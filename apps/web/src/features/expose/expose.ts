/* eslint-disable eslint/max-classes-per-file, eslint/no-control-regex, eslint/complexity, unicorn/prefer-code-point -- the error and the service tag are the seam; format sniffing is a byte table */
/* oxlint-disable anti-slop/no-shape-in-symbol-names, anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof, anti-slop/require-safety-comment-for-type-assertion, react-doctor/js-flatmap-filter -- the seam is the boundary that turns untrusted bytes and tag values into domain types */
import { Context, Schema } from "effect";
import type { Effect } from "effect";

import type { ExposeError } from "@/features/expose/expose.error";
import type {
  FileFormat,
  MetadataGroup,
} from "@/features/expose/expose.vocabulary";

export { ExposeError } from "@/features/expose/expose.error";
export { FileFormat } from "@/features/expose/expose.vocabulary";
export type { MetadataGroup } from "@/features/expose/expose.vocabulary";

/**
 * Expose: the public seam between the page and the metadata engine.
 *
 * This file does not import a metadata library. The engine implements
 * `ExposeEngine`, and the page consumes it. Every value below is plain data so
 * it can cross a Worker boundary and a server render without a library type.
 */

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                  */
/* -------------------------------------------------------------------------- */

/** The ten Metadata Groups. Display is locked and never removable. */

/** The ten groups in glossary order. */
export const METADATA_GROUPS: readonly MetadataGroup[] = [
  "ai-provenance",
  "location",
  "time",
  "device-identity",
  "camera-settings",
  "authorship",
  "software-history",
  "thumbnails",
  "other-text",
  "display",
];

/** The nine removable groups. Display is never in this list. */
const REMOVABLE_GROUPS: readonly MetadataGroup[] = METADATA_GROUPS.filter(
  (group) => group !== "display"
);

/** The four Clean Presets. Custom carries the user's group selection. */
const CleanPreset = Schema.Literals([
  "ai-only",
  "personal",
  "everything",
  "custom",
]);
export type CleanPreset = typeof CleanPreset.Type;

/** The eight cleanable formats and the read-only DNG subset. */

/** The container family a field came from. A family, not a library tag. */
const MetadataContainer = Schema.Literals([
  "exif",
  "gps",
  "iptc",
  "xmp",
  "icc",
  "mpf",
  "makernote",
  "c2pa",
  "file",
  "pdf-info",
  "pdf-xmp",
  "quicktime",
  "item-list",
  "id3",
  "vorbis",
  "riff-info",
  "matroska",
  "ooxml-core",
  "ooxml-app",
  "ooxml-custom",
]);
export type MetadataContainer = typeof MetadataContainer.Type;

/** Every named failure. There is no unnamed throw across the seam. */

/** The groups each preset resolves to. Display is never present. */
const PRESET_GROUPS: Record<CleanPreset, readonly MetadataGroup[]> = {
  "ai-only": ["ai-provenance"],
  personal: ["location", "time", "device-identity", "authorship", "thumbnails"],
  everything: REMOVABLE_GROUPS,
  custom: [],
};

const FORMAT_EXTENSION: Record<FileFormat, string> = {
  dng: "dng",
  avif: "avif",
  gif: "gif",
  heic: "heic",
  jpeg: "jpg",
  jxl: "jxl",
  png: "png",
  tiff: "tiff",
  webp: "webp",
  pdf: "pdf",
  mp4: "mp4",
  mov: "mov",
  m4v: "m4v",
  webm: "webm",
  mkv: "mkv",
  avi: "avi",
  m4a: "m4a",
  mp3: "mp3",
  wav: "wav",
  flac: "flac",
  ogg: "ogg",
  docx: "docx",
  xlsx: "xlsx",
  pptx: "pptx",
};

