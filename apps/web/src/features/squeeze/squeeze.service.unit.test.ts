import { describe, expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Layer, Option } from "effect";

import type {
  BatchItem,
  CodecReply,
  CodecRequest,
  CodecWorkerPort,
  SqueezeOutcome,
  SqueezeSettings,
} from "@/features/squeeze/squeeze";
import {
  alreadyFitsOutcome,
  DEFAULT_SETTINGS,
  rejectedOutcome,
  settingsKeyOf,
  workerCount,
} from "@/features/squeeze/squeeze";
import { CodecWorkerFactory } from "@/features/squeeze/squeeze.codec";
import type {
  CompressRequest,
  CompressTask,
  ImageCompressor,
} from "@/features/squeeze/squeeze.service";
import {
  compressItem,
  runBatch,
  runBatchTotal,
  SqueezeClient,
} from "@/features/squeeze/squeeze.service";

interface PortRecord {
  readonly emitError: (detail: string) => void;
  readonly port: CodecWorkerPort;
  readonly requests: CodecRequest[];
  readonly terminations: () => number;
}

/** A Blob whose bytes cannot be read, which no real Blob is. */
const unreadableBlob = (): Blob => {
  const source = new Blob([new ArrayBuffer(4000)]);
  Object.defineProperty(source, "arrayBuffer", {
    value: () => Promise.reject(new Error("gone")),
  });
  return source;
};

const blobOf = (size: number): Blob => new Blob([new ArrayBuffer(size)]);

const itemOf = (overrides: Partial<BatchItem> = {}): BatchItem => ({
  folderPath: null,
  format: Option.some("jpeg"),
  id: "a",
  lastModified: 1,
  name: "a.jpg",
  size: 4000,
  source: blobOf(4000),
  targetBytes: null,
  ...overrides,
});

interface Rig {
  readonly layer: Layer.Layer<CodecWorkerFactory>;
  readonly records: PortRecord[];
}

/**
 * A stand-in for the codec Worker. It answers each request from `reply`, and
 * answers nothing at all when `reply` returns `null`.
 */
const makeRig = (
  reply: (request: CodecRequest) => CodecReply | null,
  onSend?: (request: CodecRequest) => void
): Rig => {
  const records: PortRecord[] = [];
  const layer = Layer.succeed(CodecWorkerFactory, {
    create: (): CodecWorkerPort => {
      const requests: CodecRequest[] = [];
      let answer: ((reply: CodecReply) => void) | null = null;
      let onFailure: ((detail: string) => void) | null = null;
      let terminations = 0;
      const port: CodecWorkerPort = {
        send: (request) => {
          requests.push(request);
          onSend?.(request);
          const pending = answer;
          const replyTo = reply(request);
          if (replyTo !== null && pending !== null) {
            queueMicrotask(() => {
              pending(replyTo);
            });
          }
        },
        subscribe: ({ error, message }) => {
          onFailure = error;
          answer = message;
        },
        terminate: () => {
          terminations += 1;
        },
      };
      records.push({
        emitError: (error) => {
          onFailure?.(error);
        },
        port,
        requests,
        terminations: () => terminations,
      });
      return port;
    },
  });
  return { layer, records };
};

const compressWith = (rig: Rig, request: CompressRequest) =>
  Effect.gen(function* () {
    const client = yield* SqueezeClient;
    return yield* client.compress(request);
  }).pipe(Effect.provide(SqueezeClient.layer.pipe(Layer.provide(rig.layer))));

const requestOf = (
  overrides: Partial<CompressRequest> = {}
): CompressRequest => ({
  inputFormat: "jpeg",
  settings: DEFAULT_SETTINGS,
  source: blobOf(4000),
  targetBytes: 500,
  ...overrides,
});

const openReply: CodecReply = {
  image: {
    animated: false,
    hasAlpha: false,
    height: 100,
    sourceHeight: 100,
    sourceWidth: 100,
    width: 100,
  },
  kind: "opened",
};

/** A Worker that opens any image and encodes `quality * 10` bytes. */
const codecReply = (request: CodecRequest): CodecReply | null => {
  if (request.kind === "open") {
    return openReply;
  }
  if (request.kind === "encode") {
    return {
      bytes: new ArrayBuffer(request.step.quality * 10),
      kind: "encoded",
    };
  }
  return null;
};

