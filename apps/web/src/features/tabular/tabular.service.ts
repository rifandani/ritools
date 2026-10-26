/* oxlint-disable eslint/max-classes-per-file, anti-slop/no-unknown-parameters -- The service declares its injected port; unknown Worker replies are decoded at receipt. */
import { Context, Effect, Layer, Queue, Schema, Stream } from "effect";

import * as T from "./tabular";
import { operations, Reply } from "./tabular.protocol";
import type { Api, Input, Operation, Output } from "./tabular.protocol";

export interface TabularWorkerPort {
  readonly send: (request: unknown) => void;
  readonly subscribe: (handlers: {
    readonly message: (value: unknown) => void;
    readonly error: () => void;
  }) => void;
  readonly terminate: () => void;
}
export class TabularWorkerFactory extends Context.Service<
  TabularWorkerFactory,
  {
    readonly create: () => TabularWorkerPort;
    readonly offline: () => boolean;
    readonly load: () => Promise<void>;
  }
>()("@ritools/web/TabularWorkerFactory") {}
export interface TabularService extends Omit<
  Api,
  "prepareOpen" | "prepareReparse" | "discardCandidate" | "summary" | "close"
> {
  readonly prepareOpen: (
    source: T.Source,
    options: T.ParseOptions,
    job: T.Job
  ) => Effect.Effect<T.Candidate, T.EngineError>;
  readonly prepareReparse: (
    guard: T.Guard,
    options: T.ParseOptions,
    job: T.Job
  ) => Effect.Effect<T.Candidate, T.EngineError>;
  readonly discardCandidate: (
    id: T.CandidateId,
    job: T.Job
  ) => Effect.Effect<void, T.EngineError>;
  readonly summary: (
    id: T.SessionId,
    job: T.Job
  ) => Effect.Effect<T.Session, T.EngineError>;
  readonly close: (id: T.SessionId) => Effect.Effect<void, T.EngineError>;
  readonly progress: (
    id: T.RequestId
  ) => Stream.Stream<T.Progress, T.EngineError>;
}
export class TabularEngine extends Context.Service<
  TabularEngine,
  TabularService
