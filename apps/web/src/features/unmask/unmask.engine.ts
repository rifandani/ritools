/* oxlint-disable anti-slop/no-shape-in-symbol-names, anti-slop/no-unknown-parameters, eslint/no-use-before-define, oxc/no-barrel-file, promise/prefer-await-to-callbacks -- the seam name is fixed, replies are decoded at the boundary, and Effect owns the callbacks. */
import { Context, Effect, Layer, Option, Schema, Semaphore } from "effect";

import { isLibraryAssetFailure } from "@/core/libs/library-load";
import { refineMatte } from "@/features/unmask/unmask.matte";
import { requestIdOf, WorkerReply } from "@/features/unmask/unmask.protocol";
import type { WorkerRequest } from "@/features/unmask/unmask.protocol";
import type {
  Backdrop,
  CompositeRequest,
  EncodeRequest,
  EncodedFile,
  RasterImage,
  RemoveOptions,
  RemoveProgress,
  RemoveResult,
  SourceFile,
  UnmaskEngineContract,
  UnmaskError,
} from "@/features/unmask/unmask.schema";
import {
  Cancelled,
  DEFAULT_PREVIEW_MAX_EDGE,
  ModelFailed,
  ModelUnavailable,
  UnreadableFile,
  UnmaskEngine,
} from "@/features/unmask/unmask.schema";

export * from "@/features/unmask/unmask.schema";

/**
 * The Unmask engine service.
 *
 * The service owns the Worker lifecycle, the incrementing request ids, the
 * interruption path, and the response validation. The UI never sends a Worker
 * message. A fatal Worker error restarts the Worker once; a cancellation stops
 * it, and the next request starts from a clean state.
 */

/** One Worker port. A test supplies a fake; the browser supplies the real one. */
export interface UnmaskWorkerPort {
  readonly send: (
    request: WorkerRequest,
    transfer: readonly Transferable[]
  ) => void;
  readonly subscribe: (handlers: {
    readonly error: (detail: string) => void;
    readonly message: (reply: unknown) => void;
  }) => void;
  readonly terminate: () => void;
}

/** Creates the browser Worker. The browser layer is the only real factory. */
export class UnmaskWorkerFactory extends Context.Service<
  UnmaskWorkerFactory,
  { readonly create: () => UnmaskWorkerPort }
>()("@ritools/web/UnmaskWorkerFactory") {}

interface Pending {
  readonly report: ((event: RemoveProgress) => void) | undefined;
  readonly reject: (error: UnmaskError) => void;
  readonly resolve: (reply: WorkerReply) => void;
}

interface EngineState {
  blocked: boolean;
  restartsLeft: number;
  port: UnmaskWorkerPort | null;
  nextId: number;
  nextToken: number;
  activeToken: string | null;
  readonly lastBackdrop: Map<string, Backdrop>;
  readonly pending: Map<string, Pending>;
}

const cancelled = (): Cancelled =>
  new Cancelled({ detail: "the request was cancelled" });

const unexpected = (): ModelFailed =>
  new ModelFailed({
    detail: "the Worker answered a different request",
    reason: "inference",
  });

const decodeReply = (value: unknown): WorkerReply | null => {
  const decoded = Schema.decodeUnknownExit(WorkerReply)(value);
  return decoded._tag === "Success" ? decoded.value : null;
};

/** The id and tag that every reply carries, read when the full reply fails. */
const ReplyHeader = Schema.Struct({
  _tag: Schema.String,
  requestId: Schema.String,
});
const decodeReplyHeader = Schema.decodeUnknownOption(ReplyHeader);

/** The request id of a reply that did not decode, when it is not progress. */
const pendingIdOf = (value: unknown): string | null =>
  Option.match(decodeReplyHeader(value), {
    onNone: () => null,
    onSome: (header) => (header._tag === "Progress" ? null : header.requestId),
  });

const asMatte = (
  reply: WorkerReply
): Effect.Effect<RemoveResult, UnmaskError> =>
  reply._tag === "Removed"
    ? Effect.succeed(reply.result)
    : Effect.fail(unexpected());

