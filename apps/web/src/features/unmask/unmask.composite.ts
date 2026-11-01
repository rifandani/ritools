import { Effect } from "effect";

import { workingBytesOf } from "@/features/unmask/unmask.image";
import { featherMatte } from "@/features/unmask/unmask.matte";
import type {
  Backdrop,
  CompositeRequest,
  Matte,
  MatteId,
  RasterImage,
  UnmaskError,
} from "@/features/unmask/unmask.schema";
import {
  Cancelled,
  DEFAULT_BLUR_RADIUS,
  MAX_WORKING_BYTES,
  TooLarge,
} from "@/features/unmask/unmask.schema";

/**
 * Feather, the Backdrop, and the Subject.
 *
 * Feather blurs the Matte alpha, never the colour. The Backdrop is new pixels
 * behind the Subject. The output keeps the source dimensions. Nothing here
 * encodes, reads the model, or changes the Matte.
 */

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

/**
 * The three box widths that approximate a Gaussian of this sigma. The error is
 * small enough that the 10-90% transition width stays within one pixel of the
 * Gaussian. The engine note records the approximation.
 */
export const boxWidthsFor = (
  sigma: number
): readonly [number, number, number] => {
  if (!(sigma > 0)) {
    return [1, 1, 1];
  }
  const ideal = Math.sqrt((12 * sigma * sigma) / 3 + 1);
  const lower = Math.max(1, Math.floor(ideal));
  const lowerOdd = lower % 2 === 0 ? lower - 1 : lower;
  const upperOdd = lowerOdd + 2;
  const count = Math.round(
    (12 * sigma * sigma - 3 * lowerOdd * lowerOdd - 12 * lowerOdd - 9) /
      (-4 * lowerOdd - 4)
  );
  const upperCount = clamp(count, 0, 3);
  // SAFETY: the array literal has exactly three entries, one per box pass.
  return Array.from({ length: 3 }, (_, index) =>
    index < 3 - upperCount ? lowerOdd : upperOdd
  ) as [number, number, number];
};

const checkStopped = (signal?: AbortSignal): void => {
  if (signal?.aborted === true) {
    throw new Cancelled({ detail: "the composite was cancelled" });
  }
};

/** One horizontal box pass over a float plane, with a clamped edge. */
const boxHorizontal = (
  source: Float32Array,
  target: Float32Array,
  width: number,
  height: number,
  radius: number,
  signal?: AbortSignal
): void => {
  const window = radius * 2 + 1;
  for (let y = 0; y < height; y += 1) {
    if (y % 64 === 0) {
      checkStopped(signal);
    }
    const row = y * width;
    let sum = 0;
    for (let offset = -radius; offset <= radius; offset += 1) {
      sum += source[row + clamp(offset, 0, width - 1)] ?? 0;
    }
    for (let x = 0; x < width; x += 1) {
      target[row + x] = sum / window;
      sum -= source[row + clamp(x - radius, 0, width - 1)] ?? 0;
      sum += source[row + clamp(x + radius + 1, 0, width - 1)] ?? 0;
    }
  }
};

/** One vertical box pass over a float plane, with a clamped edge. */
const boxVertical = (
  source: Float32Array,
  target: Float32Array,
  width: number,
  height: number,
  radius: number,
  signal?: AbortSignal
): void => {
  const window = radius * 2 + 1;
  for (let x = 0; x < width; x += 1) {
    if (x % 64 === 0) {
      checkStopped(signal);
    }
    let sum = 0;
    for (let offset = -radius; offset <= radius; offset += 1) {
      sum += source[clamp(offset, 0, height - 1) * width + x] ?? 0;
    }
    for (let y = 0; y < height; y += 1) {
      target[y * width + x] = sum / window;
      sum -= source[clamp(y - radius, 0, height - 1) * width + x] ?? 0;
      sum += source[clamp(y + radius + 1, 0, height - 1) * width + x] ?? 0;
    }
  }
};