describe("SqueezeClient.compress", () => {
  it.effect("skips an image that already fits, and starts no Worker", () =>
    Effect.gen(function* () {
      const rig = makeRig(codecReply);
      const outcome = yield* compressWith(
        rig,
        requestOf({ source: blobOf(100), targetBytes: 500 })
      );

      expect(outcome.kind).toBe("already-fits");
      expect(rig.records.length).toBe(0);
    })
  );

  it.live("compresses one image through the Worker", () =>
    Effect.gen(function* () {
      const rig = makeRig(codecReply);
      const outcome = yield* compressWith(rig, requestOf());

      expect(outcome.kind).toBe("done");
      expect(outcome.outputBytes).toBe(480);
      expect(rig.records[0]?.requests.map((request) => request.kind)).toEqual([
        "open",
        "encode",
        "encode",
        "encode",
        "encode",
        "release",
      ]);
    })
  );

  it.live("reports a row Squeeze cannot read", () =>
    Effect.gen(function* () {
      const rig = makeRig(() => ({
        detail: "not an image",
        kind: "failed",
        problem: "unreadable",
      }));
      const outcome = yield* compressWith(rig, requestOf());

      expect(outcome).toMatchObject({
        kind: "rejected",
        problem: "unreadable",
      });
    })
  );

  it.live("reports a row when the reply answers another request", () =>
    Effect.gen(function* () {
      const rig = makeRig(() => ({
        bytes: new ArrayBuffer(10),
        kind: "encoded",
      }));
      const outcome = yield* compressWith(rig, requestOf());

      expect(outcome).toMatchObject({
        kind: "rejected",
        problem: "codec-failed",
      });
    })
  );

  it.live("reports a file whose bytes cannot be read", () =>
    Effect.gen(function* () {
      const rig = makeRig(codecReply);
      const outcome = yield* compressWith(
        rig,
        requestOf({ source: unreadableBlob() })
      );

      expect(outcome).toMatchObject({
        kind: "rejected",
        problem: "unreadable",
      });
    })
  );

  it.live("reports a Worker failure with the text it read", () =>
    Effect.gen(function* () {
      const rig = makeRig((request) => {
        if (request.kind === "open") {
          rig.records.at(-1)?.emitError("the codec crashed");
        }
        return null;
      });
      const outcome = yield* compressWith(rig, requestOf());

      expect(outcome).toMatchObject({
        kind: "rejected",
        problem: "codec-failed",
      });
    })
  );

  it.live("reports a codec that is not cached yet while offline", () =>
    Effect.gen(function* () {
      const rig = makeRig(() => ({
        detail: "the import failed",
        kind: "failed",
        problem: "codec-offline",
      }));
      const outcome = yield* compressWith(
        rig,
        requestOf({
          inputFormat: "avif",
          settings: { ...DEFAULT_SETTINGS, outputFormat: "avif" },
        })
      );

      expect(outcome).toMatchObject({
        kind: "rejected",
        problem: "codec-offline",
      });
    })
  );

  it.live("replaces a Worker that crashed before the next row", () =>
    Effect.gen(function* () {
      let crashed = false;
      const rig: Rig = makeRig(
        (request) => {
          if (request.kind === "open") {
            return openReply;
          }
          return {
            bytes: new ArrayBuffer(400),
            kind: "encoded",
          };
        },
        (request) => {
          if (!crashed && request.kind === "open") {
            crashed = true;
            queueMicrotask(() => {
              rig.records[0]?.emitError("the worker crashed");
            });
          }
        }
      );

      yield* Effect.gen(function* () {
        const client = yield* SqueezeClient;
        const first = yield* client.compress(requestOf());
        const second = yield* client.compress(requestOf());

        expect(first).toMatchObject({
          kind: "rejected",
          problem: "codec-failed",
        });
        expect(second.kind).toBe("done");
      }).pipe(
        Effect.provide(SqueezeClient.layer.pipe(Layer.provide(rig.layer)))
      );

      expect(rig.records.length).toBe(2);
      expect(rig.records[0]?.terminations()).toBeGreaterThan(0);
    })
  );

  it.live("reuses its Workers instead of making one for each image", () => {
    const rig = makeRig(codecReply);
    return Effect.gen(function* () {
      const client = yield* SqueezeClient;
      for (let index = 0; index < 8; index += 1) {
        yield* client.compress(requestOf({ inputFormat: "jpeg" }));
      }

      const opens = rig.records.reduce(
        (total, record) =>
          total +
          record.requests.filter((request) => request.kind === "open").length,
        0
      );
      expect(opens).toBe(8);
      expect(rig.records.length).toBeLessThan(8);
      expect(rig.records.length).toBe(
        workerCount(globalThis.navigator.hardwareConcurrency)
      );
    }).pipe(Effect.provide(SqueezeClient.layer.pipe(Layer.provide(rig.layer))));
  });

  it.live("stops the Worker when a request is interrupted", () =>
    Effect.gen(function* () {
      const sent = yield* Deferred.make<null>();
      const rig = makeRig((request) => {
        if (request.kind !== "open") {
          return { bytes: new ArrayBuffer(10), kind: "encoded" };
        }
        Effect.runSync(Deferred.succeed(sent, null));
        return null;
      });

      yield* Effect.gen(function* () {
        const fiber = yield* Effect.forkScoped(compressWith(rig, requestOf()));
        yield* Deferred.await(sent);
        yield* Fiber.interrupt(fiber);
      }).pipe(Effect.scoped);

      expect(rig.records[0]?.terminations()).toBe(1);
    })
  );
});