>()("@ritools/web/TabularEngine") {
  static readonly layer = Layer.effect(
    TabularEngine,
    Effect.gen(function* () {
      const factory = yield* TabularWorkerFactory;
      let port: TabularWorkerPort | null = null;
      let sessionId: T.SessionId | null = null;
      let serial = 0;
      let generation = 0;
      const pending = new Map<
        T.RequestId,
        {
          readonly message: (reply: Reply) => void;
          readonly fail: (error: T.EngineError) => void;
        }
      >();
      const terminal = new Set<T.RequestId>();
      const subscribers = new Map<
        T.RequestId,
        Set<{
          readonly next: (p: T.Progress) => void;
          readonly end: () => void;
        }>
      >();
      const end = (id: T.RequestId) => {
        terminal.add(id);
        for (const s of subscribers.get(id) ?? []) {
          s.end();
        }
        subscribers.delete(id);
      };
      const stop = () => {
        generation += 1;
        port?.terminate();
        port = null;
        for (const [id, p] of pending) {
          p.fail(
            factory.offline()
              ? new T.EngineOffline({
                  requestId: id,
                  operation: "worker",
                  sessionId,
                  asset: "tabular-worker",
                })
              : new T.EngineFailed({
                  requestId: id,
                  operation: "worker",
                  sessionId,
                  phase: "reading",
                })
          );
          end(id);
        }
        pending.clear();
      };
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          stop();
          sessionId = null;
          subscribers.clear();
        })
      );
      const id = () => T.RequestId.make(`transport-${(serial += 1)}`);
      const ask = <K extends Operation>(
        operation: K,
        payload: Input<K>,
        requestId: T.RequestId
      ): Effect.Effect<Output<K>, T.EngineError> =>
        Effect.flatMap(
          Effect.tryPromise({
            try: async () => {
              if (port) {
                return;
              }
              for (const listener of subscribers.get(requestId) ?? []) {
                listener.next({
                  requestId,
                  sessionId,
                  phase: "loading-engine",
                  completed: 0,
                  total: null,
                  unit: "bytes",
                  cancellable: true,
                });
              }
              await factory.load();
            },
            catch: () =>
              new T.EngineOffline({
                requestId,
                operation,
                sessionId,
                asset: "tabular-worker",
              }),
          }),
          () =>
            // oxlint-disable-next-line promise/prefer-await-to-callbacks -- Worker events are the Effect callback boundary
            Effect.callback<Output<K>, T.EngineError>((resume, signal) => {
              const ctx = { requestId, operation, sessionId };
              if (
                Schema.decodeUnknownExit(operations[operation].input)(payload)
                  ._tag === "Failure"
              ) {
                resume(
                  Effect.fail(
                    new T.InvalidRequest({ ...ctx, field: "payload" })
                  )
                );
                return;
              }
              if (pending.has(requestId)) {
                resume(
                  Effect.fail(
                    new T.InvalidRequest({ ...ctx, field: "requestId" })
                  )
                );
                return;
              }
              const abort = () => {
                // Keep the request pending until the Worker reports whether it committed.
                port?.send({
                  version: 1,
                  requestId: id(),
                  operation: "cancel",
                  payload: { requestId },
                });
              };
              const finish = (
                result: Effect.Effect<Output<K>, T.EngineError>
              ) => {
                pending.delete(requestId);
                signal.removeEventListener("abort", abort);
                end(requestId);
                resume(result);
              };
              pending.set(requestId, {
                fail: (error) => finish(Effect.fail(error)),
                message: (reply) => {
                  if (reply._tag === "Progress") {
                    for (const s of subscribers.get(requestId) ?? []) {
                      s.next(reply.payload);
                    }
                    return;
                  }
                  if (reply._tag === "Failure") {
                    finish(Effect.fail(reply.payload));
                    return;
                  }
                  const decoded = Schema.decodeUnknownExit(
                    operations[operation].output
                  )(reply.payload);
                  if (decoded._tag === "Failure") {
                    finish(
                      Effect.fail(
                        new T.EngineFailed({ ...ctx, phase: "reading" })
                      )
                    );
                    return;
                  }
                  const { value } = decoded;
                  if (Schema.is(T.Session)(value)) {
                    ({ sessionId } = value);
                  }
                  if (Schema.is(T.Change)(value)) {
                    ({ sessionId } = value.session);
                  }
                  // SAFETY: The operation selects its matching output schema above.
                  finish(Effect.succeed(value as Output<K>));
                },
              });
              try {
                if (!port) {
                  generation += 1;
                  const current = generation;
                  port = factory.create();
                  port.subscribe({
                    error: () => {
                      if (generation === current) {
                        stop();
                      }
                    },
                    message: (value) => {
                      if (generation !== current) {
                        return;
                      }
                      const decoded = Schema.decodeUnknownExit(Reply)(value);
                      if (decoded._tag === "Failure") {
                        stop();
                        return;
                      }
                      pending
                        .get(decoded.value.requestId)
                        ?.message(decoded.value);
                    },
                  });
                }
                signal.addEventListener("abort", abort, { once: true });
                port.send({ version: 1, requestId, operation, payload });
              } catch {
                finish(
                  Effect.fail(
                    factory.offline()
                      ? new T.EngineOffline({ ...ctx, asset: "tabular-worker" })
                      : new T.EngineFailed({ ...ctx, phase: "loading-engine" })
                  )
                );
                stop();
              }
              return Effect.sync(abort);
            })
        ).pipe(Effect.ensuring(Effect.sync(() => end(requestId))));
      const progress = (
        requestId: T.RequestId
      ): Stream.Stream<T.Progress, T.EngineError> =>
        Stream.callback<T.Progress, T.EngineError>(
          (queue) =>
            Effect.gen(function* () {
              if (terminal.has(requestId)) {
                yield* Queue.end(queue);
                return;
              }
              const listener = {
                next: (p: T.Progress) => {
                  Queue.offerUnsafe(queue, p);
                },
                end: () => {
                  Queue.endUnsafe(queue);
                },
              };
              let set = subscribers.get(requestId);
              if (!set) {
                set = new Set();
                subscribers.set(requestId, set);
              }
              set.add(listener);
              yield* Effect.addFinalizer(() =>
                Effect.sync(() => {
                  set.delete(listener);
                  if (!set.size) {
                    subscribers.delete(requestId);
                  }
                })
              );
            }),
          { bufferSize: 8, strategy: "sliding" }
        );
      return TabularEngine.of({
        prepareOpen: Effect.fn("Tabular.prepareOpen")((source, options, job) =>
          ask("prepareOpen", { source, options, job }, job.requestId)
        ),
        prepareReparse: Effect.fn("Tabular.prepareReparse")(
          (guard, options, job) =>
            ask("prepareReparse", { guard, options, job }, job.requestId)
        ),
        acceptOpen: Effect.fn("Tabular.acceptOpen")((input) =>
          ask("acceptOpen", input, input.requestId)
        ),
        discardCandidate: Effect.fn("Tabular.discardCandidate")(
          (candidateId, job) =>
            ask("discardCandidate", { candidateId, ...job }, job.requestId)
        ),
        summary: Effect.fn("Tabular.summary")((selectedSession, job) =>
          ask("summary", { sessionId: selectedSession, ...job }, job.requestId)
        ),
        setView: Effect.fn("Tabular.setView")((input) =>
          ask("setView", input, input.requestId)
        ),
        readViewport: Effect.fn("Tabular.readViewport")((input) =>
          ask("readViewport", input, input.requestId)
        ),
        locate: Effect.fn("Tabular.locate")((input) =>
          ask("locate", input, input.requestId)
        ),
        warnings: Effect.fn("Tabular.warnings")((input) =>
          ask("warnings", input, input.requestId)
        ),
        edit: Effect.fn("Tabular.edit")((input) =>
          ask("edit", input, input.requestId)
        ),
        history: Effect.fn("Tabular.history")((input) =>
          ask("history", input, input.requestId)
        ),
        planExport: Effect.fn("Tabular.planExport")((input) =>
          ask("planExport", input, input.requestId)
        ),
        exportBytes: Effect.fn("Tabular.exportBytes")((input) =>
          ask("exportBytes", input, input.requestId)
        ),
        cancel: Effect.fn("Tabular.cancel")((input) =>
          ask("cancel", input, id())
        ),
        close: Effect.fn("Tabular.close")(function* (closing) {
          try {
            if (port) {
              yield* ask("close", { sessionId: closing }, id());
            }
          } finally {
            if (sessionId === closing) {
              stop();
              sessionId = null;
            }
          }
        }),
        progress,
      });
    })
  );
}
