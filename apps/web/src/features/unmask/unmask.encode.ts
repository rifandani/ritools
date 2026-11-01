import { OUTPUT_EXTENSION, OUTPUT_MIME } from "@/features/unmask/unmask.image";
import type {
  EncodedFile,
  OutputFormat,
  RasterImage,
} from "@/features/unmask/unmask.schema";
import {
  DEFAULT_QUALITY,
  EncodeFailed,
  MAX_PIXELS,
} from "@/features/unmask/unmask.schema";

/**
 * The naming and quality rules for a Cutout. They are pure, so Node tests own
 * them, and the Worker only supplies the encoded bytes.
 */

/** Whether a raster has any pixel below full alpha. */
export const hasAnyAlpha = (image: RasterImage): boolean => {
  for (let index = 3; index < image.rgba.length; index += 4) {
    if ((image.rgba[index] ?? 255) < 255) {
      return true;
    }
  }
  return false;
};

/**
 * The display stem with path separators, control characters, and a leading dot
 * removed. Whitespace collapses. The result is at most 120 characters and
 * falls back to `image`.
 */
export const sanitizeNameStem = (name: string): string => {
  const withoutExtension = name.replace(/\.[A-Za-z0-9]{1,8}$/u, "");
  const cleaned = withoutExtension
    // eslint-disable-next-line no-control-regex -- control characters are the point
    .replaceAll(/[\u0000-\u001F\u007F]/gu, " ")
    .replaceAll(/[\\/]+/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .replace(/^\.+/u, "")
    .trim();
  return cleaned.length === 0 ? "image" : cleaned.slice(0, 120);
};

/** The download name: `<stem>-cutout.<ext>`. */
export const cutoutNameOf = (nameStem: string, format: OutputFormat): string =>
  `${sanitizeNameStem(nameStem)}-cutout.${OUTPUT_EXTENSION[format]}`;

/** The quality the codec receives: `null` for lossless PNG. */
export const qualityFor = (
  format: OutputFormat,
  quality: number
): number | null => {
  if (format === "png") {
    return null;
  }
  const value = Number.isFinite(quality)
    ? Math.round(quality)
    : DEFAULT_QUALITY;
  return Math.min(100, Math.max(1, value));
};

/** The MIME type of one output format. */
export const outputMimeOf = (format: OutputFormat): string =>
  OUTPUT_MIME[format];

/** A source that is too large to encode is a named `TooLarge`-adjacent failure. */
export const tooLargeToEncode = (image: RasterImage): boolean =>
  image.width * image.height > MAX_PIXELS;

/** A zero-length codec result is never a file. */
export const encodedFileOf = (options: {
  readonly bytes: Uint8Array;
  readonly format: OutputFormat;
  readonly image: RasterImage;
  readonly nameStem: string;
  readonly quality: number | null;
}): EncodedFile => {
  const { bytes, format, image } = options;
  if (bytes.byteLength === 0) {
    throw new EncodeFailed({
      detail: "the codec returned no bytes",
      reason: "codec",
    });
  }
  return {
    bytes,
    bytesLength: bytes.byteLength,
    format,
    hasAlpha: format !== "jpeg" && hasAnyAlpha(image),
    height: image.height,
    mime: outputMimeOf(format),
    name: cutoutNameOf(options.nameStem, format),
    quality: options.quality,
    width: image.width,
  };
};
