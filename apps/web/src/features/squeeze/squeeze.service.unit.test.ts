import { describe, expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Layer, Option } from "effect";

import type {
  BatchItem,
  CodecReply,
  CodecRequest,
  CodecWorkerPort,
} from "@/features/squeeze/squeeze";
import {
  DEFAULT_SETTINGS,
  ItemOutcome,
  settingsKeyOf,
  workerCount,
} from "@/features/squeeze/squeeze";
import { CodecWorkerFactory } from "@/features/squeeze/squeeze.codec";
import type {
  CompressRequest,
  ImageCompressor,
  QueuedImage,
} from "@/features/squeeze/squeeze.service";
import {
  compressItem,
  runBatch,
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
  format: Option.some("png"),
  id: "a",
  name: "a.png",
  size: 1000,
  source: blobOf(1000),
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
  format: "jpeg",
  settings: DEFAULT_SETTINGS,
  source: blobOf(4000),
  targetBytes: 500,
  ...overrides,
});

const imageOf = (outcome: ItemOutcome) =>
  ItemOutcome.$match(outcome, {
    Compressed: (image) => image,
    Miss: (image) => image,
    Rejected: () => null,
    UnderTarget: () => null,
  });

const openReply: CodecReply = {
  image: { height: 100, sourceHeight: 100, sourceWidth: 100, width: 100 },
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

      expect(outcome._tag).toBe("UnderTarget");
      expect(rig.records.length).toBe(0);
    })
  );

  it.live("compresses one image through the Worker", () =>
    Effect.gen(function* () {
      const rig = makeRig(codecReply);
      const outcome = yield* compressWith(rig, requestOf());

      expect(outcome._tag).toBe("Compressed");
      expect(imageOf(outcome)?.size).toBe(480);
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
        _tag: "Rejected",
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
        _tag: "Rejected",
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
        _tag: "Rejected",
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
        _tag: "Rejected",
        problem: "codec-failed",
      });
    })
  );

  it.live("reuses its Workers instead of making one for each image", () => {
    const rig = makeRig(codecReply);
    return Effect.gen(function* () {
      const client = yield* SqueezeClient;
      for (let index = 0; index < 8; index += 1) {
        yield* client.compress(requestOf({ format: "jpeg" }));
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

describe("compressItem", () => {
  const clientThatDies: ImageCompressor = {
    compress: () => Effect.die("compressItem must not call the codec"),
  };

  it.effect("rejects a format Squeeze does not read, without a codec", () =>
    Effect.gen(function* () {
      const result = yield* compressItem(
        clientThatDies,
        "a",
        itemOf({ format: Option.none() }),
        DEFAULT_SETTINGS
      );

      expect(result.outcome).toMatchObject({
        _tag: "Rejected",
        problem: "unsupported",
      });
    })
  );

  it.effect("uses the image's own Target when it has one", () =>
    Effect.gen(function* () {
      const seen: CompressRequest[] = [];
      const client: ImageCompressor = {
        compress: (request): Effect.Effect<ItemOutcome> => {
          seen.push(request);
          return Effect.succeed(ItemOutcome.UnderTarget({ size: 1 }));
        },
      };

      const result = yield* compressItem(
        client,
        "a",
        itemOf({ targetBytes: 300 }),
        DEFAULT_SETTINGS
      );

      expect(seen[0]?.targetBytes).toBe(300);
      expect(seen[0]?.format).toBe("png");
      expect(result.key).toBe(settingsKeyOf(DEFAULT_SETTINGS, 300));
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
            return ItemOutcome.UnderTarget({ size: 1 });
          }),
      };
      const images: QueuedImage[] = Array.from({ length: 24 }, (_, index) => ({
        id: `id-${index}`,
        item: {
          format: Option.some("jpeg"),
          id: `id-${index}`,
          name: `a${index}.jpg`,
          size: 1000,
          source: blobOf(1000),
          targetBytes: null,
        },
      }));
      const reported: string[] = [];

      yield* runBatch(client, images, DEFAULT_SETTINGS, (result) =>
        Effect.sync(() => {
          reported.push(result.id);
        })
      );

      expect(reported.length).toBe(24);
      expect(peak).toBeGreaterThan(1);
      expect(peak).toBeLessThanOrEqual(4);
    })
  );

  it.live("takes the first slot when there is one", () =>
    Effect.gen(function* () {
      const client: ImageCompressor = {
        compress: (): Effect.Effect<ItemOutcome> =>
          Effect.succeed(ItemOutcome.UnderTarget({ size: 1 })),
      };
      yield* runBatch(client, [], DEFAULT_SETTINGS, () => Effect.void);
    })
  );
});
