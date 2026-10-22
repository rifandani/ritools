import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { makeZip } from "client-zip";
import { Effect, Option } from "effect";
import { Atom } from "effect/reactivity";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { appRuntime } from "@/core/runtime/client";
import type {
  BatchItem,
  DroppedFile,
  ImageFormat,
  ItemResult,
  SqueezeSettings,
} from "@/features/squeeze/squeeze";
import {
  batchItemOf,
  batchShare,
  clampFileName,
  classifyWatchFailure,
  dedupeIncoming,
  isOfflineRejection,
  isStale,
  isWatchPermissionError,
  keepFormatOf,
  landResult,
  MIME_TYPE,
  outputFilesOf,
  safeZipSegments,
  settingsIssues,
  summarize,
  watchFolderSupported,
  zipPlanOf,
} from "@/features/squeeze/squeeze";
import {
  batchAtom,
  resultsAtom,
  runningAtom,
  settingsAtom,
  workingAtom,
} from "@/features/squeeze/squeeze.atoms";
import type { CompressTask } from "@/features/squeeze/squeeze.service";
import {
  runBatch,
  runBatchTotal,
  SqueezeClient,
} from "@/features/squeeze/squeeze.service";

/** The Batch images one run covers: the rows without a result, or stale. */
interface RunRequest {
  readonly images: readonly { readonly id: string; readonly item: BatchItem }[];
  readonly settings: SqueezeSettings;
}

/**
 * Runs a Batch. It is an atom rather than a component callback so the Effect
 * runtime owns the work, and so every result lands in `resultsAtom` as it
 * arrives. A Batch total owns its two passes; every other mode is one pass.
 */
const runBatchAtom = appRuntime.fn(
  Effect.fn("Squeeze.run")(function* (
    request: RunRequest,
    get: Atom.FnContext
  ) {
    const report = (result: ItemResult): Effect.Effect<void> =>
      Effect.sync(() => {
        // A row the user cleared or removed takes no result: the run must not
        // put bytes back for a row that is no longer in the Batch.
        const next = landResult(get(batchAtom), get(resultsAtom), result);
        if (next !== get(resultsAtom)) {
          get.set(resultsAtom, next);
        }
      });

    const markWorking = (id: string, working: boolean): Effect.Effect<void> =>
      Effect.sync(() => {
        const next = new Set<string>(get(workingAtom));
        if (working) {
          next.add(id);
        } else {
          next.delete(id);
        }
        get.set(workingAtom, next);
      });

    get.set(runningAtom, true);
    yield* SqueezeClient.use((client) =>
      request.settings.sizeMode === "batch-total"
        ? runBatchTotal(
            client,
            request.images,
            request.settings,
            report,
            markWorking
          )
        : runBatch(
            client,
            request.images.map((image): CompressTask => {
              const target =
                request.settings.sizeMode === "per-image"
                  ? (image.item.targetBytes ?? request.settings.targetBytes)
                  : null;
              return {
                id: image.id,
                item: image.item,
                keyTargetBytes: target,
                raised: false,
                targetBytes: target,
              };
            }),
            request.settings,
            report,
            markWorking
          )
    ).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          get.set(runningAtom, false);
          get.set(workingAtom, new Set<string>());
        })
      )
    );
  })
);

const download = (blob: Blob, name: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = name;
  link.href = url;
  // A detached link and an immediate revoke cancel the download in some
  // browsers. Keep the link in the document until the browser has read it.
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
};

/** The stem of a file name: everything before the last dot. */
const stemOf = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? name : name.slice(0, dot);
};

const extensionOf = (format: ImageFormat): string =>
  format === "jpeg" ? "jpg" : format;

/** The longest download name a browser and a file system accept. */
const MAX_DOWNLOAD_NAME = 100;

/**
 * The name one output downloads under. A long source name keeps its extension
 * and loses its tail: a file system rejects the name over its cap, and the
 * format is what the reader needs.
 */
