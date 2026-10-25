/* eslint-disable eslint/no-bitwise, eslint/no-shadow, eslint/no-await-in-loop, eslint/prefer-destructuring, eslint/prefer-promise-reject-errors, typescript/no-invalid-void-type, unicorn/no-new-array, unicorn/prefer-spread, unicorn/relative-url-style, unicorn/no-array-sort, unicorn/prefer-code-point, unicorn/no-useless-undefined, promise/no-promise-in-callback -- tests build binary fixtures and catch thrown values */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unknown-parameters, anti-slop/no-shape-in-symbol-names -- tests narrow data they built or caught */
import { describe, expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Layer } from "effect";

import type {
  CleanResult,
  ExposeEngineShape,
  ExposeSource,
  ReadReport,
} from "@/features/expose/expose";
import { ExposeEngine, ExposeError } from "@/features/expose/expose";
import {
  ExposeEngineLive,
  ExposeWorkerFactory,
} from "@/features/expose/expose.service";
import type { ExposeWorkerPort } from "@/features/expose/expose.service";
import type {
  WorkerReply,
  WorkerRequest,
} from "@/features/expose/expose.worker";

const source: ExposeSource = {
  bytes: new Blob([new Uint8Array([1, 2, 3])]),
  lastModified: 0,
  name: "image.jpg",
  type: "image/jpeg",
};

const report = {
  ai: {
    c2pa: null,
    digitalSourceTypes: [],
    generationParameters: [],
    signals: [],
  },
  counts: { fields: 0, groups: 0, kept: 0, removable: 0 },
  facts: {
    bytes: 3,
    format: "jpeg",
    frames: null,
    height: 1,
    mime: "image/jpeg",
    name: "image.jpg",
    orientation: 1,
    width: 1,
  },
  fields: [],
  gps: null,
  groups: [],
  notes: [],
  thumbnail: null,
} satisfies ReadReport;

const result = {
  engine: { name: "ExifTool", version: "13.59" },
  file: {
    bytes: new Uint8Array([1, 2, 3]),
    name: "image-clean.jpg",
    type: "image/jpeg",
  },
  kept: [],
  removed: [],
  verification: {
    c2pa: { afterBytes: 0, beforeBytes: 0 },
    display: { after: 0, before: 0, group: "display" },
    kept: [],
    payload: { afterHash: "a", beforeHash: "a", unchanged: true },
    read: report,
    selected: [],
  },
  warnings: [],
} satisfies CleanResult;

interface FakePort {
  readonly emit: (reply: WorkerReply) => void;
  readonly error: (detail: string) => void;
  readonly port: ExposeWorkerPort;
  readonly requests: WorkerRequest[];
  readonly terminated: () => number;
}

