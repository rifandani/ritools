"use client";

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLatest } from "@/core/hooks/use-latest";
import { download } from "@/core/libs/files";
import type { DroppedFile } from "@/core/libs/files";
import { makeZip } from "@/core/libs/lazy-zip";
import { LibraryLoadError } from "@/core/libs/library-load";
import {
  encodeSlots,
  incomingOf,
  isStale,
  OUTPUT_FORMATS,
  outputNameOf,
  runSlots,
  settingsIssues,
  summarize,
} from "@/features/cinch/cinch";
import type {
  BatchItem,
  CinchSettings,
  ItemResult,
  OutputFormat,
} from "@/features/cinch/cinch";
import {
  batchAtom,
  resultsAtom,
  settingsAtom,
  workingAtom,
} from "@/features/cinch/cinch.atoms";
import {
  canWrite,
  CinchError,
  compressVideo,
  hasWebCodecs,
} from "@/features/cinch/cinch.engine";

/** What the user sees about the last drop. */
export interface DropStatus {
  readonly duplicates: number;
  readonly skipped: number;
}

/** Which Output Formats this browser can write, or `null` while it checks. */
export type Writable = Readonly<Record<OutputFormat, boolean>> | null;

/** How a run ended. */
export interface RunOutcome {
  readonly ran: number;
  readonly stopped: boolean;
}

/** What a ZIP download did. */
interface ZipOutcome {
  readonly count: number;
  readonly failed: boolean;
}

/** A row that needs work: no result yet, or a Stale one. */
const needsWork = (
  result: ItemResult | undefined,
  settings: CinchSettings
): boolean => result === undefined || isStale(result, settings);

/** The browser's encoder support, checked once after hydration. */
const useWritable = (
  settings: CinchSettings,
  setSettings: (settings: CinchSettings) => void
) => {
  const [writable, setWritable] = useState<Writable>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const settingsRef = useLatest(settings);

  useEffect(() => {
    let live = true;
    const webCodecs = hasWebCodecs();
    void (async () => {
      const [mp4 = false, webm = false] = await Promise.all(
        OUTPUT_FORMATS.map(canWrite)
      );
      if (!live) {
        return;
      }
      const next = { mp4, webm };
      setWritable(next);
      setSupported(webCodecs && (mp4 || webm));
      // A default the browser cannot write moves to the one it can.
      const { current } = settingsRef;
      const other = current.outputFormat === "mp4" ? "webm" : "mp4";
      if (!next[current.outputFormat] && next[other]) {
        setSettings({ ...current, outputFormat: other });
      }
    })();
    return () => {
      live = false;
    };
  }, [setSettings, settingsRef]);

  return { supported, writable };
};

const blobNameOf = (item: BatchItem, result: ItemResult) => {
  const { outcome } = result;
  if (outcome.kind === "rejected") {
    return null;
  }
  if (outcome.kind === "already-fits") {
    return { blob: item.source, name: item.name };
  }
  return {
    blob: outcome.file.blob,
    name: outputNameOf(item, outcome.file.format),
  };
};

/** Two rows can share a name. A ZIP keeps both, with a number on the second. */
const uniqueNames = <E extends { readonly name: string }>(
  entries: readonly E[]
): E[] => {
  const seen = new Map<string, number>();
  return entries.map((entry) => {
    const count = seen.get(entry.name) ?? 0;
    seen.set(entry.name, count + 1);
    if (count === 0) {
      return entry;
    }
    const dot = entry.name.lastIndexOf(".");
    return {
      ...entry,
      name: `${entry.name.slice(0, dot)}-${count + 1}${entry.name.slice(dot)}`,
    };
  });
};

/**
 * A Cinch page: the Batch, its settings, and the run that drives them.
 *
 * Nothing starts on a drop or a settings change. **Compress all** starts the
 * work, and it picks up every row without a result or with a Stale one.
 */
