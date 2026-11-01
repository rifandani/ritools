import { clampFileName, safeZipSegments } from "@/core/libs/files";
import type enUS from "@/core/libs/i18n/locales/en-US";
import type {
  Backdrop,
  ImageFormat,
  MatteMode,
  MatteOperation,
  OutputFormat,
  RemoveProgress,
  RgbaColor,
  UnmaskError,
} from "@/features/unmask/unmask.engine";

export { formatBytes } from "@/core/utils/file-size";

/* -------------------------------------------------------------------------- */
/* Limits and defaults                                                         */
/* -------------------------------------------------------------------------- */

const INPUT_FORMATS: readonly ImageFormat[] = [
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "bmp",
];

export const OUTPUT_FORMATS: readonly OutputFormat[] = [
  "png",
  "webp",
  "avif",
  "jpeg",
];

export const ACCEPTED_MIME =
  "image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.avif,.gif,.bmp";

export const MIN_FEATHER = 0;
export const MAX_FEATHER = 50;
export const MIN_BLUR_RADIUS = 0;
export const MAX_BLUR_RADIUS = 50;
export const DEFAULT_BLUR_RADIUS = 20;
export const MIN_QUALITY = 1;
export const MAX_QUALITY = 100;
const DEFAULT_QUALITY = 85;
export const MIN_TOLERANCE = 0;
export const MAX_TOLERANCE = 100;
export const DEFAULT_TOLERANCE = 20;
export const MIN_BRUSH_SIZE = 1;
export const MAX_BRUSH_SIZE = 200;
export const DEFAULT_BRUSH_SIZE = 40;
const MAX_PIXELS = 64_000_000;
export const SAMPLE_URL = "/unmask/sample.png";
export const SAMPLE_NAME = "unmask-sample.png";
export const ZIP_NAME = "unmask-cutouts.zip";

export const SOLID_WHITE: RgbaColor = { a: 255, b: 255, g: 255, r: 255 };

export interface UnmaskSettings {
  readonly backdrop: Backdrop;
  readonly feather: number;
  readonly format: OutputFormat;
  readonly quality: number;
}

export const DEFAULT_SETTINGS: UnmaskSettings = {
  backdrop: { _tag: "Transparent" },
  feather: 0,
  format: "webp",
  quality: DEFAULT_QUALITY,
};

/* -------------------------------------------------------------------------- */
/* Formats                                                                    */
/* -------------------------------------------------------------------------- */

const MIME_OF_FORMAT: Readonly<Record<ImageFormat, string>> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const FORMAT_OF_MIME = new Map<string, ImageFormat>([
  ["image/avif", "avif"],
  ["image/bmp", "bmp"],
  ["image/gif", "gif"],
  ["image/jpeg", "jpeg"],
  ["image/jpg", "jpeg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/x-ms-bmp", "bmp"],
]);

const FORMAT_OF_EXTENSION = new Map<string, ImageFormat>([
  ["avif", "avif"],
  ["bmp", "bmp"],
  ["gif", "gif"],
  ["jpeg", "jpeg"],
  ["jpg", "jpeg"],
  ["png", "png"],
  ["webp", "webp"],
]);

