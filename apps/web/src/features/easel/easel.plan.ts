import {
  cropRectOf,
  frameSizeOf,
  frameToSourceOf,
} from "@/features/easel/easel.geometry";
import type { Matrix, Rect } from "@/features/easel/easel.geometry";
import { cropPresetOf } from "@/features/easel/easel.presets";
import type { Size } from "@/features/easel/easel.presets";
import { WHITE } from "@/features/easel/easel.stack";
import type { Backdrop, EditState, Resize } from "@/features/easel/easel.stack";

/**
 * The render plan: what the renderer, the Layer adapter, and the export need
 * to draw one Edit Stack state (ADR-0041). It is derived data. Nothing here
 * touches a canvas.
 */

export const OUTPUT_FORMATS = ["png", "jpeg", "webp", "avif"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

/** The most an export can be larger than the cropped image. */
export const MAX_UPSCALE = 2;
/** The longest side and the pixel count an export can have. */
export const MAX_EXPORT_SIDE = 16_384;
export const MAX_EXPORT_PIXELS = 64_000_000;

const EXTENSION: Readonly<Record<OutputFormat, string>> = {
  avif: "avif",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

export const OUTPUT_MIME: Readonly<Record<OutputFormat, string>> = {
  avif: "image/avif",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export type Band = "annotation" | "redaction" | "watermark";

export interface RenderPlan {
  /** The effective Backdrop. JPEG has no alpha, so Transparent becomes white. */
  readonly backdrop: Backdrop;
  /** Whether the format replaced a Transparent Backdrop with white. */
  readonly backdropFallback: boolean;
  /** The layers above the photo, from the back to the front. */
  readonly bands: readonly { readonly band: Band; readonly id: string }[];
  /** The Blur radius, in source pixels. */
  readonly blurRadius: number;
  /** The crop rectangle, in frame pixels from the top left of the frame. */
  readonly crop: Rect;
  readonly exportSize: Size;
  readonly fileName: string;
  readonly frame: Size;
  /** From a frame point (origin at the frame center) to a source pixel. */
  readonly frameToSource: Matrix;
  /** The crop size in source pixels, before a Resize. */
  readonly natural: Size;
  readonly form: "ellipse" | "rectangle";
  /** Whether the export is larger than the cropped image. */
  readonly upscaled: boolean;
}

const wholePixels = (value: number): number => Math.max(1, Math.round(value));

/**
 * The display stem of a file name: no extension, no path separator, and no
 * control character. It falls back to `image`.
 */
export const nameStemOf = (name: string): string => {
  const cleaned = name
    .replace(/\.[A-Za-z0-9]{1,8}$/u, "")
    // eslint-disable-next-line no-control-regex -- control characters are the point
    .replaceAll(/[\u0000-\u001F\u007F]/gu, " ")
    .replaceAll(/[\\/:*?"<>|]+/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .replace(/^[.\s]+/u, "")
    .trim();
  return cleaned.length === 0 ? "image" : cleaned.slice(0, 120);
};

/** The export file name: `<stem>-easel.<ext>`. */
export const exportNameOf = (name: string, format: OutputFormat): string =>
  `${nameStemOf(name)}-easel.${EXTENSION[format]}`;

/** The size that fits the export limits, with the same ratio. */
const withinLimits = (size: Size): Size => {
  const { height, width } = size;
  // A size with no pixels has nothing to scale. The scale below divides by
  // the sides and by the area, so each must be above zero.
  const area = width * height;
  if (width <= 0 || height <= 0 || area <= 0) {
    return size;
  }
  const scale = Math.min(
    1,
    MAX_EXPORT_SIDE / width,
    MAX_EXPORT_SIDE / height,
    Math.sqrt(MAX_EXPORT_PIXELS / area)
  );
  const scaledHeight = Math.floor(height * scale);
  const scaledWidth = Math.floor(width * scale);
  if (
    scale === 1 ||
    !Number.isFinite(scaledHeight) ||
    !Number.isFinite(scaledWidth)
  ) {
    return size;
  }
  return {
    height: wholePixels(scaledHeight),
    width: wholePixels(scaledWidth),
  };
};

/**
 * The export size.
 *
 * A Resize wins, limited to `MAX_UPSCALE` times the cropped image. A locked
 * Resize keeps the ratio of the cropped image. Without a Resize, a social
 * network Crop Preset gives its own size (the platform size is the point of
 * the preset, so the limit does not apply), and any other crop exports at its
 * natural size.
 */
export const exportSizeOf = (state: EditState, natural: Size): Size => {
  const { resize } = state;
  if (resize === null) {
    return withinLimits(cropPresetOf(state.cropPreset).size ?? natural);
  }
  const width = wholePixels(
    Math.min(resize.width, natural.width * MAX_UPSCALE)
  );
  return withinLimits({
    // With the lock, the height follows the cropped image, so a later crop
    // change does not stretch the export.
    height: wholePixels(
      resize.locked
        ? (width * natural.height) / natural.width
        : Math.min(resize.height, natural.height * MAX_UPSCALE)
    ),
    width,
  });
};

/**
 * The Resize for a new width or height. With the lock, the other side keeps
 * the ratio of the cropped image. Both sides stay under the upscale limit.
 */
export const resizeOf = (options: {
  readonly locked: boolean;
  readonly natural: Size;
  readonly side: "height" | "width";
  readonly value: number;
  readonly current: Size;
}): Resize => {
  const { current, locked, natural, side } = options;
  const limit = natural[side] * MAX_UPSCALE;
  const value = Math.min(
    limit,
    wholePixels(Number.isFinite(options.value) ? options.value : 1)
  );
  if (!locked) {
    return { ...current, locked, [side]: value };
  }
  const ratio = natural.width / natural.height;
  return side === "width"
    ? { height: wholePixels(value / ratio), locked, width: value }
    : { height: value, locked, width: wholePixels(value * ratio) };
};

/** The effective Backdrop of one output format. */
export const backdropFor = (
  backdrop: Backdrop,
  format: OutputFormat
): { readonly backdrop: Backdrop; readonly fallback: boolean } =>
  format === "jpeg" && backdrop._tag === "Transparent"
    ? { backdrop: { _tag: "Solid", color: WHITE }, fallback: true }
    : { backdrop, fallback: false };

/**
 * Whether the export has an empty area that shows the Backdrop: the outside
 * of an Ellipse Crop, or the corners of Keep whole image.
 */
export const showsBackdrop = (state: EditState): boolean =>
  cropPresetOf(state.cropPreset).form === "ellipse" ||
  (state.keepWhole && state.straighten !== 0);

/** The id of the one Watermark Layer in a render plan. */
export const WATERMARK_ID = "watermark";

/** The layers above the photo, in their fixed bands. */
const bandsOf = (state: EditState): RenderPlan["bands"] => [
  ...state.layers.flatMap((layer) =>
    layer.hidden ? [] : [{ band: "annotation" as const, id: layer.id }]
  ),
  ...state.redactions.map((redaction) => ({
    band: "redaction" as const,
    id: redaction.id,
  })),
  ...(state.watermark === null
    ? []
    : [{ band: "watermark" as const, id: WATERMARK_ID }]),
];

export const renderPlanOf = (options: {
  readonly format: OutputFormat;
  readonly name: string;
  readonly source: Size;
  readonly state: EditState;
}): RenderPlan => {
  const { format, name, source, state } = options;
  const preset = cropPresetOf(state.cropPreset);
  const frame = frameSizeOf(source, state);
  const crop = cropRectOf(frame, state.crop, preset.ratio);
  const natural = {
    height: wholePixels(crop.height),
    width: wholePixels(crop.width),
  };
  const exportSize = exportSizeOf(state, natural);
  const { backdrop, fallback } = backdropFor(state.backdrop, format);
  return {
    backdrop,
    backdropFallback: fallback,
    bands: bandsOf(state),
    blurRadius:
      (state.finetune.blur / 100) * (Math.max(frame.width, frame.height) / 40),
    crop,
    exportSize,
    fileName: exportNameOf(name, format),
    frame,
    frameToSource: frameToSourceOf(source, state),
    natural,
    form: preset.form,
    upscaled:
      exportSize.width > natural.width || exportSize.height > natural.height,
  };
};
