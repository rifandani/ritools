/* oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, unicorn/require-post-message-target-origin -- Effect combinators and dedicated Worker messages do not use Window origins. */
/// <reference lib="webworker" />
import { Effect, Schema } from "effect";

import * as T from "./tabular";
import { parseFile, writeOutput } from "./tabular.format";
import { FormatRequest, Written, packFile } from "./tabular.format-protocol";
import { loadPdfAssets } from "./tabular.pdf.assets";

declare const self: DedicatedWorkerGlobalScope;
self.addEventListener("message", (event: MessageEvent<unknown>) => {
  // Dedicated Workers receive messages only from their creator, so the check
  // is a guard for browsers that report an empty origin instead of the
  // document origin.
  if (event.origin && event.origin !== self.location.origin) {
    return;
  }
  const task = Effect.gen(function* () {
    const request = yield* Schema.decodeUnknownEffect(FormatRequest)(
      event.data
    );
    const result = yield* Effect.tryPromise({
      try: async () => {
        if (request._tag === "Parse") {
          return packFile(
            parseFile(request.source, request.options, request.ctx)
          );
        }
        if (request.job.format === "pdf") {
          const { writePdf } = await import("./tabular.pdf");
          const assets = await loadPdfAssets(request.ctx, undefined, "writing");
          return writePdf(request.job, assets, request.ctx);
        }
        return { bytes: writeOutput(request.job, request.ctx), pages: 0 };
      },
      catch: (error) =>
        Schema.is(T.EngineError)(error)
          ? error
          : error instanceof RangeError
            ? new T.MemoryLimit({
                ...request.ctx,
                phase: request._tag === "Parse" ? "reading" : "writing",
                estimatedBytes: null,
              })
            : new T.EngineFailed({
                ...request.ctx,
                phase: request._tag === "Parse" ? "reading" : "writing",
              }),
    });
    self.postMessage(
      { _tag: "Success", payload: result },
      Schema.is(Written)(result) ? [result.bytes.buffer] : []
    );
  }).pipe(
    Effect.catch((error) =>
      Effect.sync(() => {
        if (Schema.is(T.EngineError)(error)) {
          self.postMessage({
            _tag: "Failure",
            payload: Schema.encodeSync(T.EngineError)(error),
          });
        }
      })
    )
  );
  Effect.runFork(task);
});
