/* oxlint-disable eslint/no-bitwise -- format sniffing reads fixed header bytes. */
import { Option } from "effect";

import {
  decodeLimitPixels,
  exceedsDecodeBudget,
  imageSizeOf,
} from "@/features/squeeze/squeeze";
import type { ImageSize } from "@/features/squeeze/squeeze";
import type { ImageFormat, TooLarge } from "@/features/unmask/unmask.schema";
import {
  MAX_PIXELS,
  MAX_WORKING_BYTES,
  TooLarge as TooLargeError,
} from "@/features/unmask/unmask.schema";

/**
 * Reading an image header without decoding it.
 *
 * The engine sniffs the format from the bytes and asks the header for its
 * declared size before it allocates a raster. A corrupt header can lie, so the
 * decode still decides; this is a guard, not a fact.
 */

/** The MIME type each input format decodes from. */
export const INPUT_MIME: Record<ImageFormat, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** The file extension each output format uses. */
export const OUTPUT_EXTENSION: Record<
  "png" | "webp" | "avif" | "jpeg",
  string
> = {
  avif: "avif",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

/** The MIME type each output format uses. */
export const OUTPUT_MIME: Record<"png" | "webp" | "avif" | "jpeg", string> = {
  avif: "image/avif",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const startsWith = (bytes: Uint8Array, prefix: readonly number[]): boolean => {
  if (bytes.length < prefix.length) {
    return false;
  }
  return prefix.every((value, index) => bytes[index] === value);
};

const ascii = (bytes: Uint8Array, offset: number, length: number): string => {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += String.fromCodePoint(bytes[offset + index] ?? 0);
  }
  return value;
};

const brandAt = (bytes: Uint8Array, offset: number): string =>
  ascii(bytes, offset, 4);

/**
 * The format of an image, read from its magic bytes.
 *
 * The name and the MIME type never decide it: a `.jpg` that holds a PNG is a
 * PNG, and a `.png` that holds a HEIC is unsupported.
 */
export const sniffImageFormat = (
  bytes: Uint8Array
): Option.Option<ImageFormat> => {
  if (
    startsWith(bytes, [0xff, 0xd8, 0xff]) ||
    startsWith(bytes, [0xff, 0xd8, 0xfe])
  ) {
    return Option.some("jpeg");
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return Option.some("png");
  }
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") {
    return Option.some("gif");
  }
  if (ascii(bytes, 0, 2) === "BM") {
    return Option.some("bmp");
  }
  if (
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 4) === "WEBP" &&
    bytes.length >= 16
  ) {
    return Option.some("webp");
  }
  if (ascii(bytes, 4, 4) === "ftyp") {
    const box = Math.max(
      16,
      Math.min(
        bytes.length,
        /* v8 ignore next -- @preserve an ftyp box needs at least four size bytes. */
        (bytes[0] ?? 0) * 16_777_216 +
          /* v8 ignore next -- @preserve an ftyp box needs at least four size bytes. */
          (bytes[1] ?? 0) * 65_536 +
          /* v8 ignore next -- @preserve an ftyp box needs at least four size bytes. */
          (bytes[2] ?? 0) * 256 +
          /* v8 ignore next -- @preserve an ftyp box needs at least four size bytes. */
          (bytes[3] ?? 0)
      )
    );
    const first = brandAt(bytes, 8);
    if (first === "avif" || first === "avis") {
      return Option.some("avif");
    }
    for (let offset = 16; offset + 4 <= box; offset += 4) {
      const brand = brandAt(bytes, offset);
      if (brand === "avif" || brand === "avis") {
        return Option.some("avif");
      }
    }
  }
  return Option.none();
};

/**
 * A short name for the bytes that Sniff rejected, for the error facts. It is
 * not a second detection path: it only names the family the user picked.
 */
export const rejectedLabelOf = (bytes: Uint8Array): string => {
  if (startsWith(bytes, [0xff, 0xd8])) {
    return "jpeg";
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) {
    return "png";
  }
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46])) {
    return "riff";
  }
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = brandAt(bytes, 8);
    return brand === "heic" || brand === "heix" || brand === "mif1"
      ? "heic"
      : brand;
  }
  if (
    startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) ||
    startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a])
  ) {
    return "tiff";
  }
  if (ascii(bytes, 0, 5) === "%PDF-") {
    return "pdf";
  }
  if (ascii(bytes, 0, 4) === "<svg") {
    return "svg";
  }
  return "unknown";
};

/**
 * The pixel budget for one image on this device.
 *
 * It reuses the Squeeze decode budget, so the two image tools refuse the same
 * device-sized file, and caps it at the Unmask preflight. A device that reports
 * no memory is treated as a low-end one.
 */
export const pixelBudgetOf = (deviceMemoryGb?: number): number =>
  Math.min(MAX_PIXELS, decodeLimitPixels(deviceMemoryGb));

/** The estimated working set of one source: source RGBA, Matte, and preview. */
export const workingBytesOf = (pixels: number): number => pixels * 6;

/** The header size of one file, or `null` when the format is not readable. */
export const declaredSizeOf = (
  bytes: Uint8Array,
  format: ImageFormat
): ImageSize | null => {
  // The parser reads at most the first 64 KiB, so a prefix is enough. It also
  // keeps ArrayBuffer offsets from being mistaken for the start of the file.
  const head = bytes.subarray(0, 64 * 1024);
  const copy = new Uint8Array(head.length);
  copy.set(head);
  return imageSizeOf(copy.buffer, format);
};

/**
 * The preflight decision. It returns the named `TooLarge` error before any
 * decode, or `null` when the source may decode.
 *
 * A header the parser cannot read does not refuse the file: the decode still
 * decides, and an allocation failure maps to the same error.
 */
export const preflightTooLarge = (options: {
  readonly bytes: Uint8Array;
  readonly format: ImageFormat;
  readonly deviceMemoryGb?: number;
}): TooLarge | null => {
  const size = declaredSizeOf(options.bytes, options.format);
  if (size === null) {
    return null;
  }
  const pixels = size.width * size.height;
  const neededBytes = workingBytesOf(pixels);
  const overPixels = exceedsDecodeBudget(
    size,
    pixelBudgetOf(options.deviceMemoryGb)
  );
  if (!overPixels && neededBytes <= MAX_WORKING_BYTES) {
    return null;
  }
  return new TooLargeError({
    detail: `a ${size.width}x${size.height} source is over the device budget`,
    height: size.height,
    neededBytes,
    pixels,
    width: size.width,
  });
};

/** The device memory hint Chromium exposes, or `undefined` elsewhere. */
export const deviceMemoryGbOf = (): number | undefined => {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- a server render has no navigator.
  if (typeof navigator === "undefined") {
    return undefined;
  }
  // SAFETY: `deviceMemory` is a Chromium hint that the standard type omits.
  const memory = (navigator as Navigator & { readonly deviceMemory?: number })
    .deviceMemory;
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- the hint is optional at runtime.
  return typeof memory === "number" ? memory : undefined;
};
