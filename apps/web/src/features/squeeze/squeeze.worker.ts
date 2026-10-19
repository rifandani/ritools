/// <reference lib="webworker" />
import avifEncode from "@jsquash/avif/encode";
import jpegEncode from "@jsquash/jpeg/encode";
import { optimise as optimisePng } from "@jsquash/oxipng";
import pngEncode from "@jsquash/png/encode";
import webpEncode from "@jsquash/webp/encode";

import type {
  CodecReply,
  CodecRequest,
  EncodeStep,
  ImageFormat,
  SqueezeProblem,
} from "@/features/squeeze/squeeze";
import {
  MIME_TYPE,
  quantizeLevels,
  scaleToFit,
} from "@/features/squeeze/squeeze";

declare let self: DedicatedWorkerGlobalScope;

/**
 * oxipng effort, 0-6. Higher is smaller and slower, and the search multiplies
 * every encode, so the effort stays fixed and modest in v1.
 */
const OXIPNG_LEVEL = 3;

/**
 * The image the last `open` read. Kept here so each rung of the ladder costs an
 * encode and not a decode. `bytes` is the file as it arrived, which is what a
 * lossless PNG rung optimises.
 */
interface Opened {
  readonly bytes: ArrayBuffer;
  readonly format: ImageFormat;
  readonly image: ImageData;
  readonly resized: boolean;
  readonly sourceHeight: number;
  readonly sourceWidth: number;
}

let opened: Opened | null = null;

const post = (
  message: CodecReply,
  transfer: readonly Transferable[] = []
): void => {
  self.postMessage(message, { transfer: [...transfer] });
};

/** Reports a failure. `detail` is text a person can read; the pool logs it. */
const fail = (problem: SqueezeProblem, detail: string): void => {
  post({ detail, kind: "failed", problem });
};

/** The pixels of a bitmap, drawn at `width` by `height`. */
const pixelsOf = (
  source: CanvasImageSource,
  width: number,
  height: number
): ImageData => {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("Squeeze needs a 2D canvas context");
  }
  context.drawImage(source, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
};

const read = async (request: {
  readonly bytes: ArrayBuffer;
  readonly format: ImageFormat;
  readonly maxDimension: number | null;
}): Promise<Opened> => {
  const bitmap = await createImageBitmap(
    new Blob([request.bytes], { type: MIME_TYPE[request.format] })
  );
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  const size = scaleToFit(
    { height: sourceHeight, width: sourceWidth },
    request.maxDimension ?? Math.max(sourceHeight, sourceWidth)
  );
  const image = pixelsOf(bitmap, size.width, size.height);
  bitmap.close();
  return {
    bytes: request.bytes,
    format: request.format,
    image,
    resized: size.width !== sourceWidth || size.height !== sourceHeight,
    sourceHeight,
    sourceWidth,
  };
};

const current = (): Opened => {
  if (opened === null) {
    throw new Error("Squeeze encoded before it opened an image");
  }
  return opened;
};

/** One PNG rung: exact when it can be, quantised when the Target needs it. */
const encodePng = async (step: EncodeStep): Promise<ArrayBuffer> => {
  const state = current();
  if (step.levels === null) {
    // The original bytes are already exact, so the lossless rung only
    // recompresses their deflate stream. A resize changes the pixels, and then
    // the rung re-encodes the ones on screen.
    return optimisePng(
      state.resized ? await pngEncode(state.image) : state.bytes,
      { level: OXIPNG_LEVEL }
    );
  }
  const quantised = quantizeLevels(state.image, step.levels);
  const encoded = await pngEncode(
    new ImageData(
      new Uint8ClampedArray(quantised.data),
      quantised.width,
      quantised.height
    )
  );
  return optimisePng(encoded, { level: OXIPNG_LEVEL });
};

const encode = (step: EncodeStep): Promise<ArrayBuffer> => {
  const state = current();
  if (state.format === "png") {
    return encodePng(step);
  }
  if (state.format === "avif") {
    return avifEncode(state.image, { quality: step.quality });
  }
  if (state.format === "webp") {
    return webpEncode(state.image, { quality: step.quality });
  }
  return jpegEncode(state.image, { quality: step.quality });
};

const handle = async (request: CodecRequest): Promise<void> => {
  if (request.kind === "release") {
    opened = null;
    return;
  }
  if (request.kind === "open") {
    try {
      const state = await read(request);
      opened = state;
      post({
        image: {
          height: state.image.height,
          sourceHeight: state.sourceHeight,
          sourceWidth: state.sourceWidth,
          width: state.image.width,
        },
        kind: "opened",
      });
    } catch (error) {
      fail(
        "unreadable",
        error instanceof Error ? error.message : "the image could not be read"
      );
    }
    return;
  }
  try {
    const bytes = await encode(request.step);
    post({ bytes, kind: "encoded" }, [bytes]);
  } catch (error) {
    fail(
      "codec-failed",
      error instanceof Error ? error.message : "the codec failed"
    );
  }
};

self.addEventListener("message", (event: MessageEvent<CodecRequest>) => {
  void handle(event.data);
});
