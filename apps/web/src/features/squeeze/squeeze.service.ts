import { Context, Effect, Layer, Option, Queue } from "effect";

import type {
  BatchItem,
  CodecReply,
  CodecRequest,
  CodecSession,
  CodecWorkerPort,
  CompressPlan,
  ImageFormat,
  ItemResult,
  OpenedImage,
  SqueezeSettings,
} from "@/features/squeeze/squeeze";
import {
  canSkipEncoding,
  compressImage,
  ItemOutcome,
  settingsKeyOf,
  SqueezeError,
  workerCount,
} from "@/features/squeeze/squeeze";
import { CodecWorkerFactory } from "@/features/squeeze/squeeze.codec";

/** What one image asks of the client. */
export interface CompressRequest {
  readonly format: ImageFormat;
  readonly settings: SqueezeSettings;
  readonly source: Blob;
  /** The Target for this image: its own override, else the Batch Target. */
  readonly targetBytes: number;
}

/** What the codec pool does for the rest of the app. */
export interface ImageCompressor {
  /**
   * Compresses one image. It never fails: an image Squeeze cannot read, or
   * cannot shrink, is a `Rejected` or a `Miss` on that row, not a failed Batch.
   */
  readonly compress: (request: CompressRequest) => Effect.Effect<ItemOutcome>;
}

/**
 * One slot of the Worker pool. A slot holds at most one request at a time,
 * which is why a reply needs no correlation: the only pending request on this
 * slot is the one it answers.
 */
interface Slot {
  pending: null | ((reply: Effect.Effect<CodecReply, SqueezeError>) => void);
  port: CodecWorkerPort | null;
}

/** Hands a reply to the request that waits for it, if one still waits. */
const settle = (
  slot: Slot,
  reply: Effect.Effect<CodecReply, SqueezeError>
): void => {
  const { pending } = slot;
  if (pending !== null) {
    pending(reply);
  }
};

/** The Worker on a slot, started on first use. */
const portFor = (
  slot: Slot,
  create: () => CodecWorkerPort
): CodecWorkerPort => {
  const existing = slot.port;
  if (existing !== null) {
    return existing;
  }
  const port = create();
  port.subscribe({
    error: (detail) => {
      settle(
        slot,
        Effect.fail(new SqueezeError({ detail, problem: "codec-failed" }))
      );
    },
    message: (reply) => {
      settle(slot, Effect.succeed(reply));
    },
  });
  slot.port = port;
  return port;
};

/**
 * Sends one request to the Worker on the slot and waits for its answer.
 *
 * An interrupted request must not answer the next one, and the Worker cannot
 * tell us which request it was working on, so an interruption stops the Worker
 * instead. The next request on this slot starts a fresh one.
 */
const ask = (
  slot: Slot,
  create: () => CodecWorkerPort,
  request: CodecRequest,
  transfer: readonly Transferable[] = []
): Effect.Effect<CodecReply, SqueezeError> =>
  // oxlint-disable-next-line promise/prefer-await-to-callbacks promise/prefer-await-to-then -- Effect.callback is the API for a callback that resolves an Effect
  Effect.callback<CodecReply, SqueezeError>((resume, signal) => {
    const port = portFor(slot, create);
    const onAbort = () => {
      slot.pending = null;
      slot.port = null;
      port.terminate();
    };
    slot.pending = (reply) => {
      signal.removeEventListener("abort", onAbort);
      slot.pending = null;
      resume(reply);
    };
    signal.addEventListener("abort", onAbort);
    port.send(request, transfer);
  });

const failureFrom = (reply: CodecReply): Effect.Effect<never, SqueezeError> =>
  reply.kind === "failed"
    ? Effect.fail(
        new SqueezeError({ detail: reply.detail, problem: reply.problem })
      )
    : Effect.fail(
        new SqueezeError({
          detail: "the codec Worker answered the wrong request",
          problem: "codec-failed",
        })
      );

/** A reply that should have carried output, or the failure it carried instead. */
const asEncoded = (
  reply: CodecReply
): Effect.Effect<ArrayBuffer, SqueezeError> =>
  reply.kind === "encoded" ? Effect.succeed(reply.bytes) : failureFrom(reply);

/** A reply that should have carried the opened image. */
const asOpened = (
  reply: CodecReply
): Effect.Effect<OpenedImage, SqueezeError> =>
  reply.kind === "opened" ? Effect.succeed(reply.image) : failureFrom(reply);