const outputName = (item: BatchItem, format: ImageFormat): string => {
  const stem = safeZipSegments(stemOf(item.name)).at(-1) ?? "image";
  return `${clampFileName(stem, MAX_DOWNLOAD_NAME - 5)}.${extensionOf(format)}`;
};

/** The browser's connection flag, read after hydration and on every change. */
const useOnline = (): boolean => {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
};

/** A file the codec wrote, as a Blob. */
const blobOf = (bytes: ArrayBuffer, format: ImageFormat): Blob =>
  new Blob([bytes], { type: MIME_TYPE[format] });

/** What the user sees about the last drop, or the watcher. */
interface SqueezeStatus {
  readonly duplicates: number;
  readonly skipped: number;
  /** Files the watcher has added since the page opened. */
  readonly watched: number;
  readonly watchDenied: boolean;
  readonly watchRevoked: boolean;
  readonly watchUnsupported: boolean;
}

const EMPTY_STATUS: SqueezeStatus = {
  duplicates: 0,
  skipped: 0,
  watchDenied: false,
  watchRevoked: false,
  watched: 0,
  watchUnsupported: false,
};

/** The Chromium directory picker, which the DOM lib does not declare. */
interface DirectoryPicker {
  readonly showDirectoryPicker?: (options?: {
    readonly mode?: "read" | "readwrite";
  }) => Promise<WatchedDirectory>;
}

interface WatchedDirectory {
  readonly entries: () => AsyncIterableIterator<[string, WatchedHandle]>;
  readonly name: string;
}

interface WatchedHandle {
  readonly kind: "file" | "directory";
  readonly name: string;
  readonly getFile?: () => Promise<File>;
  readonly entries?: () => AsyncIterableIterator<[string, WatchedHandle]>;
}

const readWatchedFile = async (
  handle: WatchedHandle,
  path: string
): Promise<DroppedFile | null> => {
  if (handle.kind !== "file" || handle.getFile === undefined) {
    return null;
  }
  try {
    const file = await handle.getFile();
    return { file, folderPath: path };
  } catch (error) {
    // A file that left the folder is not a new file. A revoked permission is,
    // and it stops the whole watcher.
    if (isWatchPermissionError(error)) {
      throw error;
    }
    return null;
  }
};

const walkWatchedDirectory = async (
  handle: WatchedHandle,
  path: string,
  walk: (
    entries: AsyncIterableIterator<[string, WatchedHandle]>,
    path: string
  ) => Promise<void>
): Promise<void> => {
  if (handle.kind !== "directory" || handle.entries === undefined) {
    return;
  }
  try {
    await walk(handle.entries(), `${path}/${handle.name}`);
  } catch (error) {
    if (isWatchPermissionError(error)) {
      throw error;
    }
  }
};

/** Every file under one watched directory, with the root's name first. */
const collectWatched = async (
  directory: WatchedDirectory
): Promise<readonly DroppedFile[]> => {
  const files: DroppedFile[] = [];
  const walk = async (
    entries: AsyncIterableIterator<[string, WatchedHandle]>,
    path: string
  ): Promise<void> => {
    for await (const [, handle] of entries) {
      const file = await readWatchedFile(handle, path);
      if (file !== null) {
        files.push(file);
        continue;
      }
      await walkWatchedDirectory(handle, path, walk);
    }
  };
  await walk(directory.entries(), directory.name);
  return files;
};

/** A row that still needs work: no result, a stale one, or an offline retry. */
const needsWork = (
  result: ItemResult | undefined,
  settings: SqueezeSettings,
  target: number | null,
  online: boolean
): boolean =>
  result === undefined ||
  isStale(result, settings, target) ||
  (online && isOfflineRejection(result));

interface IncomingItems {
  readonly items: BatchItem[];
  readonly skipped: number;
}

interface BatchQuery {
  readonly batch: ReadonlyMap<string, BatchItem>;
  readonly results: ReadonlyMap<string, ItemResult>;
  readonly settings: SqueezeSettings;
  readonly targetOf: (item: BatchItem) => number | null;
}