const fakePort = (
  onSend?: (emit: (reply: WorkerReply) => void, request: WorkerRequest) => void
): FakePort => {
  let message: ((reply: WorkerReply) => void) | null = null;
  let failure: ((detail: string) => void) | null = null;
  let terminations = 0;
  const requests: WorkerRequest[] = [];
  return {
    emit: (reply) => message?.(reply),
    error: (detail) => failure?.(detail),
    port: {
      send: (request) => {
        requests.push(request);
        onSend?.((reply) => message?.(reply), request);
      },
      subscribe: (handlers) => {
        message = handlers.message;
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

const layerOf = (port: FakePort) =>
  ExposeEngineLive.pipe(
    Layer.provide(
      Layer.succeed(ExposeWorkerFactory, { create: () => port.port })
    )
  );

const engineProgram = <Value>(
  run: (engine: ExposeEngineShape) => Effect.Effect<Value, ExposeError>
): Effect.Effect<Value, ExposeError, ExposeEngine> =>
  Effect.gen(function* () {
    const engine = yield* ExposeEngine;
    return yield* run(engine);
  });

describe("the Expose engine service", () => {
  it.effect("reads in a Worker and terminates it", () =>
    Effect.gen(function* () {
      const port = fakePort((emit) => emit({ id: 1, kind: "read", report }));
      const read = yield* engineProgram((engine) => engine.read(source)).pipe(
        Effect.provide(layerOf(port))
      );
      expect(read).toEqual(report);
      expect(port.requests[0]?.kind).toBe("read");
      expect(port.terminated()).toBe(1);
    })
  );

  it.effect("forwards clean progress and terminates the Worker", () =>
    Effect.gen(function* () {
      const port = fakePort((emit) => {
        emit({
          id: 1,
          kind: "progress",
          progress: {
            loadedBytes: 10,
            percent: 50,
            phase: "loading-engine",
            totalBytes: 20,
          },
        });
        emit({ id: 1, kind: "clean", result });
      });
      const progress: number[] = [];
      const clean = yield* engineProgram((engine) =>
        engine.clean(source, {
          groups: ["authorship"],
          preset: "custom",
          report: (entry) => {
            progress.push(entry.percent ?? -1);
          },
        })
      ).pipe(Effect.provide(layerOf(port)));
      expect(clean).toEqual(result);
      expect(progress).toEqual([50]);
      expect(port.terminated()).toBe(1);
    })
  );

  it.effect("maps a Worker failure reply to a named error", () =>
    Effect.gen(function* () {
      const port = fakePort((emit) =>
        emit({
          code: "clean-not-supported",
          detail: "no",
          format: "jxl",
          group: "ai-provenance",
          id: 1,
          kind: "failed",
        })
      );
      const failure = yield* engineProgram((engine) =>
        engine.clean(source, { groups: [], preset: "ai-only" })
      ).pipe(Effect.provide(layerOf(port)), Effect.flip);
      expect(failure).toBeInstanceOf(ExposeError);
      expect(failure.code).toBe("clean-not-supported");
      expect(failure.format).toBe("jxl");
    })
  );

  it.effect("maps a Worker crash to engine-failed", () =>
    Effect.gen(function* () {
      const port = fakePort((emit) => {
        port.error("the Worker crashed");
        emit({ id: 1, kind: "read", report });
      });
      const failure = yield* engineProgram((engine) =>
        engine.read(source)
      ).pipe(Effect.provide(layerOf(port)), Effect.flip);
      expect(failure.code).toBe("engine-failed");
    })
  );

  it.effect("maps an unreadable Blob to unreadable-file", () =>
    Effect.gen(function* () {
      const unreadable = new Blob([new ArrayBuffer(2)]);
      Object.defineProperty(unreadable, "arrayBuffer", {
        value: () => Promise.reject(new Error("gone")),
      });
      const failure = yield* engineProgram((engine) =>
        engine.read({ ...source, bytes: unreadable })
      ).pipe(Effect.provide(layerOf(fakePort())), Effect.flip);
      expect(failure.code).toBe("unreadable-file");
      expect(failure.detail).toBe("gone");
    })
  );

  it.effect("maps a Blob allocation failure to too-large", () =>
    Effect.gen(function* () {
      const unreadable = new Blob([new ArrayBuffer(2)]);
      Object.defineProperty(unreadable, "arrayBuffer", {
        value: () => Promise.reject(new RangeError("allocation failed")),
      });
      const failure = yield* engineProgram((engine) =>
        engine.read({ ...source, bytes: unreadable })
      ).pipe(Effect.provide(layerOf(fakePort())), Effect.flip);
      expect(failure.code).toBe("too-large");
    })
  );

  it.effect("uses the fallback text for a non-Error read failure", () =>
    Effect.gen(function* () {
      const unreadable = new Blob([new ArrayBuffer(2)]);
      Object.defineProperty(unreadable, "arrayBuffer", {
        value: () => Promise.reject("not an error"),
      });
      const failure = yield* engineProgram((engine) =>
        engine.read({ ...source, bytes: unreadable })
      ).pipe(Effect.provide(layerOf(fakePort())), Effect.flip);
      expect(failure.code).toBe("unreadable-file");
      expect(failure.detail).toBe("the file could not be read");
    })
  );

  it.effect("ignores a Worker error after the reply that settled it", () =>
    Effect.gen(function* () {
      const port = fakePort((emit) => {
        emit({ id: 1, kind: "read", report });
        port.error("a late crash");
      });
      const read = yield* engineProgram((engine) => engine.read(source)).pipe(
        Effect.provide(layerOf(port))
      );
      expect(read).toEqual(report);
    })
  );

  it.effect("uses the fallback text for an empty Worker error", () =>
    Effect.gen(function* () {
      const port = fakePort(() => port.error(""));
      const failure = yield* engineProgram((engine) =>
        engine.read(source)
      ).pipe(Effect.provide(layerOf(port)), Effect.flip);
      expect(failure.code).toBe("engine-failed");
      expect(failure.detail).toBe("the Expose Worker failed");
    })
  );

  it.effect("maps a Worker factory memory error to too-large", () =>
    Effect.gen(function* () {
      const live = ExposeEngineLive.pipe(
        Layer.provide(
          Layer.succeed(ExposeWorkerFactory, {
            create: () => {
              throw new RangeError("allocation failed");
            },
          })
        )
      );
      const failure = yield* engineProgram((engine) =>
        engine.read(source)
      ).pipe(Effect.provide(live), Effect.flip);
      expect(failure.code).toBe("too-large");
      expect(failure.detail).toBe("allocation failed");
    })
  );

  it.effect("uses fallback text when the Worker factory throws a value", () =>
    Effect.gen(function* () {
      const live = ExposeEngineLive.pipe(
        Layer.provide(
          Layer.succeed(ExposeWorkerFactory, {
            create: () => {
              // eslint-disable-next-line eslint/no-throw-literal -- exercise the non-Error rejection boundary
              throw { toString: () => "no worker" };
            },
          })
        )
      );
      const failure = yield* engineProgram((engine) =>
        engine.read(source)
      ).pipe(Effect.provide(live), Effect.flip);
      expect(failure.code).toBe("engine-failed");
      expect(failure.detail).toBe("the Expose Worker could not start");
    })
  );

  it.effect(
    "ignores a reply with the wrong kind and recovers on the right one",
    () =>
      Effect.gen(function* () {
        const port = fakePort((emit, request) => {
          emit({ id: request.id, kind: "clean", result });
          emit({ id: request.id, kind: "read", report });
        });
        const value = yield* engineProgram((engine) =>
          engine.read(source)
        ).pipe(Effect.provide(layerOf(port)));
        expect(value).toBe(report);
        expect(port.terminated()).toBe(1);
      })
  );

  it.effect("maps a send error to engine-failed", () =>
    Effect.gen(function* () {
      const port = fakePort(() => {
        throw new Error("send failed");
      });
      const failure = yield* engineProgram((engine) =>
        engine.read(source)
      ).pipe(Effect.provide(layerOf(port)), Effect.flip);
      expect(failure.code).toBe("engine-failed");
      expect(failure.detail).toBe("send failed");
      expect(port.terminated()).toBe(1);
    })
  );

  it.effect("uses the Worker fallback text for a non-Error send failure", () =>
    Effect.gen(function* () {
      const port = fakePort(() => {
        // eslint-disable-next-line eslint/no-throw-literal -- exercise the non-Error send failure boundary
        throw { toString: () => "send failed" };
      });
      const failure = yield* engineProgram((engine) =>
        engine.read(source)
      ).pipe(Effect.provide(layerOf(port)), Effect.flip);
      expect(failure.code).toBe("engine-failed");
      expect(failure.detail).toBe("the Expose Worker failed");
    })
  );

  it.effect("maps a cancelled Worker reply to the named cancelled error", () =>
    Effect.gen(function* () {
      const port = fakePort((emit) =>
        emit({ code: "cancelled", detail: "stopped", id: 1, kind: "failed" })
      );
      const failure = yield* engineProgram((engine) =>
        engine.clean(source, { groups: [], preset: "ai-only" })
      ).pipe(Effect.provide(layerOf(port)), Effect.flip);
      expect(failure.code).toBe("cancelled");
    })
  );

  it.live("terminates the Worker when interrupted", () =>
    Effect.gen(function* () {
      const started = yield* Deferred.make<void>();
      const port = fakePort(() => {
        Deferred.doneUnsafe(started, Effect.void);
      });
      const fiber = yield* Effect.forkChild(
        engineProgram((engine) =>
          engine.clean(source, { groups: [], preset: "ai-only" })
        ).pipe(Effect.provide(layerOf(port)))
      );
      yield* Deferred.await(started);
      yield* Fiber.interrupt(fiber);
      const exit = yield* Fiber.await(fiber);
      expect(port.terminated()).toBe(1);
      expect(exit._tag).toBe("Failure");
    })
  );
});

describe("an Expose clean run", () => {
  const tasks = [
    { id: "a", source },
    { id: "b", source },
    { id: "c", source },
  ];
  const request = { groups: ["authorship"], preset: "custom" } as const;

  it.effect("reuses one Worker, increments IDs, and ignores old replies", () =>
    Effect.gen(function* () {
      let created = 0;
      const progress: number[] = [];
      const port = fakePort((emit, message) => {
        emit({
          id: message.id - 1,
          kind: "failed",
          code: "engine-failed",
          detail: "late",
        });
        emit({
          id: message.id,
          kind: "progress",
          progress: {
            loadedBytes: null,
            totalBytes: null,
            percent: 50,
            phase: "cleaning",
          },
        });
        emit({ id: message.id, kind: "clean", result });
      });
      const live = ExposeEngineLive.pipe(
        Layer.provide(
          Layer.succeed(ExposeWorkerFactory, {
            create: () => {
              created += 1;
              return port.port;
            },
          })
        )
      );
      yield* engineProgram((engine) =>
        engine.cleanBatch(tasks, request, (event) => {
          if (event.kind === "progress") {
            progress.push(event.progress.percent ?? 0);
          }
        })
      ).pipe(Effect.provide(live));
      expect(created).toBe(1);
      expect(port.requests.map((message) => message.id)).toEqual([1, 2, 3]);
      expect(progress).toEqual([50, 50, 50]);
      expect(port.terminated()).toBe(1);
    })
  );

  it.effect("a named file failure does not stop the remaining files", () =>
    Effect.gen(function* () {
      const outcomes: string[] = [];
      const port = fakePort((emit, message) => {
        if (message.id === 2) {
          emit({
            id: message.id,
            kind: "failed",
            code: "too-large",
            detail: "memory",
          });
        } else {
          emit({ id: message.id, kind: "clean", result });
        }
      });
      yield* engineProgram((engine) =>
        engine.cleanBatch(tasks, request, (event) => {
          if (event.kind === "failed" || event.kind === "result") {
            outcomes.push(`${event.id}:${event.kind}`);
          }
        })
      ).pipe(Effect.provide(layerOf(port)));
      expect(outcomes).toEqual(["a:result", "b:failed", "c:result"]);
      expect(port.terminated()).toBe(1);
    })
  );

  it.effect("replaces a crashed Worker and continues with the next file", () =>
    Effect.gen(function* () {
      const crashed = fakePort(() => crashed.error("out of memory"));
      const next = fakePort((emit, message) =>
        emit({ id: message.id, kind: "clean", result })
      );
      let created = 0;
      const live = ExposeEngineLive.pipe(
        Layer.provide(
          Layer.succeed(ExposeWorkerFactory, {
            create: () => {
              created += 1;
              return created === 1 ? crashed.port : next.port;
            },
          })
        )
      );
      const outcomes: string[] = [];
      yield* engineProgram((engine) =>
        engine.cleanBatch(tasks, request, (event) => {
          if (event.kind === "failed") {
            outcomes.push(event.error.code);
          }
          if (event.kind === "result") {
            outcomes.push(event.id);
          }
        })
      ).pipe(Effect.provide(live));
      expect(outcomes).toEqual(["too-large", "b", "c"]);
      expect(crashed.terminated()).toBe(1);
      expect(next.terminated()).toBe(1);
    })
  );

  it.live(
    "cancel stops the active file and queue but keeps completed events",
    () =>
      Effect.gen(function* () {
        const waiting = yield* Deferred.make<void>();
        const completed: string[] = [];
        const port = fakePort((emit, message) => {
          if (message.id === 1) {
            emit({ id: message.id, kind: "clean", result });
          } else {
            Deferred.doneUnsafe(waiting, Effect.void);
          }
        });
        const fiber = yield* Effect.forkChild(
          engineProgram((engine) =>
            engine.cleanBatch(tasks, request, (event) => {
              if (event.kind === "result") {
                completed.push(event.id);
              }
            })
          ).pipe(Effect.provide(layerOf(port)))
        );
        yield* Deferred.await(waiting);
        yield* Fiber.interrupt(fiber);
        expect(completed).toEqual(["a"]);
        expect(port.requests).toHaveLength(2);
        expect(port.terminated()).toBe(1);
      })
  );
});