export const useCinch = () => {
  const batch = useAtomValue(batchAtom);
  const results = useAtomValue(resultsAtom);
  const settings = useAtomValue(settingsAtom);
  const working = useAtomValue(workingAtom);
  const setBatch = useAtomSet(batchAtom);
  const setResults = useAtomSet(resultsAtom);
  const setSettings = useAtomSet(settingsAtom);
  const setWorking = useAtomSet(workingAtom);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<DropStatus>({
    duplicates: 0,
    skipped: 0,
  });
  const [zipFailed, setZipFailed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  /** Stops one in-flight video. Removing that row does not stop the others. */
  const stops = useRef(new Map<string, () => void>());
  const batchRef = useLatest(batch);

  const { supported, writable } = useWritable(settings, setSettings);

  const summary = useMemo(() => summarize(batch, results), [batch, results]);
  const pending = useMemo(
    () =>
      [...batch.values()].filter((item) =>
        needsWork(results.get(item.id), settings)
      ),
    [batch, results, settings]
  );
  const staleIds = useMemo(
    () =>
      new Set(
        [...results.values()].flatMap((result) =>
          batch.has(result.id) && isStale(result, settings) ? [result.id] : []
        )
      ),
    [batch, results, settings]
  );
  const issues = settingsIssues(settings);
  const canRun =
    pending.length > 0 &&
    issues.length === 0 &&
    writable?.[settings.outputFormat] === true &&
    !running;

  // A run must not outlive the page that started it.
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    []
  );

  const add = useCallback(
    (dropped: readonly DroppedFile[]) => {
      const { accepted, duplicates, skipped } = incomingOf(
        batchRef.current,
        dropped,
        () => crypto.randomUUID()
      );
      setStatus({ duplicates, skipped });
      if (accepted.length > 0) {
        setBatch(
          (current) =>
            new Map([
              ...current,
              ...accepted.map((item) => [item.id, item] as const),
            ])
        );
      }
    },
    [batchRef, setBatch]
  );

  /** Runs these rows, several at a time, and resolves when the run ends. */
  const runRows = useCallback(
    async (ids: readonly string[]): Promise<RunOutcome> => {
      if (controller.current !== null) {
        return { ran: 0, stopped: false };
      }
      const abort = new AbortController();
      controller.current = abort;
      setRunning(true);
      setZipFailed(false);
      const settle = () => {
        controller.current = null;
        setRunning(false);
        setWorking(new Map());
      };
      const cores =
        typeof navigator === "undefined" ? 4 : navigator.hardwareConcurrency;
      let ran = 0;
      try {
        ran = await runSlots(
          ids,
          async (id, signal) => {
            const item = batchRef.current.get(id);
            if (signal.aborted || item === undefined) {
              return false;
            }
            try {
              const result = await compressVideo({
                file: item.source,
                id,
                onProgress: (progress) => {
                  setWorking((current) => {
                    // A row that already finished must not re-enter the map.
                    if (
                      !stops.current.has(id) ||
                      current.get(id) === progress
                    ) {
                      return current;
                    }
                    const next = new Map(current);
                    next.set(id, progress);
                    return next;
                  });
                },
                settings,
                signal,
              });
              // A row the user removed, or a row they stopped, takes no result.
              if (batchRef.current.has(id) && !signal.aborted) {
                setResults((current) =>
                  new Map(current).set(result.id, result)
                );
                return true;
              }
              return false;
            } catch (error) {
              const quiet =
                (error instanceof CinchError && error.reason === "cancelled") ||
                error instanceof LibraryLoadError;
              if (quiet) {
                return false;
              }
              abort.abort();
              throw error;
            }
          },
          {
            limit: encodeSlots(cores),
            onFinish: (id) => {
              stops.current.delete(id);
              setWorking((current) => {
                if (!current.has(id)) {
                  return current;
                }
                const next = new Map(current);
                next.delete(id);
                return next;
              });
            },
            onStart: (id, stop) => {
              stops.current.set(id, stop);
              if (!batchRef.current.has(id)) {
                return;
              }
              setWorking((current) => {
                const next = new Map(current);
                next.set(id, 0);
                return next;
              });
            },
            signal: abort.signal,
          }
        );
      } catch (error) {
        settle();
        throw error;
      }
      settle();
      return { ran, stopped: abort.signal.aborted };
    },
    [batchRef, setResults, setWorking, settings]
  );

  const run = useCallback(() => {
    if (canRun) {
      void runRows(pending.map((item) => item.id));
    }
  }, [canRun, pending, runRows]);

  const stop = useCallback(() => {
    controller.current?.abort();
  }, []);

  const remove = useCallback(
    (id: string) => {
      stops.current.get(id)?.();
      setBatch(
        (current) => new Map([...current].filter(([key]) => key !== id))
      );
      setResults(
        (current) => new Map([...current].filter(([key]) => key !== id))
      );
    },
    [setBatch, setResults]
  );

  const clear = useCallback(() => {
    controller.current?.abort();
    setBatch(new Map());
    setResults(new Map());
    setStatus({ duplicates: 0, skipped: 0 });
    setZipFailed(false);
  }, [setBatch, setResults]);

  const downloadOne = useCallback(
    (id: string) => {
      const item = batch.get(id);
      const result = results.get(id);
      const file =
        item === undefined || result === undefined
          ? null
          : blobNameOf(item, result);
      if (file !== null) {
        download(file.blob, file.name);
      }
    },
    [batch, results]
  );

  /** A ZIP of every row that has a file. Rejected rows are left out. */
  const downloadAll = useCallback(async (): Promise<ZipOutcome> => {
    const entries = [...batch.values()].flatMap((item) => {
      const result = results.get(item.id);
      const file = result === undefined ? null : blobNameOf(item, result);
      return file === null ? [] : [{ input: file.blob, name: file.name }];
    });
    if (entries.length === 0) {
      return { count: 0, failed: false };
    }
    const named = uniqueNames(entries);
    try {
      const zip = await new Response(await makeZip(named)).blob();
      download(zip, `cinch-${new Date().toISOString().slice(0, 10)}.zip`);
      setZipFailed(false);
      return { count: named.length, failed: false };
    } catch {
      setZipFailed(true);
      return { count: 0, failed: true };
    }
  }, [batch, results]);

  return {
    add,
    batch,
    canRun,
    clear,
    downloadAll,
    downloadOne,
    issues,
    pending,
    remove,
    results,
    run,
    runRows,
    running,
    setSettings,
    settings,
    staleIds,
    status,
    stop,
    summary,
    supported,
    working,
    writable,
    zipFailed,
  };
};