/** The rows **Compress all** would pick up, in Batch order. */
const pendingRowsOf = (options: BatchQuery & { readonly online: boolean }) => {
  const queued: { id: string; item: BatchItem }[] = [];
  for (const [id, item] of options.batch) {
    const target = options.targetOf(item);
    const needs = needsWork(
      options.results.get(id),
      options.settings,
      target,
      options.online
    );
    if (needs) {
      queued.push({ id, item });
    }
  }
  return queued;
};

/** The rows whose result was made under other settings. */
const staleIdsOf = (options: BatchQuery): Set<string> => {
  const stale = new Set<string>();
  for (const [id, result] of options.results) {
    const item = options.batch.get(id);
    if (
      item !== undefined &&
      isStale(result, options.settings, options.targetOf(item))
    ) {
      stale.add(id);
    }
  }
  return stale;
};

/** The Batch Items a drop creates, plus the folder-only non-images it skips. */
const incomingItemsOf = (dropped: readonly DroppedFile[]): IncomingItems => {
  const items: BatchItem[] = [];
  let skipped = 0;
  for (const entry of dropped) {
    const item = batchItemOf(entry, crypto.randomUUID());
    // Inside a folder, a non-image is not a row: it is a skipped file.
    if (entry.folderPath !== null && Option.isNone(item.format)) {
      skipped += 1;
      continue;
    }
    items.push(item);
  }
  return { items, skipped };
};

const withItems = (
  current: ReadonlyMap<string, BatchItem>,
  items: readonly BatchItem[]
): Map<string, BatchItem> => {
  const next = new Map(current);
  for (const item of items) {
    next.set(item.id, item);
  }
  return next;
};

/** A folder turns the ZIP mirror on; a loose drop never turns it off. */
const turnsFoldersOn = (
  items: readonly BatchItem[],
  settings: SqueezeSettings
): boolean =>
  items.some((item) => item.folderPath !== null) && !settings.preserveFolders;

/**
 * A Squeeze page: the Batch, its settings, and the run that drives them.
 *
 * Nothing starts on a drop or a settings change. **Compress all** is the only
 * thing that starts work, and it picks up every row without a result or with a
 * stale one under the current settings.
 */
/** The Target the settings resolve to for one row. */
const keyTargetOf = (
  item: BatchItem,
  settings: SqueezeSettings,
  batchSize: number
): number | null => {
  if (settings.sizeMode === "fixed-quality") {
    return null;
  }
  if (settings.sizeMode === "batch-total") {
    return batchShare(settings.batchTotalBytes, batchSize);
  }
  return item.targetBytes ?? settings.targetBytes;
};

const useSqueezeValues = () => {
  const batch = useAtomValue(batchAtom);
  const results = useAtomValue(resultsAtom);
  const running = useAtomValue(runningAtom);
  const settings = useAtomValue(settingsAtom);
  const working = useAtomValue(workingAtom);
  const online = useOnline();
  return { batch, online, results, running, settings, working };
};

const useSqueezeSetters = () => {
  const setBatch = useAtomSet(batchAtom);
  const setResults = useAtomSet(resultsAtom);
  const setSettings = useAtomSet(settingsAtom);
  const setWorking = useAtomSet(workingAtom);
  const run = useAtomSet(runBatchAtom, { mode: "promise" });
  const interrupt = useAtomSet(runBatchAtom);
  return { interrupt, run, setBatch, setResults, setSettings, setWorking };
};

type SqueezeValues = ReturnType<typeof useSqueezeValues>;
type SqueezeSetters = ReturnType<typeof useSqueezeSetters>;
type SqueezeLocalState = ReturnType<typeof useSqueezeLocalState>;
type SqueezeDerived = ReturnType<typeof useSqueezeDerived>;

