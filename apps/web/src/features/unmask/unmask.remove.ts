/* oxlint-disable anti-slop/no-unknown-parameters -- decode and model values are thrown by ports; this module classifies them for the seam. */
import { Effect, Schema } from "effect";

import {
  deviceMemoryGbOf,
  preflightTooLarge,
  rejectedLabelOf,
  sniffImageFormat,
} from "@/features/unmask/unmask.image";
import type {
  ImageFormat,
  Matte,
  MatteId,
  ModelInfo,
  RasterImage,
  RemoveNote,
  RemoveOptions,
  RemoveProgress,
  RemoveResult,
  SourceFacts,
  SourceFile,
  SourceId,
  UnmaskError,
} from "@/features/unmask/unmask.schema";
import {
  Cancelled,
  DEFAULT_PREVIEW_MAX_EDGE,
  MAX_PREVIEW_MAX_EDGE,
  MIN_PREVIEW_MAX_EDGE,
  MODEL_INPUT_SIZE,
  TooLarge,
  UnreadableFile,
  UnmaskErrorSchema,
  UnsupportedFormat,
} from "@/features/unmask/unmask.schema";

/**
 * The `remove` pipeline, with the browser-only decoder and model behind ports.
 *
 * The decoder and the ONNX Runtime session are the only parts that need a
 * browser. Everything here is pure, so Node runs it against the fixtures with
 * a fake model.
 */

/** One decoded image. GIF and BMP report one frame; the first frame is used. */
export interface DecodedImage {
  readonly raster: RasterImage;
  readonly frameCount: number;
}

/** The raw model output, already in the model's square pixel grid. */
export interface Inference {
  readonly alpha: Float32Array;
  readonly width: number;
  readonly height: number;
  readonly model: ModelInfo;
  readonly notes: readonly RemoveNote[];
}

/** The browser-only decoder behind the remove pipeline. */
export interface DecodePort {
  readonly decode: (
    file: SourceFile,
    format: ImageFormat,
    signal?: AbortSignal
  ) => Effect.Effect<DecodedImage, UnmaskError>;
}

/** The browser-only model behind the remove pipeline. */
export interface ModelPort {
  readonly infer: (
    raster: RasterImage,
    options: {
      readonly signal?: AbortSignal;
      readonly report?: (event: RemoveProgress) => void;
    }
  ) => Effect.Effect<Inference, UnmaskError>;
}