const taskOf = (overrides: Partial<CompressTask> = {}): CompressTask => ({
  id: "a",
  item: itemOf(),
  keyTargetBytes: 200_000,
  raised: false,
  targetBytes: 200_000,
  ...overrides,
});

describe("compressItem", () => {
  const clientThatDies: ImageCompressor = {
    compress: () => Effect.die("compressItem must not call the codec"),
  };

  it.effect("rejects a format Squeeze does not read, without a codec", () =>
    Effect.gen(function* () {
      const result = yield* compressItem(
        clientThatDies,
        taskOf({ item: itemOf({ format: Option.none() }) }),
        DEFAULT_SETTINGS
      );

      expect(result.outcome).toMatchObject({
        kind: "rejected",
        problem: "unsupported",
      });
    })
  );

  it.effect("uses the task's Target and keys the result by the share", () =>
    Effect.gen(function* () {
      const seen: CompressRequest[] = [];
      const client: ImageCompressor = {
        compress: (request): Effect.Effect<SqueezeOutcome> => {
          seen.push(request);
          return Effect.succeed(rejectedOutcome(1, "unsupported"));
        },
      };

      const result = yield* compressItem(
        client,
        taskOf({ targetBytes: 300 }),
        DEFAULT_SETTINGS
      );

      expect(seen[0]?.targetBytes).toBe(300);
      expect(seen[0]?.inputFormat).toBe("jpeg");
      expect(result.key).toBe(settingsKeyOf(DEFAULT_SETTINGS, 200_000));
    })
  );

  it.effect("adds the raised-Budget notes on the second pass", () =>
    Effect.gen(function* () {
      const client: ImageCompressor = {
        compress: () =>
          Effect.succeed({
            ...rejectedOutcome(1000, "unsupported"),
            kind: "miss",
            outputBytes: 1300,
          }),
      };

      const result = yield* compressItem(
        client,
        taskOf({ raised: true, targetBytes: 130_000 }),
        DEFAULT_SETTINGS
      );

      expect(result.outcome.raisedTargetBytes).toBe(130_000);
      expect(result.outcome.notes).toContainEqual({
        bytes: 130_000,
        kind: "still-over",
      });
    })
  );

  it.effect("rejects a zero-byte file before it reaches the codec", () =>
    Effect.gen(function* () {
      const result = yield* compressItem(
        clientThatDies,
        taskOf({
          item: itemOf({ size: 0, source: blobOf(0) }),
          targetBytes: 200_000,
        }),
        DEFAULT_SETTINGS
      );

      expect(result.outcome.kind).toBe("rejected");
      expect(result.outcome.problem).toBe("unreadable");
    })
  );
});

