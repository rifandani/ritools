"use client";

/* oxlint-disable react/set-state-in-effect -- The hook owns the session state; the browser calls sit at the event and effect boundary. */
/* oxlint-disable eslint/no-await-in-loop, react-doctor/async-await-in-loop -- Batch rows run one at a time to bound memory and keep progress order. */
/* oxlint-disable eslint/complexity -- One run loop owns the model, reuse, source, cancel, and progress branches in order. */

import { useAtomSet } from "@effect/atom-react";
import { makeZip } from "client-zip";
import { Option, Schema } from "effect";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { download } from "@/core/libs/files";
import type { DroppedFile } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";
import {
  buildZipEntries,
  claimedFormatOf,
  DEFAULT_SETTINGS,
  errorCopyOf,
  isDownloadable,
  jpegBlocked,
  mimeOfFormat,
  runSetOf,
  SAMPLE_NAME,
  SAMPLE_URL,
  settingsKey,
  stateAfterSettingsChange,
  ZIP_NAME,
} from "@/features/unmask/unmask";
import type { RowState, UnmaskSettings } from "@/features/unmask/unmask";
import {
  cutoutUnmaskAtom,
  removeUnmaskAtom,
} from "@/features/unmask/unmask.atoms";
import {
  UnmaskErrorSchema,
  UnreadableFile,
} from "@/features/unmask/unmask.engine";
import type {
  ImageFormat,
  Matte,
  MatteOperation,
  ModelInfo,
  RasterImage,
  RemoveNote,
  RemoveProgress,
  SourceFacts,
  UnmaskError,
} from "@/features/unmask/unmask.engine";
import { refineMatte } from "@/features/unmask/unmask.matte";

export interface UnmaskItem {
  readonly id: string;
  readonly file: File;
  readonly folderPath: string | null;
  readonly name: string;
  readonly byteSize: number;
  readonly claimedFormat: ImageFormat | null;
  readonly state: RowState;
  readonly error: UnmaskError | null;
  readonly facts: SourceFacts | null;
  readonly preview: Matte | null;
  readonly previewBase: Matte | null;
  readonly full: Matte | null;
  readonly source: RasterImage | null;
  readonly model: ModelInfo | null;
  readonly notes: readonly RemoveNote[];
  readonly operations: readonly MatteOperation[];
  readonly redo: readonly MatteOperation[];
  readonly result: {
    readonly bytes: Uint8Array;
    readonly mime: string;
    readonly name: string;
    readonly width: number;
    readonly height: number;
    readonly bytesLength: number;
    readonly format: UnmaskSettings["format"];
  } | null;
  readonly progress: RemoveProgress | null;
  readonly settingsKey: string | null;
  readonly edited: boolean;
}

interface Outcome {
  readonly failed: boolean;
  readonly leftOut: number;
}

let itemSequence = 0;
const nextItemId = () => {
  itemSequence += 1;
  return `unmask-item-${itemSequence}`;
};

const decodeUnmaskError = Schema.decodeUnknownOption(UnmaskErrorSchema);

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- a caught failure is unparsed at this boundary.
const errorOf = (error: unknown): UnmaskError =>
  Option.getOrElse(decodeUnmaskError(error), () => ({
    _tag: "UnreadableFile",
    reason: "decode",
  }));

const sourceFileOf = async (file: File, mime: string) => ({
  bytes: new Uint8Array(await file.arrayBuffer()),
  mime,
  name: file.name,
});

const delay = (milliseconds: number) =>
  // oxlint-disable-next-line promise/avoid-new -- a delay is the test seam
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });

/**
 * The decoded source for the editor and the full-resolution replay.
 *
 * The Worker already decoded the file for the model. The editor needs the
 * pixels too, so it decodes them again here, once per opened or edited image,
 * and drops them when the row leaves the screen. The preview Matte and the
 * export share one operation log in source pixels.
 */
const decodeSourceOf = async (item: UnmaskItem): Promise<RasterImage> => {
  const format = item.facts?.format ?? item.claimedFormat;
  if (format === null) {
    throw new UnreadableFile({
      detail: "the image has no readable format",
      reason: "decode",
    });
  }
  const { decodeImage } = await import("@/features/unmask/unmask.decode");
  const { raster } = await decodeImage(
    {
      bytes: new Uint8Array(await item.file.arrayBuffer()),
      mime: mimeOfFormat(format),
      name: item.name,
    },
    format
  );
  return raster;
};

