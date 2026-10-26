import { Effect, Schema } from "effect";

import * as T from "./tabular";
import { TabularController } from "./tabular.controller";
import type { FormatPort } from "./tabular.controller";
import type { FailureContext, WriteJob } from "./tabular.format";
import type { FormatRequest, PackedFile } from "./tabular.format-protocol";
import { FormatReply, unpackFile } from "./tabular.format-protocol";
/* oxlint-disable unicorn/require-post-message-target-origin, promise/prefer-await-to-then, promise/avoid-new -- Dedicated Worker messages and Effect combinators use their own APIs. */
/// <reference lib="webworker" />
// oxlint-disable-next-line import/default -- Vite generates the default URL export for this Worker query.
import formatWorkerUrl from "./tabular.format.worker?worker&url";
import { Request, operations } from "./tabular.protocol";

declare const self: DedicatedWorkerGlobalScope;

const job = async (
  request: typeof FormatRequest.Type,
  signal: AbortSignal
): Promise<PackedFile | Uint8Array> => {
  try {
    const response = await fetch(formatWorkerUrl, {
      cache: "force-cache",
      signal,
    });
    if (!response.ok) {
      throw new Error("Engine asset unavailable");
    }
  } catch {
    if (signal.aborted) {
      throw new T.Cancelled({
        ...request.ctx,
        phase: request._tag === "Parse" ? "reading" : "writing",
      });
    }
    throw new T.EngineOffline({
      ...request.ctx,
      asset: "tabular-format-worker",
    });
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(formatWorkerUrl, {
      type: "module",
      name: "tabular-format",
    });
    const cleanup = {
      cancel: () => {
        /* Assigned before a listener is installed. */
      },
    };
    const finish = () => {
      worker.terminate();
      signal.removeEventListener("abort", cleanup.cancel);
    };
    const cancel = () => {
      finish();
      reject(
        new T.Cancelled({
          ...request.ctx,
          phase: request._tag === "Parse" ? "reading" : "writing",
        })
      );
    };
    if (signal.aborted) {
      cancel();
      return;
    }
    cleanup.cancel = cancel;
    signal.addEventListener("abort", cancel, { once: true });
    worker.addEventListener("error", () => {
      finish();
      reject(
        self.navigator.onLine === false
          ? new T.EngineOffline({
              ...request.ctx,
              asset: "tabular-format-worker",
            })
          : new T.EngineFailed({
              ...request.ctx,
              phase: request._tag === "Parse" ? "reading" : "writing",
            })
      );
    });
    worker.addEventListener("message", (event: MessageEvent<unknown>) => {
      finish();
      const decoded = Schema.decodeUnknownExit(FormatReply)(event.data);
      if (decoded._tag === "Failure") {
        reject(new T.EngineFailed({ ...request.ctx, phase: "reading" }));
        return;
      }
      if (decoded.value._tag === "Failure") {
        reject(decoded.value.payload);
      } else {
        resolve(decoded.value.payload);
      }
    });
    // A source copy is confined to this job; the accepted source remains retained.
    worker.postMessage(request);
  });
};
const format: FormatPort = {
  parse: async (
    source: T.Source,
    options: T.ParseOptions,
    ctx: FailureContext,
    signal: AbortSignal
  ) => {
    const result = await job({ _tag: "Parse", source, options, ctx }, signal);
    if (result instanceof Uint8Array) {
      throw new T.EngineFailed({ ...ctx, phase: "reading" });
    }
    return unpackFile(result, source);
  },
  write: async (output: WriteJob, ctx: FailureContext, signal: AbortSignal) =>
    Schema.decodeUnknownSync(Schema.Uint8Array)(
      await job({ _tag: "Write", job: output, ctx }, signal)
    ),
};
const controller = new TabularController(
  format,
  () =>
    new Promise((resolve) => {
      setTimeout(resolve, 0);
    }),
  (progress) =>
    self.postMessage({
      version: 1,
      requestId: progress.requestId,
      _tag: "Progress",
      payload: progress,
    })
);
self.addEventListener("message", (event: MessageEvent<unknown>) => {
  // Dedicated Workers receive messages only from their creator, so the check
  // is a guard for browsers that report an empty origin instead of the
  // document origin.
  if (event.origin && event.origin !== self.location.origin) {
    return;
  }
  Effect.runFork(
    Effect.gen(function* () {
      const request = yield* Schema.decodeUnknownEffect(Request)(event.data);
      yield* controller.run(request).pipe(
        Effect.match({
          onFailure: (error) =>
            self.postMessage({
              version: 1,
              requestId: request.requestId,
              _tag: "Failure",
              payload: Schema.encodeSync(T.EngineError)(error),
            }),
          onSuccess: (payload) => {
            const bytes = Schema.is(T.ExportBytes)(payload)
              ? payload.bytes
              : null;
            self.postMessage(
              {
                version: 1,
                requestId: request.requestId,
                _tag: "Success",
                payload: Schema.encodeUnknownSync(
                  operations[request.operation].output
                )(payload),
              },
              bytes ? [bytes.buffer] : []
            );
          },
        })
      );
    }).pipe(Effect.catch(() => Effect.void))
  );
});