describe("runBatch", () => {
  it.live("bounds the images in flight and reports each result", () =>
    Effect.gen(function* () {
      let current = 0;
      let peak = 0;
      const client: ImageCompressor = {
        compress: () =>
          Effect.gen(function* () {
            current += 1;
            peak = Math.max(peak, current);
            yield* Effect.yieldNow;
            yield* Effect.yieldNow;
            yield* Effect.yieldNow;
            current -= 1;
            return rejectedOutcome(1, "unsupported");
          }),
      };
      const tasks: CompressTask[] = Array.from({ length: 24 }, (_, index) => ({
        id: `id-${index}`,
        item: itemOf({ id: `id-${index}`, name: `a${index}.jpg` }),
        keyTargetBytes: 200_000,
        raised: false,
        targetBytes: 200_000,
      }));
      const reported: string[] = [];

      yield* runBatch(client, tasks, DEFAULT_SETTINGS, (result) =>
        Effect.sync(() => {
          reported.push(result.id);
        })
      );

      expect(reported.length).toBe(24);
      expect(peak).toBeGreaterThan(1);
      expect(peak).toBeLessThanOrEqual(4);
    })
  );

  it.live("keeps the results that landed when the run stops", () =>
    Effect.gen(function* () {
      const reported: string[] = [];
      const client: ImageCompressor = {
        compress: (request) =>
          request.source.size === 1
            ? Effect.succeed(rejectedOutcome(1, "unsupported"))
            : Effect.never,
      };
      const tasks: CompressTask[] = [
        {
          id: "a",
          item: itemOf({ id: "a", source: blobOf(1) }),
          keyTargetBytes: 200_000,
          raised: false,
          targetBytes: 200_000,
        },
        {
          id: "b",
          item: itemOf({ id: "b", source: blobOf(2) }),
          keyTargetBytes: 200_000,
          raised: false,
          targetBytes: 200_000,
        },
      ];

      yield* Effect.gen(function* () {
        const fiber = yield* Effect.forkScoped(
          runBatch(client, tasks, DEFAULT_SETTINGS, (result) =>
            Effect.sync(() => {
              reported.push(result.id);
            })
          )
        );
        yield* Effect.yieldNow;
        yield* Effect.yieldNow;
        yield* Fiber.interrupt(fiber);
      }).pipe(Effect.scoped);

      expect(reported).toEqual(["a"]);
    })
  );

  it.effect("reports a row working before it lands, and not after", () =>
    Effect.gen(function* () {
      const events: string[] = [];
      const client: ImageCompressor = {
        compress: () => Effect.succeed(rejectedOutcome(1, "unsupported")),
      };
      const tasks: CompressTask[] = ["a", "b"].map((id) => ({
        id,
        item: itemOf({ id, name: `${id}.jpg` }),
        keyTargetBytes: 200_000,
        raised: false,
        targetBytes: 200_000,
      }));

      yield* runBatch(
        client,
        tasks,
        DEFAULT_SETTINGS,
        (result) =>
          Effect.sync(() => {
            events.push(`land:${result.id}`);
          }),
        (id, working) =>
          Effect.sync(() => {
            events.push(`${id}:${working ? "start" : "end"}`);
          })
      );

      for (const id of ["a", "b"]) {
        expect(events.filter((event) => event.startsWith(`${id}:`))).toEqual([
          `${id}:start`,
          `${id}:end`,
        ]);
        expect(events.indexOf(`${id}:start`)).toBeLessThan(
          events.indexOf(`land:${id}`)
        );
        expect(events.indexOf(`land:${id}`)).toBeLessThan(
          events.indexOf(`${id}:end`)
        );
      }
    })
  );

  it.live("reports a stopped row as no longer working", () =>
    Effect.gen(function* () {
      const events: string[] = [];
      const client: ImageCompressor = {
        compress: () => Effect.never,
      };

      yield* Effect.gen(function* () {
        const fiber = yield* Effect.forkScoped(
          runBatch(
            client,
            [taskOf()],
            DEFAULT_SETTINGS,
            () => Effect.void,
            (id, working) =>
              Effect.sync(() => {
                events.push(`${id}:${working ? "start" : "end"}`);
              })
          )
        );
        yield* Effect.yieldNow;
        yield* Fiber.interrupt(fiber);
      }).pipe(Effect.scoped);

      expect(events).toEqual(["a:start", "a:end"]);
    })
  );
});

const batchSettings = (
  overrides: Partial<SqueezeSettings> = {}
): SqueezeSettings => ({
  ...DEFAULT_SETTINGS,
  batchTotalBytes: 300_000,
  sizeMode: "batch-total",
  ...overrides,
});

const outcomeFor = (target: number, size: number): SqueezeOutcome => ({
  files: [],
  inputBytes: size,
  kind: size <= target ? "done" : "miss",
  notes: [],
  outputBytes: size,
  parts: [],
  problem: null,
  raisedTargetBytes: null,
  smallestStep: size <= target ? null : "q20",
  underTargetCount: size <= target ? 1 : 0,
  writtenCount: 0,
});