const EXTENSION_OF_FORMAT: Readonly<Record<OutputFormat, string>> = {
  avif: "avif",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

const OUTPUT_MIME: Readonly<Record<OutputFormat, string>> = {
  avif: "image/avif",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const mimeOfFormat = (format: ImageFormat): string =>
  MIME_OF_FORMAT[format];

export const outputMimeOf = (format: OutputFormat): string =>
  OUTPUT_MIME[format];

export const outputExtensionOf = (format: OutputFormat): string =>
  EXTENSION_OF_FORMAT[format];

/** The format a file name and its MIME type claim, without reading bytes. */
export const claimedFormatOf = (file: {
  readonly name: string;
  readonly type: string;
}): ImageFormat | null => {
  const byMime = FORMAT_OF_MIME.get(file.type.toLowerCase());
  if (byMime !== undefined) {
    return byMime;
  }
  const dot = file.name.lastIndexOf(".");
  const extension = dot === -1 ? "" : file.name.slice(dot + 1).toLowerCase();
  return FORMAT_OF_EXTENSION.get(extension) ?? null;
};

/** Whether the picker sees a file Unmask may read. */
export const isImageFile = (file: {
  readonly name: string;
  readonly type: string;
}): boolean => claimedFormatOf(file) !== null;

export const isOutputFormat = (value: string): value is OutputFormat =>
  OUTPUT_FORMATS.some((format) => format === value);

export const isImageFormat = (value: string): value is ImageFormat =>
  INPUT_FORMATS.some((format) => format === value);

/** The format detected from the bytes, as the engine promises. */
export const detectFormat = (bytes: Uint8Array): ImageFormat | null => {
  const four = (offset: number) =>
    String.fromCodePoint(
      bytes[offset] ?? 0,
      bytes[offset + 1] ?? 0,
      bytes[offset + 2] ?? 0,
      bytes[offset + 3] ?? 0
    );
  if ((bytes[0] ?? 0) === 0xff && (bytes[1] ?? 0) === 0xd8) {
    return "jpeg";
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d
  ) {
    return "png";
  }
  if (four(0) === "RIFF" && four(8) === "WEBP") {
    return "webp";
  }
  if (four(0) === "GIF8") {
    return "gif";
  }
  if ((bytes[0] ?? 0) === 0x42 && (bytes[1] ?? 0) === 0x4d) {
    return "bmp";
  }
  if (four(4) === "ftyp") {
    const brand = four(8);
    if (brand === "avif" || brand === "avis") {
      return "avif";
    }
  }
  return null;
};

const FORMAT_LABEL_KEY = {
  avif: "unmaskFormatAvif",
  bmp: "unmaskFormatBmp",
  gif: "unmaskFormatGif",
  jpeg: "unmaskFormatJpeg",
  png: "unmaskFormatPng",
  webp: "unmaskFormatWebp",
} as const satisfies Record<ImageFormat, keyof typeof enUS>;

export type FormatLabelKey = (typeof FORMAT_LABEL_KEY)[ImageFormat];

export const formatLabelKey = (format: ImageFormat): FormatLabelKey =>
  FORMAT_LABEL_KEY[format];

const OUTPUT_LABEL_KEY = {
  avif: "unmaskFormatAvif",
  jpeg: "unmaskFormatJpeg",
  png: "unmaskFormatPng",
  webp: "unmaskFormatWebp",
} as const satisfies Record<OutputFormat, keyof typeof enUS>;

export type OutputLabelKey = (typeof OUTPUT_LABEL_KEY)[OutputFormat];

export const outputLabelKey = (format: OutputFormat): OutputLabelKey =>
  OUTPUT_LABEL_KEY[format];

const OUTPUT_NOTE_KEY = {
  avif: "unmaskFormatAvifNote",
  jpeg: "unmaskFormatJpegNote",
  png: "unmaskFormatPngNote",
  webp: "unmaskFormatWebpNote",
} as const satisfies Record<OutputFormat, keyof typeof enUS>;

export type OutputNoteKey = (typeof OUTPUT_NOTE_KEY)[OutputFormat];

export const outputNoteKey = (format: OutputFormat): OutputNoteKey =>
  OUTPUT_NOTE_KEY[format];

/* -------------------------------------------------------------------------- */
/* Sizes, names, and the ZIP                                                  */
/* -------------------------------------------------------------------------- */

/** The display stem of a file: no folder, no extension, no control text. */
export const sanitizeStem = (name: string): string => {
  const base = name.split(/[\\/]/u).at(-1) ?? "";
  const withoutExtension = base.replace(/\.[^.]+$/u, "");
  const clean = [...withoutExtension]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code > 0x1f && code !== 0x7f;
    })
    .join("")
    .replaceAll(/\s+/gu, " ")
    .replace(/^\.+/u, "")
    .trim()
    .slice(0, 120);
  return clean === "" ? "image" : clean;
};

export const cutoutName = (name: string, format: OutputFormat): string =>
  clampFileName(`${sanitizeStem(name)}-cutout.${outputExtensionOf(format)}`);

