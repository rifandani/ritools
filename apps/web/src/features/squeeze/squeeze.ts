import { Effect, Option, Schema } from "effect";

import type { DroppedFile } from "@/core/libs/files";
import {
  clampFileName,
  fingerprintOf,
  uniqueZipPath,
  safeZipSegments,
} from "@/core/libs/files";

export type { DroppedFile } from "@/core/libs/files";
export { clampFileName, safeZipSegments } from "@/core/libs/files";
export { formatBytes } from "@/core/utils/file-size";

/**
 * Squeeze: the domain of compressing a Batch of images.
 *
 * Everything here is pure or Effect. The browser sits behind the `CodecSession`
 * port, so the search, the outcome rules and the Batch budget are unit-tested
 * in Node.
 */

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                  */
/* -------------------------------------------------------------------------- */

/** The four formats Squeeze can write. */
const ImageFormat = Schema.Literals(["jpeg", "png", "webp", "avif"]);
export type ImageFormat = typeof ImageFormat.Type;

/** The six formats Squeeze can read. GIF and BMP are input only. */
const InputFormat = Schema.Literals([
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "bmp",
]);
export type InputFormat = typeof InputFormat.Type;

/** The file format Squeeze writes: one format, Keep, or Multi. */
const OutputFormat = Schema.Literals([
  "jpeg",
  "webp",
  "avif",
  "png",
  "keep",
  "multi",
]);
export type OutputFormat = typeof OutputFormat.Type;

/** How Squeeze chooses output size. */
const SizeMode = Schema.Literals(["per-image", "batch-total", "fixed-quality"]);
export type SizeMode = typeof SizeMode.Type;

/** The outcome word one row prints. */
const OutcomeKind = Schema.Literals([
  "done",
  "already-fits",
  "miss",
  "bigger",
  "rejected",
]);
export type OutcomeKind = typeof OutcomeKind.Type;

/** Why Squeeze could not compress one image. */
const SqueezeProblem = Schema.Literals([
  "unsupported",
  "unreadable",
  "too-large",
  "codec-failed",
  "codec-offline",
]);
export type SqueezeProblem = typeof SqueezeProblem.Type;

/** A failure that stopped Squeeze from reading or encoding one image. */
export class SqueezeError extends Schema.TaggedError<SqueezeError>()(
  "SqueezeError",
  {
    detail: Schema.String,
    problem: SqueezeProblem,
  }
) {}