const useSqueezeDerived = (values: SqueezeValues) => {
  const summary = useMemo(
    () => summarize(values.batch, values.results),
    [values.batch, values.results]
  );
  const targetOf = useCallback(
    (item: BatchItem) => keyTargetOf(item, values.settings, values.batch.size),
    [values.batch.size, values.settings]
  );
  const pending = useMemo(
    () =>
      pendingRowsOf({
        batch: values.batch,
        online: values.online,
        results: values.results,
        settings: values.settings,
        targetOf,
      }),
    [targetOf, values.batch, values.online, values.results, values.settings]
  );
  const staleIds = useMemo(
    () =>
      staleIdsOf({
        batch: values.batch,
        results: values.results,
        settings: values.settings,
        targetOf,
      }),
    [targetOf, values.batch, values.results, values.settings]
  );
  const issues = settingsIssues(values.settings, values.batch.size);
  const canRun =
    values.batch.size > 0 &&
    pending.length > 0 &&
    issues.length === 0 &&
    !values.running;
  return { canRun, issues, pending, staleIds, summary, targetOf };
};

const useSqueezeLocalState = () => {
  const [status, setStatus] = useState<SqueezeStatus>(EMPTY_STATUS);
  const [watching, setWatching] = useState(false);
  return { setStatus, setWatching, status, watching };
};

const useSqueezeBatchHandlers = (options: {
  readonly setters: SqueezeSetters;
  readonly state: SqueezeLocalState;
  readonly values: SqueezeValues;
}) => {
  const { setters, state, values } = options;

  const addDropped = useCallback(
    (dropped: readonly DroppedFile[]) => {
      const { items, skipped } = incomingItemsOf(dropped);
      const { accepted, duplicates } = dedupeIncoming(values.batch, items);
      state.setStatus((current) => ({
        ...current,
        duplicates,
        skipped,
      }));
      if (accepted.length === 0) {
        return;
      }
      setters.setBatch((current) => withItems(current, accepted));
      // A folder turns the ZIP mirror on, which is the default the brief asks
      // for; a loose drop never turns it off.
      if (turnsFoldersOn(accepted, values.settings)) {
        setters.setSettings({ ...values.settings, preserveFolders: true });
      }
    },
    [setters, state, values.batch, values.settings]
  );

  const remove = useCallback(
    (id: string) => {
      setters.setBatch((current) => {
        const next = new Map(current);
        next.delete(id);
        return next;
      });
      setters.setResults((current) => {
        const next = new Map(current);
        next.delete(id);
        return next;
      });
    },
    [setters]
  );

  const clear = useCallback(() => {
    if (values.running) {
      setters.interrupt(Atom.Interrupt);
    }
    setters.setBatch(new Map());
    setters.setResults(new Map());
    setters.setWorking(new Set<string>());
    state.setStatus(EMPTY_STATUS);
  }, [setters, state, values.running]);

  return { addDropped, clear, remove };
};

const useSqueezeRunHandlers = (options: {
  readonly derived: SqueezeDerived;
  readonly setters: SqueezeSetters;
  readonly values: SqueezeValues;
}) => {
  const { derived, setters, values } = options;

  /** Runs a request without letting a rejected run escape the handler. */
  const requestRun = useCallback(
    async (
      images: readonly { readonly id: string; readonly item: BatchItem }[]
    ) => {
      try {
        await setters.run({ images, settings: values.settings });
      } catch {
        // A row that fails is a row state, so a rejected run adds nothing.
      }
    },
    [setters, values.settings]
  );

  const start = useCallback(() => {
    if (!derived.canRun) {
      return;
    }
    void requestRun(derived.pending);
  }, [derived.canRun, derived.pending, requestRun]);

  const stop = useCallback(() => {
    setters.interrupt(Atom.Interrupt);
  }, [setters]);

  /**
   * Re-runs one row. A Batch total cannot re-run one row alone: the budget is
   * split across the whole Batch, so the whole Batch runs again.
   */
  const recompress = useCallback(
    (id: string) => {
      if (values.running) {
        return;
      }
      const item = values.batch.get(id);
      if (item === undefined) {
        return;
      }
      const images =
        values.settings.sizeMode === "batch-total"
          ? [...values.batch.entries()].map(([imageId, image]) => ({
              id: imageId,
              item: image,
            }))
          : [{ id, item }];
      void requestRun(images);
    },
    [requestRun, values.batch, values.running, values.settings.sizeMode]
  );

  return { recompress, requestRun, start, stop };
};