/** The row a run may process, or null when it is gone or unsupported. */
const runnableRowOf = (
  items: ReadonlyMap<string, UnmaskItem>,
  id: string,
  updateItem: (id: string, update: Partial<UnmaskItem>) => void
): UnmaskItem | null => {
  const item = items.get(id);
  if (item === undefined) {
    return null;
  }
  if (item.claimedFormat === null) {
    updateItem(id, { state: "failed" });
    return null;
  }
  return item;
};

const focusLater = (selector: string) => {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(selector)?.focus();
  });
};

const isSlowRun = () =>
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("slow") === "1";

export const useUnmask = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<ReadonlyMap<string, UnmaskItem>>(
    new Map()
  );
  const itemsRef = useRef<ReadonlyMap<string, UnmaskItem>>(items);
  const [settings, setSettings] = useState<UnmaskSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef<UnmaskSettings>(DEFAULT_SETTINGS);
  const [openId, setOpenId] = useState<string | null>(null);
  // A run reads the open row while it awaits, so it needs the current value,
  // not the value from the render that started the run.
  const openIdRef = useRef<string | null>(null);
  const selectRow = useCallback((id: string | null) => {
    openIdRef.current = id;
    setOpenId(id);
  }, []);
  const [running, setRunning] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [sampleFailed, setSampleFailed] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const removeInEngine = useAtomSet(removeUnmaskAtom, { mode: "promise" });
  const cutInEngine = useAtomSet(cutoutUnmaskAtom, { mode: "promise" });
  const abortRef = useRef<AbortController | null>(null);
  const runId = useRef(0);
  const announcementQuarter = useRef(0);
  const downloadQuarter = useRef(0);

  const commit = useCallback((next: ReadonlyMap<string, UnmaskItem>) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const updateItem = useCallback(
    (id: string, update: Partial<UnmaskItem>) => {
      const existing = itemsRef.current.get(id);
      if (existing === undefined) {
        return;
      }
      const next = new Map(itemsRef.current);
      next.set(id, { ...existing, ...update });
      commit(next);
    },
    [commit]
  );

  const changeSettings = useCallback(
    (next: UnmaskSettings) => {
      settingsRef.current = next;
      setSettings(next);
      const key = settingsKey(next);
      const map = new Map(itemsRef.current);
      for (const [id, item] of map) {
        if (item.settingsKey !== null && item.settingsKey !== key) {
          map.set(id, {
            ...item,
            state: stateAfterSettingsChange(item.state),
          });
        }
      }
      commit(map);
    },
    [commit]
  );

  const addFiles = useCallback(
    (incoming: readonly DroppedFile[]): readonly string[] => {
      const created: UnmaskItem[] = [];
      let nextSkipped = 0;
      for (const { file, folderPath } of incoming) {
        const claimed = claimedFormatOf(file);
        if (claimed === null && folderPath !== null) {
          nextSkipped += 1;
          continue;
        }
        const id = nextItemId();
        created.push({
          byteSize: file.size,
          claimedFormat: claimed,
          edited: false,
          error:
            claimed === null
              ? { _tag: "UnsupportedFormat", format: file.type || "unknown" }
              : null,
          facts: null,
          file,
          folderPath,
          full: null,
          id,
          model: null,
          name: file.name,
          notes: [],
          operations: [],
          preview: null,
          previewBase: null,
          progress: null,
          redo: [],
          result: null,
          settingsKey: null,
          source: null,
          state: claimed === null ? "failed" : "queued",
        });
      }
      const map = new Map(itemsRef.current);
      for (const item of created) {
        map.set(item.id, item);
      }
      commit(map);
      if (nextSkipped > 0) {
        setSkipped((current) => current + nextSkipped);
      }
      if (created.length > 0) {
        selectRow(map.size === 1 ? (created[0]?.id ?? null) : null);
      }
      return created.map((item) => item.id);
    },
    [commit, selectRow]
  );

  const encodeItem = useCallback(
    async (
      item: UnmaskItem,
      encodeSettings: UnmaskSettings,
      signal: AbortSignal
    ): Promise<UnmaskItem["result"]> => {
      if (item.full === null || item.facts === null || item.source === null) {
        throw new UnreadableFile({
          detail: "the source pixels are not open for this Matte",
          reason: "decode",
        });
      }
      const fullMatte =
        item.operations.length === 0
          ? item.full
          : refineMatte({
              matte: item.full,
              operations: item.operations,
              source: item.source,
            });
      const encoded = await cutInEngine({
        backdrop: encodeSettings.backdrop,
        feather: encodeSettings.feather,
        format: encodeSettings.format,
        imageToken: item.facts.sourceId,
        matte: fullMatte,
        nameStem: item.name,
        quality: encodeSettings.quality,
        signal,
        source: item.source,
      });
      return {
        bytes: encoded.bytes,
        bytesLength: encoded.bytesLength,
        format: encoded.format,
        height: encoded.height,
        mime: encoded.mime,
        name: encoded.name,
        width: encoded.width,
      };
    },
    [cutInEngine]
  );

  /** Reads one row and keeps its source pixels for the export. */
  const removeRow = useCallback(
    async (id: string, item: UnmaskItem, controller: AbortController) => {
      const sourceFile = await sourceFileOf(
        item.file,
        item.file.type ||
          (item.claimedFormat === null
            ? "application/octet-stream"
            : mimeOfFormat(item.claimedFormat))
      );
      const removeResult = await removeInEngine({
        file: sourceFile,
        options: {
          report: (event) => {
            updateItem(id, {
              progress: event,
              state: event._tag === "Infer" ? "removing" : "reading",
            });
            if (event._tag !== "ModelDownload" || event.total === null) {
              return;
            }
            const quarter = Math.floor((event.loaded / event.total) * 4);
            if (quarter > downloadQuarter.current) {
              downloadQuarter.current = quarter;
              setAnnouncement(
                t("unmaskModelLoadingPercent", {
                  percent: String(Math.min(100, quarter * 25)),
                })
              );
            }
          },
          signal: controller.signal,
        },
      });
      if (controller.signal.aborted) {
        updateItem(id, { progress: null, state: "cancelled" });
        return null;
      }
      const current = itemsRef.current.get(id);
      if (current === undefined) {
        return null;
      }
      const source =
        current.source ??
        (await decodeSourceOf({ ...current, facts: removeResult.source }));
      updateItem(id, {
        facts: removeResult.source,
        full: removeResult.matte,
        model: removeResult.model,
        notes: removeResult.notes,
        preview: removeResult.preview,
        previewBase: removeResult.preview,
        progress: null,
        source,
        state: "removing",
      });
      return itemsRef.current.get(id) ?? null;
    },
    [removeInEngine, t, updateItem]
  );

  /** Composites and encodes one row from its kept Matte. */
  const encodeRow = useCallback(
    async (
      id: string,
      current: UnmaskItem,
      runSettings: UnmaskSettings,
      signal: AbortSignal
    ) => {
      let row = current;
      if (row.source === null) {
        const source = await decodeSourceOf(row);
        updateItem(id, { source });
        row = itemsRef.current.get(id) ?? { ...row, source };
      }
      const result = await encodeItem(row, runSettings, signal);
      updateItem(id, {
        edited: row.operations.length > 0,
        error: null,
        result,
        settingsKey: settingsKey(runSettings),
        source: openIdRef.current === id ? row.source : null,
        state: row.operations.length > 0 ? "edited" : "ready",
      });
    },
    [encodeItem, updateItem]
  );

  const runIds = useCallback(
    async (ids: readonly string[]) => {
      if (ids.length === 0 || abortRef.current !== null) {
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      setRunning(true);
      setAnnouncement(t("unmaskRemoving"));
      announcementQuarter.current = 0;
      downloadQuarter.current = 0;
      runId.current += 1;
      const currentRun = runId.current;
      const runSettings = settingsRef.current;
      let settled = 0;
      const total = ids.length;
      const announce = (done: number) => {
        const quarter = Math.floor((done / total) * 4);
        if (quarter > announcementQuarter.current) {
          announcementQuarter.current = quarter;
          setAnnouncement(
            quarter >= 4
              ? t("unmaskResultReady")
              : t("unmaskBatchProgress", {
                  done: String(done),
                  total: String(total),
                })
          );
        }
      };

      for (const id of ids) {
        if (controller.signal.aborted || currentRun !== runId.current) {
          break;
        }
        const item = runnableRowOf(itemsRef.current, id, updateItem);
        if (item === null) {
          settled += 1;
          continue;
        }
        // A settings change keeps the Matte. Re-composite it; do not run the
        // model again.
        const reuseMatte =
          item.full !== null &&
          (item.state === "stale" || item.error?._tag === "EncodeFailed");
        updateItem(id, {
          error: null,
          progress: null,
          result: reuseMatte ? item.result : null,
          state: reuseMatte ? "removing" : "reading",
        });
        try {
          if (isSlowRun()) {
            await delay(350);
          }
          let current: UnmaskItem | null = itemsRef.current.get(id) ?? null;
          if (current === null) {
            settled += 1;
            continue;
          }
          if (!reuseMatte) {
            current = await removeRow(id, item, controller);
            if (current === null) {
              settled += 1;
              if (controller.signal.aborted) {
                break;
              }
              continue;
            }
          }
          await encodeRow(id, current, runSettings, controller.signal);
        } catch (error) {
          const unmaskError = errorOf(error);
          if (unmaskError._tag === "Cancelled") {
            updateItem(id, { progress: null, state: "cancelled" });
          } else {
            setAnnouncement(t(errorCopyOf(unmaskError).title));
            updateItem(id, {
              error: unmaskError,
              progress: null,
              state: "failed",
            });
          }
        }
        settled += 1;
        announce(settled);
      }

      abortRef.current = null;
      setRunning(false);
      if (ids.length === 1) {
        focusLater("#unmask-result-heading");
      } else {
        focusLater("#unmask-run");
      }
    },
    [encodeRow, removeRow, t, updateItem]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    runId.current += 1;
    setRunning(false);
    setAnnouncement(t("unmaskCancelledBody"));
    const map = new Map(itemsRef.current);
    for (const [id, item] of map) {
      if (item.state === "reading" || item.state === "removing") {
        map.set(id, { ...item, progress: null, state: "cancelled" });
      }
    }
    commit(map);
    focusLater("#unmask-cut-out");
  }, [commit, t]);

  const retry = useCallback(
    (id: string) => {
      const item = itemsRef.current.get(id);
      if (item === undefined) {
        return;
      }
      updateItem(id, { state: "queued" });
      void runIds([id]);
    },
    [runIds, updateItem]
  );

  const run = useCallback(() => {
    const ids = runSetOf([...itemsRef.current.values()]);
    if (jpegBlocked(settingsRef.current)) {
      return;
    }
    void runIds(ids);
  }, [runIds]);

  const loadSample = useCallback(() => {
    const load = async () => {
      setSampleFailed(false);
      try {
        const response = await fetch(SAMPLE_URL);
        if (!response.ok) {
          setSampleFailed(true);
          return;
        }
        const blob = await response.blob();
        const file = new File([blob], SAMPLE_NAME, {
          type: blob.type || "image/png",
        });
        const ids = addFiles([{ file, folderPath: null }]);
        await runIds(ids);
      } catch {
        setSampleFailed(true);
      }
    };
    void load();
  }, [addFiles, runIds]);

  /** Decodes the source pixels for one open row, when they are not present. */
  const ensureSource = useCallback(
    (id: string | null) => {
      if (id === null) {
        return;
      }
      const item = itemsRef.current.get(id);
      if (item === undefined || item.full === null || item.source !== null) {
        return;
      }
      const load = async () => {
        try {
          const source = await decodeSourceOf(item);
          const current = itemsRef.current.get(id);
          if (
            current !== undefined &&
            current.full !== null &&
            current.source === null
          ) {
            updateItem(id, { source });
          }
        } catch (error) {
          const unmaskError = errorOf(error);
          setAnnouncement(t(errorCopyOf(unmaskError).title));
          updateItem(id, {
            error: unmaskError,
            progress: null,
            state: "failed",
          });
        }
      };
      void load();
    },
    [t, updateItem]
  );

  const remove = useCallback(
    (id: string) => {
      const map = new Map(itemsRef.current);
      map.delete(id);
      commit(map);
      const remaining = [...map.keys()];
      if (remaining.length === 0) {
        selectRow(null);
        return;
      }
      const stillOpen = openId !== null && map.has(openId);
      const next =
        remaining.length === 1
          ? (remaining[0] ?? null)
          : stillOpen
            ? openId
            : null;
      selectRow(next);
      ensureSource(next);
    },
    [commit, ensureSource, openId, selectRow]
  );

  /** Opens a row and decodes its source pixels when the editor needs them. */
  const open = useCallback(
    (id: string | null) => {
      selectRow(id);
      ensureSource(id);
    },
    [ensureSource, selectRow]
  );

  const removeAll = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    runId.current += 1;
    setRunning(false);
    commit(new Map());
    selectRow(null);
    setSkipped(0);
  }, [commit, selectRow]);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    runId.current += 1;
    setRunning(false);
    const map = new Map<string, UnmaskItem>();
    for (const [id, item] of itemsRef.current) {
      map.set(id, {
        ...item,
        edited: false,
        error: null,
        facts: null,
        full: null,
        model: null,
        notes: [],
        operations: [],
        preview: null,
        previewBase: null,
        progress: null,
        redo: [],
        result: null,
        settingsKey: null,
        source: null,
        state: "queued",
      });
    }
    commit(map);
  }, [commit]);

  const replayPreview = useCallback(
    (item: UnmaskItem, operations: readonly MatteOperation[]): Matte | null => {
      if (item.previewBase === null || item.source === null) {
        return item.preview;
      }
      return refineMatte({
        matte: item.previewBase,
        operations,
        source: item.source,
      });
    },
    []
  );

  const applyOperation = useCallback(
    (operation: MatteOperation) => {
      if (openId === null) {
        return;
      }
      const item = itemsRef.current.get(openId);
      if (item === undefined || item.previewBase === null) {
        return;
      }
      const operations = [...item.operations, operation];
      updateItem(openId, {
        edited: item.result !== null,
        operations,
        preview: replayPreview(item, operations),
        redo: [],
        state: item.result === null ? item.state : "edited",
      });
    },
    [openId, replayPreview, updateItem]
  );

  const undo = useCallback(() => {
    if (openId === null) {
      return;
    }
    const item = itemsRef.current.get(openId);
    if (item === undefined || item.operations.length === 0) {
      return;
    }
    const redone = item.operations.at(-1) ?? null;
    const operations = item.operations.slice(0, -1);
    updateItem(openId, {
      edited: item.result !== null,
      operations,
      preview: replayPreview(item, operations),
      redo: redone === null ? item.redo : [...item.redo, redone],
      state: item.result === null ? item.state : "edited",
    });
  }, [openId, replayPreview, updateItem]);

  const redo = useCallback(() => {
    if (openId === null) {
      return;
    }
    const item = itemsRef.current.get(openId);
    if (item === undefined || item.redo.length === 0) {
      return;
    }
    const operation = item.redo.at(-1);
    if (operation === undefined) {
      return;
    }
    const operations = [...item.operations, operation];
    updateItem(openId, {
      edited: item.result !== null,
      operations,
      preview: replayPreview(item, operations),
      redo: item.redo.slice(0, -1),
      state: item.result === null ? item.state : "edited",
    });
  }, [openId, replayPreview, updateItem]);

  const resetMatte = useCallback(() => {
    if (openId === null) {
      return;
    }
    const item = itemsRef.current.get(openId);
    if (item === undefined) {
      return;
    }
    updateItem(openId, {
      edited: item.result !== null,
      operations: [],
      preview: item.previewBase,
      redo: [],
      state: item.result === null ? item.state : "edited",
    });
  }, [openId, updateItem]);

  const refreshResult = useCallback(
    async (id: string): Promise<UnmaskItem["result"]> => {
      let item = itemsRef.current.get(id);
      if (item === undefined) {
        return null;
      }
      const controller = new AbortController();
      try {
        if (item.source === null) {
          const source = await decodeSourceOf(item);
          updateItem(id, { source });
          item = itemsRef.current.get(id) ?? { ...item, source };
        }
        const result = await encodeItem(
          item,
          settingsRef.current,
          controller.signal
        );
        updateItem(id, {
          error: null,
          result,
          settingsKey: settingsKey(settingsRef.current),
          state: item.operations.length > 0 ? "edited" : "ready",
        });
        return result;
      } catch (error) {
        updateItem(id, { error: errorOf(error), state: "failed" });
        return null;
      }
    },
    [encodeItem, updateItem]
  );

  const downloadOne = useCallback(
    (id: string) => {
      const item = itemsRef.current.get(id);
      if (item === undefined || !isDownloadable(item.state)) {
        return;
      }
      const save = async () => {
        let { result } = item;
        if (item.edited || result === null) {
          result = await refreshResult(id);
        }
        if (result === null) {
          return;
        }
        download(
          new Blob([Uint8Array.from(result.bytes)], { type: result.mime }),
          result.name
        );
        updateItem(id, { state: "downloaded" });
      };
      void save();
    },
    [refreshResult, updateItem]
  );

  const downloadAll = useCallback(async (): Promise<Outcome> => {
    const rows = [...itemsRef.current.values()];
    const candidates = rows.filter(
      (item) => item.result !== null && isDownloadable(item.state)
    );
    if (candidates.length === 0) {
      return { failed: false, leftOut: rows.length };
    }
    try {
      const settled: {
        readonly item: UnmaskItem;
        readonly result: NonNullable<UnmaskItem["result"]>;
      }[] = [];
      for (const item of candidates) {
        let { result } = item;
        if (item.edited) {
          result = await refreshResult(item.id);
        }
        if (result !== null) {
          settled.push({ item, result });
        }
      }
      const names = buildZipEntries(
        settled.map(({ item, result }) => ({
          folderPath: item.folderPath,
          format: result.format,
          name: item.name,
        }))
      );
      const files = settled.map(({ result }, index) => ({
        input: result.bytes,
        name: names[index] ?? result.name,
      }));
      if (files.length === 0) {
        return { failed: false, leftOut: rows.length };
      }
      const stream = makeZip(files);
      const blob = await new Response(stream).blob();
      download(blob, ZIP_NAME);
      const map = new Map(itemsRef.current);
      for (const { item } of settled) {
        const current = map.get(item.id);
        if (current !== undefined) {
          map.set(item.id, { ...current, state: "downloaded" });
        }
      }
      commit(map);
      return { failed: false, leftOut: rows.length - settled.length };
    } catch {
      return { failed: true, leftOut: rows.length - candidates.length };
    }
  }, [commit, refreshResult]);

  const batch = useMemo(() => [...items.values()], [items]);
  const current = openId === null ? null : (items.get(openId) ?? null);
  const counts = useMemo(() => {
    let ready = 0;
    let failed = 0;
    let queued = 0;
    let stale = 0;
    for (const item of items.values()) {
      if (item.state === "failed") {
        failed += 1;
      } else if (item.state === "stale") {
        stale += 1;
      } else if (isDownloadable(item.state)) {
        ready += 1;
      } else {
        queued += 1;
      }
    }
    return { failed, queued, ready, stale };
  }, [items]);

  const batchBytes = useMemo(
    () => batch.reduce((sum, item) => sum + item.byteSize, 0),
    [batch]
  );
  const folderPath =
    batch.find((item) => item.folderPath !== null)?.folderPath ?? null;
  const downloadable = batch.filter(
    (item) => item.result !== null && isDownloadable(item.state)
  ).length;
  const canRun =
    !running &&
    !jpegBlocked(settings) &&
    batch.some((item) =>
      ["queued", "stale", "failed", "cancelled"].includes(item.state)
    );

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  return {
    addFiles,
    announcement,
    applyOperation,
    batch,
    batchBytes,
    canRun,
    cancel,
    changeSettings,
    clear,
    current,
    downloadAll,
    downloadOne,
    downloadable,
    folderPath,
    loadSample,
    open,
    openId,
    remove,
    removeAll,
    redo,
    resetMatte,
    retry,
    run,
    running,
    sampleFailed,
    settings,
    skipped,
    t,
    undo,
    counts,
  };
};

export type UnmaskController = ReturnType<typeof useUnmask>;