/** The MIME type of each format Squeeze writes. */
export const MIME_TYPE: Record<ImageFormat, string> = {
  avif: "image/avif",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** The format a MIME type names. */
const INPUT_BY_MIME = new Map<string, InputFormat>([
  ["image/avif", "avif"],
  ["image/bmp", "bmp"],
  ["image/gif", "gif"],
  ["image/jpeg", "jpeg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

/** The format a file extension names. */
const INPUT_BY_EXTENSION = new Map<string, InputFormat>([
  ["avif", "avif"],
  ["bmp", "bmp"],
  ["gif", "gif"],
  ["jpeg", "jpeg"],
  ["jpg", "jpeg"],
  ["png", "png"],
  ["webp", "webp"],
]);

/** The extension Squeeze writes for a format. */
const EXTENSION: Record<ImageFormat, string> = {
  avif: "avif",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

/** The extension Squeeze writes for a format. */
const outputExtensionOf = (format: ImageFormat): string => EXTENSION[format];

/**
 * The input format of a file. The MIME type wins, because a drag from a file
 * manager sometimes carries no type and never carries a wrong one.
 */
export const inputFormatOf = (file: {
  readonly name: string;
  readonly type: string;
}): Option.Option<InputFormat> => {
  const byMime = INPUT_BY_MIME.get(file.type);
  if (byMime !== undefined) {
    return Option.some(byMime);
  }
  const dot = file.name.lastIndexOf(".");
  const extension = dot === -1 ? "" : file.name.slice(dot + 1).toLowerCase();
  return Option.fromNullishOr(INPUT_BY_EXTENSION.get(extension));
};

/**
 * The format Keep writes for an input. GIF and BMP become PNG: Squeeze has no
 * encoder for either.
 */
export const keepFormatOf = (format: InputFormat): ImageFormat => {
  if (format === "gif" || format === "bmp") {
    return "png";
  }
  return format;
};

/** The files one row writes: one format, Keep's format, or the Multi trio. */
export const formatsFor = (
  outputFormat: OutputFormat,
  inputFormat: InputFormat
): readonly ImageFormat[] => {
  if (outputFormat === "keep") {
    return [keepFormatOf(inputFormat)];
  }
  if (outputFormat === "multi") {
    return ["jpeg", "webp", "avif"];
  }
  return [outputFormat];
};

/* -------------------------------------------------------------------------- */
/* Settings                                                                    */
/* -------------------------------------------------------------------------- */

/** The settings one Batch runs under. */
export interface SqueezeSettings {
  /** The total byte ceiling of a Batch in `batch-total` mode. */
  readonly batchTotalBytes: number;
  /** The pixel cap on height, or `null` for no cap. Never upscales. */
  readonly maxHeight: number | null;
  /** The pixel cap on width, or `null` for no cap. Never upscales. */
  readonly maxWidth: number | null;
  readonly outputFormat: OutputFormat;
  /** Whether a JPEG output copies the source's EXIF. */
  readonly preserveExif: boolean;
  /** Whether the ZIP mirrors the dropped folder paths. */
  readonly preserveFolders: boolean;
  /** Encoder quality, for `fixed-quality`. PNG stays lossless. */
  readonly quality: number;
  readonly sizeMode: SizeMode;
  /** The Target for one image in `per-image` mode, in bytes. */
  readonly targetBytes: number;
}

/** Bytes in a kilobyte, as the interface states it. */
export const BYTES_PER_KB = 1000;

export const MIN_QUALITY = 10;
export const MAX_QUALITY = 95;
export const MIN_TARGET_BYTES = 10 * BYTES_PER_KB;
export const MAX_TARGET_BYTES = 10_000 * BYTES_PER_KB;
/** A Per-image Budget under this is an invalid Batch total. */
export const MIN_BUDGET_BYTES = MIN_TARGET_BYTES;
export const MIN_MAX_DIMENSION = 16;
export const MAX_MAX_DIMENSION = 10_000;

const DEFAULT_TARGET_BYTES = 200 * BYTES_PER_KB;
const DEFAULT_BATCH_TOTAL_BYTES = 2000 * BYTES_PER_KB;
const DEFAULT_QUALITY = 80;

export const DEFAULT_SETTINGS: SqueezeSettings = {
  batchTotalBytes: DEFAULT_BATCH_TOTAL_BYTES,
  maxHeight: null,
  maxWidth: null,
  outputFormat: "jpeg",
  preserveExif: false,
  preserveFolders: true,
  quality: DEFAULT_QUALITY,
  sizeMode: "per-image",
  targetBytes: DEFAULT_TARGET_BYTES,
};

/** Whether an Output Format is offered in a Size Mode. */
export const isOutputAvailable = (
  outputFormat: OutputFormat,
  sizeMode: SizeMode
): boolean => !(outputFormat === "multi" && sizeMode === "batch-total");

/** Whether a row may carry a Target override. */
export const canOverrideTarget = (sizeMode: SizeMode): boolean =>
  sizeMode === "per-image";

/** One image's even share of a Batch Budget. The engine counts 1000 bytes per KB. */
export const batchShare = (totalBytes: number, count: number): number =>
  count <= 0 ? 0 : Math.floor(totalBytes / count);

/** What is wrong with the settings, if anything. */
export type SettingsIssue =
  | { readonly kind: "target-range" }
  | { readonly kind: "resize-range" }
  | { readonly kind: "quality-range" }
  | { readonly kind: "multi-batch-total" }
  | { readonly kind: "share-too-small"; readonly share: number };

const ISSUE_KEY = {
  "multi-batch-total": "squeezeReasonMultiBatchTotal",
  "quality-range": "squeezeReasonQualityRange",
  "resize-range": "squeezeReasonResizeRange",
  "share-too-small": "squeezeReasonShareTooSmall",
  "target-range": "squeezeReasonTargetRange",
} as const;

/** The Translation Key of a settings problem. */
export const settingsIssueKey = (issue: SettingsIssue) => ISSUE_KEY[issue.kind];

/** Whether a number sits inside an inclusive range. */
const inRange = (value: number, min: number, max: number): boolean =>
  value >= min && value <= max;

/** The Target range, which only applies outside Batch total. */
const targetIssueOf = (settings: SqueezeSettings): SettingsIssue | null =>
  settings.sizeMode === "batch-total" ||
  inRange(settings.targetBytes, MIN_TARGET_BYTES, MAX_TARGET_BYTES)
    ? null
    : { kind: "target-range" };

/** One optional dimension: absent is valid, present must be finite and in range. */
const dimensionInRange = (value: number | null): boolean =>
  value === null ||
  (Number.isFinite(value) &&
    inRange(value, MIN_MAX_DIMENSION, MAX_MAX_DIMENSION));

const resizeIssueOf = (settings: SqueezeSettings): SettingsIssue | null =>
  dimensionInRange(settings.maxWidth) && dimensionInRange(settings.maxHeight)
    ? null
    : { kind: "resize-range" };

const qualityIssueOf = (settings: SqueezeSettings): SettingsIssue | null =>
  inRange(settings.quality, MIN_QUALITY, MAX_QUALITY)
    ? null
    : { kind: "quality-range" };

/** The output/Share problem: unavailable format first, then a Share too small. */
const shareIssueOf = (
  settings: SqueezeSettings,
  itemCount: number
): SettingsIssue | null => {
  if (!isOutputAvailable(settings.outputFormat, settings.sizeMode)) {
    return { kind: "multi-batch-total" };
  }
  if (settings.sizeMode !== "batch-total" || itemCount === 0) {
    return null;
  }
  const share = batchShare(settings.batchTotalBytes, itemCount);
  return share < MIN_BUDGET_BYTES ? { kind: "share-too-small", share } : null;
};

/** The issues that disable **Compress all**, in a fixed order. */
export const settingsIssues = (
  settings: SqueezeSettings,
  itemCount: number
): readonly SettingsIssue[] =>
  [
    targetIssueOf(settings),
    resizeIssueOf(settings),
    qualityIssueOf(settings),
    shareIssueOf(settings, itemCount),
  ].filter((issue): issue is SettingsIssue => issue !== null);

/** Whether EXIF can travel with this Output Format at all. */
export const exifAvailable = (
  outputFormat: OutputFormat,
  items: readonly BatchItem[]
): boolean => {
  if (
    outputFormat !== "jpeg" &&
    outputFormat !== "keep" &&
    outputFormat !== "multi"
  ) {
    return false;
  }
  return items.some((item) => Option.getOrNull(item.format) === "jpeg");
};

/** Whether the folder option has anything to preserve. */
export const folderStructureAvailable = (
  items: readonly BatchItem[]
): boolean => items.some((item) => item.folderPath !== null);

/* -------------------------------------------------------------------------- */
/* The Batch budget                                                            */
/* -------------------------------------------------------------------------- */

/** One miss's unmet need: its smallest output minus its share. */
export interface BudgetNeed {
  readonly id: string;
  readonly need: number;
}

/**
 * The one redistribution pass. The pool is shared equally among the misses,
 * each capped at what it needs; a capped miss returns its leftover to the
 * remaining misses, and the pass repeats until the pool is under one byte per
 * remaining miss or every need is met.
 *
 * The result holds only the misses that receive at least one byte.
 */
export const redistribute = (
  pool: number,
  needs: readonly BudgetNeed[]
): ReadonlyMap<string, number> => {
  const raised = new Map<string, number>();
  let poolLeft = Math.max(0, Math.floor(pool));
  let open: { id: string; need: number }[] = [];
  for (const need of needs) {
    if (need.need > 0) {
      open.push({ id: need.id, need: Math.floor(need.need) });
    }
  }

  while (poolLeft > 0 && open.length > 0) {
    const each = Math.floor(poolLeft / open.length);
    if (each < 1) {
      break;
    }
    const next: typeof open = [];
    let spent = 0;
    for (const entry of open) {
      const give = Math.min(each, entry.need);
      raised.set(entry.id, (raised.get(entry.id) ?? 0) + give);
      spent += give;
      if (entry.need > give) {
        next.push({ id: entry.id, need: entry.need - give });
      }
    }
    if (spent === 0) {
      break;
    }
    poolLeft -= spent;
    open = next;
  }

  return raised;
};

/* -------------------------------------------------------------------------- */
/* Resize and quantise                                                         */
/* -------------------------------------------------------------------------- */

/** The width and height of an image, in pixels. */
export interface ImageSize {
  readonly height: number;
  readonly width: number;
}

/**
 * The size that fits inside both caps, never upscaled. A cap of `null` is free,
 * and both caps nullable leaves the image unchanged.
 */
export const scaleToFitBox = (
  size: ImageSize,
  maxWidth: number | null,
  maxHeight: number | null
): ImageSize => {
  const width = maxWidth ?? Number.POSITIVE_INFINITY;
  const height = maxHeight ?? Number.POSITIVE_INFINITY;
  const factor = Math.min(1, width / size.width, height / size.height);
  if (factor >= 1) {
    return size;
  }
  return {
    height: Math.max(1, Math.round(size.height * factor)),
    width: Math.max(1, Math.round(size.width * factor)),
  };
};

/** The pixel buffer of an image, which is also what `ImageData` is. */
export interface RgbaImage {
  readonly data: Uint8ClampedArray;
  readonly height: number;
  readonly width: number;
}

/**
 * Reduces an image to `levels` values per channel. The quantiser is uniform,
 * which is what makes it fast enough to run inside the search, and a smaller
 * colour set is what PNG's deflate then compresses well.
 *
 * Alpha is kept exactly: transparency is not a colour.
 */
export const quantizeLevels = (image: RgbaImage, levels: number): RgbaImage => {
  const step = Math.max(1, Math.ceil(256 / levels));
  return {
    data: Uint8ClampedArray.from(image.data, (value, index) =>
      index % 4 === 3 ? value : Math.min(255, Math.round(value / step) * step)
    ),
    height: image.height,
    width: image.width,
  };
};

/** Composites an image onto white, for a JPEG output that cannot carry alpha. */
export const flattenOnWhite = (image: RgbaImage): RgbaImage => ({
  data: Uint8ClampedArray.from(image.data, (value, index) => {
    if (index % 4 === 3) {
      return 255;
    }
    const alpha = image.data[index + (3 - (index % 4))] ?? 255;
    return Math.round((value * alpha) / 255 + (255 * (255 - alpha)) / 255);
  }),
  height: image.height,
  width: image.width,
});

/* -------------------------------------------------------------------------- */
/* EXIF                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The APP1 EXIF segment of a JPEG, or `null` when it has none. The segment is
 * returned whole, marker and length included, so it can be inserted verbatim.
 */
const hasJpegStart = (view: Uint8Array): boolean =>
  view.length >= 4 && view[0] === 0xff && view[1] === 0xd8;

const isExifHeader = (view: Uint8Array, offset: number): boolean =>
  view[offset + 1] === 0xe1 &&
  view[offset + 4] === 0x45 &&
  view[offset + 5] === 0x78 &&
  view[offset + 6] === 0x69 &&
  view[offset + 7] === 0x66;

const segmentLengthAt = (view: Uint8Array, offset: number): number =>
  (view[offset + 2] ?? 0) * 256 + (view[offset + 3] ?? 0);

export const exifSegmentOf = (jpeg: ArrayBuffer): ArrayBuffer | null => {
  const view = new Uint8Array(jpeg);
  if (!hasJpegStart(view)) {
    return null;
  }
  let offset = 2;
  while (offset + 4 <= view.length) {
    if (view[offset] !== 0xff) {
      return null;
    }
    const marker = view[offset + 1];
    if (marker === 0xd9 || marker === 0xda) {
      return null;
    }
    const length = segmentLengthAt(view, offset);
    if (length < 2 || offset + 2 + length > view.length) {
      return null;
    }
    const exif = isExifHeader(view, offset);
    if (exif) {
      return view.slice(offset, offset + 2 + length).buffer;
    }
    offset += 2 + length;
  }
  return null;
};

/** Copies an EXIF segment into an encoded JPEG, right after its SOI marker. */
export const insertExifSegment = (
  jpeg: ArrayBuffer,
  segment: ArrayBuffer
): ArrayBuffer => {
  const source = new Uint8Array(jpeg);
  const exif = new Uint8Array(segment);
  const out = new Uint8Array(source.length + exif.length);
  out.set(source.subarray(0, 2), 0);
  out.set(exif, 2);
  out.set(source.subarray(2), 2 + exif.length);
  return out.buffer;
};

/* -------------------------------------------------------------------------- */
/* The codec port                                                              */
/* -------------------------------------------------------------------------- */

/** One rung of a format's quality ladder. */
export interface EncodeStep {
  /** Channel levels for PNG's uniform quantiser. `null` keeps every colour. */
  readonly levels: number | null;
  /** Encoder quality, 1-100. PNG ignores it. */
  readonly quality: number;
}

/** Qualities from best to worst, for the formats that take a quality. */
const LOSSY_LADDER = [95, 88, 80, 72, 64, 56, 48, 40, 30, 20] as const;
/** AVIF reaches the same damage at a lower number than JPEG and WebP do. */
const AVIF_LADDER = [70, 63, 56, 49, 42, 35, 28, 22, 16, 10] as const;
/** Channel levels from best to worst. `null` keeps every colour, so PNG is exact. */
const PNG_LADDER = [null, 8, 6, 5, 4, 3, 2] as const;

/**
 * The rungs Squeeze tries for a format, best first. A lower rung gives a
 * smaller file, so the order is what lets `searchBestStep` bisect.
 */
export const ladderFor = (format: ImageFormat): readonly EncodeStep[] => {
  if (format === "png") {
    return PNG_LADDER.map((levels) => ({ levels, quality: MAX_QUALITY }));
  }
  const qualities = format === "avif" ? AVIF_LADDER : LOSSY_LADDER;
  return qualities.map((quality) => ({ levels: null, quality }));
};

/**
 * The rungs one run uses: the whole ladder to reach a Target, one rung in
 * Fixed quality, where the user has already picked the quality.
 */
export const stepsFor = (
  format: ImageFormat,
  settings: SqueezeSettings
): readonly EncodeStep[] => {
  if (settings.sizeMode === "fixed-quality") {
    return [{ levels: null, quality: settings.quality }];
  }
  return ladderFor(format);
};

/** The rung a Miss names, in the smallest terms it reached. */
const stepLabel = (step: EncodeStep): string =>
  step.levels === null ? `q${step.quality}` : `${step.levels} colours`;

/** An image the codec has read and scaled, ready to encode. */
export interface OpenedImage {
  /** The source was an animated GIF. The codec read its first frame. */
  readonly animated: boolean;
  /** The source carries at least one pixel below full alpha. */
  readonly hasAlpha: boolean;
  readonly height: number;
  readonly sourceHeight: number;
  readonly sourceWidth: number;
  readonly width: number;
}

/** What the codec needs to open one image. */
export interface OpenRequest {
  readonly bytes: ArrayBuffer;
  readonly format: InputFormat;
  readonly maxHeight: number | null;
  readonly maxWidth: number | null;
  readonly preserveExif: boolean;
}

/**
 * The codec port: one image at a time, over one Worker.
 *
 * `open` reads the bytes and scales them once, so every rung of the ladder
 * costs an encode and not a decode. `encode` writes any of the four formats,
 * which is what makes Output Format a setting and Multi possible.
 */
export interface CodecSession {
  readonly encode: (
    format: ImageFormat,
    step: EncodeStep
  ) => Effect.Effect<ArrayBuffer, SqueezeError>;
  readonly open: (
    input: OpenRequest
  ) => Effect.Effect<OpenedImage, SqueezeError>;
}

/** One message the pool sends to a codec Worker. */
export type CodecRequest =
  | ({ readonly kind: "open" } & OpenRequest)
  | {
      readonly format: ImageFormat;
      readonly kind: "encode";
      readonly step: EncodeStep;
    }
  | { readonly kind: "release" };

/** One message a codec Worker sends back. It answers the request it just got. */
export type CodecReply =
  | { readonly image: OpenedImage; readonly kind: "opened" }
  | { readonly bytes: ArrayBuffer; readonly kind: "encoded" }
  | {
      readonly detail: string;
      readonly kind: "failed";
      readonly problem: SqueezeProblem;
    };

/**
 * The part of `Worker` the pool uses. It is an interface rather than the DOM
 * type so a unit test can supply a fake.
 *
 * `error` carries the message the Worker's own error event already read, so the
 * pool never handles an unparsed failure.
 */
export interface CodecWorkerPort {
  readonly send: (
    request: CodecRequest,
    transfer: readonly Transferable[]
  ) => void;
  readonly subscribe: (on: {
    readonly error: (detail: string) => void;
    readonly message: (reply: CodecReply) => void;
  }) => void;
  readonly terminate: () => void;
}

/**
 * How many codec Workers run at once: half the cores, kept between 2 and 4.
 *
 * A bound is what keeps a large Batch alive: an unbounded pool would decode
 * every image at the same time and exhaust the device.
 */
export const workerCount = (hardwareConcurrency = 4): number =>
  Math.min(4, Math.max(2, Math.floor(hardwareConcurrency / 2)));

/**
 * A codec that fails while offline is not cached yet: the Worker's dynamic
 * import could not reach the network. That is a different row problem from a
 * codec that ran and failed.
 */
export const classifyCodecFailure = (offline: boolean): SqueezeProblem =>
  offline ? "codec-offline" : "codec-failed";

/** The pixel budget per GiB of device memory, for one decoded image. */
const DECODE_PIXELS_PER_GIB = 24_000_000;

/**
 * How many pixels one image may decode to on this device.
 *
 * A decoded pixel is four bytes, and the canvas and the encoder each hold a
 * copy, so a very large image can end a tab even when the file is small. The
 * browser reports its memory in whole GiB and caps it at 8; 2 GiB is the floor,
 * because an unreported device is treated as a low-end one.
 */
export const decodeLimitPixels = (deviceMemoryGb?: number): number => {
  const reported =
    deviceMemoryGb === undefined || !Number.isFinite(deviceMemoryGb)
      ? 4
      : deviceMemoryGb;
  const gigabytes = Math.min(8, Math.max(2, reported));
  return Math.round(gigabytes * DECODE_PIXELS_PER_GIB);
};

/** Whether an image is too large to decode on this device. */
export const exceedsDecodeBudget = (
  size: ImageSize,
  limitPixels: number
): boolean =>
  size.width > 0 &&
  size.height > 0 &&
  size.width * size.height > Math.max(0, limitPixels);

/** Big-endian and little-endian reads, without bit arithmetic. */
const be16 = (view: Uint8Array, offset: number): number =>
  (view[offset] ?? 0) * 256 + (view[offset + 1] ?? 0);

const be32 = (view: Uint8Array, offset: number): number =>
  be16(view, offset) * 65_536 + be16(view, offset + 2);

const le16 = (view: Uint8Array, offset: number): number =>
  (view[offset] ?? 0) + (view[offset + 1] ?? 0) * 256;

const le24 = (view: Uint8Array, offset: number): number =>
  (view[offset] ?? 0) +
  (view[offset + 1] ?? 0) * 256 +
  (view[offset + 2] ?? 0) * 65_536;

const le32 = (view: Uint8Array, offset: number): number =>
  le16(view, offset) + le16(view, offset + 2) * 65_536;

/** A 32-bit unsigned read as a signed number, which a BMP height may need. */
const asSigned = (value: number): number =>
  value > 2_147_483_647 ? value - 4_294_967_296 : value;

const sizeOf = (width: number, height: number): ImageSize | null =>
  width > 0 && height > 0 ? { height, width } : null;

/** The four bytes at an offset, as ASCII. */
const tagAt = (view: Uint8Array, offset: number, length: number): string => {
  let tag = "";
  for (let index = 0; index < length; index += 1) {
    tag += String.fromCodePoint(view[offset + index] ?? 0);
  }
  return tag;
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const hasPngSignature = (view: Uint8Array): boolean => {
  if (view.length < PNG_SIGNATURE.length) {
    return false;
  }
  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (view[index] !== PNG_SIGNATURE[index]) {
      return false;
    }
  }
  return true;
};

const pngSizeOf = (view: Uint8Array): ImageSize | null =>
  view.length < 24 || !hasPngSignature(view)
    ? null
    : sizeOf(be32(view, 16), be32(view, 20));

const gifSizeOf = (view: Uint8Array): ImageSize | null =>
  view.length < 10 || !tagAt(view, 0, 3).startsWith("GIF")
    ? null
    : sizeOf(le16(view, 6), le16(view, 8));

const bmpSizeOf = (view: Uint8Array): ImageSize | null => {
  if (view.length < 26 || view[0] !== 0x42 || view[1] !== 0x4d) {
    return null;
  }
  const headerBytes = le32(view, 14);
  if (headerBytes === 12) {
    return sizeOf(le16(view, 18), le16(view, 20));
  }
  return sizeOf(
    Math.abs(asSigned(le32(view, 18))),
    Math.abs(asSigned(le32(view, 22)))
  );
};

/** Whether a JPEG marker starts a frame header, which carries the size. */
const isFrameMarker = (marker: number): boolean =>
  marker >= 0xc0 &&
  marker <= 0xcf &&
  marker !== 0xc4 &&
  marker !== 0xc8 &&
  marker !== 0xcc;

type JpegSegmentStep =
  | { readonly by: number; readonly kind: "advance" }
  | { readonly kind: "frame"; readonly size: ImageSize | null }
  | { readonly kind: "stop" };

/** What the segment at `offset` does: advance, carry the frame size, or end. */
const jpegSegmentStep = (view: Uint8Array, offset: number): JpegSegmentStep => {
  const marker = view[offset + 1] ?? 0;
  if (marker === 0xff) {
    return { by: 1, kind: "advance" };
  }
  if (marker === 0xd8 || marker === 0x01) {
    return { by: 2, kind: "advance" };
  }
  const length = be16(view, offset + 2);
  if (marker === 0xd9 || marker === 0xda || length < 2) {
    return { kind: "stop" };
  }
  if (isFrameMarker(marker)) {
    return {
      kind: "frame",
      size: sizeOf(be16(view, offset + 7), be16(view, offset + 5)),
    };
  }
  return { by: 2 + length, kind: "advance" };
};

const jpegSizeOf = (view: Uint8Array): ImageSize | null => {
  if (!hasJpegStart(view)) {
    return null;
  }
  let offset = 2;
  while (offset + 9 < view.length) {
    if (view[offset] !== 0xff) {
      return null;
    }
    const step = jpegSegmentStep(view, offset);
    if (step.kind === "stop") {
      return null;
    }
    if (step.kind === "frame") {
      return step.size;
    }
    offset += step.by;
  }
  return null;
};

const vp8xSizeOf = (view: Uint8Array): ImageSize | null =>
  sizeOf(le24(view, 24) + 1, le24(view, 27) + 1);

const vp8lSizeOf = (view: Uint8Array): ImageSize | null => {
  const bits = le32(view, 21);
  return sizeOf(1 + (bits % 16_384), 1 + (Math.floor(bits / 16_384) % 16_384));
};

const vp8SizeOf = (view: Uint8Array): ImageSize | null =>
  view[23] !== 0x9d || view[24] !== 0x01 || view[25] !== 0x2a
    ? null
    : sizeOf(le16(view, 26) % 16_384, le16(view, 28) % 16_384);

const webpSizeOf = (view: Uint8Array): ImageSize | null => {
  if (
    view.length < 30 ||
    tagAt(view, 0, 4) !== "RIFF" ||
    tagAt(view, 8, 4) !== "WEBP"
  ) {
    return null;
  }
  const chunk = tagAt(view, 12, 4);
  if (chunk === "VP8X") {
    return vp8xSizeOf(view);
  }
  if (chunk === "VP8L") {
    return vp8lSizeOf(view);
  }
  if (chunk === "VP8 ") {
    return vp8SizeOf(view);
  }
  return null;
};

const avifSizeOf = (view: Uint8Array): ImageSize | null => {
  const limit = Math.min(view.length - 16, 65_536);
  for (let offset = 4; offset <= limit; offset += 1) {
    if (tagAt(view, offset, 4) === "ispe") {
      const boxBytes = be32(view, offset - 4);
      if (boxBytes >= 20 && offset + 12 < view.length) {
        return sizeOf(be32(view, offset + 8), be32(view, offset + 12));
      }
    }
  }
  return null;
};

/**
 * The pixel size an image header declares, or `null` when Squeeze cannot read
 * it. It reads at most the first 64 KiB, so it is safe to call before decode.
 *
 * The answer is a guard, not a fact: a corrupt header can lie, and the decode
 * still decides. A format this cannot parse returns `null` and is not refused.
 */
export const imageSizeOf = (
  bytes: ArrayBuffer,
  format: InputFormat
): ImageSize | null => {
  const view = new Uint8Array(bytes);
  switch (format) {
    case "avif": {
      return avifSizeOf(view);
    }
    case "bmp": {
      return bmpSizeOf(view);
    }
    case "gif": {
      return gifSizeOf(view);
    }
    case "jpeg": {
      return jpegSizeOf(view);
    }
    case "png": {
      return pngSizeOf(view);
    }
    case "webp": {
      return webpSizeOf(view);
    }
    default: {
      return null;
    }
  }
};

/* oxlint-disable anti-slop/no-unknown-parameters -- a thrown value has no type; these classifiers are the boundary that gives it one */

/** The browser's name for a thrown value, or an empty string. */
const errorNameOf = (error: unknown): string => {
  // SAFETY: a thrown value may carry a `name`; a missing one reads as empty,
  // which no classifier treats as a known error.
  const named = error as { readonly name?: unknown } | null | undefined;
  return String(named?.name ?? "");
};

/**
 * Why a decode failed: an allocation failure means the image was too large for
 * this device, not that the file was unreadable. The error types differ per
 * browser, so the check reads the name and the message.
 */
export const classifyReadFailure = (error: unknown): SqueezeProblem => {
  if (error instanceof RangeError) {
    return "too-large";
  }
  const message = error instanceof Error ? error.message : String(error);
  if (
    errorNameOf(error) === "QuotaExceededError" ||
    /alloc|out of memory|too (?:large|big)|exceeds|invalid image size/iu.test(
      message
    )
  ) {
    return "too-large";
  }
  return "unreadable";
};

export {
  classifyWatchFailure,
  isWatchPermissionError,
} from "@/core/libs/watch-folder";

/* oxlint-enable anti-slop/no-unknown-parameters */

/** Every row needs the same codec that is not cached yet. */
export const allCodecOffline = (
  results: ReadonlyMap<string, ItemResult>
): boolean => {
  for (const result of results.values()) {
    if (
      result.outcome.kind !== "rejected" ||
      result.outcome.problem !== "codec-offline"
    ) {
      return false;
    }
  }
  return true;
};

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

/** One measurement of a rung. */
export interface Probe<S, A> {
  readonly result: A;
  readonly step: S;
}

/** The rung whose output Squeeze kept, and whether it reached the bar. */
export interface SearchOutcome<S, A> {
  readonly best: Probe<S, A>;
  /** How many times the ladder was measured. */
  readonly probes: number;
  readonly within: boolean;
}

/* v8 ignore start -- @preserve A ladder is never empty, so this is unreachable. */
const at = <A>(items: readonly A[], index: number): A => {
  const value = items[index];
  if (value === undefined) {
    throw new Error(`Squeeze: ladder index ${index} is out of range`);
  }
  return value;
};
/* v8 ignore stop -- @preserve */

/**
 * Finds the best rung whose output satisfies `fits`.
 *
 * The ladder is ordered best first, and a lower rung gives a smaller file, so a
 * bisection finds the best fit in `log2(steps)` measurements. When no rung
 * fits, the outcome is the worst rung, with `within: false`: the caller reports
 * a Miss and still hands the user the smallest file it made.
 */
export const searchBestStep = <S, A, E>(options: {
  readonly fits: (result: A) => boolean;
  readonly ladder: readonly S[];
  readonly measure: (step: S, index: number) => Effect.Effect<A, E>;
}): Effect.Effect<SearchOutcome<S, A>, E> =>
  Effect.gen(function* () {
    const { fits, ladder, measure } = options;
    const measured = new Map<number, Probe<S, A>>();
    let probes = 0;

    const probeAt = (index: number) =>
      Effect.gen(function* () {
        const cached = measured.get(index);
        if (cached !== undefined) {
          return cached;
        }
        const step = at(ladder, index);
        const probe = { result: yield* measure(step, index), step };
        probes += 1;
        measured.set(index, probe);
        return probe;
      });

    let low = 0;
    let high = ladder.length - 1;
    let best: Probe<S, A> | null = null;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const probe = yield* probeAt(middle);
      if (fits(probe.result)) {
        best = probe;
        high = middle - 1;
      } else {
        low = middle + 1;
      }
    }

    return {
      best: best ?? (yield* probeAt(ladder.length - 1)),
      probes,
      within: best !== null,
    };
  });

/* -------------------------------------------------------------------------- */
/* The Batch                                                                   */
/* -------------------------------------------------------------------------- */

/** One image of a Batch. */
export interface BatchItem {
  /** The path inside the dropped or watched root, or `null` for a loose file. */
  readonly folderPath: string | null;
  readonly format: Option.Option<InputFormat>;
  readonly id: string;
  /** The file's last-modified time, which is part of its identity. */
  readonly lastModified: number;
  readonly name: string;
  readonly size: number;
  readonly source: Blob;
  /** The Target for this image alone, in Per-image target mode only. */
  readonly targetBytes: number | null;
}

/** A Batch Item as it arrives, before it gets an id. */
export const batchItemOf = (dropped: DroppedFile, id: string): BatchItem => ({
  folderPath: dropped.folderPath,
  format: inputFormatOf(dropped.file),
  id,
  lastModified: dropped.file.lastModified,
  name: dropped.file.name,
  size: dropped.file.size,
  source: dropped.file,
  targetBytes: null,
});

/**
 * Drops the files that are already in the Batch, or repeated inside the same
 * drop. A Batch may hold two different files of the same name; it may not hold
 * the same file twice.
 */
export interface DedupeResult {
  readonly accepted: readonly BatchItem[];
  readonly duplicates: number;
}

export const dedupeIncoming = (
  existing: ReadonlyMap<string, BatchItem>,
  incoming: readonly BatchItem[]
): DedupeResult => {
  const seen = new Set(
    [...existing.values()].map((item) => fingerprintOf(item))
  );
  const accepted: BatchItem[] = [];
  let duplicates = 0;
  for (const item of incoming) {
    const fingerprint = fingerprintOf(item);
    if (seen.has(fingerprint)) {
      duplicates += 1;
      continue;
    }
    seen.add(fingerprint);
    accepted.push(item);
  }
  return { accepted, duplicates };
};

/** One file a row writes: its bytes and what they are. */
export interface OutputFile {
  readonly bytes: ArrayBuffer;
  readonly format: ImageFormat;
  readonly height: number;
  /** The PNG colour rung, or `null` when every colour was kept. */
  readonly levels: number | null;
  /** The encoder quality, or `null` when the format ignores it. */
  readonly quality: number | null;
  readonly size: number;
  readonly width: number;
}

/** One format of a Multi row. */
export interface MultiPart {
  readonly file: OutputFile | null;
  readonly format: ImageFormat;
  /** The output bytes, or `null` when the codec failed. */
  readonly size: number | null;
  /** How much smaller this file is than the input; negative when bigger. */
  readonly saved: number;
  readonly state: "done" | "miss" | "bigger" | "failed";
}

/** A note the row prints beside its outcome. */
export type RowNote =
  | { readonly kind: "resized"; readonly from: string; readonly to: string }
  | { readonly kind: "colors-reduced" }
  | { readonly kind: "flattened" }
  | { readonly kind: "first-frame" }
  | { readonly kind: "exif-kept" }
  | { readonly kind: "bigger-than-input"; readonly percent: number }
  | { readonly kind: "original-used" }
  | { readonly kind: "out-of-date" }
  | { readonly kind: "raised"; readonly bytes: number }
  | { readonly kind: "still-over"; readonly bytes: number }
  | { readonly kind: "no-smaller" };

/**
 * What Squeeze made of one image. `already-fits` carries no files because
 * Squeeze encoded nothing: the file the user dropped is the output.
 */
export interface SqueezeOutcome {
  readonly files: readonly OutputFile[];
  readonly inputBytes: number;
  readonly kind: OutcomeKind;
  readonly notes: readonly RowNote[];
  /** The bytes the row goes out at: the written files, or the original. */
  readonly outputBytes: number;
  /** Multi only: one entry per format, in JPEG, WebP, AVIF order. */
  readonly parts: readonly MultiPart[];
  readonly problem: SqueezeProblem | null;
  /** Batch total only: the Target this row was raised to. */
  readonly raisedTargetBytes: number | null;
  /** Miss only: the smallest quality or colour rung it reached. */
  readonly smallestStep: string | null;
  /** How many of a Multi row's files met their bar. */
  readonly underTargetCount: number;
  /** How many of a Multi row's formats were written. */
  readonly writtenCount: number;
}

/** The row for an image Squeeze could not read or encode. */
export const rejectedOutcome = (
  inputBytes: number,
  problem: SqueezeProblem
): SqueezeOutcome => ({
  files: [],
  inputBytes,
  kind: "rejected",
  notes: [],
  outputBytes: inputBytes,
  parts: [],
  problem,
  raisedTargetBytes: null,
  smallestStep: null,
  underTargetCount: 0,
  writtenCount: 0,
});

/** The row for an image that needs no work: its own file, unchanged. */
export const alreadyFitsOutcome = (inputBytes: number): SqueezeOutcome => ({
  files: [],
  inputBytes,
  kind: "already-fits",
  notes: [{ kind: "original-used" }],
  outputBytes: inputBytes,
  parts: [],
  problem: null,
  raisedTargetBytes: null,
  smallestStep: null,
  underTargetCount: 1,
  writtenCount: 0,
});

/** Whether this row's bytes should carry the source's EXIF. */
const shouldPreserveExif = (
  settings: SqueezeSettings,
  inputFormat: InputFormat
): boolean =>
  settings.preserveExif &&
  inputFormat === "jpeg" &&
  (settings.outputFormat === "jpeg" ||
    settings.outputFormat === "keep" ||
    settings.outputFormat === "multi");

/** Everything `compressImage` needs, with the bytes already read. */
export interface CompressPlan {
  readonly inputBytes: number;
  readonly inputFormat: InputFormat;
  readonly settings: SqueezeSettings;
  /** The Target, or `null` in Fixed quality. */
  readonly targetBytes: number | null;
}

/** Everything `compressImage` needs, with the bytes already read. */
export interface CompressInput extends CompressPlan {
  readonly bytes: ArrayBuffer;
}

/**
 * Whether Squeeze can skip the codec entirely: the input already fits the
 * Target, writes its own format, and nothing asks for a resize. With a resize
 * cap the image's own dimensions decide, so the codec has to open it.
 */
export const canSkipEncoding = (plan: CompressPlan): boolean =>
  plan.settings.sizeMode !== "fixed-quality" &&
  plan.targetBytes !== null &&
  plan.settings.maxWidth === null &&
  plan.settings.maxHeight === null &&
  formatsFor(plan.settings.outputFormat, plan.inputFormat).length === 1 &&
  formatsFor(plan.settings.outputFormat, plan.inputFormat)[0] ===
    plan.inputFormat &&
  plan.inputBytes <= plan.targetBytes;

/** How much smaller the output is, as a percentage. It is negative when bigger. */
export const savingsPercent = (
  inputBytes: number,
  outputBytes: number
): number => {
  if (inputBytes <= 0) {
    return 0;
  }
  return Math.round(((inputBytes - outputBytes) / inputBytes) * 100);
};

const fileOf = (
  bytes: ArrayBuffer,
  format: ImageFormat,
  opened: OpenedImage,
  step: EncodeStep
): OutputFile => ({
  bytes,
  format,
  height: opened.height,
  levels: step.levels,
  quality: step.levels === null ? step.quality : null,
  size: bytes.byteLength,
  width: opened.width,
});

/** The notes every encoded row shares. */
const encodedNotes = (options: {
  readonly files: readonly OutputFile[];
  readonly inputFormat: InputFormat;
  readonly opened: OpenedImage;
  readonly resized: boolean;
  readonly settings: SqueezeSettings;
}): RowNote[] => {
  const { files, inputFormat, opened, resized, settings } = options;
  const notes: RowNote[] = [];
  if (resized) {
    notes.push({
      from: `${opened.sourceWidth}×${opened.sourceHeight}`,
      kind: "resized",
      to: `${opened.width}×${opened.height}`,
    });
  }
  if (inputFormat === "gif") {
    notes.push({ kind: "first-frame" });
  }
  if (files.some((file) => file.levels !== null)) {
    notes.push({ kind: "colors-reduced" });
  }
  if (opened.hasAlpha && files.some((file) => file.format === "jpeg")) {
    notes.push({ kind: "flattened" });
  }
  if (
    shouldPreserveExif(settings, inputFormat) &&
    files.some((file) => file.format === "jpeg")
  ) {
    notes.push({ kind: "exif-kept" });
  }
  return notes;
};

/** The growth note a DONE row carries when the output grew but still fits. */
const growthNote = (
  inputBytes: number,
  outputBytes: number
): RowNote | null => {
  if (inputBytes <= 0 || outputBytes <= inputBytes) {
    return null;
  }
  return {
    kind: "bigger-than-input",
    percent: Math.round(((outputBytes - inputBytes) / inputBytes) * 100),
  };
};

const targetFits = (bytes: ArrayBuffer, target: number): boolean =>
  bytes.byteLength <= target;

/** One ladder search, as a value the caller can branch on. */
type SearchAttempt =
  | { readonly ok: false; readonly problem: SqueezeProblem }
  | {
      readonly ok: true;
      readonly search: SearchOutcome<EncodeStep, ArrayBuffer>;
    };

/** Measures one format's ladder, turning a codec failure into a row problem. */
const searchOne = (options: {
  readonly codec: CodecSession;
  readonly fits: (bytes: ArrayBuffer) => boolean;
  readonly format: ImageFormat;
  readonly settings: SqueezeSettings;
}): Effect.Effect<SearchAttempt> =>
  searchBestStep<EncodeStep, ArrayBuffer, SqueezeError>({
    fits: options.fits,
    ladder: stepsFor(options.format, options.settings),
    measure: (step) => options.codec.encode(options.format, step),
  }).pipe(
    Effect.match({
      onFailure: (error: SqueezeError) => ({
        ok: false as const,
        problem: error.problem,
      }),
      onSuccess: (search) => ({ ok: true as const, search }),
    })
  );

/** The Fixed quality single row: ALREADY FITS, DONE, or BIGGER. */
const singleFixedOutcome = (
  input: CompressInput,
  image: OpenedImage,
  format: ImageFormat,
  resized: boolean,
  sameFormat: boolean,
  best: SearchOutcome<EncodeStep, ArrayBuffer>["best"]
): SqueezeOutcome => {
  const encoded = best.result;
  const encodedBytes = encoded.byteLength;
  if (sameFormat && !resized && encodedBytes >= input.inputBytes) {
    return alreadyFitsOutcome(input.inputBytes);
  }
  const file = fileOf(encoded, format, image, best.step);
  return {
    files: [file],
    inputBytes: input.inputBytes,
    kind: encodedBytes > input.inputBytes ? "bigger" : "done",
    notes: encodedNotes({
      files: [file],
      inputFormat: input.inputFormat,
      opened: image,
      resized,
      settings: input.settings,
    }),
    outputBytes: encodedBytes,
    parts: [],
    problem: null,
    raisedTargetBytes: null,
    smallestStep: null,
    underTargetCount: 1,
    writtenCount: 1,
  } satisfies SqueezeOutcome;
};

/** The file a Target-mode row hands over, or `null` when it keeps the input. */
const targetFileOf = (
  input: CompressInput,
  image: OpenedImage,
  format: ImageFormat,
  sameFormat: boolean,
  best: SearchOutcome<EncodeStep, ArrayBuffer>["best"]
): OutputFile | null =>
  sameFormat && best.result.byteLength >= input.inputBytes
    ? null
    : fileOf(best.result, format, image, best.step);

/** The notes a Target-mode row carries, including the no-smaller stamp. */
const targetNotesOf = (options: {
  readonly best: SearchOutcome<EncodeStep, ArrayBuffer>["best"];
  readonly file: OutputFile | null;
  readonly image: OpenedImage;
  readonly input: CompressInput;
  readonly resized: boolean;
  readonly within: boolean;
}): RowNote[] => {
  const { best, file, image, input, resized, within } = options;
  if (file === null) {
    return [{ kind: "no-smaller" }];
  }
  const notes = encodedNotes({
    files: [file],
    inputFormat: input.inputFormat,
    opened: image,
    resized,
    settings: input.settings,
  });
  const growth = growthNote(input.inputBytes, best.result.byteLength);
  if (growth !== null && within) {
    notes.push(growth);
  }
  return notes;
};

/** The Target-mode single row: DONE, MISS, or the original file kept. */
const singleTargetOutcome = (options: {
  readonly input: CompressInput;
  readonly image: OpenedImage;
  readonly format: ImageFormat;
  readonly resized: boolean;
  readonly sameFormat: boolean;
  readonly search: SearchOutcome<EncodeStep, ArrayBuffer>;
}): SqueezeOutcome => {
  const { input, image, format, resized, sameFormat, search } = options;
  const { best, within } = search;
  const file = targetFileOf(input, image, format, sameFormat, best);
  const bytes = file === null ? input.bytes : best.result;
  return {
    files: file === null ? [] : [file],
    inputBytes: input.inputBytes,
    kind: within ? "done" : "miss",
    notes: targetNotesOf({ best, file, image, input, resized, within }),
    outputBytes: bytes.byteLength,
    parts: [],
    problem: null,
    raisedTargetBytes: null,
    smallestStep: within ? null : stepLabel(best.step),
    underTargetCount: within ? 1 : 0,
    writtenCount: file === null ? 0 : 1,
  } satisfies SqueezeOutcome;
};

/** The single-format branch: DONE, ALREADY FITS, MISS, or BIGGER. */
const singleOutcome = (
  codec: CodecSession,
  input: CompressInput,
  image: OpenedImage,
  format: ImageFormat,
  sameFormat: boolean,
  resized: boolean
): Effect.Effect<SqueezeOutcome> =>
  Effect.gen(function* () {
    const { inputBytes, settings } = input;
    const target = input.targetBytes;
    const searched = yield* searchOne({
      codec,
      fits: (bytes) =>
        settings.sizeMode === "fixed-quality"
          ? bytes.byteLength < inputBytes
          : target !== null && targetFits(bytes, target),
      format,
      settings,
    });

    if (!searched.ok) {
      return rejectedOutcome(inputBytes, searched.problem);
    }

    return settings.sizeMode === "fixed-quality"
      ? singleFixedOutcome(
          input,
          image,
          format,
          resized,
          sameFormat,
          searched.search.best
        )
      : singleTargetOutcome({
          format,
          image,
          input,
          resized,
          sameFormat,
          search: searched.search,
        });
  });

const partStateOf = (
  settings: SqueezeSettings,
  size: number,
  inputBytes: number,
  within: boolean
): MultiPart["state"] => {
  if (settings.sizeMode === "fixed-quality") {
    return size <= inputBytes ? "done" : "bigger";
  }
  return within ? "done" : "miss";
};

/** One format's part: the file it wrote, or its failure. */
const multiPartOf = (
  input: CompressInput,
  image: OpenedImage,
  format: ImageFormat,
  attempt: SearchAttempt
): MultiPart => {
  if (!attempt.ok) {
    return { file: null, format, saved: 0, size: null, state: "failed" };
  }
  const { best, within } = attempt.search;
  const size = best.result.byteLength;
  return {
    file: fileOf(best.result, format, image, best.step),
    format,
    saved: savingsPercent(input.inputBytes, size),
    size,
    state: partStateOf(input.settings, size, input.inputBytes, within),
  };
};

const multiKindOf = (
  settings: SqueezeSettings,
  inputBytes: number,
  outputBytes: number,
  parts: readonly MultiPart[]
): OutcomeKind => {
  if (settings.sizeMode === "fixed-quality") {
    return outputBytes <= inputBytes ? "done" : "bigger";
  }
  return parts.some((part) => part.state === "miss") ? "miss" : "done";
};

const multiRejectionOf = (
  failures: readonly SqueezeProblem[]
): SqueezeProblem =>
  failures.every((problem) => problem === "codec-offline")
    ? "codec-offline"
    : "codec-failed";

/** The Multi result, once every format has its part. */
const multiOutcomeOf = (options: {
  readonly failures: readonly SqueezeProblem[];
  readonly image: OpenedImage;
  readonly input: CompressInput;
  readonly parts: readonly MultiPart[];
  readonly resized: boolean;
}): SqueezeOutcome => {
  const { failures, image, input, parts, resized } = options;
  const { inputBytes, settings } = input;
  const written = parts.flatMap((part) =>
    part.file === null ? [] : [part.file]
  );
  if (written.length === 0) {
    return rejectedOutcome(inputBytes, multiRejectionOf(failures));
  }

  const outputBytes = written.reduce((total, file) => total + file.size, 0);
  const underTarget = parts.filter((part) => part.state === "done").length;
  const kind = multiKindOf(settings, inputBytes, outputBytes, parts);
  const notes: RowNote[] = encodedNotes({
    files: written,
    inputFormat: input.inputFormat,
    opened: image,
    resized,
    settings,
  });
  const growth = growthNote(inputBytes, outputBytes);
  if (growth !== null && kind === "done") {
    notes.push(growth);
  }

  return {
    files: written,
    inputBytes,
    kind,
    notes,
    outputBytes,
    parts,
    problem: null,
    raisedTargetBytes: null,
    smallestStep: null,
    underTargetCount: underTarget,
    writtenCount: written.length,
  } satisfies SqueezeOutcome;
};

/** The Multi branch: one search per format, and one failure does not stop the rest. */
const multiOutcome = (
  codec: CodecSession,
  input: CompressInput,
  image: OpenedImage,
  formats: readonly ImageFormat[],
  resized: boolean
): Effect.Effect<SqueezeOutcome> =>
  Effect.gen(function* () {
    const { inputBytes, settings } = input;
    const target = input.targetBytes;
    const parts: MultiPart[] = [];
    const failures: SqueezeProblem[] = [];

    for (const format of formats) {
      const searched = yield* searchOne({
        codec,
        fits: (bytes) =>
          settings.sizeMode === "fixed-quality"
            ? bytes.byteLength <= inputBytes
            : target !== null && targetFits(bytes, target),
        format,
        settings,
      });
      parts.push(multiPartOf(input, image, format, searched));
      if (!searched.ok) {
        failures.push(searched.problem);
      }
    }

    return multiOutcomeOf({
      failures,
      image,
      input,
      parts,
      resized,
    });
  });

type OpenedAttempt =
  | { readonly image: OpenedImage; readonly ok: true }
  | { readonly ok: false; readonly problem: SqueezeProblem };

const openImage = (
  codec: CodecSession,
  input: CompressInput
): Effect.Effect<OpenedAttempt> =>
  codec
    .open({
      bytes: input.bytes,
      format: input.inputFormat,
      maxHeight: input.settings.maxHeight,
      maxWidth: input.settings.maxWidth,
      preserveExif: shouldPreserveExif(input.settings, input.inputFormat),
    })
    .pipe(
      Effect.match({
        onFailure: (error: SqueezeError) => ({
          ok: false as const,
          problem: error.problem,
        }),
        onSuccess: (image: OpenedImage) => ({ image, ok: true as const }),
      })
    );

/** ALREADY FITS: the same format at or under the Target, and no resize. */
const alreadyFitsBeforeRun = (options: {
  readonly input: CompressInput;
  readonly resized: boolean;
  readonly sameFormat: boolean;
}): boolean => {
  const { input, resized, sameFormat } = options;
  const target = input.targetBytes;
  return (
    input.settings.sizeMode !== "fixed-quality" &&
    sameFormat &&
    !resized &&
    target !== null &&
    input.inputBytes <= target
  );
};

/**
 * Compresses one image: opens it, walks each output format's ladder until the
 * output reaches the bar, and reports the best output it made.
 *
 * The bar is the Target in a Target mode. In Fixed quality there is no Target,
 * so the bar is the input size. The function never fails: an image Squeeze
 * cannot read, or cannot encode, is a `rejected` row.
 */
export const compressImage = (
  codec: CodecSession,
  input: CompressInput
): Effect.Effect<SqueezeOutcome> =>
  Effect.gen(function* () {
    const { inputBytes, inputFormat, settings } = input;
    const formats = formatsFor(settings.outputFormat, inputFormat);
    const opened = yield* openImage(codec, input);

    if (!opened.ok) {
      return rejectedOutcome(inputBytes, opened.problem);
    }

    const { image } = opened;
    const resized =
      image.width !== image.sourceWidth || image.height !== image.sourceHeight;
    const sameFormat = formats.length === 1 && formats[0] === inputFormat;

    if (alreadyFitsBeforeRun({ input, resized, sameFormat })) {
      return alreadyFitsOutcome(inputBytes);
    }

    const only = formats.length === 1 ? formats[0] : undefined;
    return only === undefined
      ? yield* multiOutcome(codec, input, image, formats, resized)
      : yield* singleOutcome(codec, input, image, only, sameFormat, resized);
  });

/**
 * Adds the Batch total's raised-Target notes to a row. It is applied by the
 * service, which is the only place that knows the share and the raise.
 */
export const withBudgetNotes = (
  outcome: SqueezeOutcome,
  raisedTargetBytes: number
): SqueezeOutcome => ({
  ...outcome,
  notes: [
    ...outcome.notes,
    { bytes: raisedTargetBytes, kind: "raised" },
    ...(outcome.kind === "miss"
      ? [{ bytes: raisedTargetBytes, kind: "still-over" as const }]
      : []),
  ],
  raisedTargetBytes,
});

/* -------------------------------------------------------------------------- */
/* Results, staleness, and rows                                                */
/* -------------------------------------------------------------------------- */

/** The result of one image, with the id that ties it to its Batch Item. */
export interface ItemResult {
  readonly id: string;
  /** The settings it was made under. A different key makes it stale. */
  readonly key: string;
  readonly outcome: SqueezeOutcome;
}

/**
 * The settings key of one image: a result under another key is stale.
 *
 * The folder option is absent on purpose: it changes the ZIP, not the bytes.
 */
export const settingsKeyOf = (
  settings: SqueezeSettings,
  targetBytes: number | null
): string =>
  [
    settings.outputFormat,
    settings.sizeMode,
    settings.sizeMode === "fixed-quality" ? settings.quality : "-",
    settings.maxWidth ?? "auto",
    settings.maxHeight ?? "auto",
    targetBytes ?? "-",
    settings.preserveExif ? "exif" : "-",
  ].join(":");

/** Whether a result was made under settings that have since changed. */
export const isStale = (
  result: ItemResult | undefined,
  settings: SqueezeSettings,
  targetBytes: number | null
): boolean =>
  result === undefined || result.key !== settingsKeyOf(settings, targetBytes);

/** The state one row of the Batch shows. */
export type RowState = "working" | OutcomeKind;

/** What one row of the Batch shows, derived from its outcome. */
export interface RowView {
  readonly files: readonly OutputFile[];
  readonly inputBytes: number;
  readonly notes: readonly RowNote[];
  readonly outputBytes: number | null;
  readonly parts: readonly MultiPart[];
  readonly problem: SqueezeProblem | null;
  readonly raisedTargetBytes: number | null;
  /** How much smaller the output is, as a percentage. Negative when bigger. */
  readonly saved: number;
  readonly smallestStep: string | null;
  readonly state: RowState;
  readonly stale: boolean;
  readonly underTargetCount: number;
  readonly writtenCount: number;
}

/** The row of one image: its state, its sizes, and the notes about it. */
export const rowViewOf = (
  item: BatchItem,
  result: ItemResult | undefined,
  stale = false
): RowView => {
  if (result === undefined) {
    return {
      files: [],
      inputBytes: item.size,
      notes: stale ? [{ kind: "out-of-date" }] : [],
      outputBytes: null,
      parts: [],
      problem: null,
      raisedTargetBytes: null,
      saved: 0,
      smallestStep: null,
      state: "working",
      stale,
      underTargetCount: 0,
      writtenCount: 0,
    };
  }
  const { outcome } = result;
  return {
    files: outcome.files,
    inputBytes: outcome.inputBytes,
    notes: stale ? [...outcome.notes, { kind: "out-of-date" }] : outcome.notes,
    outputBytes: outcome.outputBytes,
    parts: outcome.parts,
    problem: outcome.problem,
    raisedTargetBytes: outcome.raisedTargetBytes,
    saved: savingsPercent(item.size, outcome.outputBytes),
    smallestStep: outcome.smallestStep,
    state: outcome.kind,
    stale,
    underTargetCount: outcome.underTargetCount,
    writtenCount: outcome.writtenCount,
  };
};

/**
 * The batch-and-result pair with the newest result, or the same map when the
 * item has left the Batch. A run must not put a result back for a row the user
 * has removed or cleared.
 */
export const landResult = (
  batch: ReadonlyMap<string, BatchItem>,
  results: ReadonlyMap<string, ItemResult>,
  result: ItemResult
): ReadonlyMap<string, ItemResult> =>
  batch.has(result.id) ? new Map(results).set(result.id, result) : results;

/** Whether a row waits for a codec that a connection can load. */
export const isOfflineRejection = (result: ItemResult | undefined): boolean =>
  result?.outcome.kind === "rejected" &&
  result.outcome.problem === "codec-offline";

const ROW_STATE_KEYS = {
  "already-fits": "squeezeStateAlreadyFits",
  bigger: "squeezeStateBigger",
  done: "squeezeStateDone",
  miss: "squeezeStateMiss",
  rejected: "squeezeStateRejected",
  working: "squeezeWorking",
} as const satisfies Record<RowState, string>;

/** The Translation Key of a row state. */
export const rowStateKey = (state: RowState) => ROW_STATE_KEYS[state];

const PROBLEM_KEYS = {
  "codec-failed": "squeezeProblemCodecFailed",
  "codec-offline": "squeezeProblemCodecOffline",
  "too-large": "squeezeProblemTooLarge",
  unreadable: "squeezeProblemUnreadable",
  unsupported: "squeezeProblemUnsupported",
} as const satisfies Record<SqueezeProblem, string>;

/** The Translation Key of a rejection reason. */
export const problemKey = <P extends SqueezeProblem>(problem: P) =>
  PROBLEM_KEYS[problem];

const NOTE_KEYS = {
  "bigger-than-input": "squeezeNoteBiggerThanInput",
  "colors-reduced": "squeezeNoteColorsReduced",
  "exif-kept": "squeezeNoteExifKept",
  "first-frame": "squeezeNoteFirstFrame",
  flattened: "squeezeNoteFlattened",
  "no-smaller": "squeezeNoteNoSmaller",
  "original-used": "squeezeNoteOriginalUsed",
  "out-of-date": "squeezeNoteOutOfDate",
  raised: "squeezeNoteRaised",
  resized: "squeezeNoteResized",
  "still-over": "squeezeNoteStillOver",
} as const;

/** The Translation Key of a row note, narrowed to the note's kind. */
export const noteKey = <K extends RowNote["kind"]>(
  note: Extract<RowNote, { readonly kind: K }>
) => NOTE_KEYS[note.kind];

/** The files one row wrote, or none when the original is the output. */
export const outputFilesOf = (
  result: ItemResult | undefined
): readonly OutputFile[] => result?.outcome.files ?? [];

/* -------------------------------------------------------------------------- */
/* Summary                                                                     */
/* -------------------------------------------------------------------------- */

/** What a Batch adds up to, for the summary bar. */
export interface BatchSummary {
  readonly alreadyFits: number;
  readonly bigger: number;
  readonly done: number;
  readonly inputBytes: number;
  readonly misses: number;
  /** Bytes the Batch goes out at, counting an image without a result at its input size. */
  readonly outputBytes: number;
  readonly rejected: number;
  readonly total: number;
  /** Rows at or under their bar: DONE and ALREADY FITS. */
  readonly underTarget: number;
}

export const summarize = (
  items: ReadonlyMap<string, BatchItem>,
  results: ReadonlyMap<string, ItemResult>
): BatchSummary => {
  let alreadyFits = 0;
  let bigger = 0;
  let done = 0;
  let inputBytes = 0;
  let misses = 0;
  let outputBytes = 0;
  let rejected = 0;

  for (const [id, item] of items) {
    inputBytes += item.size;
    const outcome = results.get(id)?.outcome;
    if (outcome === undefined) {
      outputBytes += item.size;
      continue;
    }
    outputBytes += outcome.outputBytes;
    switch (outcome.kind) {
      case "already-fits": {
        alreadyFits += 1;
        break;
      }
      case "bigger": {
        bigger += 1;
        break;
      }
      case "done": {
        done += 1;
        break;
      }
      case "miss": {
        misses += 1;
        break;
      }
      case "rejected": {
        rejected += 1;
        break;
      }
      default: {
        break;
      }
    }
  }

  return {
    alreadyFits,
    bigger,
    done,
    inputBytes,
    misses,
    outputBytes,
    rejected,
    total: items.size,
    underTarget: done + alreadyFits,
  };
};

/* -------------------------------------------------------------------------- */
/* ZIP                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Names that a ZIP can carry. One Batch may hold two files of the same name,
 * and a ZIP may not, so a repeat gets `-2`, `-3`, and so on before its
 * extension.
 */
export const uniqueNames = (names: readonly string[]): readonly string[] =>
  names.map((name, index) => {
    const repeat = names.slice(0, index).filter((seen) => seen === name).length;
    if (repeat === 0) {
      return name;
    }
    const dot = name.lastIndexOf(".");
    const stem = dot <= 0 ? name : name.slice(0, dot);
    const extension = dot <= 0 ? "" : name.slice(dot);
    return `${stem}-${repeat + 1}${extension}`;
  });

/** The stem of a file name: everything before the last dot. */
const stemOf = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? name : name.slice(0, dot);
};

/** One row as the ZIP sees it. */
export interface ZipSource {
  readonly folderPath: string | null;
  readonly format: Option.Option<InputFormat>;
  readonly id: string;
  readonly name: string;
  readonly source: Blob;
}

/** One file inside the ZIP. */
export interface ZipEntry {
  readonly format: ImageFormat;
  readonly input: Blob | ArrayBuffer;
  /** The path inside the ZIP, with the dropped root's name first. */
  readonly name: string;
}

/** The unique path a row's files take inside the ZIP. */
const zipPathOf = (
  item: ZipSource,
  options: { readonly preserveFolders: boolean },
  taken: Set<string>
): string => {
  const folder =
    options.preserveFolders && item.folderPath !== null
      ? safeZipSegments(item.folderPath)
      : [];
  const rawStem = safeZipSegments(stemOf(item.name)).at(-1) ?? "file";
  const stem = clampFileName(rawStem, 80);
  return uniqueZipPath(folder, stem, "", taken);
};

/** One row's contribution: its output files, or its own file when it fits. */
const zipEntriesOf = (
  item: ZipSource,
  result: ItemResult | undefined,
  options: { readonly preserveFolders: boolean },
  taken: Set<string>
): readonly ZipEntry[] => {
  const outcome = result?.outcome;
  if (outcome === undefined || outcome.kind === "rejected") {
    return [];
  }
  const path = zipPathOf(item, options, taken);
  if (outcome.kind === "already-fits") {
    const format = keepFormatOf(Option.getOrNull(item.format) ?? "jpeg");
    return [
      {
        format,
        input: item.source,
        name: `${path}.${outputExtensionOf(format)}`,
      },
    ];
  }
  return outcome.files.map((file) => ({
    format: file.format,
    input: file.bytes,
    name: `${path}.${outputExtensionOf(file.format)}`,
  }));
};

/**
 * The files the ZIP carries, in Batch order, with the folder paths and the
 * duplicate stems applied.
 *
 * A row that wrote files contributes them. An ALREADY FITS row contributes its
 * own file. A REJECTED row contributes nothing and is named in the count the
 * page shows.
 */
export const zipPlanOf = (
  items: readonly ZipSource[],
  results: ReadonlyMap<string, ItemResult>,
  options: { readonly preserveFolders: boolean }
): readonly ZipEntry[] => {
  const taken = new Set<string>();
  return items.flatMap((item) =>
    zipEntriesOf(item, results.get(item.id), options, taken)
  );
};

/* -------------------------------------------------------------------------- */
/* Watch Folder                                                                */
/* -------------------------------------------------------------------------- */

/** The part of the browser the Watch Folder needs. */
export interface WatchFolderEnv {
  readonly showDirectoryPicker?: unknown;
}

/**
 * Watch folder is a Chromium feature (Chrome and Edge). Where the directory
 * picker is absent the action is absent too: it is not a broken button.
 */
export const watchFolderSupported = (env: WatchFolderEnv): boolean =>
  env.showDirectoryPicker !== undefined;
