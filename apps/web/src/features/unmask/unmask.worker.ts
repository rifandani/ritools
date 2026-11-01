/* oxlint-disable anti-slop/no-unknown-parameters, promise/prefer-await-to-callbacks, promise/prefer-await-to-then, unicorn/require-post-message-target-origin -- Dedicated Worker messages, thrown decoder values, and Effect combinators use their own APIs. */
/// <reference lib="webworker" />
import { Effect, Schema } from "effect";

import { encodeImage } from "@/features/unmask/unmask.codec";
import { compositeEffect } from "@/features/unmask/unmask.composite";
import { decodeImage } from "@/features/unmask/unmask.decode";
import { deviceMemoryGbOf } from "@/features/unmask/unmask.image";
import { createModelPort } from "@/features/unmask/unmask.model";
import { WorkerRequest } from "@/features/unmask/unmask.protocol";
import type { WorkerReply } from "@/features/unmask/unmask.protocol";
import { removeWith } from "@/features/unmask/unmask.remove";
import type {
  CompositeRequest,
  EncodeRequest,
  Matte,
  RasterImage,
  RemoveProgress,
  SourceFile,
  SourceId,
  UnmaskError,
} from "@/features/unmask/unmask.schema";
import {
  Cancelled,
  ModelFailed,
  TooLarge,
  UnreadableFile,
} from "@/features/unmask/unmask.schema";

declare const self: DedicatedWorkerGlobalScope;

/**
 * The Unmask Worker.
 *
 * It owns the decoded source, the full and preview Mattes, and the ORT
 * session. One request is handled at a time. Every message is validated with
 * its Effect Schema; an unknown shape is ignored. A DedicatedWorker receives
 * messages only from its creator, so there is no origin check: `event.origin`
 * is empty here.
 */

interface Retained {
  readonly imageToken: string;
  readonly matte: Matte;
  readonly preview: Matte;
  readonly raster: RasterImage;
}

let retained: Retained | null = null;
const model = createModelPort();
const jobs = new Map<string, AbortController>();

const post = (
  reply: WorkerReply,
  transfer: readonly Transferable[] = []
): void => {
  self.postMessage(reply, { transfer: [...transfer] });
};

const reportFailure = (requestId: string, error: UnmaskError): void => {
  self.postMessage({ _tag: "Failed", error, requestId });
};

const reportProgress = (requestId: string, event: RemoveProgress): void => {
  self.postMessage({ _tag: "Progress", event, requestId });
};

const noSource = (): UnreadableFile =>
  new UnreadableFile({
    detail: "the Worker has no source for this image",
    reason: "decode",
  });

const runRemove = async (
  request: Extract<WorkerRequest, { _tag: "Remove" }>,
  signal: AbortSignal
): Promise<void> => {
  retained = null;
  const file: SourceFile = {
    bytes: request.bytes,
    mime: request.mime,
    name: request.name,
  };
  const outcome = await Effect.runPromise(
    removeWith({
      decode: (sourceFile, format, decodeSignal) =>
        Effect.tryPromise({
          // SAFETY: the decoder maps every thrown value to a named error.
          catch: (error) => error as UnmaskError,
          try: () => decodeImage(sourceFile, format, decodeSignal),
        }),
      infer: model.infer,
    })(
      {
        deviceMemoryGb: deviceMemoryGbOf(),
        // SAFETY: the service creates the token; it is an opaque non-empty id.
        sourceId: request.imageToken as SourceId,
      },
      file,
      {
        previewMaxEdge: request.previewMaxEdge,
        report: (event) => {
          reportProgress(request.requestId, event);
        },
        signal,
      }
    )
  );
  retained = {
    imageToken: request.imageToken,
    matte: outcome.result.matte,
    preview: outcome.result.preview,
    raster: outcome.raster,
  };
  post({
    _tag: "Removed",
    requestId: request.requestId,
    result: outcome.result,
  });
};

const runComposite = async (
  request: Extract<WorkerRequest, { _tag: "Composite" }>
): Promise<void> => {
  const cached =
    retained !== null && retained.imageToken === request.imageToken
      ? retained.raster
      : null;
  const source = request.source ?? cached;
  if (source === null || source === undefined) {
    throw noSource();
  }
  const compositeRequest: CompositeRequest = {
    backdrop: request.backdrop,
    feather: request.feather,
    matte: request.matte,
    source,
  };
  const image = await Effect.runPromise(compositeEffect(compositeRequest));
  post({ _tag: "Composited", image, requestId: request.requestId });
};

const runEncode = async (
  request: Extract<WorkerRequest, { _tag: "Encode" }>,
  signal: AbortSignal
): Promise<void> => {
  const encodeRequest: EncodeRequest = {
    backdrop: request.backdrop,
    format: request.format,
    image: request.image,
    nameStem: request.nameStem,
    quality: request.quality,
  };
  const file = await encodeImage(encodeRequest, signal);
  post({ _tag: "Encoded", file, requestId: request.requestId }, [
    file.bytes.buffer,
  ]);
};

const failureOf = (error: unknown): UnmaskError => {
  if (
    error instanceof Cancelled ||
    error instanceof ModelFailed ||
    error instanceof TooLarge ||
    error instanceof UnreadableFile
  ) {
    return error;
  }
  if (error instanceof RangeError) {
    return new TooLarge({
      detail: error.message,
      height: 0,
      neededBytes: 0,
      pixels: 0,
      width: 0,
    });
  }
  const detail = error instanceof Error ? error.message : String(error);
  return /alloc|out of memory|too (?:large|big)|memory/iu.test(detail)
    ? new ModelFailed({ detail, reason: "memory" })
    : new ModelFailed({ detail, reason: "inference" });
};

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  const decoded = Schema.decodeUnknownExit(WorkerRequest)(event.data);
  if (decoded._tag === "Failure") {
    return;
  }
  const request = decoded.value;
  if (request._tag === "Cancel") {
    jobs.get(request.target)?.abort();
    return;
  }
  if (request._tag === "Close") {
    for (const controller of jobs.values()) {
      controller.abort();
    }
    jobs.clear();
    retained = null;
    post({ _tag: "Closed", requestId: request.requestId });
    return;
  }
  const controller = new AbortController();
  jobs.set(request.requestId, controller);
  const task =
    request._tag === "Remove"
      ? runRemove(request, controller.signal)
      : request._tag === "Composite"
        ? runComposite(request)
        : runEncode(request, controller.signal);
  task
    .catch((error: unknown) => {
      reportFailure(request.requestId, failureOf(error));
    })
    .finally(() => {
      jobs.delete(request.requestId);
    });
});
