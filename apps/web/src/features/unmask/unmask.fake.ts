import { Effect, Option, Schema } from "effect";

import {
  cutoutName,
  detectFormat,
  exceedsPreflight,
  outputMimeOf,
} from "@/features/unmask/unmask";
import {
  EncodeFailed,
  TooLarge,
  UnmaskErrorSchema,
  UnreadableFile,
  UnsupportedFormat,
} from "@/features/unmask/unmask.engine";
import type {
  CompositeRequest,
  EncodeRequest,
  EncodedFile,
  Matte,
  ModelInfo,
  RasterImage,
  RemoveOptions,
  RemoveResult,
  SourceFacts,
  SourceFile,
  UnmaskEngineContract,
  UnmaskError,
} from "@/features/unmask/unmask.engine";
import {
  anyTransparent,
  createMatte,
  fakeMatteBytes,
  featherMatte,
  makeMatteId,
  meaningfulAlpha,
  refineMatte,
  scaleMatte,
} from "@/features/unmask/unmask.matte";

/**
 * The deterministic fake engine behind the seam.
 *
 * It decodes the real file, keeps a real Matte, runs the real Magic Brush
 * operations, and writes a real file. It runs no model and makes no network
 * request. The Ship issue replaces this layer; the UI and the seam stay.
 *
 * This module is browser-only and loaded on the first Cut out, so the model
 * path and every codec stay out of the entry chunk and the empty state.
 */

const MODEL: ModelInfo = {
  backend: "wasm",
  bytes: 44_229_662,
  id: "isnet-int8",
  licence: "MIT",
  licenceUrl: "https://github.com/xrds/isnet-general-onnx-int8",
  name: "ISNet int8",
  sha256: "fake-engine",
  version: "fake-1",
};

let sourceSequence = 0;
let matteSequence = 0;

const CANCELLED: UnmaskError = { _tag: "Cancelled" };

const aborted = (signal: AbortSignal | undefined): boolean =>
  signal?.aborted === true;

const checkAbort = (signal: AbortSignal | undefined): void => {
  if (aborted(signal)) {
    throw CANCELLED;
  }
};

const decodeUnmaskError = Schema.decodeUnknownOption(UnmaskErrorSchema);

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- a caught failure is unparsed at this boundary.
const toUnmaskError = (error: unknown): UnmaskError =>
  Option.getOrElse(
    decodeUnmaskError(error),
    () => new UnreadableFile({ reason: "decode" })
  );

const canvasOf = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context === null) {
    throw new Error("The browser did not provide a 2D canvas");
  }
  return { canvas, context };
};

const decode = async (file: SourceFile): Promise<RasterImage> => {
  if (file.bytes.length === 0) {
    throw new UnreadableFile({ reason: "empty" });
  }
  const blob = new Blob([Uint8Array.from(file.bytes)], { type: file.mime });
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new UnreadableFile({ reason: "decode" });
  }
  if (exceedsPreflight(bitmap.width, bitmap.height)) {
    throw new TooLarge({
      height: bitmap.height,
      neededBytes: bitmap.width * bitmap.height * 4,
      pixels: bitmap.width * bitmap.height,
      width: bitmap.width,
    });
  }
  const { canvas, context } = canvasOf(bitmap.width, bitmap.height);
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return {
    height: canvas.height,
    rgba: new Uint8Array(image.data),
    width: canvas.width,
  };
};

interface PreviewMatte {
  readonly matte: Matte;
  readonly scaled: boolean;
}

const previewMatteOf = (matte: Matte, maxEdge: number): PreviewMatte => {
  const edge = Math.max(matte.width, matte.height);
  if (edge <= maxEdge) {
    return { matte, scaled: false };
  }
  const ratio = maxEdge / edge;
  const width = Math.max(1, Math.round(matte.width * ratio));
  const height = Math.max(1, Math.round(matte.height * ratio));
  return { matte: scaleMatte(matte, width, height), scaled: true };
};

const alphaOfRaster = (raster: RasterImage): Uint8Array => {
  const alpha = new Uint8Array(raster.width * raster.height);
  for (let index = 0; index < alpha.length; index += 1) {
    alpha[index] = raster.rgba[index * 4 + 3] ?? 255;
  }
  return alpha;
};

