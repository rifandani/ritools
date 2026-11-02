/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-shape-in-symbol-names, eslint/no-await-in-loop, eslint/no-unused-vars, eslint/no-duplicate-imports, import/no-duplicates, typescript/array-type, typescript/no-non-null-assertion, unicorn/consistent-function-scoping, unicorn/no-useless-undefined -- tests build typed fixtures and replay steps in order. */
import { Effect, Fiber, Layer } from "effect";
import { describe, expect, it } from "vitest";

import type {
  Matte,
  MatteId,
  RasterImage,
  RemoveResult,
  SourceId,
  UnmaskEngineContract,
  UnmaskError,
  UnmaskWorkerPort,
} from "@/features/unmask/unmask.engine";
import {
  ModelFailed,
  TooLarge,
  UnmaskEngine,
  UnmaskEngineLive,
  UnmaskWorkerFactory,
} from "@/features/unmask/unmask.engine";
import { failedReplyOf } from "@/features/unmask/unmask.protocol";
import type {
  WorkerRequest,
  WorkerReply,
} from "@/features/unmask/unmask.protocol";

const matteId = (value: string): MatteId => value as MatteId;

const matte: Matte = {
  alpha: Uint8Array.from([0, 255, 128, 255]),
  height: 2,
  matteId: matteId("matte-1"),
  width: 2,
};

const raster: RasterImage = {
  height: 2,
  rgba: Uint8Array.from([
    1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255,
  ]),
  width: 2,
};

const removed: RemoveResult = {
  matte,
  model: null,
  notes: [],
  preview: matte,
  source: {
    bytes: 12,
    format: "png",
    frameCount: 1,
    hasAlpha: false,
    height: 2,
    name: "a.png",
    sourceId: "source-1" as SourceId,
    width: 2,
  },
};

interface FakePort {
  readonly port: UnmaskWorkerPort;
  readonly requests: WorkerRequest[];
  readonly terminated: () => number;
}

type Emitted = WorkerReply | typeof WorkerReply.Encoded;

const fakePort = (
  onSend?: (emit: (reply: Emitted) => void, request: WorkerRequest) => void
): FakePort => {
  let message: ((reply: Emitted) => void) | null = null;
  let failure: ((detail: string) => void) | null = null;
  let terminations = 0;
  const requests: WorkerRequest[] = [];
  return {
    port: {
      send: (request) => {
        requests.push(request);
        onSend?.((reply) => message?.(reply), request);
      },
      subscribe: (handlers) => {
        message = handlers.message as (reply: Emitted) => void;
        failure = handlers.error;
      },
      terminate: () => {
        terminations += 1;
      },
    },
    requests,
    terminated: () => terminations,
  };
};

const layerOf = (factory: () => UnmaskWorkerPort) =>
  UnmaskEngineLive.pipe(
    Layer.provide(Layer.succeed(UnmaskWorkerFactory, { create: factory }))
  );

const program = <A>(
  run: (engine: UnmaskEngineContract) => Effect.Effect<A, UnmaskError>
) =>
  Effect.gen(function* () {
    const engine = yield* UnmaskEngine;
    return yield* run(engine);
  });

