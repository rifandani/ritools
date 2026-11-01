"use client";

/* oxlint-disable react/set-state-in-effect -- The hook owns the session state; the browser calls sit at the event and effect boundary. */
/* oxlint-disable eslint/no-await-in-loop, react-doctor/async-await-in-loop -- Batch rows run one at a time to bound memory and keep progress order. */

import { makeZip } from "client-zip";
import { Effect, Option, Schema } from "effect";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { download } from "@/core/libs/files";
import type { DroppedFile } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";
import {
  buildZipEntries,
  claimedFormatOf,
  DEFAULT_SETTINGS,
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
import { UnmaskErrorSchema } from "@/features/unmask/unmask.engine";
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
import type { FakeUnmaskEngine } from "@/features/unmask/unmask.fake";
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

const loadFakeEngine = async (): Promise<FakeUnmaskEngine> => {
  const { makeFakeEngine } = await import("@/features/unmask/unmask.fake");
  return makeFakeEngine();
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
  const [running, setRunning] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [sampleFailed, setSampleFailed] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const engineRef = useRef<FakeUnmaskEngine | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runId = useRef(0);
  const announcementQuarter = useRef(0);

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

  const ensureEngine = useCallback(async (): Promise<FakeUnmaskEngine> => {
    if (engineRef.current !== null) {
      return engineRef.current;
    }
    engineRef.current = await loadFakeEngine();
    return engineRef.current;
  }, []);

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

  const releaseItem = useCallback((item: UnmaskItem) => {
    if (item.facts !== null && engineRef.current !== null) {
      engineRef.current.releaseSource(item.facts.sourceId);
    }
  }, []);

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
        setOpenId(map.size === 1 ? (created[0]?.id ?? null) : null);
      }
      return created.map((item) => item.id);
    },
    [commit]
  );

  const encodeItem = useCallback(
    async (
      item: UnmaskItem,
      encodeSettings: UnmaskSettings,
      signal: AbortSignal
    ): Promise<UnmaskItem["result"]> => {
      if (item.full === null || item.source === null) {
        return null;
      }
      const engine = await ensureEngine();
      const fullMatte = refineMatte({
        matte: item.full,
        operations: item.operations,
        source: item.source,
      });
      const composite = await Effect.runPromise(
        engine.composite({
          backdrop: encodeSettings.backdrop,
          feather: encodeSettings.feather,
          matte: fullMatte,
          signal,
          source: item.source,
        })
      );
      const encoded = await Effect.runPromise(
        engine.encode({
          format: encodeSettings.format,
          image: composite,
          nameStem: item.name,
          quality: encodeSettings.quality,
          signal,
        })
      );
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
    [ensureEngine]
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
      runId.current += 1;
      const currentRun = runId.current;
      const runSettings = settingsRef.current;
      let settled = 0;
      const total = ids.length;

      for (const id of ids) {
        if (controller.signal.aborted || currentRun !== runId.current) {
          break;
        }
        const item = itemsRef.current.get(id);
        if (item === undefined) {
          settled += 1;
          continue;
        }
        if (item.claimedFormat === null) {
          updateItem(id, { state: "failed" });
          settled += 1;
          continue;
        }
        updateItem(id, {
          error: null,
          progress: null,
          result: null,
          state: "reading",
        });
        try {
          if (isSlowRun()) {
            await delay(350);
          }
          const engine = await ensureEngine();
          const sourceFile = await sourceFileOf(
            item.file,
            item.file.type ||
              (item.claimedFormat === null
                ? "application/octet-stream"
                : mimeOfFormat(item.claimedFormat))
          );
          const removeResult = await Effect.runPromise(
            engine.remove(sourceFile, {
              report: (event) => {
                updateItem(id, {
                  progress: event,
                  state: event._tag === "Infer" ? "removing" : "reading",
                });
              },
              signal: controller.signal,
            })
          );
          if (controller.signal.aborted) {
            updateItem(id, { progress: null, state: "cancelled" });
            settled += 1;
            break;
          }
          const source = engine.sourceOf(removeResult.source.sourceId);
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
          const current = itemsRef.current.get(id);
          if (current === undefined) {
            settled += 1;
            continue;
          }
          const result = await encodeItem(
            current,
            runSettings,
            controller.signal
          );
          updateItem(id, {
            edited: current.operations.length > 0,
            error: null,
            result,
            settingsKey: settingsKey(runSettings),
            state: current.operations.length > 0 ? "edited" : "ready",
          });
        } catch (error) {
          const unmaskError = errorOf(error);
          if (unmaskError._tag === "Cancelled") {
            updateItem(id, { progress: null, state: "cancelled" });
          } else {
            updateItem(id, {
              error: unmaskError,
              progress: null,
              state: "failed",
            });
          }
        }
        settled += 1;
        const quarter = Math.floor((settled / total) * 4);
        if (quarter > announcementQuarter.current) {
          announcementQuarter.current = quarter;
          setAnnouncement(
            quarter >= 4
              ? t("unmaskResultReady")
              : t("unmaskBatchProgress", {
                  done: String(settled),
                  total: String(total),
                })
          );
        }
      }

      abortRef.current = null;
      setRunning(false);
      if (ids.length === 1) {
        focusLater("#unmask-result-heading");
      } else {
        focusLater("#unmask-run");
      }
    },
    [encodeItem, ensureEngine, t, updateItem]
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
      updateItem(id, { error: null, state: "queued" });
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

  const remove = useCallback(
    (id: string) => {
      const item = itemsRef.current.get(id);
      if (item !== undefined) {
        releaseItem(item);
      }
      const map = new Map(itemsRef.current);
      map.delete(id);
      commit(map);
      const remaining = [...map.keys()];
      if (remaining.length === 0) {
        setOpenId(null);
        return;
      }
      const stillOpen = openId !== null && map.has(openId);
      setOpenId(
        remaining.length === 1
          ? (remaining[0] ?? null)
          : stillOpen
            ? openId
            : null
      );
    },
    [commit, openId, releaseItem]
  );

  const removeAll = useCallback(() => {
    for (const item of itemsRef.current.values()) {
      releaseItem(item);
    }
    abortRef.current?.abort();
    abortRef.current = null;
    runId.current += 1;
    setRunning(false);
    commit(new Map());
    setOpenId(null);
    setSkipped(0);
  }, [commit, releaseItem]);

  const clear = useCallback(() => {
    for (const item of itemsRef.current.values()) {
      releaseItem(item);
    }
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
  }, [commit, releaseItem]);

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
      const item = itemsRef.current.get(id);
      if (item === undefined) {
        return null;
      }
      const controller = new AbortController();
      try {
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
      for (const item of itemsRef.current.values()) {
        if (item.facts !== null) {
          engineRef.current?.releaseSource(item.facts.sourceId);
        }
      }
    },
    []
  );

  return {
    addFiles,
    announcement,
    applyOperation,
    batch,
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
    open: setOpenId,
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
