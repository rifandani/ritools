/* eslint-disable eslint/no-bitwise, eslint/complexity, eslint/no-unmodified-loop-condition, eslint/require-unicode-regexp, unicorn/prefer-code-point, unicorn/prefer-number-coercion, unicorn/consistent-function-scoping, import/no-named-as-default-member -- the reader parses byte-exact image headers and container values */
/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof, anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unsafe-dictionary-type, anti-slop/no-known-value-widening, anti-slop/no-chained-type-assertions, react-doctor/js-combine-iterations -- the reader is the boundary that turns ExifReader objects into the seam report */
import { DOMParser as XmlDomParser, onErrorStopParsing } from "@xmldom/xmldom";
import ExifReader from "exifreader";
import type { ExpandedTags } from "exifreader";

import type {
  AiParameter,
  AiSignal,
  C2paEvidence,
  GpsPoint,
  ImageFacts,
  ImageFormat,
  MetadataContainer,
  MetadataField,
  MetadataGroupReport,
  ReadNote,
  ReadReport,
  Thumbnail,
} from "@/features/expose/expose";
import {
  clampGps,
  countsOf,
  ExposeError,
  fieldIdOf,
  isMemoryFailure,
  METADATA_GROUPS,
  mimeOf,
  sniffFormat,
  textOf,
} from "@/features/expose/expose";
import { scanC2pa } from "@/features/expose/expose.c2pa";
import { containerFor, groupOf } from "@/features/expose/expose.groups";

/**
 * Read one image with ExifReader and a small C2PA scan.
 *
 * The result is semantic: every tag is classified, every value is text, and
 * no ExifReader object leaves this module.
 */

/** XMP is XML, and a Worker has no DOMParser of its own. */
const xmlParser = new XmlDomParser({ onError: onErrorStopParsing });

const EXIFREADER_SKIP = new Set([
  "_raw",
  "about",
  "base64",
  "image",
  "data",
  "MakerNote",
  "MakerNotes",
  // Pointers and container bookkeeping are not metadata a person can remove.
  // They also disappear when a container is rewritten, so counting them would
  // make the Verification report a Display change that did not happen.
  "applicationnotes",
  "cfapattern",
  "componentsconfiguration",
  "compositeimage",
  "compressedbitsperpixel",
  "exififdpointer",
  "exifversion",
  "extrasamples",
  "flashpixversion",
  "gpsifdpointer",
  "interoperabilityifdpointer",
  "interoperabilityindex",
  "interoperabilityversion",
  "iptcnaa",
  "mpfversion",
  "numberofimages",
  "planarconfiguration",
  "predictor",
  "recordversion",
  "rowsperstrip",
  "sampleformat",
  "samplerate",
  "stripoffsets",
  "stripbytecounts",
  "subfiletype",
  "tilebytecounts",
  "tilelength",
  "tileoffsets",
  "tilewidth",
]);

const structuralName = (label: string): boolean =>
  EXIFREADER_SKIP.has(label.toLowerCase().replaceAll(/[^a-z0-9]/gu, ""));

const binarySummary = (label: string, value: unknown): string => {
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return `${label} · ${value.byteLength} bytes`;
  }
  return "";
};

const cleanText = (value: string): string =>
  value.replaceAll("\u0000", "").replaceAll(/\r\n?/g, "\n").slice(0, 20_000);

const arrayBufferOf = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer instanceof ArrayBuffer
    ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    : new Uint8Array(bytes).buffer;

const decodeBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    out[index] = binary.charCodeAt(index);
  }
  return out;
};

/* -------------------------------------------------------------------------- */
/* Image dimensions                                                           */
/* -------------------------------------------------------------------------- */