export interface RemovePorts {
  readonly decode: DecodePort["decode"];
  readonly infer: ModelPort["infer"];
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

/** A Matte ID for a source, without exposing a runtime brand parser. */
const matteIdOf = (sourceId: string, suffix: string): MatteId =>
  // SAFETY: the template always yields a non-empty string; MatteId is opaque.
  `matte-${sourceId}-${suffix}` as MatteId;

/** Whether a source has meaningful alpha: at least 0.1% of pixels below 255. */
export const hasMeaningfulAlpha = (raster: RasterImage): boolean => {
  const pixels = raster.width * raster.height;
  if (pixels === 0) {
    return false;
  }
  const threshold = Math.max(1, Math.ceil(pixels / 1000));
  let transparent = 0;
  for (let index = 3; index < raster.rgba.length; index += 4) {
    if ((raster.rgba[index] ?? 255) < 255) {
      transparent += 1;
      if (transparent >= threshold) {
        return true;
      }
    }
  }
  return false;
};

/** The alpha channel of an RGBA raster, as one 8-bit sample per pixel. */
export const alphaOfRaster = (raster: RasterImage): Uint8Array => {
  const alpha = new Uint8Array(raster.width * raster.height);
  for (let index = 0; index < alpha.length; index += 1) {
    alpha[index] = raster.rgba[index * 4 + 3] ?? 255;
  }
  return alpha;
};

/** The size of the preview Matte: the source, capped on the long edge. */
export const previewSizeOf = (
  width: number,
  height: number,
  maxEdge: number = DEFAULT_PREVIEW_MAX_EDGE
) => {
  const longEdge = Math.min(
    Math.max(maxEdge, MIN_PREVIEW_MAX_EDGE),
    MAX_PREVIEW_MAX_EDGE
  );
  const sourceLong = Math.max(width, height);
  if (sourceLong <= longEdge) {
    return { height, width };
  }
  const factor = longEdge / sourceLong;
  return {
    height: Math.max(1, Math.round(height * factor)),
    width: Math.max(1, Math.round(width * factor)),
  };
};

/**
 * A box-filter downscale of the Matte alpha. It averages the source rectangle
 * behind each preview pixel, so the preview keeps the soft edge.
 */
export const downscaleAlpha = (
  alpha: Uint8Array,
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number
): Uint8Array => {
  if (targetWidth === width && targetHeight === height) {
    return Uint8Array.from(alpha);
  }
  const output = new Uint8Array(targetWidth * targetHeight);
  for (let y = 0; y < targetHeight; y += 1) {
    const top = Math.floor((y * height) / targetHeight);
    const bottom = Math.max(
      top + 1,
      Math.floor(((y + 1) * height) / targetHeight)
    );
    for (let x = 0; x < targetWidth; x += 1) {
      const left = Math.floor((x * width) / targetWidth);
      const right = Math.max(
        left + 1,
        Math.floor(((x + 1) * width) / targetWidth)
      );
      let sum = 0;
      let count = 0;
      for (let sourceY = top; sourceY < bottom; sourceY += 1) {
        const row = sourceY * width;
        for (let sourceX = left; sourceX < right; sourceX += 1) {
          sum += alpha[row + sourceX] ?? 0;
          count += 1;
        }
      }
      output[y * targetWidth + x] = count === 0 ? 0 : Math.round(sum / count);
    }
  }
  return output;
};

/** The source part of a derived Matte ID. */
const matteIdSource = (matte: Matte): string => {
  const marker = matte.matteId.lastIndexOf("-");
  return marker === -1 ? matte.matteId : matte.matteId.slice(0, marker);
};

/** The preview Matte. It is never larger than the source. */
export const previewMatteOf = (
  matte: Matte,
  maxEdge: number = DEFAULT_PREVIEW_MAX_EDGE
): Matte => {
  const size = previewSizeOf(matte.width, matte.height, maxEdge);
  return {
    alpha: downscaleAlpha(
      matte.alpha,
      matte.width,
      matte.height,
      size.width,
      size.height
    ),
    height: size.height,
    matteId: matteIdOf(matteIdSource(matte), "preview"),
    width: size.width,
  };
};

/** The source facts for the result. */
export const sourceFactsOf = (options: {
  readonly sourceId: SourceId;
  readonly file: SourceFile;
  readonly format: ImageFormat;
  readonly raster: RasterImage;
  readonly frameCount: number;
}): SourceFacts => ({
  bytes: options.file.bytes.byteLength,
  format: options.format,
  frameCount: options.frameCount,
  hasAlpha: hasMeaningfulAlpha(options.raster),
  height: options.raster.height,
  name: options.file.name,
  sourceId: options.sourceId,
  width: options.raster.width,
});

/**
 * The model input: a bilinear resize to 1024x1024, NCHW, with
 * `(pixel - 128) / 256` per channel. These are the numbers the model card
 * names; they are recorded in the engine note.
 */
export const modelInputOf = (raster: RasterImage): Float32Array => {
  const size = MODEL_INPUT_SIZE;
  const input = new Float32Array(3 * size * size);
  const plane = size * size;
  for (let y = 0; y < size; y += 1) {
    const sourceY = clamp(
      ((y + 0.5) * raster.height) / size - 0.5,
      0,
      raster.height - 1
    );
    const y0 = Math.floor(sourceY);
    const y1 = Math.min(raster.height - 1, y0 + 1);
    const wy = sourceY - y0;
    for (let x = 0; x < size; x += 1) {
      const sourceX = clamp(
        ((x + 0.5) * raster.width) / size - 0.5,
        0,
        raster.width - 1
      );
      const x0 = Math.floor(sourceX);
      const x1 = Math.min(raster.width - 1, x0 + 1);
      const wx = sourceX - x0;
      const topLeft = (y0 * raster.width + x0) * 4;
      const topRight = (y0 * raster.width + x1) * 4;
      const bottomLeft = (y1 * raster.width + x0) * 4;
      const bottomRight = (y1 * raster.width + x1) * 4;
      const target = y * size + x;
      for (let channel = 0; channel < 3; channel += 1) {
        const top =
          (raster.rgba[topLeft + channel] ?? 0) * (1 - wx) +
          (raster.rgba[topRight + channel] ?? 0) * wx;
        const bottom =
          (raster.rgba[bottomLeft + channel] ?? 0) * (1 - wx) +
          (raster.rgba[bottomRight + channel] ?? 0) * wx;
        const value = top * (1 - wy) + bottom * wy;
        input[channel * plane + target] = (value - 128) / 256;
      }
    }
  }
  return input;
};

const sigmoid = (value: number): number => 1 / (1 + Math.exp(-value));

/** Whether the model output is a logit field rather than a probability. */
const isLogitField = (values: Float32Array): boolean => {
  for (const value of values) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      return true;
    }
  }
  return false;
};

