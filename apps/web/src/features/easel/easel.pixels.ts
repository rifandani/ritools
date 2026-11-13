import type { Point } from "@/features/easel/easel.geometry";
import type { BucketFill, RgbaColor } from "@/features/easel/easel.stack";

/**
 * The pixel rules of the Edit Stack, on plain RGBA buffers: the Bucket Fill
 * area, the Mosaic, and the Cover. A buffer has four bytes for each pixel, in
 * rows from the top, with straight (not premultiplied) alpha.
 */

export interface Raster {
  readonly height: number;
  readonly rgba: Uint8Array | Uint8ClampedArray;
  readonly width: number;
}

/** One byte of a buffer. */
const byteAt = (bytes: Uint8Array | Uint8ClampedArray, index: number): number =>
  /* v8 ignore next -- @preserve every index in this module is inside its buffer. */
  bytes[index] ?? 0;

/** The smallest Mosaic block, in pixels. A smaller block can be reversed. */
export const MIN_MOSAIC_BLOCK = 12;
/** A Mosaic block is at least this part of the longest side. */
const MOSAIC_DIVISOR = 48;

/**
 * The Mosaic block size for an image. It grows with the image, so a large
 * photo does not get blocks that are too small to hide content.
 */
export const mosaicBlockSizeOf = (width: number, height: number): number =>
  Math.max(
    MIN_MOSAIC_BLOCK,
    Math.ceil(Math.max(width, height) / MOSAIC_DIVISOR)
  );

/**
 * The Bucket Fill area: the pixels that connect to `point` (by a side) and
 * are similar to it. `tolerance` goes from 0 (the same color only) to 100
 * (every pixel). The result has one byte for each pixel: 255 inside, 0
 * outside.
 */
// oxlint-disable-next-line eslint/complexity -- one scanline fill: the seed, the run to the left, and the rows above and below.
export const bucketFillArea = (
  source: Raster,
  point: Point,
  tolerance: number
): Uint8Array => {
  const { height, rgba, width } = source;
  const area = new Uint8Array(width * height);
  const startX = Math.floor(point.x);
  const startY = Math.floor(point.y);
  if (startX < 0 || startY < 0 || startX >= width || startY >= height) {
    return area;
  }
  const limit =
    (Math.min(100, Math.max(0, Number.isFinite(tolerance) ? tolerance : 0)) /
      100) *
    255;
  const seed = (startY * width + startX) * 4;
  const seedR = byteAt(rgba, seed);
  const seedG = byteAt(rgba, seed + 1);
  const seedB = byteAt(rgba, seed + 2);
  const seedA = byteAt(rgba, seed + 3);
  const similar = (pixel: number): boolean => {
    const at = pixel * 4;
    return (
      Math.abs(byteAt(rgba, at) - seedR) <= limit &&
      Math.abs(byteAt(rgba, at + 1) - seedG) <= limit &&
      Math.abs(byteAt(rgba, at + 2) - seedB) <= limit &&
      Math.abs(byteAt(rgba, at + 3) - seedA) <= limit
    );
  };
  // A scanline fill: each stack entry is the start of one run of a row.
  const stack: number[] = [startY * width + startX];
  while (stack.length > 0) {
    const entry = stack.pop() ?? 0;
    const y = Math.floor(entry / width);
    let x = entry - y * width;
    const row = y * width;
    if (area[row + x] !== 0) {
      continue;
    }
    while (x > 0 && area[row + x - 1] === 0 && similar(row + x - 1)) {
      x -= 1;
    }
    let openAbove = false;
    let openBelow = false;
    while (x < width && area[row + x] === 0 && similar(row + x)) {
      area[row + x] = 255;
      if (y > 0) {
        const above = row - width + x;
        const open = area[above] === 0 && similar(above);
        if (open && !openAbove) {
          stack.push(above);
        }
        openAbove = open;
      }
      if (y < height - 1) {
        const below = row + width + x;
        const open = area[below] === 0 && similar(below);
        if (open && !openBelow) {
          stack.push(below);
        }
        openBelow = open;
      }
      x += 1;
    }
  }
  return area;
};

/**
 * The fill overlay of a source image: a source-sized RGBA buffer that holds
 * each Bucket Fill color on its area, and nothing elsewhere. A later fill
 * paints over an earlier one. Each area comes from the original pixels only,
 * so no other change moves it.
 */
export const fillOverlayOf = (
  source: Raster,
  fills: readonly BucketFill[]
): Uint8Array => {
  const overlay = new Uint8Array(source.width * source.height * 4);
  for (const fill of fills) {
    const area = bucketFillArea(source, fill.point, fill.tolerance);
    for (let pixel = 0; pixel < area.length; pixel += 1) {
      if (area[pixel] !== 0) {
        const at = pixel * 4;
        overlay[at] = fill.color.r;
        overlay[at + 1] = fill.color.g;
        overlay[at + 2] = fill.color.b;
        overlay[at + 3] = fill.color.a;
      }
    }
  }
  return overlay;
};

/** An area byte at or above this value is inside a Redaction. */
const AREA_THRESHOLD = 1;

/**
 * Bakes a Cover: each pixel in the area becomes the opaque color. The area
 * has one byte for each pixel. The hidden pixel values do not stay.
 */
export const bakeCover = (
  image: Raster,
  area: Uint8Array | Uint8ClampedArray,
  color: RgbaColor
): void => {
  const { rgba } = image;
  const pixels = image.width * image.height;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (byteAt(area, pixel) >= AREA_THRESHOLD) {
      const at = pixel * 4;
      rgba[at] = color.r;
      rgba[at + 1] = color.g;
      rgba[at + 2] = color.b;
      rgba[at + 3] = 255;
    }
  }
};

/**
 * Bakes a Mosaic: the image is cut into `block`-sized squares from the top
 * left, and each inside pixel becomes the average color of its whole square.
 * Give one area for all Mosaics, so no Mosaic reads the output of another.
 */
export const bakeMosaic = (
  image: Raster,
  area: Uint8Array | Uint8ClampedArray,
  block: number
): void => {
  const { height, rgba, width } = image;
  const size = Math.max(MIN_MOSAIC_BLOCK, Math.floor(block));
  for (let top = 0; top < height; top += size) {
    const bottom = Math.min(height, top + size);
    for (let left = 0; left < width; left += size) {
      const right = Math.min(width, left + size);
      let inside = false;
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const pixel = y * width + x;
          const at = pixel * 4;
          const a = byteAt(rgba, at + 3);
          // Weight the color by alpha, so a clear pixel adds no color.
          red += byteAt(rgba, at) * a;
          green += byteAt(rgba, at + 1) * a;
          blue += byteAt(rgba, at + 2) * a;
          alpha += a;
          inside ||= byteAt(area, pixel) >= AREA_THRESHOLD;
        }
      }
      if (!inside) {
        continue;
      }
      const count = (bottom - top) * (right - left);
      const r = alpha === 0 ? 0 : Math.round(red / alpha);
      const g = alpha === 0 ? 0 : Math.round(green / alpha);
      const b = alpha === 0 ? 0 : Math.round(blue / alpha);
      const a = Math.round(alpha / count);
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const pixel = y * width + x;
          if (byteAt(area, pixel) >= AREA_THRESHOLD) {
            const at = pixel * 4;
            rgba[at] = r;
            rgba[at + 1] = g;
            rgba[at + 2] = b;
            rgba[at + 3] = a;
          }
        }
      }
    }
  }
};