const firstImage = {
  id: "a",
  item: itemOf({ id: "a", size: 40_000, source: blobOf(40_000) }),
};

const batchImages = [
  {
    id: "a",
    item: itemOf({ id: "a", size: 40_000, source: blobOf(40_000) }),
  },
  {
    id: "b",
    item: itemOf({ id: "b", size: 110_000, source: blobOf(110_000) }),
  },
  {
    id: "c",
    item: itemOf({ id: "c", size: 120_000, source: blobOf(120_000) }),
  },
];

describe("runBatchTotal", () => {
  it.live("re-shares the unused bytes once and turns a Miss into DONE", () =>
    Effect.gen(function* () {
      const seen: { id: string; target: number | null }[] = [];
      const client: ImageCompressor = {
        compress: (request) =>
          Effect.sync(() => {
            // A is already under its share, exactly as SqueezeClient's
            // pre-check would decide before it takes a Worker.
            if (request.source.size === 40_000) {
              return alreadyFitsOutcome(40_000);
            }
            const size = request.source.size === 110_000 ? 130_000 : 140_000;
            seen.push({
              id: request.source.size === 110_000 ? "b" : "c",
              target: request.targetBytes,
            });
            return outcomeFor(request.targetBytes ?? 0, size);
          }),
      };
      const landed = new Map<string, SqueezeOutcome>();
      const reported: string[] = [];

      yield* runBatchTotal(client, batchImages, batchSettings(), (result) =>
        Effect.sync(() => {
          landed.set(result.id, result.outcome);
          reported.push(result.id);
        })
      );

      // The share is 100 KB, so the first pass hits b and c; the 60 KB pool
      // gives both 30 KB and raises their Target to 130 KB.
      expect(seen).toContainEqual({ id: "b", target: 100_000 });
      expect(seen).toContainEqual({ id: "c", target: 100_000 });
      expect(seen).toContainEqual({ id: "b", target: 130_000 });
      expect(seen).toContainEqual({ id: "c", target: 130_000 });

      expect(landed.get("a")?.kind).toBe("already-fits");
      expect(landed.get("b")?.kind).toBe("done");
      expect(landed.get("b")?.raisedTargetBytes).toBe(130_000);
      expect(landed.get("c")?.kind).toBe("miss");
      expect(landed.get("c")?.notes).toContainEqual({
        bytes: 130_000,
        kind: "still-over",
      });
      expect(reported).toEqual(["a", "b", "c", "b", "c"]);
    })
  );

  it.live("runs nothing when the share is under 10 KB", () =>
    Effect.gen(function* () {
      let calls = 0;
      const client: ImageCompressor = {
        compress: () =>
          Effect.sync(() => {
            calls += 1;
            return outcomeFor(0, 1);
          }),
      };

      yield* runBatchTotal(
        client,
        batchImages,
        batchSettings({ batchTotalBytes: 20_000 }),
        () => Effect.void
      );

      expect(calls).toBe(0);
    })
  );

  it.live("runs a Per-image Batch through the same reporter", () =>
    Effect.gen(function* () {
      const reported: string[] = [];
      const client: ImageCompressor = {
        compress: () => Effect.succeed(rejectedOutcome(1, "unsupported")),
      };

      yield* runBatchTotal(
        client,
        [firstImage],
        { ...DEFAULT_SETTINGS, sizeMode: "per-image" },
        (result) =>
          Effect.sync(() => {
            reported.push(result.id);
          })
      );

      expect(reported).toEqual(["a"]);
    })
  );
});

describe("runBatchTotal with rejected rows", () => {
  it.live("leaves a rejected row out of the unused-byte pool", () =>
    Effect.gen(function* () {
      const client: ImageCompressor = {
        compress: () => Effect.succeed(rejectedOutcome(0, "codec-failed")),
      };
      const landed = new Map<string, SqueezeOutcome>();
      yield* runBatchTotal(client, batchImages, batchSettings(), (result) =>
        Effect.sync(() => {
          landed.set(result.id, result.outcome);
        })
      );

      expect(
        [...landed.values()].every((outcome) => outcome.kind === "rejected")
      ).toBe(true);
    })
  );
});