const useSqueezeDownloads = (options: {
  readonly derived: SqueezeDerived;
  readonly values: SqueezeValues;
}) => {
  const { derived, values } = options;
  const { batch, results, settings } = values;

  const downloadOne = useCallback(
    (id: string) => {
      const item = batch.get(id);
      const result = results.get(id);
      if (item === undefined || result === undefined) {
        return;
      }
      const { outcome } = result;
      if (outcome.kind === "rejected") {
        return;
      }
      if (outcome.kind === "already-fits") {
        const format = Option.getOrNull(item.format);
        if (format !== null) {
          download(item.source, outputName(item, keepFormatOf(format)));
        }
        return;
      }
      const files = outputFilesOf(result);
      if (files.length === 0) {
        return;
      }
      if (files.length === 1) {
        const [file] = files;
        if (file !== undefined) {
          download(
            blobOf(file.bytes, file.format),
            outputName(item, file.format)
          );
        }
        return;
      }
      // A Multi row's main Download is a small ZIP of its three files.
      const stream = makeZip(
        files.map((file) => ({
          input: blobOf(file.bytes, file.format),
          name: outputName(item, file.format),
        }))
      );
      void (async () => {
        try {
          const zip = await new Response(stream).blob();
          download(zip, `${stemOf(item.name)}.zip`);
        } catch {
          // A ZIP that cannot be built leaves the Batch untouched.
        }
      })();
    },
    [batch, results]
  );

  const downloadPart = useCallback(
    (id: string, format: ImageFormat) => {
      const item = batch.get(id);
      const result = results.get(id);
      if (item === undefined || result === undefined) {
        return;
      }
      const file = outputFilesOf(result).find(
        (entry) => entry.format === format
      );
      if (file !== undefined) {
        download(blobOf(file.bytes, format), outputName(item, format));
      }
    },
    [batch, results]
  );

  /** What a ZIP download did: how many rows it left out, and whether it failed. */
  const downloadAll = useCallback(async (): Promise<{
    readonly failed: boolean;
    readonly leftOut: number;
  }> => {
    const entries = zipPlanOf([...batch.values()], results, {
      preserveFolders: settings.preserveFolders,
    });
    if (entries.length === 0) {
      return { failed: false, leftOut: derived.summary.rejected };
    }
    try {
      const stream = makeZip(
        entries.map((entry) => ({
          input:
            entry.input instanceof Blob
              ? entry.input
              : new Blob([entry.input], { type: MIME_TYPE[entry.format] }),
          name: entry.name,
        }))
      );
      const zip = await new Response(stream).blob();
      download(zip, `squeeze-${new Date().toISOString().slice(0, 10)}.zip`);
      return { failed: false, leftOut: derived.summary.rejected };
    } catch {
      // A ZIP that cannot be built leaves the Batch untouched, and the status
      // line says so instead of failing silently.
      return { failed: true, leftOut: derived.summary.rejected };
    }
  }, [batch, derived.summary.rejected, results, settings.preserveFolders]);

  return { downloadAll, downloadOne, downloadPart };
};

