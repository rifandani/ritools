"use client";

import { useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { useLatest } from "@/core/hooks/use-latest";
import { download } from "@/core/libs/files";
import type { DroppedFile } from "@/core/libs/files";
import {
  MAX_TABS,
  SAMPLE_NAME,
  SAMPLE_URL,
  tabAfterClose,
  tabRoomOf,
} from "@/features/easel/easel";
import {
  decodeImageFile,
  downscaleBitmap,
  fittedSizeOf,
  pixelsOfBitmap,
} from "@/features/easel/easel.decode.browser";
import { exportImage } from "@/features/easel/easel.export.browser";
import type { ExportedImage } from "@/features/easel/easel.export.browser";
import { isFontFileName } from "@/features/easel/easel.fonts";
import type { FontChoice } from "@/features/easel/easel.fonts";
import {
  canQueryDeviceFonts,
  ensureFont,
  queryDeviceFonts,
  registerFontFile,
} from "@/features/easel/easel.fonts.browser";
import {
  assetFileName,
  exportedOf,
  fontsOfStack,
  recordOf,
  SOURCE_FILE,
} from "@/features/easel/easel.persist";
import type { SessionRecord } from "@/features/easel/easel.persist";
import { easelStorage } from "@/features/easel/easel.persist.browser";
import type {
  Commit,
  SavedSession,
  SavedTab,
  TabWrite,
} from "@/features/easel/easel.persist.browser";
import { fillOverlayOf } from "@/features/easel/easel.pixels";
import type { Raster } from "@/features/easel/easel.pixels";
import type { OutputFormat } from "@/features/easel/easel.plan";
import type { Size } from "@/features/easel/easel.presets";
import { DEFAULT_QUALITY, qualityOf } from "@/features/easel/easel.protocol";
import { createPhotoRenderer } from "@/features/easel/easel.renderer.browser";
import type { PhotoRenderer } from "@/features/easel/easel.renderer.browser";
import {
  applyChange,
  EMPTY_STACK,
  endGesture,
  ORIGINAL,
  redo,
  undo,
} from "@/features/easel/easel.stack";
import type {
  BucketFill,
  Change,
  EditStack,
  EditState,
} from "@/features/easel/easel.stack";

/**
 * The Easel controller: it owns the File Tabs (at most `MAX_TABS`), the
 * active File Tab, open and close, the unexported-edits state, and the one
 * pixel renderer. Each File Tab has its own Edit Stack.
 *
 * It also keeps the File Tabs in the browser (IndexedDB), so a reload opens
 * them again with their edits and undo history. A change is written after a
 * short pause, and a hidden page writes at once. Closing a File Tab deletes
 * its saved data. Only a write that did not finish, or that failed, asks
 * before a reload.
 */

export interface EaselTab {
  readonly byteSize: number;
  /** The state of the last downloaded export, or the original state. */
  readonly exported: EditState;
  readonly exportFailed: boolean;
  readonly exporting: boolean;
  readonly format: OutputFormat;
  readonly id: string;
  readonly name: string;
  readonly quality: number;
  /** The last export, and the state it was made from. */
  readonly result: {
    readonly image: ExportedImage;
    readonly state: EditState;
  } | null;
  readonly source: Size;
  readonly stack: EditStack;
}

/** An image that is larger than the GPU limit and waits for the user. */
export interface OversizedImage {
  readonly fitted: Size;
  readonly id: string;
  readonly name: string;
  readonly size: Size;
}

type ExportOutcome =
  | { readonly image: ExportedImage; readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: "busy" | "failed" | "no-image" | "unsupported";
    };

interface TabResources {
  readonly assets: Map<string, CanvasImageSource>;
  readonly bitmap: ImageBitmap;
  pixels: Raster | null;
}

interface Pending {
  readonly bitmap: ImageBitmap;
  /** The file as the user gave it, which Easel saves. */
  readonly file: Blob;
  readonly name: string;
}

/** The files of one File Tab that Easel saves, as the user gave them. */
interface KeptFiles {
  readonly assets: Map<string, Blob>;
  readonly source: Blob;
}

/** What the last finished write holds for one File Tab. */
interface Written {
  readonly assets: ReadonlySet<string>;
  readonly dirty: boolean;
  readonly format: OutputFormat;
  readonly quality: number;
  readonly stack: EditStack;
}

/** A change is written this long after the last change, in milliseconds. */
const SAVE_DELAY = 400;

const sameSession = (left: SessionRecord, right: SessionRecord): boolean =>
  left.active === right.active &&
  left.order.length === right.order.length &&
  left.order.every((id, index) => id === right.order[index]);

/** Whether a File Tab has edits that no downloaded export holds. */
export const isDirty = (tab: EaselTab): boolean =>
  tab.stack.present !== tab.exported;

/** Frees the source and each added picture of one File Tab. */
const releaseResources = (held: TabResources): void => {
  held.bitmap.close();
  for (const asset of held.assets.values()) {
    if (asset instanceof ImageBitmap) {
      asset.close();
    }
  }
  held.assets.clear();
};

/** A gesture with no end event ends after this pause, in milliseconds. */
const GESTURE_PAUSE = 700;

/** An id that a later page load cannot repeat: saved File Tabs keep theirs. */
const nextId = (prefix: string): string => `${prefix}-${crypto.randomUUID()}`;

/** Writes one commit. It resolves to `false` when the browser refuses it. */
const commitPlan = async (commit: Commit): Promise<boolean> => {
  try {
    await easelStorage().commit(commit);
    return true;
  } catch {
    return false;
  }
};

/** The saved File Tabs, or `null` when the browser cannot read them. */
const loadSaved = async (): Promise<SavedSession | null> => {
  try {
    return await easelStorage().load();
  } catch {
    return null;
  }
};

interface Restoration {
  readonly files: Map<string, KeptFiles>;
  readonly held: Map<string, TabResources>;
  readonly refused: readonly string[];
  readonly session: SessionRecord;
  readonly tabs: readonly EaselTab[];
  readonly written: Map<string, Written>;
}

/** Decodes the images of one saved File Tab. It throws when the original fails. */
const openSaved = async (
  { assets, source }: SavedTab,
  maxSize: number,
  opened: ImageBitmap[]
): Promise<TabResources> => {
  let bitmap = await decodeImageFile(source);
  opened.push(bitmap);
  if (Math.max(bitmap.width, bitmap.height) > maxSize) {
    bitmap = await downscaleBitmap(bitmap, maxSize);
    opened.push(bitmap);
  }
  const pictures = new Map<string, CanvasImageSource>();
  for (const [assetId, blob] of assets) {
    try {
      // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- one decode at a time keeps the memory use low.
      const picture = await decodeImageFile(blob);
      opened.push(picture);
      pictures.set(assetId, picture);
    } catch {
      // A picture that cannot open leaves its layer empty.
    }
  }
  return { assets: pictures, bitmap, pixels: null };
};

/**
 * Opens every saved File Tab. It returns `null` after `cancelled` says so,
 * and then it has freed what it decoded. A File Tab that cannot open is in
 * `refused`; its saved data stays.
 */
const restoreTabs = async (
  saved: SavedSession,
  maxSize: number,
  cancelled: () => boolean
): Promise<Restoration | null> => {
  const held = new Map<string, TabResources>();
  const files = new Map<string, KeptFiles>();
  const written = new Map<string, Written>();
  const tabs: EaselTab[] = [];
  const refused: string[] = [];
  for (const entry of saved.tabs) {
    const { record } = entry;
    const opened: ImageBitmap[] = [];
    try {
      // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- one decode at a time keeps the memory use low.
      const resourcesOfTab = await openSaved(entry, maxSize, opened);
      const { bitmap } = resourcesOfTab;
      held.set(record.id, resourcesOfTab);
      files.set(record.id, {
        assets: new Map(entry.assets),
        source: entry.source,
      });
      const tab: EaselTab = {
        byteSize: record.byteSize,
        exported: exportedOf(record),
        exportFailed: false,
        exporting: false,
        format: record.format,
        id: record.id,
        name: record.name,
        quality: record.quality,
        result: null,
        source: { height: bitmap.height, width: bitmap.width },
        stack: record.stack,
      };
      tabs.push(tab);
      written.set(record.id, {
        assets: new Set(entry.assets.keys()),
        dirty: isDirty(tab),
        format: tab.format,
        quality: tab.quality,
        stack: tab.stack,
      });
    } catch {
      for (const bitmap of opened) {
        bitmap.close();
      }
      refused.push(record.name);
    }
  }
  // The canvas draws a font only after the browser has its file.
  await Promise.all(
    tabs.flatMap((tab) =>
      fontsOfStack(tab.stack).map((family) => ensureFont(family))
    )
  );
  if (cancelled()) {
    for (const entry of held.values()) {
      releaseResources(entry);
    }
    return null;
  }
  const order = tabs.map((tab) => tab.id);
  return {
    files,
    held,
    refused,
    session: {
      active: order.includes(saved.active ?? "") ? saved.active : null,
      order,
    },
    tabs,
    written,
  };
};

export const useEasel = () => {
  const [tabs, setTabs] = useState<readonly EaselTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rejected, setRejected] = useState<readonly string[]>([]);
  const [tabLimitHit, setTabLimitHit] = useState(false);
  const [oversized, setOversized] = useState<readonly OversizedImage[]>([]);
  const [sampleFailed, setSampleFailed] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [opening, setOpening] = useState(0);
  const [fonts, setFonts] = useState<readonly FontChoice[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [ready, setReady] = useState(false);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const resources = useRef(new Map<string, TabResources>());
  /** The files to save. Unlike `resources`, it outlives the page's cleanup. */
  const kept = useRef(new Map<string, KeptFiles>());
  const written = useRef(new Map<string, Written>());
  const writtenSession = useRef<SessionRecord>({ active: null, order: [] });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writing = useRef(false);
  /** A change came while a write was running, so a new write follows. */
  const again = useRef(false);
  const pending = useRef(new Map<string, Pending>());
  const renderer = useRef<PhotoRenderer | null>(null);
  const synced = useRef<{
    fills: readonly BucketFill[] | null;
    tabId: string | null;
  }>({ fills: null, tabId: null });
  const overlays = useRef(new WeakMap<readonly BucketFill[], Uint8Array>());
  const gestureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The files that are being decoded, which will each need a File Tab. */
  const decoding = useRef(0);
  const tabsRef = useLatest(tabs);
  const activeRef = useLatest(activeId);
  const readyRef = useLatest(ready);
  const saveFailedRef = useLatest(saveFailed);

  const active = tabs.find((tab) => tab.id === activeId) ?? null;

  /** The one pixel renderer, or `null` when the browser has no WebGL2. */
  const rendererOf = useCallback((): PhotoRenderer | null => {
    if (renderer.current !== null) {
      return renderer.current;
    }
    try {
      renderer.current = createPhotoRenderer();
    } catch {
      setUnsupported(true);
      return null;
    }
    return renderer.current;
  }, []);

  /**
   * The renderer with the source and the Bucket Fills of one File Tab state
   * on the GPU.
   */
  const photoOf = useCallback(
    (tabId: string, state: EditState): PhotoRenderer | null => {
      const photo = rendererOf();
      const held = resources.current.get(tabId);
      if (photo === null || held === undefined) {
        return null;
      }
      if (synced.current.tabId !== tabId) {
        photo.setSource(held.bitmap);
        synced.current = { fills: null, tabId };
      }
      if (synced.current.fills !== state.fills) {
        const size = { height: held.bitmap.height, width: held.bitmap.width };
        if (state.fills.length === 0) {
          photo.setFill(null, size);
        } else {
          let overlay = overlays.current.get(state.fills);
          if (overlay === undefined) {
            const pixels = held.pixels ?? pixelsOfBitmap(held.bitmap);
            held.pixels = pixels;
            overlay = fillOverlayOf(pixels, state.fills);
            overlays.current.set(state.fills, overlay);
          }
          photo.setFill(overlay, size);
        }
        synced.current.fills = state.fills;
      }
      return photo;
    },
    [rendererOf]
  );

  const updateTab = useCallback(
    (id: string | null, update: (tab: EaselTab) => EaselTab) => {
      if (id === null) {
        return;
      }
      setTabs((current) =>
        current.map((tab) => (tab.id === id ? update(tab) : tab))
      );
    },
    []
  );

  const openBitmap = useCallback(
    (bitmap: ImageBitmap, name: string, file: Blob) => {
      const id = nextId("easel-tab");
      const byteSize = file.size;
      resources.current.set(id, { assets: new Map(), bitmap, pixels: null });
      kept.current.set(id, { assets: new Map(), source: file });
      const tab: EaselTab = {
        byteSize,
        exported: ORIGINAL,
        exportFailed: false,
        exporting: false,
        format: "png",
        id,
        name,
        quality: DEFAULT_QUALITY,
        result: null,
        source: { height: bitmap.height, width: bitmap.width },
        stack: EMPTY_STACK,
      };
      setTabs((current) => [...current, tab]);
      setActiveId(id);
      setAnnouncement(name);
    },
    []
  );

  const addFiles = useCallback(
    async (files: readonly DroppedFile[]) => {
      const photo = rendererOf();
      if (photo === null || files.length === 0) {
        return;
      }
      const room = tabRoomOf(
        tabsRef.current.length + pending.current.size + decoding.current,
        files.length
      );
      setTabLimitHit(room.limited);
      setRejected([]);
      setSampleFailed(false);
      setOpening((count) => count + 1);
      decoding.current += room.accepted;
      const refused: string[] = [];
      for (const { file } of files.slice(0, room.accepted)) {
        try {
          // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- one decode at a time keeps the memory use low.
          const bitmap = await decodeImageFile(file);
          if (Math.max(bitmap.width, bitmap.height) > photo.maxSize) {
            const id = nextId("easel-large");
            const size = { height: bitmap.height, width: bitmap.width };
            pending.current.set(id, {
              bitmap,
              file,
              name: file.name,
            });
            setOversized((current) => [
              ...current,
              {
                fitted: fittedSizeOf(size, photo.maxSize),
                id,
                name: file.name,
                size,
              },
            ]);
          } else {
            openBitmap(bitmap, file.name, file);
          }
        } catch {
          refused.push(file.name);
        }
        decoding.current -= 1;
      }
      setRejected(refused);
      setOpening((count) => count - 1);
    },
    [openBitmap, rendererOf, tabsRef]
  );

  /** Opens a too-large image at the size the GPU can hold, or drops it. */
  const resolveOversized = useCallback(
    async (id: string, accept: boolean) => {
      const held = pending.current.get(id);
      pending.current.delete(id);
      setOversized((current) => current.filter((item) => item.id !== id));
      const photo = rendererOf();
      if (held === undefined) {
        return;
      }
      if (!accept || photo === null) {
        held.bitmap.close();
        return;
      }
      try {
        const bitmap = await downscaleBitmap(held.bitmap, photo.maxSize);
        openBitmap(bitmap, held.name, held.file);
      } catch {
        setRejected((current) => [...current, held.name]);
      }
    },
    [openBitmap, rendererOf]
  );

  const loadSample = useCallback(async (): Promise<boolean> => {
    if (
      tabsRef.current.length + pending.current.size + decoding.current >=
      MAX_TABS
    ) {
      setTabLimitHit(true);
      return false;
    }
    if (rendererOf() === null) {
      return false;
    }
    setSampleFailed(false);
    setOpening((count) => count + 1);
    try {
      const response = await fetch(SAMPLE_URL);
      const blob = response.ok ? await response.blob() : null;
      if (blob !== null) {
        openBitmap(await decodeImageFile(blob), SAMPLE_NAME, blob);
      }
      setSampleFailed(blob === null);
      setOpening((count) => count - 1);
      return blob !== null;
    } catch {
      setSampleFailed(true);
      setOpening((count) => count - 1);
      return false;
    }
  }, [openBitmap, rendererOf, tabsRef]);

  const select = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const close = useCallback(
    (id: string) => {
      const ids = tabsRef.current.map((tab) => tab.id);
      const held = resources.current.get(id);
      resources.current.delete(id);
      kept.current.delete(id);
      if (synced.current.tabId === id) {
        synced.current = { fills: null, tabId: null };
      }
      if (held !== undefined) {
        releaseResources(held);
      }
      setTabs((current) => current.filter((tab) => tab.id !== id));
      setActiveId(tabAfterClose(ids, id, activeRef.current));
      setTabLimitHit(false);
    },
    [activeRef, tabsRef]
  );

  const finishGesture = useCallback(() => {
    clearTimeout(gestureTimer.current ?? undefined);
    updateTab(activeRef.current, (tab) => ({
      ...tab,
      stack: endGesture(tab.stack),
    }));
  }, [activeRef, updateTab]);

  const apply = useCallback(
    (change: Change, gesture: string | null = null) => {
      updateTab(activeRef.current, (tab) => ({
        ...tab,
        stack: applyChange(tab.stack, change, gesture),
      }));
      // A color drag or typed text has no end event. A pause ends it, so the
      // next change of the same control is a new undo step.
      clearTimeout(gestureTimer.current ?? undefined);
      if (gesture !== null) {
        gestureTimer.current = setTimeout(finishGesture, GESTURE_PAUSE);
      }
    },
    [activeRef, finishGesture, updateTab]
  );

  const undoActive = useCallback(() => {
    updateTab(activeRef.current, (tab) => ({ ...tab, stack: undo(tab.stack) }));
  }, [activeRef, updateTab]);

  const redoActive = useCallback(() => {
    updateTab(activeRef.current, (tab) => ({ ...tab, stack: redo(tab.stack) }));
  }, [activeRef, updateTab]);

  const setFormat = useCallback(
    (format: OutputFormat) => {
      updateTab(activeRef.current, (tab) => ({ ...tab, format, result: null }));
    },
    [activeRef, updateTab]
  );

  const setQuality = useCallback(
    (quality: number) => {
      updateTab(activeRef.current, (tab) => ({
        ...tab,
        quality: qualityOf(quality),
        result: null,
      }));
    },
    [activeRef, updateTab]
  );

  const assetOf = useCallback(
    (id: string): CanvasImageSource | null => {
      const tabId = activeRef.current;
      return tabId === null
        ? null
        : (resources.current.get(tabId)?.assets.get(id) ?? null);
    },
    [activeRef]
  );

  /** Adds a picture to the active File Tab for an image layer or mark. */
  const addAsset = useCallback(
    async (file: Blob): Promise<({ readonly id: string } & Size) | null> => {
      const tabId = activeRef.current;
      const held = tabId === null ? undefined : resources.current.get(tabId);
      if (held === undefined) {
        return null;
      }
      try {
        const bitmap = await decodeImageFile(file);
        const id = nextId("easel-asset");
        held.assets.set(id, bitmap);
        kept.current.get(tabId ?? "")?.assets.set(id, file);
        return { height: bitmap.height, id, width: bitmap.width };
      } catch {
        return null;
      }
    },
    [activeRef]
  );

  /**
   * Draws and encodes the active File Tab. It does not download. A format or
   * a quality in `overrides` also becomes the File Tab's setting.
   */
  const exportActive = useCallback(
    async (
      overrides: {
        readonly format?: OutputFormat;
        readonly quality?: number;
      } = {}
    ): Promise<ExportOutcome> => {
      const found = tabsRef.current.find(
        (item) => item.id === activeRef.current
      );
      if (found === undefined) {
        return { ok: false, reason: "no-image" };
      }
      if (found.exporting) {
        return { ok: false, reason: "busy" };
      }
      const format = overrides.format ?? found.format;
      const quality = qualityOf(overrides.quality ?? found.quality);
      const sameSettings = format === found.format && quality === found.quality;
      const tab: EaselTab = sameSettings
        ? found
        : { ...found, format, quality, result: null };
      if (!sameSettings) {
        updateTab(tab.id, (item) => ({
          ...item,
          format,
          quality,
          result: null,
        }));
      }
      const state = tab.stack.present;
      if (tab.result !== null && tab.result.state === state) {
        return { image: tab.result.image, ok: true };
      }
      const photo = photoOf(tab.id, state);
      const held = resources.current.get(tab.id);
      if (photo === null || held === undefined) {
        return { ok: false, reason: "unsupported" };
      }
      updateTab(tab.id, (item) => ({
        ...item,
        exportFailed: false,
        exporting: true,
      }));
      try {
        const image = await exportImage({
          assetOf: (id) => held.assets.get(id) ?? null,
          format: tab.format,
          name: tab.name,
          quality: tab.quality,
          renderer: () => photoOf(tab.id, state),
          source: tab.source,
          state,
        });
        updateTab(tab.id, (item) => ({
          ...item,
          exporting: false,
          result: { image, state },
        }));
        return { image, ok: true };
      } catch {
        updateTab(tab.id, (item) => ({
          ...item,
          exportFailed: true,
          exporting: false,
        }));
        return { ok: false, reason: "failed" };
      }
    },
    [activeRef, photoOf, tabsRef, updateTab]
  );

  /** Saves an export as a file. The File Tab then has no unexported edits. */
  const downloadExport = useCallback(
    (tabId: string, image: ExportedImage, state: EditState) => {
      const bytes = new Uint8Array(image.bytes.byteLength);
      bytes.set(image.bytes);
      download(new Blob([bytes.buffer], { type: image.mime }), image.name);
      updateTab(tabId, (tab) => ({ ...tab, exported: state }));
    },
    [updateTab]
  );

  const addFontFile = useCallback(
    async (file: File): Promise<string | null> => {
      if (!isFontFileName(file.name)) {
        return null;
      }
      try {
        const font = await registerFontFile(file);
        setFonts((current) => [...current, font]);
        return font.family;
      } catch {
        return null;
      }
    },
    []
  );

  const loadDeviceFonts = useCallback(async (): Promise<number> => {
    const found = await queryDeviceFonts();
    setFonts((current) => [...current, ...found]);
    return found.length;
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Saving                                                                    */
  /* ------------------------------------------------------------------------ */

  /**
   * The write that brings the saved data to the open File Tabs, or `null`
   * when it is up to date. A File Tab is written again only after a change.
   * Its files are written once, with its first record.
   */
  const planCommit = useCallback(
    (open: readonly EaselTab[], activeTab: string | null) => {
      const before = written.current;
      const next = new Map(before);
      const put: TabWrite[] = [];
      for (const tab of open) {
        const files = kept.current.get(tab.id);
        if (files === undefined) {
          continue;
        }
        const prior = before.get(tab.id);
        const saved = prior?.assets ?? new Set<string>();
        const fresh = [...files.assets].filter(([id]) => !saved.has(id));
        const dirty = isDirty(tab);
        if (
          prior?.stack === tab.stack &&
          prior.format === tab.format &&
          prior.quality === tab.quality &&
          prior.dirty === dirty &&
          fresh.length === 0
        ) {
          continue;
        }
        const assetIds = [...saved, ...fresh.map(([id]) => id)];
        put.push({
          files: [
            ...(prior === undefined
              ? [{ blob: files.source, name: SOURCE_FILE }]
              : []),
            ...fresh.map(([id, blob]) => ({ blob, name: assetFileName(id) })),
          ],
          record: recordOf(tab, assetIds),
        });
        next.set(tab.id, {
          assets: new Set(assetIds),
          dirty,
          format: tab.format,
          quality: tab.quality,
          stack: tab.stack,
        });
      }
      const openIds = new Set(open.map((tab) => tab.id));
      const remove = [...before.keys()].filter((id) => !openIds.has(id));
      for (const id of remove) {
        next.delete(id);
      }
      const session: SessionRecord = {
        active: activeTab,
        order: open.map((tab) => tab.id),
      };
      const sessionChanged = !sameSession(session, writtenSession.current);
      if (put.length === 0 && remove.length === 0 && !sessionChanged) {
        return null;
      }
      return {
        commit: { put, remove, session: sessionChanged ? session : null },
        next,
        session,
      };
    },
    []
  );

  /** Writes the changes now. Writes run one at a time. */
  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current ?? undefined);
    saveTimer.current = null;
    if (!readyRef.current) {
      return;
    }
    if (writing.current) {
      again.current = true;
      return;
    }
    writing.current = true;
    let plan = planCommit(tabsRef.current, activeRef.current);
    while (plan !== null) {
      again.current = false;
      // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- a write starts only after the one before it.
      const saved = await commitPlan(plan.commit);
      setSaveFailed(!saved);
      if (!saved) {
        break;
      }
      written.current = plan.next;
      writtenSession.current = plan.session;
      plan = again.current
        ? planCommit(tabsRef.current, activeRef.current)
        : null;
    }
    writing.current = false;
  }, [activeRef, planCommit, readyRef, tabsRef]);

  const handleRetrySave = useCallback(() => {
    void flush();
  }, [flush]);

  // A change is written after a pause, so a slider drag is one write.
  useEffect(() => {
    if (!ready || planCommit(tabs, activeId) === null) {
      return;
    }
    const timer = setTimeout(() => {
      void flush();
    }, SAVE_DELAY);
    saveTimer.current = timer;
    return () => {
      clearTimeout(timer);
      if (saveTimer.current === timer) {
        saveTimer.current = null;
      }
    };
  }, [activeId, flush, planCommit, ready, tabs]);

  // A page that goes away writes at once. A reload and a tab close fire
  // `pagehide`; a switch to another tab or app fires `visibilitychange`.
  useEffect(() => {
    const onHide = () => {
      void flush();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void flush();
      }
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      // A link inside the app unmounts the page. The write still finishes.
      void flush();
    };
  }, [flush]);

  // A reload and a tab close ask first only while a change is not saved. A
  // link inside the app asks only after a write failed: a write that has not
  // finished still finishes after the page unmounts.
  const blocker = useBlocker({
    enableBeforeUnload: () =>
      saveTimer.current !== null || writing.current || saveFailedRef.current,
    shouldBlockFn: () => saveFailedRef.current,
    withResolver: true,
  });
  const leaving = blocker.status === "blocked";
  const confirmLeave = () => {
    blocker.proceed?.();
  };
  const cancelLeave = () => {
    blocker.reset?.();
  };

  // Opens the saved File Tabs again. A File Tab that cannot open is reported
  // and its saved data stays.
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      const saved = await loadSaved();
      if (cancelled) {
        return;
      }
      if (saved === null) {
        setRestoreFailed(true);
        setReady(true);
        return;
      }
      const photo = saved.tabs.length === 0 ? null : rendererOf();
      if (photo !== null) {
        setOpening((count) => count + 1);
        const restoration = await restoreTabs(
          saved,
          photo.maxSize,
          () => cancelled
        );
        setOpening((count) => count - 1);
        if (restoration !== null) {
          for (const [id, entry] of restoration.held) {
            resources.current.set(id, entry);
          }
          for (const [id, entry] of restoration.files) {
            kept.current.set(id, entry);
          }
          for (const [id, entry] of restoration.written) {
            written.current.set(id, entry);
          }
          writtenSession.current = restoration.session;
          setTabs((current) => [...restoration.tabs, ...current]);
          setActiveId(
            (current) =>
              current ??
              restoration.session.active ??
              restoration.tabs[0]?.id ??
              null
          );
          setRejected((current) => [...current, ...restoration.refused]);
        }
      }
      if (!cancelled) {
        setReady(true);
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, [rendererOf]);

  useEffect(() => {
    const held = resources.current;
    const waiting = pending.current;
    return () => {
      for (const entry of held.values()) {
        releaseResources(entry);
      }
      for (const entry of waiting.values()) {
        entry.bitmap.close();
      }
      held.clear();
      waiting.clear();
      clearTimeout(gestureTimer.current ?? undefined);
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);

  return {
    active,
    activeId,
    addAsset,
    addFiles,
    addFontFile,
    announcement,
    apply,
    assetOf,
    cancelLeave,
    canQueryDeviceFonts,
    confirmLeave,
    leaving,
    close,
    downloadExport,
    ensureFont,
    exportActive,
    finishGesture,
    fonts,
    loadDeviceFonts,
    loadSample,
    opening: opening > 0,
    oversized,
    photoOf,
    redo: redoActive,
    rejected,
    resolveOversized,
    restoreFailed,
    handleRetrySave,
    sampleFailed,
    saveFailed,
    select,
    setFormat,
    setQuality,
    tabLimitHit,
    tabs,
    undo: undoActive,
    unsupported,
  };
};

export type EaselController = ReturnType<typeof useEasel>;