const sizeFromJpeg = (
  bytes: Uint8Array
): { height: number; width: number } | null => {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1] ?? 0;
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset += 2;
      continue;
    }
    if (marker === 0xda || marker === 0x01) {
      return null;
    }
    const length = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      return {
        height: ((bytes[offset + 5] ?? 0) << 8) | (bytes[offset + 6] ?? 0),
        width: ((bytes[offset + 7] ?? 0) << 8) | (bytes[offset + 8] ?? 0),
      };
    }
    if (length < 2) {
      return null;
    }
    offset += 2 + length;
  }
  return null;
};

const sizeFromGif = (
  bytes: Uint8Array
): { height: number; width: number } | null => {
  if (bytes.length < 10) {
    return null;
  }
  return {
    height: (bytes[8] ?? 0) | ((bytes[9] ?? 0) << 8),
    width: (bytes[6] ?? 0) | ((bytes[7] ?? 0) << 8),
  };
};

const sizeFromWebp = (
  bytes: Uint8Array
): { height: number; width: number } | null => {
  const type = String.fromCharCode(...bytes.subarray(12, 16));
  if (type === "VP8X" && bytes.length >= 30) {
    return {
      height:
        (bytes[27] ?? 0) * 0x1_00_00 +
        ((bytes[28] ?? 0) << 8) +
        (bytes[29] ?? 0) +
        1,
      width:
        (bytes[24] ?? 0) * 0x1_00_00 +
        ((bytes[25] ?? 0) << 8) +
        (bytes[26] ?? 0) +
        1,
    };
  }
  if (type === "VP8L" && bytes.length >= 25) {
    const bits =
      (bytes[21] ?? 0) +
      ((bytes[22] ?? 0) << 8) +
      ((bytes[23] ?? 0) << 16) +
      (bytes[24] ?? 0) * 0x1_00_00_00;
    return {
      height: ((bits >> 14) & 0x3f_ff) + 1,
      width: (bits & 0x3f_ff) + 1,
    };
  }
  if (type === "VP8 " && bytes.length >= 30) {
    const start = 26;
    if (
      bytes[start] !== 0x9d ||
      bytes[start + 1] !== 0x01 ||
      bytes[start + 2] !== 0x2a
    ) {
      return null;
    }
    return {
      height: ((bytes[start + 5] ?? 0) << 8) | (bytes[start + 4] ?? 0),
      width: ((bytes[start + 7] ?? 0) << 8) | (bytes[start + 6] ?? 0),
    };
  }
  return null;
};

const sizeFromBmff = (
  bytes: Uint8Array
): { height: number; width: number } | null => {
  const walk = (
    start: number,
    end: number,
    depth: number
  ): { height: number; width: number } | null => {
    let offset = start;
    while (offset + 8 <= end && depth < 4) {
      let size =
        ((bytes[offset] ?? 0) * 0x1_00_00_00 +
          ((bytes[offset + 1] ?? 0) << 16) +
          ((bytes[offset + 2] ?? 0) << 8) +
          (bytes[offset + 3] ?? 0)) >>>
        0;
      const type = String.fromCharCode(
        ...bytes.subarray(offset + 4, offset + 8)
      );
      let header = 8;
      if (size === 1) {
        size = 0;
        header = 16;
      } else if (size === 0) {
        size = end - offset;
      }
      if (size < header || offset + size > end) {
        return null;
      }
      if (type === "ispe" && size >= 20) {
        return {
          height:
            ((bytes[offset + 16] ?? 0) * 0x1_00_00_00 +
              ((bytes[offset + 17] ?? 0) << 16) +
              ((bytes[offset + 18] ?? 0) << 8) +
              (bytes[offset + 19] ?? 0)) >>>
            0,
          width:
            ((bytes[offset + 12] ?? 0) * 0x1_00_00_00 +
              ((bytes[offset + 13] ?? 0) << 16) +
              ((bytes[offset + 14] ?? 0) << 8) +
              (bytes[offset + 15] ?? 0)) >>>
            0,
        };
      }
      if (
        type === "meta" ||
        type === "moov" ||
        type === "trak" ||
        type === "mdia" ||
        type === "iprp" ||
        type === "ipco"
      ) {
        const found = walk(
          type === "meta" ? offset + header + 4 : offset + header,
          offset + size,
          depth + 1
        );
        if (found !== null) {
          return found;
        }
      }
      offset += size;
    }
    return null;
  };
  return walk(0, bytes.length, 0);
};