const FORMAT_MIME: Record<FileFormat, string> = {
  dng: "image/dng",
  avif: "image/avif",
  gif: "image/gif",
  heic: "image/heic",
  jpeg: "image/jpeg",
  jxl: "image/jxl",
  png: "image/png",
  tiff: "image/tiff",
  webp: "image/webp",
  pdf: "application/pdf",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  ogg: "audio/ogg",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export const FORMAT_LABEL: Record<FileFormat, string> = {
  dng: "DNG",
  avif: "AVIF",
  gif: "GIF",
  heic: "HEIC/HEIF",
  jpeg: "JPEG",
  jxl: "JPEG XL",
  png: "PNG",
  tiff: "TIFF",
  webp: "WebP",
  pdf: "PDF",
  mp4: "MP4",
  mov: "MOV",
  m4v: "M4V",
  webm: "WebM",
  mkv: "MKV",
  avi: "AVI",
  m4a: "M4A",
  mp3: "MP3",
  wav: "WAV",
  flac: "FLAC",
  ogg: "OGG/Opus",
  docx: "DOCX",
  xlsx: "XLSX",
  pptx: "PPTX",
};

export type FormatFamily =
  | "image"
  | "raw"
  | "document"
  | "video"
  | "audio"
  | "office";

export const familyOf = (format: FileFormat): FormatFamily => {
  if (format === "dng") {
    return "raw";
  }
  if (format === "pdf") {
    return "document";
  }
  if (["mp4", "mov", "m4v", "webm", "mkv", "avi"].includes(format)) {
    return "video";
  }
  if (["m4a", "mp3", "wav", "flac", "ogg"].includes(format)) {
    return "audio";
  }
  if (["docx", "xlsx", "pptx"].includes(format)) {
    return "office";
  }
  return "image";
};

export const isReadOnly = (format: FileFormat): boolean =>
  ["dng", "pdf", "mp3", "wav", "flac", "ogg", "webm", "mkv", "avi"].includes(
    format
  );

/** Resolve a preset to the Metadata Groups a clean asks for. */
export const groupsForPreset = (
  preset: CleanPreset,
  custom: readonly MetadataGroup[] = []
): readonly MetadataGroup[] => {
  if (preset === "custom") {
    return custom.filter((group) => group !== "display");
  }
  return PRESET_GROUPS[preset].filter((group) => group !== "display");
};

/** The file name a clean writes. The input name is never reused. */
export const cleanedNameOf = (name: string, format: FileFormat): string => {
  const dot = name.lastIndexOf(".");
  const stem = (dot > 0 ? name.slice(0, dot) : dot === -1 ? name : "")
    .replaceAll(/[\\/:*?"<>|]/gu, "-")
    .replaceAll(/[\u0000-\u001F]/gu, "")
    .trim();
  const safeStem = stem.length > 0 ? stem : "image";
  return `${safeStem}-clean.${FORMAT_EXTENSION[format]}`;
};

export const mimeOf = (format: FileFormat): string => FORMAT_MIME[format];

export { sniffFormat } from "@/features/expose/expose.sniff";

/* -------------------------------------------------------------------------- */
/* Input and read report                                                      */
/* -------------------------------------------------------------------------- */

/** One file. The engine sniffs the bytes; `type` and `name` are hints only. */
export interface ExposeSource {
  readonly bytes: Blob;
  readonly lastModified: number;
  readonly name: string;
  readonly type: string;
}

/** What the image is, independent of its metadata. */
export interface FileFacts {
  readonly bytes: number;
  readonly format: FileFormat;
  /** Null when the format does not report a frame count. */
  readonly frames: number | null;
  readonly height: number | null;
  readonly mime: string;
  readonly name: string;
  /** The EXIF orientation value, or 1 when the file has none. */
  readonly orientation: number;
  readonly width: number | null;
  readonly family: FormatFamily;
  readonly durationSeconds: number | null;
  readonly pageCount: number | null;
  readonly sampleRate: number | null;
  readonly channels: number | null;
  readonly parts: number | null;
}

/**
 * One Metadata Field.
 *
 * `id` is an engine-owned stable key. It is not a library property name.
 * `value` is plain text and is always rendered as text, never as HTML.
 * Binary payloads (ICC, thumbnail, C2PA) are summarised as a label and a
 * size, never dumped as text. The thumbnail is in `Thumbnail`; the manifest
 * is in `AiProvenance`.
 */
export interface MetadataField {
  readonly container: MetadataContainer;
  readonly group: MetadataGroup;
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

/** One group's count and whether this format can remove it. */
export interface MetadataGroupReport {
  readonly containers: readonly MetadataContainer[];
  readonly count: number;
  readonly group: MetadataGroup;
  readonly removability: "removable" | "display" | "format";
}

/** A decimal GPS point, clamped to valid ranges. */
export interface GpsPoint {
  readonly altitudeMeters: number | null;
  readonly latitude: number;
  readonly longitude: number;
}

/** The C2PA evidence. Presence and size, never a validity claim. */
export interface C2paEvidence {
  readonly bytes: number;
  readonly claimGenerator: string | null;
  readonly hasThumbnail: boolean;
  readonly manifests: number;
  readonly claimedSigner: string | null;
}

/** One generation parameter read from the C2PA Manifest, as text. */
export interface AiParameter {
  readonly label: string;
  readonly value: string;
}

/** AI Provenance outside the C2PA Manifest, such as an XMP source type. */
export interface AiSignal {
  readonly container: MetadataContainer;
  readonly label: string;
  readonly value: string;
}

export interface AiProvenance {
  readonly c2pa: C2paEvidence | null;
  readonly digitalSourceTypes: readonly string[];
  readonly generationParameters: readonly AiParameter[];
  readonly signals: readonly AiSignal[];
}

/** An embedded preview. `data` is a Blob, never a base64 tag value. */
export interface Thumbnail {
  readonly bytes: number;
  readonly data: Blob;
  readonly height: number;
  readonly mime: string;
  readonly source:
    | "exif"
    | "mpf"
    | "c2pa"
    | "cover-art"
    | "office"
    | "dng-preview";
  readonly width: number;
}

export interface ReadCounts {
  readonly fields: number;
  readonly groups: number;
  readonly kept: number;
  readonly removable: number;
}

/**
 * A fact the UI must show beside the report. Codes are translated; `detail`
 * is developer-only and never printed.
 */
export type ReadNoteCode =
  | "dng-read-only"
  | "maker-note"
  | "c2pa-unparsed"
  | "jxl-brotli"
  | "icc-not-read"
  | "read-only-format"
  | "pdf-clean-unavailable"
  | "office-properties-only"
  | "media-tags-only"
  | "c2pa-format-unsupported"
  | "pdf-preview-unavailable"
  | "media-preview-unavailable"
  | "office-preview-unavailable"
  | "engine-build-limited"
  | "tiff-no-file-details";

export interface ReadNote {
  readonly code: ReadNoteCode;
  readonly detail: string | null;
}

export interface ReadReport {
  readonly ai: AiProvenance;
  readonly counts: ReadCounts;
  readonly facts: FileFacts;
  readonly fields: readonly MetadataField[];
  readonly gps: GpsPoint | null;
  readonly groups: readonly MetadataGroupReport[];
  readonly notes: readonly ReadNote[];
  readonly thumbnail: Thumbnail | null;
}

/* -------------------------------------------------------------------------- */
/* Clean                                                                      */
/* -------------------------------------------------------------------------- */

/** The phases a clean reports. */
export type CleanPhase = "loading-engine" | "cleaning" | "verifying";

export interface CleanProgress {
  readonly loadedBytes: number | null;
  readonly percent: number | null;
  readonly phase: CleanPhase;
  readonly totalBytes: number | null;
}

/**
 * The resolved selection. The UI resolves a preset to groups; the engine
 * validates it. `display` is never accepted here.
 */
export interface CleanRequest {
  readonly groups: readonly MetadataGroup[];
  readonly preset: CleanPreset;
  /** Host-only progress sink. It never crosses the worker boundary. */
  readonly report?: (progress: CleanProgress) => void;
}

export interface GroupChange {
  readonly after: number;
  readonly before: number;
  readonly group: MetadataGroup;
}

export interface CleanedFile {
  readonly bytes: Uint8Array;
  readonly name: string;
  readonly type: string;
}

export interface ContentCheck {
  readonly kind:
    | "image-payload"
    | "pdf-content"
    | "media-samples"
    | "office-parts";
  readonly beforeHash: string;
  readonly afterHash: string;
  readonly unchanged: boolean;
  readonly parts: number | null;
}

export interface Verification {
  readonly c2pa: {
    readonly afterBytes: number;
    readonly beforeBytes: number;
  };
  readonly display: GroupChange;
  readonly kept: readonly GroupChange[];
  readonly content: ContentCheck;
  /** The second read of the Cleaned File. */
  readonly read: ReadReport;
  readonly selected: readonly GroupChange[];
}

export type CleanWarningCode =
  | "maker-note-removed"
  | "c2pa-not-validated"
  | "format-limit"
  | "container-rebuilt"
  | "pdf-info-and-xmp"
  | "media-tags-only"
  | "office-properties-only";

export interface CleanWarning {
  readonly code: CleanWarningCode;
  readonly detail: string | null;
  readonly group: MetadataGroup | null;
}

export interface EngineFacts {
  readonly name: string;
  readonly version: string;
}

export interface CleanResult {
  readonly engine: EngineFacts;
  readonly file: CleanedFile;
  readonly kept: readonly GroupChange[];
  readonly removed: readonly GroupChange[];
  readonly verification: Verification;
  readonly warnings: readonly CleanWarning[];
}

/* -------------------------------------------------------------------------- */
/* Errors and service                                                         */
/* -------------------------------------------------------------------------- */

export interface ExposeCleanTask {
  readonly id: string;
  readonly source: ExposeSource;
}

export type ExposeCleanEvent =
  | { readonly kind: "started"; readonly id: string }
  | {
      readonly kind: "progress";
      readonly id: string;
      readonly progress: CleanProgress;
    }
  | {
      readonly kind: "result";
      readonly id: string;
      readonly result: CleanResult;
    }
  | {
      readonly kind: "failed";
      readonly id: string;
      readonly error: ExposeError;
    };

export interface ExposeEngineShape {
  readonly cleanBatch: (
    tasks: readonly ExposeCleanTask[],
    request: CleanRequest,
    report: (event: ExposeCleanEvent) => void
  ) => Effect.Effect<void>;
  readonly read: (
    source: ExposeSource,
    report?: (progress: CleanProgress) => void
  ) => Effect.Effect<ReadReport, ExposeError>;
  readonly clean: (
    source: ExposeSource,
    request: CleanRequest
  ) => Effect.Effect<CleanResult, ExposeError>;
}

export class ExposeEngine extends Context.Service<
  ExposeEngine,
  ExposeEngineShape
>()("@ritools/web/ExposeEngine") {}

/* -------------------------------------------------------------------------- */
/* Pure report helpers                                                        */
/* -------------------------------------------------------------------------- */

/** Whether a thrown value is the device refusing to allocate the work. */
export const isMemoryFailure = (value: unknown): boolean => {
  const message = value instanceof Error ? value.message : String(value ?? "");
  return /memory|allocation|array buffer|out of bounds/iu.test(message);
};

/** Clamp a GPS point to the ranges a latitude, longitude, and altitude use. */
export const clampGps = (
  latitude: number | null,
  longitude: number | null,
  altitude: number | null
): GpsPoint | null => {
  if (
    latitude === null ||
    longitude === null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }
  const lat = Math.min(90, Math.max(-90, latitude));
  const lon = Math.min(180, Math.max(-180, longitude));
  return {
    altitudeMeters:
      altitude !== null && Number.isFinite(altitude) ? altitude : null,
    latitude: lat,
    longitude: lon,
  };
};

/** The field counts the report and the clean summary both read. */
export const countsOf = (
  fields: readonly MetadataField[],
  groups: readonly MetadataGroupReport[]
): ReadCounts => {
  const removable = groups.reduce(
    (total, report) =>
      report.removability === "removable" ? total + report.count : total,
    0
  );
  return {
    fields: fields.length,
    groups: groups.filter((report) => report.count > 0).length,
    kept: fields.length - removable,
    removable,
  };
};

/**
 * A path inside a Worker message or a tag never changes the ID format. IDs are
 * deterministic for the same report, so a re-read can be compared.
 */
export const fieldIdOf = (
  container: MetadataContainer,
  label: string,
  index: number
): string => {
  const slug = label
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "")
    .slice(0, 48);
  return `${container}:${slug || "field"}:${index}`;
};

/** Turn any untrusted tag value into plain text, never HTML. */
export const textOf = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    if ("description" in value) {
      return textOf((value as { description: unknown }).description);
    }
    if ("value" in value) {
      return textOf((value as { value: unknown }).value);
    }
    if (Array.isArray(value)) {
      return value.map(textOf).filter(Boolean).join(", ");
    }
    if (
      "byteLength" in value &&
      typeof (value as { byteLength: unknown }).byteLength === "number"
    ) {
      return `${(value as { byteLength: number }).byteLength} bytes`;
    }
  }
  return "";
};

export type { ExposeErrorCode } from "@/features/expose/expose.vocabulary";