/**
 * Postprocesses the model output to a soft alpha map. It applies sigmoid only
 * when the model returned logits, then resizes to the source with bilinear
 * interpolation. It never thresholds the whole map: hair needs the soft values.
 */
export const matteFromInference = (options: {
  readonly values: Float32Array;
  readonly modelWidth: number;
  readonly modelHeight: number;
  readonly width: number;
  readonly height: number;
  readonly matteId: MatteId;
}): Matte => {
  const { values, modelWidth, modelHeight, width, height } = options;
  const logits = isLogitField(values);
  const alpha = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const sourceY = clamp(
      ((y + 0.5) * modelHeight) / height - 0.5,
      0,
      modelHeight - 1
    );
    const y0 = Math.floor(sourceY);
    const y1 = Math.min(modelHeight - 1, y0 + 1);
    const wy = sourceY - y0;
    for (let x = 0; x < width; x += 1) {
      const sourceX = clamp(
        ((x + 0.5) * modelWidth) / width - 0.5,
        0,
        modelWidth - 1
      );
      const x0 = Math.floor(sourceX);
      const x1 = Math.min(modelWidth - 1, x0 + 1);
      const wx = sourceX - x0;
      const top =
        (values[y0 * modelWidth + x0] ?? 0) * (1 - wx) +
        (values[y0 * modelWidth + x1] ?? 0) * wx;
      const bottom =
        (values[y1 * modelWidth + x0] ?? 0) * (1 - wx) +
        (values[y1 * modelWidth + x1] ?? 0) * wx;
      const raw = top * (1 - wy) + bottom * wy;
      const value = logits ? sigmoid(raw) : raw;
      alpha[y * width + x] = Math.round(
        clamp(Number.isFinite(value) ? value : 0, 0, 1) * 255
      );
    }
  }
  return { alpha, height, matteId: options.matteId, width };
};

/** The progress a cancelled run reports, so the UI can settle its state. */
const cancelled = (detail: string): Cancelled => new Cancelled({ detail });

const stopped = (signal?: AbortSignal): boolean => signal?.aborted === true;

const checkStop = (signal?: AbortSignal): Effect.Effect<void, UnmaskError> =>
  stopped(signal)
    ? Effect.fail(cancelled("the cutout was cancelled"))
    : Effect.void;

/**
 * Maps a decode or allocation failure to a named error. The decoder port may
 * already return a named error; a raw value is classified here.
 */