export const imageSizeOf = (
  bytes: Uint8Array
): { height: number; width: number } | null => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return sizeFromJpeg(bytes);
  }
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return {
      height:
        ((bytes[20] ?? 0) * 0x1_00_00_00 +
          ((bytes[21] ?? 0) << 16) +
          ((bytes[22] ?? 0) << 8) +
          (bytes[23] ?? 0)) >>>
        0,
      width:
        ((bytes[16] ?? 0) * 0x1_00_00_00 +
          ((bytes[17] ?? 0) << 16) +
          ((bytes[18] ?? 0) << 8) +
          (bytes[19] ?? 0)) >>>
        0,
    };
  }
  if (
    bytes.length >= 10 &&
    String.fromCharCode(...bytes.subarray(0, 3)) === "GIF"
  ) {
    return sizeFromGif(bytes);
  }
  if (
    bytes.length >= 30 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return sizeFromWebp(bytes);
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(4, 8)) === "ftyp"
  ) {
    return sizeFromBmff(bytes);
  }
  return null;
};

/* -------------------------------------------------------------------------- */
/* Field extraction                                                           */
/* -------------------------------------------------------------------------- */

const pushField = (
  fields: MetadataField[],
  seen: Map<string, number>,
  container: MetadataContainer,
  label: string,
  value: string,
  fallbackGroup?: Parameters<typeof groupOf>[2]
): void => {
  const cleaned = cleanText(value);
  if (cleaned.trim().length === 0) {
    return;
  }
  const key = `${container}:${label}`;
  const index = seen.get(key) ?? 0;
  seen.set(key, index + 1);
  fields.push({
    container,
    group: groupOf(container, label, fallbackGroup),
    id: fieldIdOf(container, label, index),
    label: cleanText(label),
    value: cleaned,
  });
};

const pushGroup = (
  fields: MetadataField[],
  seen: Map<string, number>,
  container: MetadataContainer,
  records: Record<string, unknown>
): void => {
  for (const [label, value] of Object.entries(records)) {
    if (EXIFREADER_SKIP.has(label) || structuralName(label)) {
      continue;
    }
    const summary = binarySummary(label, value);
    pushField(
      fields,
      seen,
      container,
      label,
      summary.length > 0 ? summary : textOf(value)
    );
  }
};

const numeric = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const text = textOf(value);
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : null;
};

const gpsPointOf = (tags: ExpandedTags): GpsPoint | null => {
  const gps = (tags.gps ?? {}) as Record<string, unknown>;
  const exif = (tags.exif ?? {}) as Record<string, unknown>;
  const latitude =
    numeric(gps.Latitude) ??
    numeric(
      (exif.GPSLatitude as { description?: unknown } | undefined)?.description
    );
  const rawLongitude =
    numeric(gps.Longitude) ??
    numeric(
      (exif.GPSLongitude as { description?: unknown } | undefined)?.description
    );
  if (latitude === null || rawLongitude === null) {
    return null;
  }
  let longitude = rawLongitude;
  const longitudeRef = textOf(exif.GPSLongitudeRef).trim().toUpperCase();
  if (longitudeRef === "W" && longitude > 0) {
    longitude = -longitude;
  }
  const altitude =
    numeric(gps.Altitude) ??
    numeric(
      (exif.GPSAltitude as { description?: unknown } | undefined)?.description
    );
  return clampGps(latitude, longitude, altitude);
};

