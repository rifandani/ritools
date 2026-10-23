import { Context, Effect, Layer } from "effect";

import type {
  CleanProgress,
  CleanRequest,
  CleanResult,
  ExposeSource,
  ReadReport,
} from "@/features/expose/expose";
import {
  ExposeEngine,
  ExposeError,
  isMemoryFailure,
} from "@/features/expose/expose";
import type {
  WorkerReply,
  WorkerRequest,
} from "@/features/expose/expose.worker";

/** One Worker port. A test provides a fake; the browser provides the real one. */
export interface ExposeWorkerPort {
  readonly send: (
    request: WorkerRequest,
    transfer: readonly Transferable[]
  ) => void;
  readonly subscribe: (handlers: {
    readonly error: (detail: string) => void;
    readonly message: (reply: WorkerReply) => void;
  }) => void;
  readonly terminate: () => void;
}

/** Creates the browser Worker. The browser layer is the only real factory. */
export class ExposeWorkerFactory extends Context.Service<
  ExposeWorkerFactory,
  { readonly create: () => ExposeWorkerPort }
>()("@ritools/web/ExposeWorkerFactory") {}

const readBytes = (source: Blob): Effect.Effect<ArrayBuffer, ExposeError> =>
  Effect.tryPromise({
    catch: (error) =>
      new ExposeError({
        code: isMemoryFailure(error) ? "too-large" : "unreadable-file",
        detail:
          error instanceof Error ? error.message : "the file could not be read",
      }),
    try: () => source.arrayBuffer(),
  });

const failureOf = (
  reply: Extract<WorkerReply, { kind: "failed" }>
): ExposeError =>
  new ExposeError({
    code: reply.code,
    detail: reply.detail,
    format: reply.format,
    group: reply.group,
  });

/**
 * Send one request to a fresh Worker and wait for its answer.
 *
 * An interrupted request terminates the Worker. The next call starts a fresh
 * Worker, so an interrupted clean can never answer the next clean. The caller
 * renders the interruption as the named `cancelled` state; a Worker that
 * cancels itself asks for the same state with a `cancelled` failure reply.
 * The bytes are transferred, never copied into the main thread twice.
 */
const ask = <Reply extends WorkerReply>(
  factory: { readonly create: () => ExposeWorkerPort },
  request: WorkerRequest,
  transfer: readonly Transferable[],
  onProgress?: (progress: CleanProgress) => void
): Effect.Effect<Reply, ExposeError> =>
  // oxlint-disable-next-line promise/prefer-await-to-callbacks promise/prefer-await-to-then -- Effect.callback is the API for a callback that resolves an Effect
  Effect.callback<Reply, ExposeError>((resume, signal) => {
    const port = factory.create();
    let settled = false;
    const onAbort = () => {
      settled = true;
      port.terminate();
    };
    signal.addEventListener("abort", onAbort);
    port.subscribe({
      error: (detail) => {
        if (settled) {
          return;
        }
        settled = true;
        signal.removeEventListener("abort", onAbort);
        port.terminate();
        resume(
          Effect.fail(
            new ExposeError({
              code: "engine-failed",
              detail: String(detail || "") || "the Expose Worker failed",
            })
          )
        );
      },
      message: (reply) => {
        if (reply.kind === "progress") {
          onProgress?.(reply.progress);
          return;
        }
        if (settled) {
          return;
        }
        settled = true;
        signal.removeEventListener("abort", onAbort);
        port.terminate();
        if (reply.kind === "failed") {
          resume(Effect.fail(failureOf(reply)));
          return;
        }
        // SAFETY: `ask` is called with the reply kind its caller narrows to; a
        // read request only accepts a read reply and a clean only a clean one.
        resume(Effect.succeed(reply as Reply));
      },
    });
    port.send(request, transfer);
  });

/** The live Expose engine. Each call starts one Worker and terminates it. */
export const ExposeEngineLive = Layer.effect(
  ExposeEngine,
  Effect.gen(function* () {
    const factory = yield* ExposeWorkerFactory;
    return ExposeEngine.of({
      clean: (
        source: ExposeSource,
        request: CleanRequest
      ): Effect.Effect<CleanResult, ExposeError> =>
        Effect.gen(function* () {
          const bytes = yield* readBytes(source.bytes);
          const reply = yield* ask<Extract<WorkerReply, { kind: "clean" }>>(
            factory,
            {
              bytes,
              groups: request.groups,
              id: 1,
              kind: "clean",
              name: source.name,
              preset: request.preset,
              type: source.type,
            },
            [bytes],
            (progress) => request.report?.(progress)
          );
          return reply.result;
        }),
      read: (source: ExposeSource): Effect.Effect<ReadReport, ExposeError> =>
        Effect.gen(function* () {
          const bytes = yield* readBytes(source.bytes);
          const reply = yield* ask<Extract<WorkerReply, { kind: "read" }>>(
            factory,
            {
              bytes,
              id: 1,
              kind: "read",
              name: source.name,
              type: source.type,
            },
            [bytes]
          );
          return reply.report;
        }),
    });
  })
);