const asImage = (
  reply: WorkerReply
): Effect.Effect<RasterImage, UnmaskError> =>
  reply._tag === "Composited"
    ? Effect.succeed(reply.image)
    : Effect.fail(unexpected());

const asFile = (reply: WorkerReply): Effect.Effect<EncodedFile, UnmaskError> =>
  reply._tag === "Encoded"
    ? Effect.succeed(reply.file)
    : Effect.fail(unexpected());

/** The state of one engine session. */
const makeService = (
  factory: { readonly create: () => UnmaskWorkerPort },
  state: EngineState
): UnmaskEngineContract => {
  const terminate = (): void => {
    state.port?.terminate();
    state.port = null;
  };

  const settleAll = (error: UnmaskError): void => {
    const pending = [...state.pending.values()];
    state.pending.clear();
    for (const entry of pending) {
      entry.reject(error);
    }
  };

  const subscribe = (port: UnmaskWorkerPort): void => {
    port.subscribe({
      error: (detail) => {
        if (state.port === port) {
          terminate();
        }
        if (/library failed to load/u.test(detail)) {
          state.blocked = false;
          state.restartsLeft = 1;
        } else if (state.restartsLeft > 0) {
          state.restartsLeft -= 1;
        } else {
          state.blocked = true;
        }
        settleAll(
          new ModelFailed({
            detail,
            reason: /device|gpu/iu.test(detail) ? "device-lost" : "inference",
          })
        );
      },
      message: (value) => {
        const reply = decodeReply(value);
        if (reply === null) {
          // A reply for a pending request that does not decode would leave
          // the request waiting forever. Fail it with a named error.
          const id = pendingIdOf(value);
          const entry = id === null ? undefined : state.pending.get(id);
          if (id !== null && entry !== undefined) {
            state.pending.delete(id);
            entry.reject(
              new ModelFailed({
                detail: "the Worker sent a reply that does not decode",
                reason: "inference",
              })
            );
          }
          return;
        }
        if (reply._tag === "Progress") {
          state.pending.get(reply.requestId)?.report?.(reply.event);
          return;
        }
        const entry = state.pending.get(reply.requestId);
        if (entry === undefined) {
          return;
        }
        state.pending.delete(reply.requestId);
        state.blocked = false;
        state.restartsLeft = 1;
        if (reply._tag === "Failed") {
          if (
            reply.error._tag === "ModelUnavailable" ||
            ((reply.error._tag === "EncodeFailed" ||
              reply.error._tag === "UnreadableFile") &&
              isLibraryAssetFailure(new Error(reply.error.detail)))
          ) {
            terminate();
          }
          entry.reject(reply.error);
          return;
        }
        entry.resolve(reply);
      },
    });
  };

  /** The Worker, started on first use. Throws a named error when it may not. */
  const ensurePort = (): UnmaskWorkerPort => {
    if (state.port !== null) {
      return state.port;
    }
    if (state.blocked) {
      throw new ModelFailed({
        detail: "the engine stopped after a fatal error",
        reason: "inference",
      });
    }
    const port = factory.create();
    state.port = port;
    subscribe(port);
    return port;
  };

  const ask = (
    request: WorkerRequest,
    options?: {
      readonly report?: (event: RemoveProgress) => void;
      readonly signal?: AbortSignal;
    }
  ): Effect.Effect<WorkerReply, UnmaskError> =>
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- Effect.callback is the API for a callback that resolves an Effect
    Effect.callback<WorkerReply, UnmaskError>((resume, signal) => {
      const id = request.requestId;
      const clean = () => {
        signal.removeEventListener("abort", onInterrupt);
        options?.signal?.removeEventListener("abort", onUserAbort);
      };
      const settle = (reply: WorkerReply) => {
        clean();
        resume(Effect.succeed(reply));
      };
      const failWith = (error: UnmaskError) => {
        clean();
        resume(Effect.fail(error));
      };
      const stop = () => {
        clean();
        state.pending.delete(id);
        const { port } = state;
        if (port !== null) {
          try {
            state.nextId += 1;
            port.send(
              {
                _tag: "Cancel",
                imageToken: state.activeToken ?? "session",
                requestId: requestIdOf(state.nextId),
                target: id,
              },
              []
            );
          } catch {
            // The Worker is already gone; stopping it below is enough.
          }
        }
        terminate();
      };
      const onInterrupt = () => {
        stop();
      };
      const onUserAbort = () => {
        stop();
        resume(Effect.fail(cancelled()));
      };
      signal.addEventListener("abort", onInterrupt);
      options?.signal?.addEventListener("abort", onUserAbort);
      state.pending.set(id, {
        reject: failWith,
        report: options?.report,
        resolve: settle,
      });
      try {
        ensurePort().send(request, []);
      } catch (error) {
        state.pending.delete(id);
        failWith(
          error instanceof ModelFailed || error instanceof ModelUnavailable
            ? error
            : new ModelUnavailable({
                /* v8 ignore next -- @preserve a Worker start throws an Error. */
                detail: error instanceof Error ? error.message : String(error),
                reason: "init",
              })
        );
      }
    });

  const remove = (
    file: SourceFile,
    options: RemoveOptions = {}
  ): Effect.Effect<RemoveResult, UnmaskError> =>
    Effect.suspend(() => {
      state.activeToken = `image-${state.nextToken}`;
      state.nextToken += 1;
      state.nextId += 1;
      const request: WorkerRequest = {
        _tag: "Remove",
        bytes: file.bytes,
        imageToken: state.activeToken,
        mime: file.mime,
        name: file.name,
        previewMaxEdge: options.previewMaxEdge ?? DEFAULT_PREVIEW_MAX_EDGE,
        requestId: requestIdOf(state.nextId),
      };
      return ask(request, {
        report: options.report,
        signal: options.signal,
      }).pipe(
        Effect.flatMap(asMatte),
        Effect.mapError((error) => {
          state.activeToken = null;
          return error;
        })
      );
    });

  const composite = (
    request: CompositeRequest
  ): Effect.Effect<RasterImage, UnmaskError> =>
    Effect.suspend(() => {
      const imageToken = request.imageToken ?? state.activeToken;
      if (imageToken === null) {
        return Effect.fail(
          new UnreadableFile({
            detail: "no image is open",
            reason: "decode",
          })
        );
      }
      state.nextId += 1;
      return ask(
        {
          _tag: "Composite",
          backdrop: request.backdrop,
          feather: request.feather,
          imageToken,
          matte: request.matte,
          requestId: requestIdOf(state.nextId),
          source: request.source,
        },
        { signal: request.signal }
      ).pipe(Effect.flatMap(asImage));
    });

  const encode = (
    request: EncodeRequest
  ): Effect.Effect<EncodedFile, UnmaskError> =>
    Effect.suspend(() => {
      state.nextId += 1;
      return ask(
        {
          _tag: "Encode",
          backdrop: request.backdrop,
          format: request.format,
          image: request.image,
          imageToken: request.imageToken ?? state.activeToken ?? "batch",
          nameStem: request.nameStem,
          quality: request.quality,
          requestId: requestIdOf(state.nextId),
        },
        { signal: request.signal }
      ).pipe(Effect.flatMap(asFile));
    });

  return {
    composite,
    encode,
    refine: (request) => refineMatte(request),
    remove,
  };
};

/** The service layer. It is lazy: no Worker exists until the first request. */
export const UnmaskEngineLive = Layer.effect(
  UnmaskEngine,
  Effect.gen(function* () {
    const factory = yield* UnmaskWorkerFactory;
    const semaphore = yield* Semaphore.make(1);
    const state: EngineState = {
      activeToken: null,
      blocked: false,
      lastBackdrop: new Map(),
      nextId: 0,
      nextToken: 0,
      pending: new Map(),
      port: null,
      restartsLeft: 1,
    };
    const service = makeService(factory, state);
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        state.port?.terminate();
        state.port = null;
      })
    );
    return UnmaskEngine.of({
      composite: (request) =>
        semaphore.withPermits(1)(service.composite(request)),
      encode: (request) => semaphore.withPermits(1)(service.encode(request)),
      refine: service.refine,
      remove: (file, options) =>
        semaphore.withPermits(1)(service.remove(file, options)),
    });
  })
);