export const decodeFailure = (error: unknown): UnmaskError => {
  if (Schema.is(UnmaskErrorSchema)(error)) {
    return error;
  }
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  if (
    error instanceof RangeError ||
    name === "QuotaExceededError" ||
    /alloc|out of memory|too (?:large|big)|exceeds|invalid image size/iu.test(
      message
    )
  ) {
    return new TooLarge({
      detail: message,
      height: 0,
      neededBytes: 0,
      pixels: 0,
      width: 0,
    });
  }
  return new UnreadableFile({ detail: message, reason: "decode" });
};

/** The remove pipeline outcome: the seam result and the retained source. */
export interface RemoveOutcome {
  readonly raster: RasterImage;
  readonly result: RemoveResult;
}

/**
 * The remove pipeline. It sniffs, preflights, decodes once, uses the input
 * alpha when it is meaningful, otherwise runs the model, and returns the full
 * and preview Mattes.
 */
export const removeWith = (ports: RemovePorts) =>
  Effect.fn("Unmask.remove")(function* (
    context: {
      readonly sourceId: SourceId;
      readonly deviceMemoryGb?: number;
    },
    file: SourceFile,
    options: RemoveOptions = {}
  ) {
    const { signal, report } = options;
    yield* checkStop(signal);
    if (file.bytes.byteLength === 0) {
      return yield* Effect.fail(
        new UnreadableFile({ detail: "the file is empty", reason: "empty" })
      );
    }
    const format = sniffImageFormat(file.bytes);
    if (format._tag === "None") {
      return yield* Effect.fail(
        new UnsupportedFormat({
          detail: "the bytes are not one of the six input formats",
          format: rejectedLabelOf(file.bytes),
        })
      );
    }
    const tooLarge = preflightTooLarge({
      bytes: file.bytes,
      deviceMemoryGb: context.deviceMemoryGb ?? deviceMemoryGbOf(),
      format: format.value,
    });
    if (tooLarge !== null) {
      return yield* Effect.fail(tooLarge);
    }

    report?.({ _tag: "Decode" });
    const decoded = yield* ports
      .decode(file, format.value, signal)
      .pipe(Effect.mapError(decodeFailure));
    yield* checkStop(signal);

    const { raster } = decoded;
    const hasAlpha = hasMeaningfulAlpha(raster);
    const notes: RemoveNote[] = [];
    if (format.value === "gif" || format.value === "bmp") {
      notes.push({ _tag: "FirstFrame", format: format.value });
    }
    if (hasAlpha) {
      notes.push({ _tag: "InputAlpha" });
    }

    let matte: Matte;
    let model: ModelInfo | null = null;
    if (hasAlpha) {
      matte = {
        alpha: alphaOfRaster(raster),
        height: raster.height,
        matteId: matteIdOf(context.sourceId, "full"),
        width: raster.width,
      };
    } else {
      yield* checkStop(signal);
      const inference = yield* ports
        .infer(raster, { report, signal })
        .pipe(Effect.mapError(decodeFailure));
      yield* checkStop(signal);
      matte = matteFromInference({
        height: raster.height,
        matteId: matteIdOf(context.sourceId, "full"),
        modelHeight: inference.height,
        modelWidth: inference.width,
        values: inference.alpha,
        width: raster.width,
      });
      const { model: inferredModel } = inference;
      model = inferredModel;
      notes.push(...inference.notes);
    }

    const preview = previewMatteOf(matte, options.previewMaxEdge);
    if (preview.width !== matte.width || preview.height !== matte.height) {
      notes.push({
        _tag: "PreviewDownscaled",
        height: preview.height,
        width: preview.width,
      });
    }

    const source = sourceFactsOf({
      file,
      format: format.value,
      frameCount: decoded.frameCount,
      raster,
      sourceId: context.sourceId,
    });
    return {
      raster,
      result: { matte, model, notes, preview, source } satisfies RemoveResult,
    } satisfies RemoveOutcome;
  });
