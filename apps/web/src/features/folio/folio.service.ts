/* oxlint-disable eslint/max-classes-per-file, anti-slop/no-unknown-parameters, anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-chained-type-assertions, anti-slop/no-conditional-empty-object-spread -- The service narrows the decoded response union after the tag check. */
import { Context, Effect, Layer, Queue, Schema, Stream } from "effect";

import * as F from "./folio";
import type { Request, Response } from "./folio";

export interface FolioWorkerPort {
  readonly send: (request: unknown) => void;
  readonly subscribe: (handlers: {
    readonly message: (value: unknown) => void;
    readonly error: () => void;
  }) => void;
  readonly terminate: () => void;
}

export class FolioWorkerFactory extends Context.Service<
  FolioWorkerFactory,
  {
    readonly create: () => FolioWorkerPort;
    readonly offline: () => boolean;
    readonly load: () => Promise<void>;
  }
>()("@ritools/web/FolioWorkerFactory") {}

export interface RenderedOutput {
  readonly rendered: Extract<Response, { _tag: "Rendered" }>;
  readonly bitmap: ImageBitmap | null;
}

interface FolioService {
  readonly open: (input: {
    readonly request: F.RequestId;
    readonly bytes: Uint8Array;
    readonly name?: string;
    readonly password?: string;
  }) => Effect.Effect<Extract<Response, { _tag: "Opened" }>, F.FolioFailure>;
  readonly inspectSource: (
    input: Extract<Request, { _tag: "InspectSource" }>
  ) => Effect.Effect<
    Extract<Response, { _tag: "SourceInspected" }>,
    F.FolioFailure
  >;
  readonly releaseSource: (
    input: Extract<Request, { _tag: "ReleaseSource" }>
  ) => Effect.Effect<
    Extract<Response, { _tag: "SourceReleased" }>,
    F.FolioFailure
  >;
  readonly readViewport: (
    input: Extract<Request, { _tag: "ReadViewport" }>
  ) => Effect.Effect<RenderedOutput, F.FolioFailure>;
  readonly readThumbnail: (
    input: Extract<Request, { _tag: "ReadThumbnail" }>
  ) => Effect.Effect<RenderedOutput, F.FolioFailure>;
  readonly readText: (
    input: Extract<Request, { _tag: "ReadText" }>
  ) => Effect.Effect<Extract<Response, { _tag: "TextRead" }>, F.FolioFailure>;
  readonly readOutline: (
    input: Extract<Request, { _tag: "ReadOutline" }>
  ) => Effect.Effect<
    Extract<Response, { _tag: "OutlineRead" }>,
    F.FolioFailure
  >;
  readonly readAnnotations: (
    input: Extract<Request, { _tag: "ReadAnnotations" }>
  ) => Effect.Effect<
    Extract<Response, { _tag: "AnnotationsRead" }>,
    F.FolioFailure
  >;
  readonly readForms: (
    input: Extract<Request, { _tag: "ReadForms" }>
  ) => Effect.Effect<Extract<Response, { _tag: "FormsRead" }>, F.FolioFailure>;
  readonly search: (
    input: Extract<Request, { _tag: "Search" }>
  ) => Effect.Effect<Extract<Response, { _tag: "SearchRead" }>, F.FolioFailure>;
  readonly commit: (
    input: Extract<Request, { _tag: "Commit" }>
  ) => Effect.Effect<Extract<Response, { _tag: "Changed" }>, F.FolioFailure>;
  readonly undo: (
    input: Extract<Request, { _tag: "Undo" }>
  ) => Effect.Effect<Extract<Response, { _tag: "Changed" }>, F.FolioFailure>;
  readonly redo: (
    input: Extract<Request, { _tag: "Redo" }>
  ) => Effect.Effect<Extract<Response, { _tag: "Changed" }>, F.FolioFailure>;
  readonly planExport: (
    input: Extract<Request, { _tag: "PlanExport" }>
  ) => Effect.Effect<
    Extract<Response, { _tag: "ExportPlanned" }>,
    F.FolioFailure
  >;
  readonly write: (
    input: Extract<Request, { _tag: "Write" }>
  ) => Effect.Effect<Extract<Response, { _tag: "Written" }>, F.FolioFailure>;
  readonly acknowledgeDownload: (
    input: Extract<Request, { _tag: "AcknowledgeDownload" }>
  ) => Effect.Effect<
    Extract<Response, { _tag: "Acknowledged" }>,
    F.FolioFailure
  >;
  readonly cancel: (
    input: Extract<Request, { _tag: "Cancel" }>
  ) => Effect.Effect<void, F.FolioFailure>;
  readonly close: (input: {
    readonly request: F.RequestId;
    readonly session: F.SessionId;
  }) => Effect.Effect<void, F.FolioFailure>;
  readonly progress: (
    request: F.RequestId
  ) => Stream.Stream<Extract<Response, { _tag: "Progress" }>, F.FolioFailure>;
}

