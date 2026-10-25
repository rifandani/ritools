import { Context, Effect, Layer, Schedule, Semaphore } from "effect";

import type {
  CleanProgress,
  ExposeCleanTask,
  ExposeCleanEvent,
  CleanRequest,
  ExposeSource,
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

/** One run owns one port. Requests are sequential and have distinct IDs. */
interface Run {
  port: ExposeWorkerPort | null;
  nextId: number;
  pending: {
    readonly id: number;
    readonly reply: (reply: WorkerReply) => void;
    readonly error: (detail: string) => void;
  } | null;
}

const closeRun = (run: Run): void => {
  run.pending = null;
  run.port?.terminate();
  run.port = null;
};

const ask = <Reply extends WorkerReply>(
  factory: { readonly create: () => ExposeWorkerPort },
  request: WorkerRequest,
  transfer: readonly Transferable[],
  onProgress: ((progress: CleanProgress) => void) | undefined,
  shared: Run
): Effect.Effect<Reply, ExposeError> =>
  // oxlint-disable-next-line promise/prefer-await-to-callbacks promise/prefer-await-to-then -- Effect.callback adapts Worker events
  Effect.callback<Reply, ExposeError>((resume, signal) => {
    const run = shared;
    run.nextId += 1;
    const id = run.nextId;
    if (run.port === null) {
      try {
        run.port = factory.create();
        run.port.subscribe({
          error: (detail) => run.pending?.error(detail),
          message: (reply) => {
            if (reply.id === run.pending?.id) {
              run.pending.reply(reply);
            }
          },
        });
      } catch (error) {
        closeRun(run);
        resume(
          Effect.fail(
            new ExposeError({
              code: isMemoryFailure(error) ? "too-large" : "engine-failed",
              detail:
                error instanceof Error
                  ? error.message
                  : "the Expose Worker could not start",
            })
          )
        );
        return;
      }
    }
    const { port } = run;
    const onAbort = () => closeRun(run);
    const finish = (answer: Effect.Effect<Reply, ExposeError>) => {
      signal.removeEventListener("abort", onAbort);
      run.pending = null;

      resume(answer);
    };
    run.pending = {
      id,
      error: (detail) => {
        // A crashed Worker cannot answer the next file. Recreate only on crash.
        closeRun(run);
        finish(
          Effect.fail(
            new ExposeError({
              code: isMemoryFailure(detail) ? "too-large" : "engine-failed",
              detail: detail || "the Expose Worker failed",
            })
          )
        );
      },
      reply: (reply) => {
        if (reply.kind === "progress") {
          onProgress?.(reply.progress);
          return;
        }
        if (reply.kind === "failed") {
          if (reply.fatal) {
            closeRun(run);
          }
          finish(Effect.fail(failureOf(reply)));
          return;
        }
        if (reply.kind !== request.kind) {
          return;
        }
        // SAFETY: the request kind and ID above match the pending reply.
        finish(Effect.succeed(reply as Reply));
      },
    };
    signal.addEventListener("abort", onAbort);
    try {
      port.send({ ...request, id }, transfer);
    } catch (error) {
      run.pending?.error(
        error instanceof Error ? error.message : "the Expose Worker failed"
      );
    }
  });

const retryFatal = <A>(effect: Effect.Effect<A, ExposeError>) =>
  effect.pipe(
    Effect.retry({
      schedule: Schedule.recurs(1),
      while: (error) =>
        /Failed to reset Perl interpreter|Can't load module mro|unreachable|RuntimeError|out of bounds/iu.test(
          error.detail
        ),
    })
  );

const cleanOnRun = Effect.fn("Expose.cleanOnRun")(function* (
  factory: { readonly create: () => ExposeWorkerPort },
  source: ExposeSource,
  request: CleanRequest,
  run: Run
) {
  const bytes = yield* readBytes(source.bytes);
  const reply = yield* ask<Extract<WorkerReply, { kind: "clean" }>>(
    factory,
    {
      bytes,
      groups: request.groups,
      id: 0,
      kind: "clean",
      name: source.name,
      preset: request.preset,
      type: source.type,
    },
    [bytes],
    request.report,
    run
  );
  return reply.result;
});

/** Failure is a row event. Interruption still stops the entire run. */
const cleanBatch = Effect.fn("Expose.cleanBatch")(function* (
  factory: { readonly create: () => ExposeWorkerPort },
  tasks: readonly ExposeCleanTask[],
  request: CleanRequest,
  report: (event: ExposeCleanEvent) => void,
  run: Run
) {
  yield* Effect.forEach(
    tasks,
    (task) =>
      Effect.gen(function* () {
        yield* Effect.sync(() => report({ kind: "started", id: task.id }));
        yield* cleanOnRun(
          factory,
          task.source,
          {
            ...request,
            report: (progress) =>
              report({ kind: "progress", id: task.id, progress }),
          },
          run
        ).pipe(
          Effect.tap((result) =>
            Effect.sync(() => report({ kind: "result", id: task.id, result }))
          ),
          Effect.catch((error) =>
            Effect.sync(() => report({ kind: "failed", id: task.id, error }))
          )
        );
      }),
    { concurrency: 1, discard: true }
  );
});

/** The layer owns one sequential Worker for reads and cleans for the session. */
export const ExposeEngineLive = Layer.effect(
  ExposeEngine,
  Effect.gen(function* () {
    const factory = yield* ExposeWorkerFactory;
    const run: Run = { port: null, nextId: 0, pending: null };
    const semaphore = yield* Semaphore.make(1);
    yield* Effect.addFinalizer(() => Effect.sync(() => closeRun(run)));
    const read = Effect.fn("Expose.read")(function* (
      source: ExposeSource,
      report?: (progress: CleanProgress) => void
    ) {
      const bytes = yield* readBytes(source.bytes);
      const reply = yield* ask<Extract<WorkerReply, { kind: "read" }>>(
        factory,
        { bytes, id: 0, kind: "read", name: source.name, type: source.type },
        [bytes],
        report,
        run
      );
      return reply.report;
    });
    return ExposeEngine.of({
      clean: Effect.fn("Expose.clean")((source, request) =>
        semaphore.withPermits(1)(
          retryFatal(cleanOnRun(factory, source, request, run))
        )
      ),
      cleanBatch: Effect.fn("Expose.cleanBatch")((tasks, request, report) =>
        semaphore.withPermits(1)(
          cleanBatch(factory, tasks, request, report, run)
        )
      ),
      read: Effect.fn("Expose.readQueued")((source, report) =>
        semaphore.withPermits(1)(retryFatal(read(source, report)))
      ),
    });
  })
);