/** A three-pass box blur of one float plane. */
export const blurPlane = (options: {
  readonly source: Float32Array;
  readonly width: number;
  readonly height: number;
  readonly sigma: number;
  readonly signal?: AbortSignal;
}): Float32Array => {
  const { width, height, signal } = options;
  const sigma = Math.max(0, options.sigma);
  if (sigma === 0) {
    return Float32Array.from(options.source);
  }
  const current = Float32Array.from(options.source);
  const intermediate = new Float32Array(current.length);
  for (const widthOfBox of boxWidthsFor(sigma)) {
    boxHorizontal(
      current,
      intermediate,
      width,
      height,
      (widthOfBox - 1) / 2,
      signal
    );
    boxVertical(
      intermediate,
      current,
      width,
      height,
      (widthOfBox - 1) / 2,
      signal
    );
  }
  return current;
};

/**
 * Feather. It blurs the Matte alpha and returns one 8-bit sample per pixel.
 * `feather: 0` is exactly the original alpha. The pure operation lives in
 * `unmask.matte.ts`, so the preview and the export share one implementation.
 */
export const featherAlpha = (options: {
  readonly alpha: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly feather: number;
  readonly signal?: AbortSignal;
}): Uint8Array => {
  const feather = clamp(
    Number.isFinite(options.feather) ? options.feather : 0,
    0,
    50
  );
  if (feather === 0) {
    return options.alpha;
  }
  checkStopped(options.signal);
  const feathered = featherMatte(
    {
      alpha: options.alpha,
      height: options.height,
      // SAFETY: the id is opaque and never parsed; one constant is enough here.
      matteId: "feather" as MatteId,
      width: options.width,
    },
    feather
  );
  checkStopped(options.signal);
  return feathered.alpha;
};

const radiusOf = (backdrop: Backdrop): number => {
  if (backdrop._tag !== "Blur") {
    return 0;
  }
  return clamp(
    Number.isFinite(backdrop.radius) ? backdrop.radius : DEFAULT_BLUR_RADIUS,
    0,
    50
  );
};

/** The original pixels over white, for the Blur Backdrop. */
const overWhite = (source: RasterImage): Float32Array => {
  const plane = new Float32Array(source.width * source.height * 3);
  for (let index = 0; index < source.width * source.height; index += 1) {
    const alpha = (source.rgba[index * 4 + 3] ?? 255) / 255;
    for (let channel = 0; channel < 3; channel += 1) {
      const value = source.rgba[index * 4 + channel] ?? 0;
      plane[index * 3 + channel] = value * alpha + 255 * (1 - alpha);
    }
  }
  return plane;
};

/** Blurs the original image for a Blur Backdrop. */
const blurBackdrop = (options: {
  readonly source: RasterImage;
  readonly radius: number;
  readonly signal?: AbortSignal;
}): Float32Array => {
  const { source } = options;
  const radius = clamp(options.radius, 0, 50);
  const plane = overWhite(source);
  if (radius === 0) {
    return plane;
  }
  const sigma = radius / 2;
  const blurred = new Float32Array(plane.length);
  const channel = new Float32Array(source.width * source.height);
  const scratch = new Float32Array(channel.length);
  for (let index = 0; index < 3; index += 1) {
    for (let pixel = 0; pixel < channel.length; pixel += 1) {
      channel[pixel] = plane[pixel * 3 + index] ?? 0;
    }
    const current = channel;
    const next = scratch;
    for (const widthOfBox of boxWidthsFor(sigma)) {
      const boxRadius = (widthOfBox - 1) / 2;
      boxHorizontal(
        current,
        next,
        source.width,
        source.height,
        boxRadius,
        options.signal
      );
      boxVertical(
        next,
        current,
        source.width,
        source.height,
        boxRadius,
        options.signal
      );
    }
    for (let pixel = 0; pixel < channel.length; pixel += 1) {
      blurred[pixel * 3 + index] = current[pixel] ?? 0;
    }
  }
  return blurred;
};