/** A ZIP entry that keeps the folder path and never climbs out of the root. */
export const zipEntryName = (options: {
  readonly name: string;
  readonly folderPath: string | null;
  readonly format: OutputFormat;
  readonly used: ReadonlySet<string>;
}): string => {
  const stem = sanitizeStem(options.name);
  const extension = outputExtensionOf(options.format);
  const folder =
    options.folderPath === null ? [] : safeZipSegments(options.folderPath);
  const base = `${stem}-cutout`;
  let attempt = 1;
  let fileName = `${base}.${extension}`;
  let path = [...folder, fileName].join("/");
  while (options.used.has(path.toLowerCase())) {
    attempt += 1;
    fileName = `${base}-${attempt}.${extension}`;
    path = [...folder, fileName].join("/");
  }
  return clampFileName(path, 240);
};

export const buildZipEntries = (
  files: readonly {
    readonly name: string;
    readonly folderPath: string | null;
    readonly format: OutputFormat;
  }[]
): readonly string[] => {
  const used = new Set<string>();
  return files.map((file) => {
    const path = zipEntryName({ ...file, used });
    used.add(path.toLowerCase());
    return path;
  });
};

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */

export const jpegBlocked = (settings: UnmaskSettings): boolean =>
  settings.backdrop._tag === "Transparent" && settings.format === "jpeg";

export const settingsKey = (settings: UnmaskSettings): string => {
  const { backdrop } = settings;
  const fill =
    backdrop._tag === "Solid"
      ? `${backdrop.color.r},${backdrop.color.g},${backdrop.color.b}`
      : backdrop._tag === "Blur"
        ? String(backdrop.radius)
        : "";
  return [
    settings.format,
    String(settings.quality),
    String(settings.feather),
    backdrop._tag,
    fill,
  ].join("|");
};

const BACKDROP_LABEL_KEY = {
  Blur: "unmaskBackdropBlur",
  Solid: "unmaskBackdropSolid",
  Transparent: "unmaskBackdropTransparent",
} as const satisfies Record<Backdrop["_tag"], keyof typeof enUS>;

export type BackdropLabelKey = (typeof BACKDROP_LABEL_KEY)[Backdrop["_tag"]];

export const backdropLabelKey = (backdrop: Backdrop): BackdropLabelKey =>
  BACKDROP_LABEL_KEY[backdrop._tag];

export const brushLabelKey = (
  operation: MatteOperation
): "unmaskBrush" | "unmaskWand" =>
  operation._tag === "Wand" ? "unmaskWand" : "unmaskBrush";

export const modeLabelKey = (
  mode: MatteMode
): "unmaskErase" | "unmaskRestore" =>
  mode === "restore" ? "unmaskRestore" : "unmaskErase";

export const clampFeather = (value: number): number =>
  Math.min(MAX_FEATHER, Math.max(MIN_FEATHER, value));

export const clampBlurRadius = (value: number): number =>
  Math.min(MAX_BLUR_RADIUS, Math.max(MIN_BLUR_RADIUS, value));

export const clampQuality = (value: number): number =>
  Math.min(MAX_QUALITY, Math.max(MIN_QUALITY, value));

/** The reasons the Magic Brush is paused, with visible copy. */
export type ToolbarReason =
  | "unmaskCompareActive"
  | "unmaskToolbarNoCutout"
  | "unmaskToolbarPaused";

/** The effective Backdrop a settings change produces. */
export const withBackdrop = (
  settings: UnmaskSettings,
  backdrop: Backdrop
): UnmaskSettings => ({ ...settings, backdrop });

/* -------------------------------------------------------------------------- */
/* Rows and states                                                            */
/* -------------------------------------------------------------------------- */

export type RowState =
  | "cancelled"
  | "downloaded"
  | "edited"
  | "failed"
  | "queued"
  | "reading"
  | "ready"
  | "removing"
  | "stale";

export const ROW_STATE_KEY = {
  cancelled: "unmaskBatchCancelled",
  downloaded: "unmaskBatchDownloaded",
  edited: "unmaskBatchEdited",
  failed: "unmaskBatchFailed",
  queued: "unmaskBatchQueued",
  reading: "unmaskBatchReading",
  ready: "unmaskBatchReady",
  removing: "unmaskBatchRemoving",
  stale: "unmaskBatchStale",
} as const satisfies Record<RowState, keyof typeof enUS>;

