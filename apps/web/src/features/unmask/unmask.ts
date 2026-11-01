import { clampFileName, safeZipSegments } from "@/core/libs/files";
import type enUS from "@/core/libs/i18n/locales/en-US";
import type {
  Backdrop,
  ImageFormat,
  MatteMode,
  OutputFormat,
  RemoveProgress,
  RgbaColor,
  UnmaskError,
} from "@/features/unmask/unmask.engine";

/** A Translation Key of the Message Catalog. */
export type UnmaskKey = keyof typeof enUS;

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

// oxlint-disable-next-line anti-slop/no-known-value-widening -- keys are runtime MIME strings.
const FORMAT_OF_MIME: Readonly<Record<string, ImageFormat>> = {
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/gif": "gif",
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/x-ms-bmp": "bmp",
};

// oxlint-disable-next-line anti-slop/no-known-value-widening -- keys are runtime extensions.
const FORMAT_OF_EXTENSION: Readonly<Record<string, ImageFormat>> = {
  avif: "avif",
  bmp: "bmp",
  gif: "gif",
  jpeg: "jpeg",
  jpg: "jpeg",
  png: "png",
  webp: "webp",
};

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

const outputExtensionOf = (format: OutputFormat): string =>
  EXTENSION_OF_FORMAT[format];

/** The format a file name and its MIME type claim, without reading bytes. */
export const claimedFormatOf = (file: {
  readonly name: string;
  readonly type: string;
}): ImageFormat | null => {
  const byMime = FORMAT_OF_MIME[file.type.toLowerCase()];
  if (byMime !== undefined) {
    return byMime;
  }
  const dot = file.name.lastIndexOf(".");
  const extension = dot === -1 ? "" : file.name.slice(dot + 1).toLowerCase();
  return FORMAT_OF_EXTENSION[extension] ?? null;
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

export const formatBytes = (bytes: number, locale: string): string => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "—";
  }
  if (bytes < 1000) {
    return `${new Intl.NumberFormat(locale).format(bytes)} B`;
  }
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1000;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)} ${units[unit]}`;
};

export const formatDimensions = (width: number, height: number): string =>
  `${width} × ${height}`;

/** The display stem of a file: no folder, no extension, no control text. */
export const sanitizeStem = (name: string): string => {
  /* v8 ignore next -- @preserve split always yields one element. */
  const base = name.split(/[\\/]/u).at(-1) ?? "";
  const withoutExtension = base.replace(/\.[^.]+$/u, "");
  const clean = [...withoutExtension]
    .filter((character) => {
      /* v8 ignore next -- @preserve a spread element is one code point. */
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

export const clampTolerance = (value: number): number =>
  Math.min(MAX_TOLERANCE, Math.max(MIN_TOLERANCE, value));

export const clampBrushSize = (value: number): number =>
  Math.min(MAX_BRUSH_SIZE, Math.max(MIN_BRUSH_SIZE, value));

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

const isReadyState = (state: RowState): boolean =>
  state === "ready" || state === "edited" || state === "downloaded";

export const isDownloadable = (state: RowState): boolean => isReadyState(state);

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
): readonly string[] =>
  rows.flatMap((row) =>
    row.state === "queued" ||
    row.state === "stale" ||
    row.state === "cancelled" ||
    row.state === "failed"
      ? [row.id]
      : []
  );

export const nextOpenId = (remaining: readonly string[]): string | null =>
  /* v8 ignore next -- @preserve the length check proves index zero exists. */
  remaining.length === 1 ? (remaining[0] ?? null) : null;

/** The state a settings change gives a finished row. */
export const stateAfterSettingsChange = (state: RowState): RowState =>
  isReadyState(state) ? "stale" : state;

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

export const fitScaleOf = (
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): number => {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return 1;
  }
  return Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
};

export const clampScale = (scale: number): number =>
  Math.min(8, Math.max(0.1, scale));

export const clampOffset = (options: {
  readonly offset: number;
  readonly scale: number;
  readonly stage: number;
  readonly viewport: number;
}): number => {
  const scaled = options.stage * options.scale;
  const slack = Math.max(
    0,
    (scaled - options.viewport) / 2 + options.viewport * 0.2
  );
  return Math.min(slack, Math.max(-slack, options.offset));
};

export const zoomAt = (options: {
  readonly pointerX: number;
  readonly pointerY: number;
  readonly nextScale: number;
  readonly viewportHeight: number;
  readonly viewportWidth: number;
  readonly view: PreviewState;
}): PreviewState => {
  const { pointerX, pointerY, nextScale, view } = options;
  const scale = clampScale(nextScale);
  const ratio = scale / view.scale;
  const x = pointerX - (pointerX - view.x) * ratio;
  const y = pointerY - (pointerY - view.y) * ratio;
  return {
    ...view,
    scale,
    x: clampOffset({
      offset: x,
      scale,
      stage: options.viewportWidth,
      viewport: options.viewportWidth,
    }),
    y: clampOffset({
      offset: y,
      scale,
      stage: options.viewportHeight,
      viewport: options.viewportHeight,
    }),
  };
};
