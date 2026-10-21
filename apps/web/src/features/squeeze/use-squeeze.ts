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
  dedupeIncoming,
  isStale,
  keepFormatOf,
  MIME_TYPE,
  outputFilesOf,
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
        get.set(resultsAtom, new Map(get(resultsAtom)).set(result.id, result));
      });

    get.set(runningAtom, true);
    yield* SqueezeClient.use((client) =>
      request.settings.sizeMode === "batch-total"
        ? runBatchTotal(client, request.images, request.settings, report)
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
            report
          )
    ).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          get.set(runningAtom, false);
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
  link.click();
  URL.revokeObjectURL(url);
};

/** The stem of a file name: everything before the last dot. */
const stemOf = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? name : name.slice(0, dot);
};

const extensionOf = (format: ImageFormat): string =>
  format === "jpeg" ? "jpg" : format;

/** The name one output downloads under. */
const outputName = (item: BatchItem, format: ImageFormat): string =>
  `${stemOf(item.name)}.${extensionOf(format)}`;

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
  readonly watchUnsupported: boolean;
}

const EMPTY_STATUS: SqueezeStatus = {
  duplicates: 0,
  skipped: 0,
  watchDenied: false,
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
      if (handle.kind === "file" && handle.getFile !== undefined) {
        const file = await handle.getFile();
        // oxlint-disable-next-line no-await-in-loop -- the iterator is a cursor
        files.push({ file, folderPath: path });
        continue;
      }
      if (handle.kind === "directory" && handle.entries !== undefined) {
        // oxlint-disable-next-line no-await-in-loop -- recursively walking the tree
        await walk(handle.entries(), `${path}/${handle.name}`);
      }
    }
  };
  await walk(directory.entries(), directory.name);
  return files;
};

/**
 * A Squeeze page: the Batch, its settings, and the run that drives them.
 *
 * Nothing starts on a drop or a settings change. **Compress all** is the only
 * thing that starts work, and it picks up every row without a result or with a
 * stale one under the current settings.
 */