/** The codec port over one Worker. */
const sessionFor = (
  slot: Slot,
  create: () => CodecWorkerPort
): CodecSession => ({
  encode: (step) =>
    ask(slot, create, { kind: "encode", step }).pipe(Effect.flatMap(asEncoded)),
  open: (input) =>
    ask(
      slot,
      create,
      {
        bytes: input.bytes,
        format: input.format,
        kind: "open",
        maxDimension: input.maxDimension,
      },
      [input.bytes]
    ).pipe(Effect.flatMap(asOpened)),
});

/** Reads the bytes of a dropped file. */
const readBytes = (source: Blob): Effect.Effect<ArrayBuffer, SqueezeError> =>
  Effect.tryPromise({
    catch: () =>
      new SqueezeError({
        detail: "the file could not be read",
        problem: "unreadable",
      }),
    try: () => source.arrayBuffer(),
  });

/**
 * The codec Worker pool. Workers are created on first use, so a server render
 * that builds this layer touches no browser API.
 */
export class SqueezeClient extends Context.Service<
  SqueezeClient,
  ImageCompressor
>()("@ritools/web/SqueezeClient") {
  static readonly layer = Layer.effect(
    SqueezeClient,
    Effect.gen(function* () {
      const factory = yield* CodecWorkerFactory;
      const create = () => factory.create();
      const idle = yield* Queue.unbounded<Slot>();
      const slots = Array.from(
        { length: workerCount(globalThis.navigator.hardwareConcurrency) },
        (): Slot => ({ pending: null, port: null })
      );
      yield* Queue.offerAll(idle, slots);

      /** Frees the decoded image and puts the slot back in the pool. */
      const release = (slot: Slot): Effect.Effect<void> =>
        Effect.suspend(() => {
          const { port } = slot;
          if (port !== null) {
            port.send({ kind: "release" }, []);
          }
          return Queue.offer(idle, slot).pipe(Effect.asVoid);
        });

      const compress = (
        request: CompressRequest
      ): Effect.Effect<ItemOutcome> => {
        const plan: CompressPlan = {
          inputBytes: request.source.size,
          settings: request.settings,
          targetBytes: request.targetBytes,
        };
        if (canSkipEncoding(plan)) {
          return Effect.succeed(
            ItemOutcome.UnderTarget({ size: plan.inputBytes })
          );
        }
        return Effect.gen(function* () {
          const slot = yield* Queue.take(idle);
          return yield* Effect.gen(function* () {
            // Reading the bytes after the slot is taken keeps at most one
            // file per Worker in memory.
            const bytes = yield* readBytes(request.source);
            return yield* compressImage(sessionFor(slot, create), {
              ...plan,
              bytes,
              format: request.format,
            });
          }).pipe(Effect.ensuring(release(slot)));
        }).pipe(
          // oxlint-disable-next-line promise/prefer-await-to-callbacks promise/prefer-await-to-then -- Effect.catch takes its fallback as a callback
          Effect.catch((error) =>
            Effect.succeed(ItemOutcome.Rejected({ problem: error.problem }))
          )
        );
      };

      return SqueezeClient.of({ compress });
    })
  );
}

/** One image to run, with the id that ties its result to it. */
export interface QueuedImage {
  readonly id: string;
  readonly item: BatchItem;
}

/**
 * Compresses one Batch Item.
 *
 * An image Squeeze cannot read, or a format it does not accept, is a row state
 * and never a failed run: the user still gets the other rows.
 */
export const compressItem = (
  client: ImageCompressor,
  id: string,
  item: BatchItem,
  settings: SqueezeSettings
): Effect.Effect<ItemResult> => {
  const { format, source } = item;
  const targetBytes = item.targetBytes ?? settings.targetBytes;
  const key = settingsKeyOf(settings, targetBytes);
  if (Option.isNone(format)) {
    return Effect.succeed({
      id,
      key,
      outcome: ItemOutcome.Rejected({ problem: "unsupported" }),
    });
  }
  return client
    .compress({ format: format.value, settings, source, targetBytes })
    .pipe(Effect.map((outcome): ItemResult => ({ id, key, outcome })));
};

/**
 * Compresses a Batch, with a bounded number of images in flight, and reports
 * each result as it lands.
 *
 * The bound is what keeps a large Batch alive: every image is a decode, and
 * decoding all of them at once exhausts the device.
 */
export const runBatch = (
  client: ImageCompressor,
  images: readonly QueuedImage[],
  settings: SqueezeSettings,
  report: (result: ItemResult) => Effect.Effect<void>
): Effect.Effect<void> =>
  Effect.forEach(
    images,
    (image) =>
      compressItem(client, image.id, image.item, settings).pipe(
        Effect.tap(report)
      ),
    {
      concurrency: workerCount(globalThis.navigator.hardwareConcurrency),
      discard: true,
    }
  );