const removeImpl = async (
  file: SourceFile,
  options: RemoveOptions,
  retain: (sourceId: string, raster: RasterImage) => void
): Promise<RemoveResult> => {
  const format = detectFormat(file.bytes);
  if (format === null) {
    throw new UnsupportedFormat({ format: file.mime || "unknown" });
  }
  options.report?.({ _tag: "Decode" });
  checkAbort(options.signal);
  const raster = await decode(file);
  checkAbort(options.signal);
  const sourceAlpha = alphaOfRaster(raster);
  const keepsAlpha = meaningfulAlpha(sourceAlpha);
  let model: ModelInfo | null = null;
  if (keepsAlpha) {
    options.report?.({ _tag: "ModelInit" });
    await Promise.resolve();
  } else {
    options.report?.({ _tag: "ModelInit" });
    await Promise.resolve();
    model = MODEL;
  }
  checkAbort(options.signal);
  options.report?.({ _tag: "Infer" });
  const alpha = keepsAlpha
    ? sourceAlpha
    : fakeMatteBytes(raster.width, raster.height);
  checkAbort(options.signal);
  const full = createMatte(
    makeMatteId((matteSequence += 1)),
    raster.width,
    raster.height,
    alpha
  );
  const preview = previewMatteOf(
    full,
    Math.max(512, Math.min(2048, options.previewMaxEdge ?? 2048))
  );
  const source: SourceFacts = {
    bytes: file.bytes.length,
    format,
    frameCount: 1,
    hasAlpha: anyTransparent(sourceAlpha),
    height: raster.height,
    name: file.name,
    // SAFETY: the counter yields a non-empty string, the SourceId brand.
    sourceId: `source-${(sourceSequence += 1)}` as SourceFacts["sourceId"],
    width: raster.width,
  };
  retain(source.sourceId, raster);
  const notes = [
    ...(keepsAlpha
      ? [{ _tag: "InputAlpha" } as const]
      : [{ _tag: "ModelCached" } as const]),
    ...(format === "gif" || format === "bmp"
      ? [{ _tag: "FirstFrame", format } as const]
      : []),
    ...(preview.scaled
      ? [
          {
            _tag: "PreviewDownscaled",
            height: preview.matte.height,
            width: preview.matte.width,
          } as const,
        ]
      : []),
  ];
  return {
    matte: full,
    model,
    notes,
    preview: preview.matte,
    source,
  };
};

const maskCanvasOf = (matte: Matte, width: number, height: number) => {
  const { canvas, context } = canvasOf(width, height);
  const image = context.createImageData(width, height);
  for (let index = 0; index < matte.alpha.length; index += 1) {
    image.data[index * 4] = 255;
    image.data[index * 4 + 1] = 255;
    image.data[index * 4 + 2] = 255;
    image.data[index * 4 + 3] = matte.alpha[index] ?? 0;
  }
  context.putImageData(image, 0, 0);
  return canvas;
};

const subjectCanvasOf = (
  source: RasterImage,
  matte: Matte,
  feather: number
): HTMLCanvasElement => {
  const { width } = source;
  const { height } = source;
  const { canvas, context } = canvasOf(width, height);
  const image = context.createImageData(width, height);
  image.data.set(source.rgba);
  context.putImageData(image, 0, 0);
  const feathered =
    feather > 0
      ? featherMatte(
          {
            alpha: matte.alpha,
            height: matte.height,
            matteId: matte.matteId,
            width: matte.width,
          },
          feather
        )
      : matte;
  const mask = maskCanvasOf(feathered, width, height);
  context.globalCompositeOperation = "destination-in";
  context.drawImage(mask, 0, 0);
  context.globalCompositeOperation = "source-over";
  return canvas;
};