export const useSqueeze = () => {
  const batch = useAtomValue(batchAtom);
  const results = useAtomValue(resultsAtom);
  const running = useAtomValue(runningAtom);
  const settings = useAtomValue(settingsAtom);
  const summary = useMemo(() => summarize(batch, results), [batch, results]);

  const setBatch = useAtomSet(batchAtom);
  const setResults = useAtomSet(resultsAtom);
  const setSettings = useAtomSet(settingsAtom);
  const run = useAtomSet(runBatchAtom, { mode: "promise" });
  const interrupt = useAtomSet(runBatchAtom);

  const [status, setStatus] = useState<SqueezeStatus>(EMPTY_STATUS);
  const [watching, setWatching] = useState(false);
  const stopWatch = useRef<null | (() => void)>(null);

  /** The Target the settings resolve to for this row, if any. */
  const keyTargetOf = useCallback(
    (item: BatchItem): number | null => {
      if (settings.sizeMode === "fixed-quality") {
        return null;
      }
      if (settings.sizeMode === "batch-total") {
        return batchShare(settings.batchTotalBytes, batch.size);
      }
      return item.targetBytes ?? settings.targetBytes;
    },
    [batch.size, settings]
  );

  /** The rows that still need work: no result yet, or a stale result. */
  const pending = useMemo(() => {
    const queued: { id: string; item: BatchItem }[] = [];
    for (const [id, item] of batch) {
      const result = results.get(id);
      if (
        result === undefined ||
        isStale(result, settings, keyTargetOf(item))
      ) {
        queued.push({ id, item });
      }
    }
    return queued;
  }, [batch, keyTargetOf, results, settings]);

  const staleIds = useMemo(() => {
    const stale = new Set<string>();
    for (const [id, result] of results) {
      const item = batch.get(id);
      if (item === undefined) {
        continue;
      }
      if (isStale(result, settings, keyTargetOf(item))) {
        stale.add(id);
      }
    }
    return stale;
  }, [batch, keyTargetOf, results, settings]);

  const issues = settingsIssues(settings, batch.size);
  const canRun =
    batch.size > 0 && pending.length > 0 && issues.length === 0 && !running;

  const addDropped = useCallback(
    (dropped: readonly DroppedFile[]) => {
      const incoming: BatchItem[] = [];
      let skipped = 0;
      for (const entry of dropped) {
        const item = batchItemOf(entry, crypto.randomUUID());
        // Inside a folder, a non-image is not a row: it is a skipped file.
        if (entry.folderPath !== null && Option.isNone(item.format)) {
          skipped += 1;
          continue;
        }
        incoming.push(item);
      }

      const { accepted, duplicates } = dedupeIncoming(batch, incoming);
      setStatus((current) => ({
        ...current,
        duplicates,
        skipped,
      }));
      if (accepted.length === 0) {
        return;
      }
      setBatch((current) => {
        const next = new Map(current);
        for (const item of accepted) {
          next.set(item.id, item);
        }
        return next;
      });
      // A folder turns the ZIP mirror on, which is the default the brief asks
      // for; a loose drop never turns it off.
      if (
        accepted.some((item) => item.folderPath !== null) &&
        !settings.preserveFolders
      ) {
        setSettings({ ...settings, preserveFolders: true });
      }
    },
    [batch, setBatch, setSettings, settings]
  );

  const remove = useCallback(
    (id: string) => {
      setBatch((current) => {
        const next = new Map(current);
        next.delete(id);
        return next;
      });
      setResults((current) => {
        const next = new Map(current);
        next.delete(id);
        return next;
      });
    },
    [setBatch, setResults]
  );

  /** Runs a request without letting a rejected run escape the handler. */
  const requestRun = useCallback(
    async (
      images: readonly { readonly id: string; readonly item: BatchItem }[]
    ) => {
      try {
        await run({ images, settings });
      } catch {
        // A row that fails is a row state, so a rejected run adds nothing.
      }
    },
    [run, settings]
  );

  const start = useCallback(() => {
    if (!canRun) {
      return;
    }
    void requestRun(pending);
  }, [canRun, pending, requestRun]);

  const stop = useCallback(() => {
    interrupt(Atom.Interrupt);
  }, [interrupt]);

  /**
   * Re-runs one row. A Batch total cannot re-run one row alone: the budget is
   * split across the whole Batch, so the whole Batch runs again.
   */
  const recompress = useCallback(
    (id: string) => {
      if (running) {
        return;
      }
      const item = batch.get(id);
      if (item === undefined) {
        return;
      }
      const images =
        settings.sizeMode === "batch-total"
          ? [...batch.entries()].map(([imageId, image]) => ({
              id: imageId,
              item: image,
            }))
          : [{ id, item }];
      void requestRun(images);
    },
    [batch, requestRun, running, settings]
  );

  const clear = useCallback(() => {
    if (running) {
      interrupt(Atom.Interrupt);
    }
    setBatch(new Map());
    setResults(new Map());
    setStatus(EMPTY_STATUS);
  }, [interrupt, running, setBatch, setResults]);

  const setTarget = useCallback(
    (id: string, targetBytes: number | null) => {
      if (settings.sizeMode !== "per-image") {
        return;
      }
      setBatch((current) => {
        const item = current.get(id);
        if (item === undefined) {
          return current;
        }
        const next = new Map(current);
        next.set(id, { ...item, targetBytes });
        return next;
      });
    },
    [setBatch, settings.sizeMode]
  );

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

  const downloadAll = useCallback(async (): Promise<number> => {
    const entries = zipPlanOf([...batch.values()], results, {
      preserveFolders: settings.preserveFolders,
    });
    if (entries.length === 0) {
      return summary.rejected;
    }
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
    return summary.rejected;
  }, [batch, results, settings.preserveFolders, summary.rejected]);

  /* ---------------------------------------------------------------------- */
  /* Watch Folder, behind a feature check                                    */
  /* ---------------------------------------------------------------------- */

  // SAFETY: `showDirectoryPicker` is Chromium-only and absent elsewhere; the
  // feature check below reads it as optional, which is all this code needs.
  const browser = globalThis as DirectoryPicker;
  const { showDirectoryPicker: picker } = browser;
  const watchSupported = watchFolderSupported(browser);

  const startWatch = useCallback(async () => {
    if (!watchSupported || picker === undefined) {
      return;
    }
    try {
      const root = await picker({ mode: "read" });
      const known = new Set(
        [...batch.values()].map(
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
      await poll();
      // The handle is stored and cleared by `stopWatching` and by the unmount
      // effect, so the watcher never outlives the page.
      // oxlint-disable-next-line react-doctor/effect-needs-cleanup
      const timer = setInterval(() => {
        void poll();
      }, 2000);
      stopWatch.current = () => {
        clearInterval(timer);
        setWatching(false);
      };
      setWatching(true);
    } catch {
      // A denied permission returns to idle; it never re-prompts.
      setStatus((current) => ({ ...current, watchDenied: true }));
    }
  }, [addDropped, batch, picker, watchSupported]);

  const stopWatching = useCallback(() => {
    stopWatch.current?.();
    stopWatch.current = null;
  }, []);

  // A watcher must not outlive the page that started it.
  useEffect(
    () => () => {
      stopWatch.current?.();
      stopWatch.current = null;
    },
    []
  );

  return {
    add: addDropped,
    batch,
    canRun,
    clear,
    downloadAll,
    downloadOne,
    downloadPart,
    issues,
    pending,
    recompress,
    remove,
    results,
    run: start,
    running,
    setSettings,
    setTarget,
    settings,
    staleIds,
    startWatch: watchSupported ? startWatch : null,
    status,
    stop,
    stopWatching,
    summary,
    watching,
  };
};
