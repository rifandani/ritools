import { Effect } from "effect";

import type {
  Backdrop,
  EncodedFile,
  Matte,
  OutputFormat,
  UnmaskError,
} from "@/features/unmask/unmask.schema";
import {
  BATCH_WARN_BYTES,
  DEFAULT_FEATHER,
  DEFAULT_QUALITY,
} from "@/features/unmask/unmask.schema";

/**
 * The Batch.
 *
 * One image at a time. The model stays loaded in the Worker between images.
 * Settings are shared; the Matte edits are per image. A settings change marks
 * the affected Cutouts Stale. A stale row re-composites from its kept Matte; it
 * runs the model again only when the Matte is gone.
 */

export type BatchState =
  | "queued"
  | "running"
  | "ready"
  | "edited"
  | "stale"
  | "failed"
  | "cancelled"
  | "downloaded";

export interface BatchSettings {
  readonly backdrop: Backdrop;
  readonly feather: number;
  readonly format: OutputFormat;
  readonly quality: number;
}

export const DEFAULT_BATCH_SETTINGS: BatchSettings = {
  backdrop: { _tag: "Transparent" },
  feather: DEFAULT_FEATHER,
  format: "webp",
  quality: DEFAULT_QUALITY,
};

export interface BatchRow {
  readonly id: string;
  readonly name: string;
  readonly bytes: number;
  readonly state: BatchState;
  /** The full-resolution Matte once the model or the input alpha produced it. */
  readonly matte: Matte | null;
  readonly result: BatchResult | null;
  readonly error: UnmaskError | null;
}

/** A finished Cutout, kept as a Blob for the ZIP. */
export interface BatchResult {
  readonly blob: Blob;
  readonly file: EncodedFile;
}

/** One row ready to run, and whether it can reuse the Matte it already has. */
export interface BatchStep {
  readonly reuseMatte: boolean;
  readonly row: BatchRow;
}

/** A stable key for the shared settings. */
export const settingsKeyOf = (settings: BatchSettings): string => {
  const backdrop =
    settings.backdrop._tag === "Solid"
      ? `solid:${settings.backdrop.color.r},${settings.backdrop.color.g},${settings.backdrop.color.b}`
      : settings.backdrop._tag === "Blur"
        ? `blur:${settings.backdrop.radius}`
        : "transparent";
  return [backdrop, settings.feather, settings.format, settings.quality].join(
    "|"
  );
};

/** Marks every Cutout that the new settings no longer describe as Stale. */
export const markStale = (rows: readonly BatchRow[]): readonly BatchRow[] =>
  rows.map((row) =>
    row.state === "ready" ||
    row.state === "edited" ||
    row.state === "downloaded"
      ? { ...row, state: "stale" }
      : row
  );

/** The total input size of the Batch. */
export const batchBytesOf = (rows: readonly BatchRow[]): number =>
  rows.reduce((sum, row) => sum + row.bytes, 0);

/** Whether the Batch crosses the named warning size. */
export const overBatchWarning = (rows: readonly BatchRow[]): boolean =>
  batchBytesOf(rows) > BATCH_WARN_BYTES;

/** The rows one run covers, in order. */
export const planBatch = (rows: readonly BatchRow[]): readonly BatchStep[] =>
  rows.flatMap((row) =>
    row.state === "queued" || row.state === "stale"
      ? [{ reuseMatte: row.matte !== null, row }]
      : []
  );

/** Removes a finished row's memory, when the user removes it from the Batch. */
export const forgetMatte = (row: BatchRow): BatchRow => ({
  ...row,
  matte: null,
  result: null,
});

/** What the runner asks of the engine. */
export interface BatchRuntime {
  readonly cut: (
    row: BatchRow,
    options: {
      readonly reuseMatte: boolean;
      readonly settings: BatchSettings;
      readonly signal: AbortSignal;
    }
  ) => Effect.Effect<
    { readonly file: EncodedFile; readonly matte: Matte },
    UnmaskError
  >;
  readonly onChange: (row: BatchRow) => void;
}

/**
 * Runs the queue sequentially.
 *
 * A failed image becomes `failed` and does not stop the Batch. Cancellation
 * interrupts the current image and the queue: the current row returns to the
 * state it had before the run, and every finished row stays. The model is not
 * touched here; the Worker keeps it.
 */
export const runBatch = (
  rows: readonly BatchRow[],
  settings: BatchSettings,
  runtime: BatchRuntime,
  signal?: AbortSignal
): Effect.Effect<void> => {
  const steps = planBatch(rows);
  let running: { readonly previous: BatchRow } | null = null;
  let stopped = signal?.aborted === true;
  const report = (row: BatchRow): void => {
    runtime.onChange(row);
  };
  const runOne = (step: BatchStep): Effect.Effect<void> =>
    Effect.gen(function* () {
      if (stopped) {
        return;
      }
      running = { previous: step.row };
      report({ ...step.row, error: null, state: "running" });
      yield* runtime
        .cut(step.row, {
          reuseMatte: step.reuseMatte,
          settings,
          signal: signal ?? new AbortController().signal,
        })
        .pipe(
          Effect.match({
            onFailure: (error) => {
              running = null;
              if (error._tag === "Cancelled") {
                stopped = true;
                report(step.row);
                return;
              }
              report({ ...step.row, error, state: "failed" });
            },
            onSuccess: (value) => {
              running = null;
              if (signal?.aborted === true) {
                stopped = true;
                report(step.row);
                return;
              }
              const bytes = new Uint8Array(value.file.bytes.length);
              bytes.set(value.file.bytes);
              report({
                ...step.row,
                error: null,
                matte: value.matte,
                result: {
                  blob: new Blob([bytes], {
                    type: value.file.mime,
                  }),
                  file: value.file,
                },
                state: "ready",
              });
            },
          })
        );
    });
  return Effect.forEach(steps, runOne, {
    concurrency: 1,
    discard: true,
  }).pipe(
    Effect.onInterrupt(() =>
      Effect.sync(() => {
        const current = running;
        running = null;
        if (current !== null) {
          report(current.previous);
        }
      })
    )
  );
};
