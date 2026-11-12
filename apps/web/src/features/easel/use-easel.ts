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
 * pixel renderer. Each File Tab has its own Edit Stack. Nothing is kept after
 * a reload.
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
  readonly byteSize: number;
  readonly name: string;
}

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

let sequence = 0;
const nextId = (prefix: string): string => {
  sequence += 1;
  return `${prefix}-${sequence}`;
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

  const resources = useRef(new Map<string, TabResources>());
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
    (bitmap: ImageBitmap, name: string, byteSize: number) => {
      const id = nextId("easel-tab");
      resources.current.set(id, { assets: new Map(), bitmap, pixels: null });
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
              byteSize: file.size,
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
            openBitmap(bitmap, file.name, file.size);
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
        openBitmap(bitmap, held.name, held.byteSize);
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
        openBitmap(await decodeImageFile(blob), SAMPLE_NAME, blob.size);
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

  // A reload, a tab close, and a link inside the app all ask first when a
  // File Tab has unexported edits.
  const anyDirty = tabs.some(isDirty);
  const dirtyRef = useLatest(anyDirty);
  const blocker = useBlocker({
    enableBeforeUnload: anyDirty,
    shouldBlockFn: () => dirtyRef.current,
    withResolver: true,
  });
  const leaving = blocker.status === "blocked";
  const confirmLeave = () => {
    blocker.proceed?.();
  };
  const cancelLeave = () => {
    blocker.reset?.();
  };

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
    sampleFailed,
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
