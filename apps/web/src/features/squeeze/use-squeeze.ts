import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { makeZip } from "client-zip";
import { Effect, Option } from "effect";
import type { Atom } from "effect/reactivity";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { appRuntime } from "@/core/runtime/client";
import type {
  BatchItem,
  ItemResult,
  SqueezeSettings,
} from "@/features/squeeze/squeeze";
import {
  formatOf,
  MIME_TYPE,
  outputBytesOf,
  settingsKeyOf,
  summarize,
  uniqueNames,
} from "@/features/squeeze/squeeze";
import {
  batchAtom,
  resultsAtom,
  runningAtom,
  settingsAtom,
} from "@/features/squeeze/squeeze.atoms";
import type { QueuedImage } from "@/features/squeeze/squeeze.service";
import { runBatch, SqueezeClient } from "@/features/squeeze/squeeze.service";

interface RunRequest {
  readonly images: readonly QueuedImage[];
  readonly settings: SqueezeSettings;
}

/**
 * Runs a Batch. It is an atom rather than a component callback so the Effect
 * runtime owns the work, and so every result lands in `resultsAtom` as it
 * arrives.
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
      runBatch(client, request.images, request.settings, report)
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

/** The name one image's output downloads under: the name it came in with. */
const outputName = (item: BatchItem): string => item.name;

/** The type of one image's output. An image Squeeze cannot read keeps its own. */
const mimeOf = (item: BatchItem): string => {
  const format = Option.getOrNull(item.format);
  return format === null ? "application/octet-stream" : MIME_TYPE[format];
};

/**
 * A Squeeze page: the Batch, its settings, and the run that drives them.
 *
 * The images that still need work are derived, not commanded, so a new drop and
 * a changed Target both start the work they imply.
 */
export const useSqueeze = () => {
  const batch = useAtomValue(batchAtom);
  const results = useAtomValue(resultsAtom);
  const running = useAtomValue(runningAtom);
  const settings = useAtomValue(settingsAtom);
  // Derived here rather than in an atom: a fresh object on every read breaks
  // `useSyncExternalStore`, which wants a cached snapshot.
  const summary = useMemo(() => summarize(batch, results), [batch, results]);

  const setBatch = useAtomSet(batchAtom);
  const setResults = useAtomSet(resultsAtom);
  const setSettings = useAtomSet(settingsAtom);
  const run = useAtomSet(runBatchAtom, { mode: "promise" });

  const inFlight = useRef(false);
  const [, settle] = useReducer((count: number) => count + 1, 0);

  const add = useCallback(
    (files: readonly File[]) => {
      setBatch((current) => {
        const next = new Map(current);
        for (const file of files) {
          const id = crypto.randomUUID();
          next.set(id, {
            format: formatOf(file),
            id,
            name: file.name,
            size: file.size,
            source: file,
            targetBytes: null,
          });
        }
        return next;
      });
    },
    [setBatch]
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

  const clear = useCallback(() => {
    setBatch(new Map());
    setResults(new Map());
  }, [setBatch, setResults]);

  const setTarget = useCallback(
    (id: string, targetBytes: number | null) => {
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
    [setBatch]
  );

  /** The images with no result yet, or with a result the settings outgrew. */
  const pending = useMemo(() => {
    const queued: QueuedImage[] = [];
    for (const [id, item] of batch) {
      const result = results.get(id);
      const targetBytes = item.targetBytes ?? settings.targetBytes;
      if (
        result === undefined ||
        result.key !== settingsKeyOf(settings, targetBytes)
      ) {
        queued.push({ id, item });
      }
    }
    return queued;
  }, [batch, results, settings]);

  useEffect(() => {
    if (inFlight.current || pending.length === 0) {
      return;
    }
    inFlight.current = true;
    // A React effect cannot be async, so the run is wrapped and awaited here.
    const runPending = async () => {
      try {
        await run({ images: pending, settings });
      } catch {
        // A row that fails is a row state, so a rejected run adds nothing.
      }
      inFlight.current = false;
      settle();
    };
    void runPending();
  }, [pending, run, settings]);

  const downloadOne = useCallback(
    (id: string) => {
      const item = batch.get(id);
      if (item === undefined) {
        return;
      }
      const bytes = outputBytesOf(item, results.get(id));
      const blob =
        bytes === null
          ? item.source
          : new Blob([bytes], { type: mimeOf(item) });
      download(blob, outputName(item));
    },
    [batch, results]
  );

  const downloadAll = useCallback(async () => {
    const entries = [...batch.entries()].flatMap(([id, item]) => {
      const bytes = outputBytesOf(item, results.get(id));
      if (bytes === null) {
        return [];
      }
      return [
        {
          input: new Blob([bytes], { type: mimeOf(item) }),
          name: outputName(item),
        },
      ];
    });
    if (entries.length === 0) {
      return;
    }
    const names = uniqueNames(entries.map((entry) => entry.name));
    const stream = makeZip(
      entries.map((entry, index) => ({
        input: entry.input,
        name: names[index] ?? entry.name,
      }))
    );
    const zip = await new Response(stream).blob();
    download(zip, `squeeze-${new Date().toISOString().slice(0, 10)}.zip`);
  }, [batch, results]);

  return {
    add,
    batch,
    clear,
    downloadAll,
    downloadOne,
    pending,
    remove,
    results,
    run,
    running,
    setSettings,
    setTarget,
    settings,
    summary,
  };
};