const rejection = (reply: Extract<Response, { _tag: "Rejected" }>) =>
  F.FolioFailure.make({
    requestId: reply.request,
    code: reply.code,
    reason: reply.reason,
    preservedRevision: reply.preservedRevision,
    sessionAlive: reply.sessionAlive,
  });

export class FolioEngine extends Context.Service<FolioEngine, FolioService>()(
  "@ritools/web/FolioEngine"
) {
  static readonly layer = Layer.effect(
    FolioEngine,
    Effect.gen(function* () {
      const factory = yield* FolioWorkerFactory;
      let port: FolioWorkerPort | null = null;
      let generation = 0;
      const pending = new Map<
        F.RequestId,
        {
          readonly message: (
            reply: Response,
            bitmap: ImageBitmap | undefined
          ) => void;
          readonly fail: (error: F.FolioFailure) => void;
        }
      >();
      const subscribers = new Map<
        F.RequestId,
        Set<{
          next: (value: Extract<Response, { _tag: "Progress" }>) => void;
          end: () => void;
        }>
      >();
      const end = (request: F.RequestId) => {
        for (const subscriber of subscribers.get(request) ?? []) {
          subscriber.end();
        }
        subscribers.delete(request);
      };
      const stop = () => {
        generation += 1;
        port?.terminate();
        port = null;
        for (const [request, holder] of pending) {
          holder.fail(
            F.FolioFailure.make({
              requestId: request,
              code: factory.offline() ? "offline-asset-missing" : "worker-lost",
              sessionAlive: false,
            })
          );
          end(request);
        }
        pending.clear();
      };
      yield* Effect.addFinalizer(() => Effect.sync(stop));
      const ask = <K extends Response["_tag"]>(
        request: Request,
        tag: K,
        transfer = false
      ): Effect.Effect<Extract<Response, { _tag: K }>, F.FolioFailure> =>
        Effect.flatMap(
          Effect.tryPromise({
            try: async () => {
              if (port) {
                return;
              }
              await factory.load();
            },
            catch: () =>
              F.FolioFailure.make({
                requestId: request.request,
                code: "offline-asset-missing",
                sessionAlive: false,
              }),
          }),
          () =>
            // oxlint-disable-next-line promise/prefer-await-to-callbacks -- Worker events are the Effect callback boundary
            Effect.callback<Extract<Response, { _tag: K }>, F.FolioFailure>(
              (resume) => {
                if (pending.has(request.request)) {
                  resume(
                    Effect.fail(
                      F.FolioFailure.make({
                        requestId: request.request,
                        code: "invalid-request",
                        sessionAlive: true,
                      })
                    )
                  );
                  return;
                }
                const finish = (
                  result: Effect.Effect<
                    Extract<Response, { _tag: K }>,
                    F.FolioFailure
                  >
                ) => {
                  pending.delete(request.request);
                  end(request.request);
                  resume(result);
                };
                pending.set(request.request, {
                  fail: (error) => finish(Effect.fail(error)),
                  message: (reply, bitmap) => {
                    if (reply._tag === "Progress") {
                      for (const subscriber of subscribers.get(
                        request.request
                      ) ?? []) {
                        subscriber.next(reply);
                      }
                      return;
                    }
                    if (reply._tag === "Rejected") {
                      bitmap?.close();
                      finish(Effect.fail(rejection(reply)));
                      return;
                    }
                    if (reply._tag !== tag) {
                      bitmap?.close();
                      finish(
                        Effect.fail(
                          F.FolioFailure.make({
                            requestId: request.request,
                            code: "invalid-request",
                            sessionAlive: true,
                          })
                        )
                      );
                      return;
                    }
                    if (transfer) {
                      // SAFETY: Only a render request passes `transfer` and its
                      // response tag is "Rendered".
                      const rendered = { ...reply, bitmap };
                      finish(
                        Effect.succeed(
                          rendered as unknown as Extract<Response, { _tag: K }>
                        )
                      );
                      return;
                    }
                    bitmap?.close();
                    // SAFETY: The operation selects its matching response tag above.
                    finish(
                      Effect.succeed(reply as Extract<Response, { _tag: K }>)
                    );
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
                        const decoded = Schema.decodeUnknownExit(
                          F.WireResponse
                        )(value);
                        if (decoded._tag === "Failure") {
                          stop();
                          return;
                        }
                        const { bitmap } = value as { bitmap?: ImageBitmap };
                        pending
                          .get(decoded.value.payload.request)
                          ?.message(decoded.value.payload, bitmap);
                      },
                    });
                  }
                  port.send({ protocol: 1, payload: request });
                } catch {
                  finish(
                    Effect.fail(
                      F.FolioFailure.make({
                        requestId: request.request,
                        code: factory.offline()
                          ? "offline-asset-missing"
                          : "worker-lost",
                        sessionAlive: false,
                      })
                    )
                  );
                  stop();
                }
                return Effect.void;
              }
            )
        );
      const renderedAsk = (
        request: Request
      ): Effect.Effect<RenderedOutput, F.FolioFailure> =>
        ask(request, "Rendered", true).pipe(
          Effect.map((reply) => {
            const { bitmap } = reply as { bitmap?: ImageBitmap };
            return { rendered: reply, bitmap: bitmap ?? null };
          })
        );
      const service: FolioService = {
        open: Effect.fn("Folio.open")(function* (input) {
          const reply = yield* ask(
            {
              _tag: "Open",
              request: input.request,
              bytes: input.bytes,
              ...(input.name === undefined ? {} : { name: input.name }),
              ...(input.password === undefined
                ? {}
                : { password: input.password }),
            },
            "Opened"
          );
          return reply;
        }),
        inspectSource: Effect.fn("Folio.inspectSource")((input) =>
          ask(input, "SourceInspected")
        ),
        releaseSource: Effect.fn("Folio.releaseSource")((input) =>
          ask(input, "SourceReleased")
        ),
        readViewport: Effect.fn("Folio.readViewport")((input) =>
          renderedAsk(input)
        ),
        readThumbnail: Effect.fn("Folio.readThumbnail")((input) =>
          renderedAsk(input)
        ),
        readText: Effect.fn("Folio.readText")((input) =>
          ask(input, "TextRead")
        ),
        readOutline: Effect.fn("Folio.readOutline")((input) =>
          ask(input, "OutlineRead")
        ),
        readAnnotations: Effect.fn("Folio.readAnnotations")((input) =>
          ask(input, "AnnotationsRead")
        ),
        readForms: Effect.fn("Folio.readForms")((input) =>
          ask(input, "FormsRead")
        ),
        search: Effect.fn("Folio.search")((input) => ask(input, "SearchRead")),
        commit: Effect.fn("Folio.commit")((input) => ask(input, "Changed")),
        undo: Effect.fn("Folio.undo")((input) => ask(input, "Changed")),
        redo: Effect.fn("Folio.redo")((input) => ask(input, "Changed")),
        planExport: Effect.fn("Folio.planExport")((input) =>
          ask(input, "ExportPlanned")
        ),
        write: Effect.fn("Folio.write")((input) => ask(input, "Written")),
        acknowledgeDownload: Effect.fn("Folio.acknowledgeDownload")((input) =>
          ask(input, "Acknowledged")
        ),
        cancel: Effect.fn("Folio.cancel")(function* (input) {
          yield* ask(input, "Cancelled");
        }),
        close: Effect.fn("Folio.close")(function* (input) {
          try {
            yield* ask(
              { _tag: "Close", request: input.request, session: input.session },
              "Closed"
            );
          } finally {
            stop();
          }
        }),
        progress: (request) =>
          Stream.callback<
            Extract<Response, { _tag: "Progress" }>,
            F.FolioFailure
          >(
            (queue) =>
              Effect.gen(function* () {
                const listener = {
                  next: (value: Extract<Response, { _tag: "Progress" }>) => {
                    Queue.offerUnsafe(queue, value);
                  },
                  end: () => {
                    Queue.endUnsafe(queue);
                  },
                };
                let set = subscribers.get(request);
                if (!set) {
                  set = new Set();
                  subscribers.set(request, set);
                }
                set.add(listener);
                yield* Effect.addFinalizer(() =>
                  Effect.sync(() => {
                    set.delete(listener);
                    if (!set.size) {
                      subscribers.delete(request);
                    }
                  })
                );
              }),
            { bufferSize: 8, strategy: "sliding" }
          ),
      };
      return service;
    })
  );
}