const orientationOf = (tags: ExpandedTags): number => {
  const exif = (tags.exif ?? {}) as Record<string, unknown>;
  const tag = exif.Orientation as
    | { computed?: unknown; description?: unknown; value?: unknown }
    | undefined;
  const value = numeric(tag?.computed ?? tag?.value);
  if (value !== null && value >= 1 && value <= 8) {
    return value;
  }
  const description = textOf(tag?.description).toLowerCase();
  const byDescription: Record<string, number> = {
    "bottom-left": 3,
    "bottom-right": 3,
    "left-bottom": 8,
    "left-top": 5,
    "right-bottom": 7,
    "right-top": 6,
    "top-left": 1,
    "top-right": 2,
  };
  return byDescription[description] ?? 1;
};

const thumbnailOf = (tags: ExpandedTags): Thumbnail | null => {
  const thumbnail = (tags.Thumbnail ??
    (tags as unknown as Record<string, unknown>).thumbnail) as
    | {
        base64?: unknown;
        image?: unknown;
        type?: unknown;
      }
    | undefined;
  if (thumbnail === undefined) {
    return null;
  }
  let bytes: Uint8Array | null = null;
  const { image } = thumbnail;
  if (image instanceof ArrayBuffer) {
    bytes = new Uint8Array(image);
  } else if (ArrayBuffer.isView(image)) {
    bytes = new Uint8Array(image.buffer, image.byteOffset, image.byteLength);
  } else if (typeof thumbnail.base64 === "string") {
    try {
      bytes = decodeBase64(thumbnail.base64);
    } catch {
      return null;
    }
  }
  if (bytes === null || bytes.length === 0) {
    return null;
  }
  const mime =
    typeof thumbnail.type === "string" && thumbnail.type.length > 0
      ? thumbnail.type
      : "image/jpeg";
  const size = imageSizeOf(bytes);
  return {
    bytes: bytes.length,
    data: new Blob([bytes.slice().buffer as ArrayBuffer], { type: mime }),
    height: size?.height ?? 0,
    mime,
    source: "exif",
    width: size?.width ?? 0,
  };
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1000) {
    return `${bytes} B`;
  }
  if (bytes < 1_000_000) {
    return `${(bytes / 1000).toFixed(1)} KB`;
  }
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
};

/* -------------------------------------------------------------------------- */
/* The read                                                                   */
/* -------------------------------------------------------------------------- */

export interface ReadImageInput {
  readonly bytes: Uint8Array;
  readonly name: string;
  readonly type: string;
}

const formatFromExifReader = (tags: ExpandedTags): ImageFormat | null => {
  const file = (tags.file ?? {}) as Record<string, unknown>;
  const value = textOf(file.FileType).toLowerCase();
  if (
    value === "jpeg" ||
    value === "jxl" ||
    value === "tiff" ||
    value === "png" ||
    value === "heic" ||
    value === "avif" ||
    value === "webp" ||
    value === "gif"
  ) {
    return value;
  }
  return null;
};

const frameCountOf = (tags: ExpandedTags): number | null => {
  const gif = (tags.gif ?? {}) as Record<string, unknown>;
  const count = numeric(gif["Number of Frames"] ?? gif["Frame Count"]);
  return count !== null && count > 0 ? count : null;
};

const dimensionsFromTags = (
  tags: ExpandedTags
): { height: number; width: number } | null => {
  const file = (tags.file ?? {}) as Record<string, unknown>;
  const png = (tags.png ?? {}) as Record<string, unknown>;
  const exif = (tags.exif ?? {}) as Record<string, unknown>;
  const pick = (record: Record<string, unknown>, key: string): number | null =>
    numeric(
      (record[key] as { computed?: unknown; value?: unknown } | undefined)
        ?.computed ?? (record[key] as { value?: unknown } | undefined)?.value
    );
  const width =
    pick(file, "Image Width") ??
    pick(png, "Image Width") ??
    pick(exif, "ImageWidth") ??
    pick(exif, "Image Width");
  const height =
    pick(file, "Image Height") ??
    pick(png, "Image Height") ??
    pick(exif, "ImageLength") ??
    pick(exif, "Image Height");
  if (width === null || height === null || width <= 0 || height <= 0) {
    return null;
  }
  return { height, width };
};