const useSqueezeWatch = (options: {
  readonly addDropped: (dropped: readonly DroppedFile[]) => void;
  readonly state: SqueezeLocalState;
  readonly values: SqueezeValues;
}) => {
  const { addDropped, state, values } = options;
  const { setStatus, setWatching } = state;
  const stopWatch = useRef<null | (() => void)>(null);

  // SAFETY: `showDirectoryPicker` is Chromium-only and absent elsewhere; the
  // feature check below reads it as optional, which is all this code needs.
  const browser = globalThis as DirectoryPicker;
  const { showDirectoryPicker: picker } = browser;
  const watchSupported = watchFolderSupported(browser);

  const startWatch = useCallback(async () => {
    if (!watchSupported || picker === undefined) {
      return;
    }
    setStatus((current) => ({
      ...current,
      watchDenied: false,
      watchRevoked: false,
    }));
    try {
      const root = await picker({ mode: "read" });
      const known = new Set(
        [...values.batch.values()].map(
          (item) => `${item.name}:${item.size}:${item.lastModified}`
        )
      );
      const poll = async () => {
        const files = await collectWatched(root);
        const fresh = files.filter((entry) => {
          const fingerprint = `${entry.file.name}:${entry.file.size}:${entry.file.lastModified}`;
          if (known.has(fingerprint)) {
            return false;
          }
          known.add(fingerprint);
          return true;
        });
        if (fresh.length > 0) {
          addDropped(fresh);
          setStatus((current) => ({
            ...current,
            watched: current.watched + fresh.length,
          }));
        }
      };

      // A permission that is revoked after the pick stops the watcher: it must
      // not keep an unhandled rejection or claim to be on.
      /* oxlint-disable anti-slop/no-unknown-parameters -- a directory poll throws an untyped DOM error */
      const stopWithFailure = (error: unknown) => {
        stopWatch.current?.();
        stopWatch.current = null;
        setWatching(false);
        if (classifyWatchFailure(error) !== "cancelled") {
          setStatus((current) => ({ ...current, watchRevoked: true }));
        }
      };
      /* oxlint-enable anti-slop/no-unknown-parameters */

      try {
        await poll();
      } catch (error) {
        stopWithFailure(error);
        return;
      }

      // The handle is stored and cleared by `stopWatching` and by the unmount
      // effect, so the watcher never outlives the page.
      // oxlint-disable-next-line react-doctor/effect-needs-cleanup
      const timer = setInterval(() => {
        void (async () => {
          try {
            await poll();
          } catch (error) {
            stopWithFailure(error);
          }
        })();
      }, 2000);
      stopWatch.current = () => {
        clearInterval(timer);
        setWatching(false);
      };
      setWatching(true);
    } catch (error) {
      // A dismissed picker returns to idle with no message. A denied one says
      // so once and never prompts again by itself.
      if (classifyWatchFailure(error) === "denied") {
        setStatus((current) => ({ ...current, watchDenied: true }));
      }
    }
  }, [
    addDropped,
    picker,
    setStatus,
    setWatching,
    stopWatch,
    values.batch,
    watchSupported,
  ]);

  const stopWatching = useCallback(() => {
    stopWatch.current?.();
    stopWatch.current = null;
  }, [stopWatch]);

  // A watcher must not outlive the page that started it.
  useEffect(
    () => () => {
      stopWatch.current?.();
      stopWatch.current = null;
    },
    [stopWatch]
  );

  return { startWatch: watchSupported ? startWatch : null, stopWatching };
};

/**
 * A Squeeze page: the Batch, its settings, and the run that drives them.
 *
 * Nothing starts on a drop or a settings change. **Compress all** is the only
 * thing that starts work, and it picks up every row without a result or with a
 * stale one under the current settings.
 */
export const useSqueeze = () => {
  const values = useSqueezeValues();
  const setters = useSqueezeSetters();
  const derived = useSqueezeDerived(values);
  const state = useSqueezeLocalState();
  const handlers = useSqueezeBatchHandlers({ setters, state, values });
  const run = useSqueezeRunHandlers({ derived, setters, values });
  const downloads = useSqueezeDownloads({ derived, values });
  const watch = useSqueezeWatch({
    addDropped: handlers.addDropped,
    state,
    values,
  });

  return {
    add: handlers.addDropped,
    batch: values.batch,
    canRun: derived.canRun,
    clear: handlers.clear,
    downloadAll: downloads.downloadAll,
    downloadOne: downloads.downloadOne,
    downloadPart: downloads.downloadPart,
    issues: derived.issues,
    online: values.online,
    pending: derived.pending,
    recompress: run.recompress,
    remove: handlers.remove,
    results: values.results,
    run: run.start,
    running: values.running,
    setSettings: setters.setSettings,
    settings: values.settings,
    staleIds: derived.staleIds,
    startWatch: watch.startWatch,
    status: state.status,
    stop: run.stop,
    stopWatching: watch.stopWatching,
    summary: derived.summary,
    watching: state.watching,
    working: values.working,
  };
};