describe("the Unmask engine service", () => {
  it("removes in a Worker and forwards progress", async () => {
    const progress: string[] = [];
    const port = fakePort((emit, request) => {
      emit({
        _tag: "Progress",
        event: { _tag: "Decode" },
        requestId: request.requestId,
      });
      emit({ _tag: "Removed", requestId: request.requestId, result: removed });
    });
    const result = await Effect.runPromise(
      program((engine) =>
        engine.remove(
          { bytes: Uint8Array.from([1]), mime: "image/png", name: "a.png" },
          { report: (event) => progress.push(event._tag) }
        )
      ).pipe(Effect.provide(layerOf(() => port.port)))
    );
    expect(result).toEqual(removed);
    expect(progress).toEqual(["Decode"]);
    expect(port.requests[0]?._tag).toBe("Remove");
  });

  it("composites and encodes through the same Worker", async () => {
    const port = fakePort((emit, request) => {
      if (request._tag === "Remove") {
        emit({
          _tag: "Removed",
          requestId: request.requestId,
          result: removed,
        });
      } else if (request._tag === "Composite") {
        emit({
          _tag: "Composited",
          image: raster,
          requestId: request.requestId,
        });
      } else if (request._tag === "Encode") {
        emit({
          _tag: "Encoded",
          file: {
            bytes: Uint8Array.from([1, 2]),
            bytesLength: 2,
            format: "webp",
            hasAlpha: true,
            height: 2,
            mime: "image/webp",
            name: "a-cutout.webp",
            quality: 85,
            width: 2,
          },
          requestId: request.requestId,
        });
      }
    });
    const result = await Effect.runPromise(
      program((engine) =>
        Effect.gen(function* () {
          yield* engine.remove({
            bytes: Uint8Array.from([1]),
            mime: "image/png",
            name: "a.png",
          });
          const composite = yield* engine.composite({
            backdrop: { _tag: "Transparent" },
            feather: 0,
            matte,
            source: raster,
          });
          const encoded = yield* engine.encode({
            format: "webp",
            image: composite,
            nameStem: "a",
            quality: 85,
          });
          return { composite, encoded };
        })
      ).pipe(Effect.provide(layerOf(() => port.port)))
    );
    expect(result.composite).toEqual(raster);
    expect(result.encoded.name).toBe("a-cutout.webp");
  });

  it("cancels a request and terminates the Worker", async () => {
    const port = fakePort();
    const controller = new AbortController();
    const fiber = Effect.runFork(
      program((engine) =>
        engine.remove(
          { bytes: Uint8Array.from([1]), mime: "image/png", name: "a.png" },
          { signal: controller.signal }
        )
      ).pipe(Effect.provide(layerOf(() => port.port)))
    );
    await Effect.runPromise(Effect.sleep("10 millis"));
    controller.abort();
    const exit = await Effect.runPromise(Fiber.await(fiber));
    expect(exit._tag).toBe("Failure");
    expect(port.terminated()).toBe(1);
  });

  it("restarts the Worker once after a fatal error", async () => {
    let created = 0;
    const factory = (): UnmaskWorkerPort => {
      created += 1;
      if (created === 1) {
        let failure: ((detail: string) => void) | null = null;
        return {
          send: () => {
            queueMicrotask(() => {
              failure?.("fatal engine error");
            });
          },
          subscribe: (handlers) => {
            failure = handlers.error;
          },
          terminate: () => undefined,
        };
      }
      return fakePort((emit, request) => {
        emit({
          _tag: "Removed",
          requestId: request.requestId,
          result: removed,
        });
      }).port;
    };
    const result = await Effect.runPromise(
      program((engine) =>
        Effect.gen(function* () {
          const first = yield* Effect.exit(
            engine.remove({
              bytes: Uint8Array.from([1]),
              mime: "image/png",
              name: "a.png",
            })
          );
          const second = yield* engine.remove({
            bytes: Uint8Array.from([1]),
            mime: "image/png",
            name: "a.png",
          });
          return { first, second };
        })
      ).pipe(Effect.provide(layerOf(factory)))
    );
    expect(result.first._tag).toBe("Failure");
    expect(result.second).toEqual(removed);
    expect(created).toBe(2);
  });

  it("turns a Failed reply into the named error", async () => {
    const port = fakePort((emit, request) => {
      emit({
        _tag: "Failed",
        error: new TooLarge({
          height: 2,
          neededBytes: 8,
          pixels: 2,
          width: 1,
        }),
        requestId: request.requestId,
      });
    });
    const error = await Effect.runPromise(
      Effect.flip(
        program((engine) =>
          engine.remove({
            bytes: Uint8Array.from([1]),
            mime: "image/png",
            name: "a.png",
          })
        ).pipe(Effect.provide(layerOf(() => port.port)))
      )
    );
    expect(error._tag).toBe("TooLarge");
  });

  it("keeps the named error of a Failed reply through structured clone", async () => {
    // A real Worker reply crosses postMessage. A clone of an Error keeps only
    // its name and message, so the Worker must post the encoded error.
    const port = fakePort((emit, request) => {
      emit(
        structuredClone(
          failedReplyOf(
            request.requestId,
            new TooLarge({ height: 2, neededBytes: 8, pixels: 2, width: 1 })
          )
        )
      );
    });
    const error = await Effect.runPromise(
      Effect.flip(
        program((engine) =>
          engine.remove({
            bytes: Uint8Array.from([1]),
            mime: "image/png",
            name: "a.png",
          })
        ).pipe(Effect.provide(layerOf(() => port.port)))
      )
    );
    expect(error._tag).toBe("TooLarge");
  });

  it("fails a pending request when its reply does not decode", async () => {
    const port = fakePort((emit, request) => {
      emit({
        _tag: "Failed",
        error: structuredClone(
          new ModelFailed({ detail: "boom", reason: "inference" })
        ),
        requestId: request.requestId,
      });
    });
    const error = await Effect.runPromise(
      Effect.flip(
        program((engine) =>
          engine.remove({
            bytes: Uint8Array.from([1]),
            mime: "image/png",
            name: "a.png",
          })
        ).pipe(Effect.provide(layerOf(() => port.port)))
      )
    );
    expect(error._tag).toBe("ModelFailed");
  });

  it("ignores an unknown reply and keeps waiting", async () => {
    const port = fakePort((emit, request) => {
      emit({ _tag: "Closed", requestId: "wrong" as never });
      emit({ _tag: "Removed", requestId: request.requestId, result: removed });
    });
    const result = await Effect.runPromise(
      program((engine) =>
        engine.remove({
          bytes: Uint8Array.from([1]),
          mime: "image/png",
          name: "a.png",
        })
      ).pipe(Effect.provide(layerOf(() => port.port)))
    );
    expect(result).toEqual(removed);
  });

  it("ignores a malformed reply and keeps waiting", async () => {
    const port = fakePort((emit, request) => {
      emit({ nonsense: true } as never);
      emit({ _tag: "Removed", requestId: request.requestId, result: removed });
    });
    const result = await Effect.runPromise(
      program((engine) =>
        engine.remove({
          bytes: Uint8Array.from([1]),
          mime: "image/png",
          name: "a.png",
        })
      ).pipe(Effect.provide(layerOf(() => port.port)))
    );
    expect(result).toEqual(removed);
  });

  it("fails when the Worker answers with the wrong reply", async () => {
    const port = fakePort((emit, request) => {
      emit({
        _tag: "Composited",
        image: raster,
        requestId: request.requestId,
      });
    });
    const error = await Effect.runPromise(
      Effect.flip(
        program((engine) =>
          engine.remove({
            bytes: Uint8Array.from([1]),
            mime: "image/png",
            name: "a.png",
          })
        ).pipe(Effect.provide(layerOf(() => port.port)))
      )
    );
    expect(error._tag).toBe("ModelFailed");
  });

  it("classifies a device loss and blocks after the second fatal error", async () => {
    let created = 0;
    const factory = (): UnmaskWorkerPort => {
      created += 1;
      let failure: ((detail: string) => void) | null = null;
      return {
        send: () => {
          queueMicrotask(() => {
            failure?.(created === 1 ? "device lost" : "fatal engine error");
          });
        },
        subscribe: (handlers) => {
          failure = handlers.error;
        },
        terminate: () => undefined,
      };
    };
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const engine = yield* UnmaskEngine;
        const first = yield* Effect.flip(
          engine.remove({
            bytes: Uint8Array.from([1]),
            mime: "image/png",
            name: "a.png",
          })
        );
        const second = yield* Effect.flip(
          engine.remove({
            bytes: Uint8Array.from([1]),
            mime: "image/png",
            name: "a.png",
          })
        );
        const third = yield* Effect.flip(
          engine.remove({
            bytes: Uint8Array.from([1]),
            mime: "image/png",
            name: "a.png",
          })
        );
        return { first, second, third };
      }).pipe(Effect.provide(layerOf(factory)))
    );
    expect(result.first._tag).toBe("ModelFailed");
    expect(
      result.first._tag === "ModelFailed" ? result.first.reason : null
    ).toBe("device-lost");
    expect(result.third._tag).toBe("ModelFailed");
    expect(
      result.third._tag === "ModelFailed" ? result.third.detail : null
    ).toBe("the engine stopped after a fatal error");
    expect(created).toBe(2);
  });

  it("maps a throwing Worker start to a named error", async () => {
    const throwingPort = (failure: Error): UnmaskWorkerPort => ({
      send: () => {
        throw failure;
      },
      subscribe: () => undefined,
      terminate: () => undefined,
    });
    const removeOnce = (failure: Error) =>
      Effect.runPromise(
        Effect.flip(
          program((engine) =>
            engine.remove({
              bytes: Uint8Array.from([1]),
              mime: "image/png",
              name: "a.png",
            })
          ).pipe(Effect.provide(layerOf(() => throwingPort(failure))))
        )
      );
    const error = await removeOnce(
      new ModelFailed({ detail: "init failed", reason: "inference" })
    );
    expect(error._tag).toBe("ModelFailed");
    const unavailable = await removeOnce(new Error("no worker"));
    expect(unavailable._tag).toBe("ModelUnavailable");
  });

  it("sends the batch token and cancels a request with no open image", async () => {
    const port = fakePort((emit, request) => {
      if (request._tag === "Encode") {
        emit({
          _tag: "Encoded",
          file: {
            bytes: Uint8Array.from([1]),
            bytesLength: 1,
            format: "webp",
            hasAlpha: false,
            height: 1,
            mime: "image/webp",
            name: "a-cutout.webp",
            quality: 85,
            width: 1,
          },
          requestId: request.requestId,
        });
      }
    });
    const encoded = await Effect.runPromise(
      program((engine) =>
        engine.encode({
          format: "webp",
          image: raster,
          nameStem: "a",
          quality: 85,
        })
      ).pipe(Effect.provide(layerOf(() => port.port)))
    );
    expect(encoded.name).toBe("a-cutout.webp");
    const encodeRequest = port.requests.find(
      (request) => request._tag === "Encode"
    );
    expect(
      encodeRequest !== undefined && encodeRequest._tag === "Encode"
        ? encodeRequest.imageToken
        : null
    ).toBe("batch");

    const pending = fakePort();
    const fiber = Effect.runFork(
      program((engine) =>
        engine.encode({
          format: "webp",
          image: raster,
          nameStem: "a",
          quality: 85,
        })
      ).pipe(Effect.provide(layerOf(() => pending.port)))
    );
    await Effect.runPromise(Effect.sleep("10 millis"));
    await Effect.runPromise(Fiber.interrupt(fiber));
    const cancel = pending.requests.find(
      (request) => request._tag === "Cancel"
    );
    expect(
      cancel !== undefined && cancel._tag === "Cancel"
        ? cancel.imageToken
        : null
    ).toBe("session");
  });

  it("refuses to composite without an open image", async () => {
    const port = fakePort();
    const error = await Effect.runPromise(
      Effect.flip(
        program((engine) =>
          engine.composite({
            backdrop: { _tag: "Transparent" },
            feather: 0,
            matte,
            source: raster,
          })
        ).pipe(Effect.provide(layerOf(() => port.port)))
      )
    );
    expect(error._tag).toBe("UnreadableFile");
  });

  it("exposes the pure refine", async () => {
    const port = fakePort();
    const result = await Effect.runPromise(
      program((engine) =>
        Effect.sync(() =>
          engine.refine({
            matte,
            operations: [],
            source: { ...raster, height: 2, width: 2 },
          })
        )
      ).pipe(Effect.provide(layerOf(() => port.port)))
    );
    expect(result.alpha).toEqual(matte.alpha);
  });
});