const hasMakerNote = (tags: ExpandedTags): boolean => {
  if (tags.makerNotes !== undefined) {
    return true;
  }
  const exif = (tags.exif ?? {}) as Record<string, unknown>;
  return exif.MakerNote !== undefined || exif.MakerNotes !== undefined;
};

/** Read one image. Every failure is an `ExposeError`. */
export const readImage = (input: ReadImageInput): ReadReport => {
  const format = sniffFormat(input.bytes, input.name);
  if (format === null) {
    throw new ExposeError({
      code: "unsupported-format",
      detail: "the bytes are not one of the eight supported image formats",
    });
  }

  let tags: ExpandedTags;
  try {
    tags = ExifReader.load(arrayBufferOf(input.bytes), {
      computed: true,
      domParser: xmlParser,
      expanded: true,
    });
  } catch (error) {
    throw new ExposeError({
      code: isMemoryFailure(error) ? "too-large" : "unreadable-file",
      detail:
        error instanceof Error ? error.message : "ExifReader rejected the file",
      format,
    });
  }
  if (Object.keys(tags).length === 0) {
    throw new ExposeError({
      code: "unreadable-file",
      detail: "the file carries no readable image container",
      format,
    });
  }

  const resolvedFormat = formatFromExifReader(tags) ?? format;
  const fields: MetadataField[] = [];
  const seen = new Map<string, number>();
  for (const [key, value] of Object.entries(tags)) {
    if (
      key === "Thumbnail" ||
      key === "thumbnail" ||
      key === "Images" ||
      key === "pngFile" ||
      key === "pngText"
    ) {
      continue;
    }
    const container = containerFor(key);
    if (typeof value !== "object" || value === null) {
      continue;
    }
    pushGroup(fields, seen, container, value as Record<string, unknown>);
  }

  if (fields.length === 0) {
    throw new ExposeError({
      code: "unreadable-file",
      detail: "the file carries no readable image container",
      format: resolvedFormat,
    });
  }

  // An unexpanded Maker Note is still a fact the report must show. Its fields
  // are not readable, so one marker field stands in for the block.
  if (
    hasMakerNote(tags) &&
    !fields.some((field) => field.container === "makernote")
  ) {
    const exif = (tags.exif ?? {}) as Record<string, unknown>;
    const makerNote = exif.MakerNote ?? exif.MakerNotes;
    pushField(
      fields,
      seen,
      "makernote",
      "Maker Note",
      binarySummary("Maker Note", makerNote) || "Maker Note present"
    );
  }

  const c2pa = scanC2pa(input.bytes, resolvedFormat);
  const c2paEvidence: C2paEvidence | null =
    c2pa === null
      ? null
      : {
          bytes: c2pa.bytes,
          claimGenerator: c2pa.claimGenerator,
          hasThumbnail: c2pa.hasThumbnail,
          manifests: c2pa.manifests,
          claimedSigner: c2pa.claimedSigner,
        };
  if (c2pa !== null) {
    pushField(
      fields,
      seen,
      "c2pa",
      "C2PA Manifest",
      `${c2pa.manifests} manifest${c2pa.manifests === 1 ? "" : "s"} · ${formatBytes(c2pa.bytes)}`
    );
    if (c2pa.claimGenerator !== null) {
      pushField(fields, seen, "c2pa", "Claim generator", c2pa.claimGenerator);
    }
    if (c2pa.claimedSigner !== null) {
      pushField(fields, seen, "c2pa", "Claimed signer", c2pa.claimedSigner);
    }
    if (c2pa.actions.length > 0) {
      pushField(fields, seen, "c2pa", "Actions", c2pa.actions.join(", "));
    }
    for (const type of c2pa.digitalSourceTypes) {
      pushField(fields, seen, "c2pa", "Digital source type", type);
    }
    for (const parameter of c2pa.parameters) {
      pushField(fields, seen, "c2pa", parameter.label, parameter.value);
    }
  }

  const thumbnail = thumbnailOf(tags);
  if (thumbnail !== null) {
    pushField(
      fields,
      seen,
      "mpf",
      "Thumbnail",
      `${thumbnail.width} × ${thumbnail.height} · ${formatBytes(thumbnail.bytes)}`
    );
  }

  const groupOrder = new Map(
    METADATA_GROUPS.map((group, index) => [group, index])
  );
  fields.sort((left, right) => {
    const groupDelta =
      (groupOrder.get(left.group) ?? 0) - (groupOrder.get(right.group) ?? 0);
    if (groupDelta !== 0) {
      return groupDelta;
    }
    if (left.container !== right.container) {
      return left.container.localeCompare(right.container);
    }
    return left.label.localeCompare(right.label);
  });

  const dimensions = dimensionsFromTags(tags) ?? imageSizeOf(input.bytes);
  const facts: ImageFacts = {
    bytes: input.bytes.length,
    format: resolvedFormat,
    frames: frameCountOf(tags),
    height: dimensions?.height ?? 0,
    mime: mimeOf(resolvedFormat),
    name: input.name,
    orientation: orientationOf(tags),
    width: dimensions?.width ?? 0,
  };

  const groups: MetadataGroupReport[] = METADATA_GROUPS.map((group) => {
    const inGroup = fields.filter((field) => field.group === group);
    return {
      containers: [...new Set(inGroup.map((field) => field.container))],
      count: inGroup.length,
      group,
      removability:
        group === "display"
          ? "display"
          : group === "ai-provenance" &&
              resolvedFormat === "jxl" &&
              c2paEvidence !== null
            ? "format"
            : "removable",
    };
  });

  const aiFields = fields.filter((field) => field.group === "ai-provenance");
  const signals: AiSignal[] = aiFields
    .filter((field) => field.container !== "c2pa")
    .map((field) => ({
      container: field.container,
      label: field.label,
      value: field.value,
    }));
  const generationParameters: AiParameter[] = (c2pa?.parameters ?? []).map(
    (parameter) => ({
      label: parameter.label,
      value: parameter.value,
    })
  );

  const notes: ReadNote[] = [];
  if (hasMakerNote(tags)) {
    notes.push({ code: "maker-note", detail: null });
  }
  if (c2pa !== null && !c2pa.parsed) {
    notes.push({
      code: "c2pa-unparsed",
      detail: "the JUMBF store did not carry a readable claim",
    });
  }
  if (resolvedFormat === "jxl") {
    notes.push({ code: "jxl-brotli", detail: null });
  }
  if (
    (resolvedFormat === "jxl" || resolvedFormat === "gif") &&
    (tags.icc === undefined || Object.keys(tags.icc).length === 0)
  ) {
    notes.push({ code: "icc-not-read", detail: null });
  }
  if (resolvedFormat === "gif") {
    notes.push({ code: "gif-details-only", detail: null });
  }
  if (resolvedFormat === "tiff") {
    notes.push({ code: "tiff-no-file-details", detail: null });
  }

  return {
    ai: {
      c2pa: c2paEvidence,
      digitalSourceTypes: [
        ...new Set([
          ...(c2pa?.digitalSourceTypes ?? []),
          ...fields
            .filter(
              (field) =>
                field.group === "ai-provenance" &&
                /digital source type/i.test(field.label)
            )
            .map((field) => field.value),
        ]),
      ],
      generationParameters,
      signals,
    },
    counts: countsOf(fields, groups),
    facts,
    fields,
    gps: gpsPointOf(tags),
    groups,
    notes,
    thumbnail,
  };
};