const ERROR_COPY = {
  cancelled: {
    body: "unmaskCancelledBody",
    title: "unmaskCancelledTitle",
  },
  encode: {
    body: "unmaskEncodeFailedBody",
    title: "unmaskEncodeFailedTitle",
  },
  modelFailed: {
    body: "unmaskModelFailedBody",
    title: "unmaskModelFailedTitle",
  },
  modelOffline: {
    body: "unmaskModelOfflineBody",
    title: "unmaskModelOfflineTitle",
  },
  modelUnavailable: {
    body: "unmaskModelUnavailableBody",
    title: "unmaskModelUnavailableTitle",
  },
  tooLarge: {
    body: "unmaskTooLargeBody",
    title: "unmaskTooLargeTitle",
  },
  unreadable: {
    body: "unmaskUnreadableBody",
    title: "unmaskUnreadableTitle",
  },
  unsupported: {
    body: "unmaskUnsupportedBody",
    title: "unmaskUnsupportedTitle",
  },
} as const;

export type ErrorCopy = (typeof ERROR_COPY)[keyof typeof ERROR_COPY];

export const errorCopyOf = (error: UnmaskError): ErrorCopy => {
  switch (error._tag) {
    case "UnsupportedFormat": {
      return ERROR_COPY.unsupported;
    }
    case "UnreadableFile": {
      return ERROR_COPY.unreadable;
    }
    case "TooLarge": {
      return ERROR_COPY.tooLarge;
    }
    case "ModelUnavailable": {
      return error.reason === "offline"
        ? ERROR_COPY.modelOffline
        : ERROR_COPY.modelUnavailable;
    }
    case "ModelFailed": {
      return ERROR_COPY.modelFailed;
    }
    case "Cancelled": {
      return ERROR_COPY.cancelled;
    }
    default: {
      return ERROR_COPY.encode;
    }
  }
};

export const isReadyState = (state: RowState): boolean =>
  state === "ready" || state === "edited" || state === "downloaded";

export interface BatchCounts {
  readonly failed: number;
  readonly queued: number;
  readonly ready: number;
  readonly stale: number;
}

export const countRows = (
  rows: readonly { readonly state: RowState }[]
): BatchCounts => {
  const counts = { failed: 0, queued: 0, ready: 0, stale: 0 };
  for (const row of rows) {
    if (row.state === "failed") {
      counts.failed += 1;
    } else if (row.state === "stale") {
      counts.stale += 1;
    } else if (isReadyState(row.state)) {
      counts.ready += 1;
    } else {
      counts.queued += 1;
    }
  }
  return counts;
};

/** The rows a Cut out press should process now. */
export const runSetOf = (
  rows: readonly { readonly id: string; readonly state: RowState }[]
): readonly string[] => {
  const ids: string[] = [];
  for (const row of rows) {
    if (
      row.state === "queued" ||
      row.state === "stale" ||
      row.state === "cancelled" ||
      row.state === "failed"
    ) {
      ids.push(row.id);
    }
  }
  return ids;
};

export const nextOpenId = (remaining: readonly string[]): string | null =>
  remaining.length === 1 ? (remaining[0] ?? null) : null;

/** The state a settings change gives a finished row. */
export const stateAfterSettingsChange = (state: RowState): RowState =>
  isReadyState(state) ? "stale" : state;

/** The state the current operation count gives a finished row. */
export const stateAfterOperations = (
  state: RowState,
  hasResult: boolean,
  count: number
): RowState => {
  if (!hasResult) {
    return state;
  }
  if (state === "stale") {
    return "stale";
  }
  if (count > 0) {
    return "edited";
  }
  return state === "downloaded" ? "downloaded" : "ready";
};

export const editedAfterOperations = (
  hasResult: boolean,
  count: number
): boolean => hasResult && count > 0;

export const progressQuarterOf = (value: number): number =>
  Math.max(0, Math.min(4, Math.floor(value * 4)));

export const progressPercent = (
  progress: RemoveProgress | null
): number | null =>
  progress?._tag === "ModelDownload" && progress.total
    ? Math.round((progress.loaded / progress.total) * 100)
    : null;

const pixelLimitOf = (width: number, height: number): number => width * height;

export const exceedsPreflight = (width: number, height: number): boolean =>
  pixelLimitOf(width, height) > MAX_PIXELS;

/* -------------------------------------------------------------------------- */
/* The editor model                                                           */
/* -------------------------------------------------------------------------- */

export interface PreviewState {
  readonly compare: boolean;
  readonly compareAt: number;
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export const clampScale = (scale: number): number =>
  Math.min(8, Math.max(0.1, scale));