/**
 * Composites the Subject over the Backdrop. The source RGB is straight, so the
 * Matte is applied once. `Solid` and `Blur` write an opaque result.
 */
// oxlint-disable-next-line eslint/complexity -- one pass owns three Backdrop branches.
export const compositeRaster = (options: {
  readonly source: RasterImage;
  readonly matte: Matte;
  readonly backdrop: Backdrop;
  readonly feather: number;
  readonly signal?: AbortSignal;
}): RasterImage => {
  const { source, matte, backdrop, signal } = options;
  if (matte.width !== source.width || matte.height !== source.height) {
    throw new Error("Unmask: the source and the Matte must share a size");
  }
  const pixels = source.width * source.height;
  if (
    pixels * 4 > MAX_WORKING_BYTES ||
    workingBytesOf(pixels) > MAX_WORKING_BYTES
  ) {
    throw new TooLarge({
      detail: "the composite working set is over 1 GiB",
      height: source.height,
      neededBytes: workingBytesOf(pixels),
      pixels,
      width: source.width,
    });
  }
  const alpha = featherAlpha({
    alpha: matte.alpha,
    feather: options.feather,
    height: matte.height,
    signal,
    width: matte.width,
  });
  const output = new Uint8Array(pixels * 4);

  if (backdrop._tag === "Transparent") {
    for (let index = 0; index < pixels; index += 1) {
      const offset = index * 4;
      output[offset] = source.rgba[offset] ?? 0;
      output[offset + 1] = source.rgba[offset + 1] ?? 0;
      output[offset + 2] = source.rgba[offset + 2] ?? 0;
      output[offset + 3] = alpha[index] ?? 0;
    }
    return { height: source.height, rgba: output, width: source.width };
  }

  if (backdrop._tag === "Solid") {
    const { color } = backdrop;
    for (let index = 0; index < pixels; index += 1) {
      const offset = index * 4;
      const coverage = (alpha[index] ?? 0) / 255;
      output[offset] = Math.round(
        (source.rgba[offset] ?? 0) * coverage + color.r * (1 - coverage)
      );
      output[offset + 1] = Math.round(
        (source.rgba[offset + 1] ?? 0) * coverage + color.g * (1 - coverage)
      );
      output[offset + 2] = Math.round(
        (source.rgba[offset + 2] ?? 0) * coverage + color.b * (1 - coverage)
      );
      output[offset + 3] = 255;
    }
    return { height: source.height, rgba: output, width: source.width };
  }

  const subject = overWhite(source);
  const background = blurBackdrop({
    radius: radiusOf(backdrop),
    signal,
    source,
  });
  for (let index = 0; index < pixels; index += 1) {
    const offset = index * 4;
    const coverage = (alpha[index] ?? 0) / 255;
    for (let channel = 0; channel < 3; channel += 1) {
      const front = subject[index * 3 + channel] ?? 0;
      const behind = background[index * 3 + channel] ?? 0;
      output[offset + channel] = Math.round(
        front * coverage + behind * (1 - coverage)
      );
    }
    output[offset + 3] = 255;
  }
  return { height: source.height, rgba: output, width: source.width };
};

/** The pure composite behind the seam. */
// oxlint-disable-next-line eslint/complexity -- one pass owns three Backdrop branches.
export const compositeEffect = (
  request: CompositeRequest
): Effect.Effect<RasterImage, UnmaskError> => {
  const { source } = request;
  return Effect.suspend(() => {
    try {
      return Effect.succeed(
        compositeRaster({
          backdrop: request.backdrop,
          feather: request.feather,
          matte: request.matte,
          signal: request.signal,
          source,
        })
      );
    } catch (error) {
      if (error instanceof Cancelled || error instanceof TooLarge) {
        return Effect.fail(error);
      }
      // A size mismatch or another defect is not a product error.
      throw error;
    }
  });
};