const blurBackdropOf = (
  source: RasterImage,
  radius: number
): HTMLCanvasElement => {
  const { canvas, context } = canvasOf(source.width, source.height);
  const image = context.createImageData(source.width, source.height);
  image.data.set(source.rgba);
  const sourceCanvas = canvasOf(source.width, source.height);
  sourceCanvas.context.putImageData(image, 0, 0);
  context.filter = `blur(${Math.max(0, radius / 2)}px)`;
  context.drawImage(sourceCanvas.canvas, 0, 0);
  context.filter = "none";
  return canvas;
};

const compositeImpl = (request: CompositeRequest): RasterImage => {
  checkAbort(request.signal);
  const { matte, source, backdrop } = request;
  const { canvas, context } = canvasOf(source.width, source.height);
  if (backdrop._tag === "Solid") {
    context.fillStyle = `rgba(${backdrop.color.r}, ${backdrop.color.g}, ${backdrop.color.b}, 1)`;
    context.fillRect(0, 0, source.width, source.height);
  } else if (backdrop._tag === "Blur") {
    context.drawImage(blurBackdropOf(source, backdrop.radius), 0, 0);
  }
  context.drawImage(subjectCanvasOf(source, matte, request.feather), 0, 0);
  checkAbort(request.signal);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return {
    height: source.height,
    rgba: new Uint8Array(image.data),
    width: source.width,
  };
};

const encodesAlpha = (format: EncodeRequest["format"]) =>
  format === "png" || format === "webp" || format === "avif";

const encodeImpl = async (request: EncodeRequest): Promise<EncodedFile> => {
  checkAbort(request.signal);
  const transparent = anyTransparent(
    (() => {
      const alpha = new Uint8Array(request.image.width * request.image.height);
      for (let index = 0; index < alpha.length; index += 1) {
        alpha[index] = request.image.rgba[index * 4 + 3] ?? 255;
      }
      return alpha;
    })()
  );
  if (request.format === "jpeg" && transparent) {
    throw new EncodeFailed({ reason: "jpeg-transparent" });
  }
  const { canvas, context } = canvasOf(
    request.image.width,
    request.image.height
  );
  const image = context.createImageData(
    request.image.width,
    request.image.height
  );
  image.data.set(request.image.rgba);
  context.putImageData(image, 0, 0);
  const quality =
    request.format === "png"
      ? undefined
      : Math.min(1, Math.max(0.01, request.quality / 100));
  let blob: Blob | null;
  try {
    // oxlint-disable-next-line promise/avoid-new -- canvas.toBlob is callback-based
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, outputMimeOf(request.format), quality);
    });
  } catch {
    throw new EncodeFailed({ reason: "codec" });
  }
  if (blob === null || blob.size === 0) {
    throw new EncodeFailed({ reason: "codec" });
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  checkAbort(request.signal);
  return {
    bytes,
    bytesLength: bytes.length,
    format: request.format,
    hasAlpha: encodesAlpha(request.format) && transparent,
    height: request.image.height,
    mime: outputMimeOf(request.format),
    name: cutoutName(request.nameStem, request.format),
    quality: request.format === "png" ? null : request.quality,
    width: request.image.width,
  };
};

/** The fake engine plus the source cache its preview needs. */
export interface FakeUnmaskEngine extends UnmaskEngineContract {
  /** The decoded source of one `remove` call. It is released on Close. */
  readonly sourceOf: (sourceId: string) => RasterImage | null;
  readonly releaseSource: (sourceId: string) => void;
}

export const makeFakeEngine = (): FakeUnmaskEngine => {
  const sources = new Map<string, RasterImage>();
  const engine: FakeUnmaskEngine = {
    composite: (request) =>
      Effect.try({
        catch: toUnmaskError,
        try: () => compositeImpl(request),
      }),
    encode: (request) =>
      Effect.tryPromise({
        catch: toUnmaskError,
        try: () => encodeImpl(request),
      }),
    refine: (request) => refineMatte(request),
    releaseSource: (sourceId) => {
      sources.delete(sourceId);
    },
    remove: (file, options = {}) =>
      Effect.tryPromise({
        catch: toUnmaskError,
        try: () =>
          removeImpl(file, options, (sourceId, raster) => {
            sources.set(sourceId, raster);
          }),
      }),
    sourceOf: (sourceId) => sources.get(sourceId) ?? null,
  };
  return engine;
};
