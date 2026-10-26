/* eslint-disable eslint/complexity, eslint/prefer-named-capture-group, unicorn/consistent-function-scoping -- the reader decodes fixed tag values and GPS coordinate grammars at the engine boundary */
/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-unknown-returns, anti-slop/no-runtime-typeof, react-doctor/js-combine-iterations -- untrusted engine tag values are parsed here; reports expose plain semantic fields */
import type {
  CleanProgress,
  FileFacts,
  MetadataContainer,
  MetadataField,
  MetadataGroupReport,
  ReadNote,
  ReadReport,
  Thumbnail,
  GpsPoint,
} from "@/features/expose/expose";
import {
  clampGps,
  countsOf,
  ExposeError,
  familyOf,
  fieldIdOf,
  isReadOnly,
  METADATA_GROUPS,
  mimeOf,
  sniffFormat,
  textOf,
} from "@/features/expose/expose";
import { scanC2pa } from "@/features/expose/expose.c2pa";
import { inspectDng } from "@/features/expose/expose.dng";
import type { MetadataEngine } from "@/features/expose/expose.engine";
import { nodeMetadataEngine } from "@/features/expose/expose.engine";
import {
  canRemoveGroup,
  containerFor,
  groupOf,
} from "@/features/expose/expose.groups";
import { imageSizeOf } from "@/features/expose/expose.image-size";
import { readOffice } from "@/features/expose/expose.office";

export { imageSizeOf } from "@/features/expose/expose.image-size";
export interface ReadFileInput {
  readonly bytes: Uint8Array;
  readonly name: string;
  readonly type: string;
}
const numeric = (value: unknown): number | null => {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^-?\d+(?:\.\d+)?$/u.test(value.trim())
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(number) ? number : null;
};

/** QuickTime coordinates can be signed decimal or display DMS. */
export const gpsCoordinatesOf = (value: string): GpsPoint | null => {
  const decimal =
    /^\s*([+-]?\d+(?:\.\d+)?)\s*[, ]\s*([+-]?\d+(?:\.\d+)?)(?:\s*[, ]\s*([+-]?\d+(?:\.\d+)?))?\s*\/?$/u.exec(
      value
    );
  if (decimal !== null) {
    return clampGps(
      Number(decimal[1]),
      Number(decimal[2]),
      decimal[3] === undefined ? null : Number(decimal[3])
    );
  }
  const iso =
    /^([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)?\/?$/u.exec(
      value
    );
  if (iso !== null) {
    return clampGps(
      Number(iso[1]),
      Number(iso[2]),
      iso[3] === undefined ? null : Number(iso[3])
    );
  }
  const dms = [
    ...value.matchAll(
      /(\d+(?:\.\d+)?)\s*(?:deg|°)\s*(\d+(?:\.\d+)?)['′]\s*(\d+(?:\.\d+)?)?["″]?\s*([NSEW])/giu
    ),
  ];
  if (dms.length !== 2) {
    return null;
  }
  const coordinate = (match: RegExpMatchArray) =>
    (Number(match[1]) + Number(match[2]) / 60 + Number(match[3] ?? 0) / 3600) *
    (/S|W/iu.test(match[4] ?? "") ? -1 : 1);
  const lat = dms.find((match) => /N|S/iu.test(match[4] ?? ""));
  const lon = dms.find((match) => /E|W/iu.test(match[4] ?? ""));
  return lat === undefined || lon === undefined
    ? null
    : clampGps(coordinate(lat), coordinate(lon), null);
};

const tagValue = (
  tags: ReadonlyMap<string, unknown>,
  label: string
): unknown => {
  for (const [key, value] of tags) {
    if (
      key.slice(key.indexOf(":") + 1).replace(/#$/u, "") === label &&
      !key.startsWith("Composite:")
    ) {
      return value;
    }
  }
  return undefined;
};
const numberTag = (
  tags: ReadonlyMap<string, unknown>,
  label: string
): number | null => numeric(tagValue(tags, label));
const gpsOf = (tags: ReadonlyMap<string, unknown>): GpsPoint | null => {
  let lat = numberTag(tags, "GPSLatitude");
  let lon = numberTag(tags, "GPSLongitude");
  if (lat !== null && /S/iu.test(textOf(tagValue(tags, "GPSLatitudeRef")))) {
    lat = -Math.abs(lat);
  }
  if (lon !== null && /W/iu.test(textOf(tagValue(tags, "GPSLongitudeRef")))) {
    lon = -Math.abs(lon);
  }
  let altitude = numberTag(tags, "GPSAltitude");
  if (
    altitude !== null &&
    /below|^1$/iu.test(textOf(tagValue(tags, "GPSAltitudeRef")))
  ) {
    altitude = -Math.abs(altitude);
  }
  return (
    clampGps(lat, lon, altitude) ??
    gpsCoordinatesOf(textOf(tagValue(tags, "GPSCoordinates")))
  );
};
const thumbnailFrom = (
  bytes: Uint8Array,
  source: Thumbnail["source"]
): Thumbnail | null => {
  if (bytes.length === 0) {
    return null;
  }
  const size = imageSizeOf(bytes);
  const mime = bytes[0] === 0x89 ? "image/png" : "image/jpeg";
  return {
    bytes: bytes.length,
    data: new Blob([new Uint8Array(bytes).buffer], { type: mime }),
    height: size?.height ?? 0,
    width: size?.width ?? 0,
    mime,
    source,
  };
};
const cleanText = (value: string): string =>
  value.replaceAll("\u0000", "").slice(0, 20_000);
const prettyLabel = (label: string): string =>
  label.replaceAll(/([a-z])([A-Z])/gu, "$1 $2");

/** One read, one classifier. The DNG and OOXML branches inspect bounded containers. */
export const readFile = async (
  input: ReadFileInput,
  engine: MetadataEngine = nodeMetadataEngine,
  report?: (progress: CleanProgress) => void
): Promise<ReadReport> => {
  const format = sniffFormat(input.bytes);
  if (format === null) {
    throw new ExposeError({
      code: "unsupported-format",
      detail: "The bytes are not a supported format",
    });
  }
  if (format === "tiff" && /\.dng$/iu.test(input.name)) {
    throw new ExposeError({
      code: "unreadable-file",
      format: "dng",
      detail: "DNGVersion is missing",
    });
  }
  const family = familyOf(format);
  const dng = format === "dng" ? inspectDng(input.bytes) : null;
  if (dng !== null && dng.kind !== "read") {
    throw new ExposeError({ code: dng.kind, format, detail: dng.detail });
  }
  const progress = (
    loadedBytes: number | null,
    totalBytes: number | null,
    percent: number | null
  ) => report?.({ phase: "loading-engine", loadedBytes, totalBytes, percent });
  const engineInput = {
    ...input,
    name: `source.${format === "jpeg" ? "jpg" : format}`,
  };
  const office = family === "office" ? readOffice(input.bytes) : null;
  const tags =
    dng !== null || office !== null
      ? new Map<string, unknown>()
      : await engine.read(engineInput, progress);
  if (tags.size === 0 && dng === null && office === null) {
    throw new ExposeError({
      code: "unreadable-file",
      format,
      detail: "The engine returned no readable container",
    });
  }
  const fields: MetadataField[] = [];
  const seen = new Map<string, number>();
  const push = (
    container: MetadataContainer,
    label: string,
    value: unknown
  ) => {
    const text = cleanText(textOf(value));
    if (
      (family === "video" || family === "audio") &&
      label.endsWith("Date") &&
      /^(?:0000:00:00|1904:01:01 00:00:00)/u.test(text)
    ) {
      return;
    }
    if (text.trim().length === 0) {
      return;
    }
    const key = fieldIdOf(container, label, 0);
    const index = seen.get(key) ?? 0;
    seen.set(key, index + 1);
    fields.push({
      container,
      group: groupOf(family, container, label),
      id: fieldIdOf(container, label, index),
      label: prettyLabel(label),
      value: text,
    });
  };
  for (const [key, value] of tags) {
    const colon = key.indexOf(":");
    if (colon === -1 || /^(?:System|ExifTool):/u.test(key)) {
      continue;
    }
    const prefix = key.slice(0, colon);
    const label = key.slice(colon + 1).replace(/#$/u, "");
    // File identity is cross-checked by bytes; OS file facts never become removable tags.
    if (
      prefix === "File" &&
      ![
        "FileType",
        "MIMEType",
        "ImageWidth",
        "ImageHeight",
        "BitsPerSample",
        "ColorComponents",
        "EncodingProcess",
      ].includes(label)
    ) {
      continue;
    }
    if (["XMPToolkit", "ApplicationRecordVersion"].includes(label)) {
      continue;
    }
    if (prefix === "Composite") {
      continue;
    } // derived values repeat their source fields
    push(containerFor(prefix, family), label, value);
  }
  if (dng !== null) {
    for (const property of dng.facts.properties) {
      push("exif", property.label, property.value);
    }
    push("file", "FileType", "DNG");
    push("exif", "ImageWidth", dng.facts.width);
    push("exif", "ImageHeight", dng.facts.height);
    push("exif", "Orientation", dng.facts.orientation);
  }
  if (office !== null) {
    for (const property of office.properties) {
      push(property.container, property.label, property.value);
    }
    push("file", "FileType", format.toUpperCase());
    push("file", "PartCount", office.parts);
  }
  const c2pa = ["image", "video", "audio"].includes(family)
    ? scanC2pa(input.bytes, format)
    : null;
  if (c2pa !== null) {
    push(
      "c2pa",
      "C2PA Manifest",
      `${c2pa.manifests} manifest · ${c2pa.bytes} B`
    );
    if (c2pa.claimGenerator !== null) {
      push("c2pa", "Claim generator", c2pa.claimGenerator);
    }
    if (c2pa.claimedSigner !== null) {
      push("c2pa", "Claimed signer", c2pa.claimedSigner);
    }
    for (const type of c2pa.digitalSourceTypes) {
      push("c2pa", "Digital source type", type);
    }
    for (const parameter of c2pa.parameters) {
      push("c2pa", parameter.label, parameter.value);
    }
  }
  let thumbnail =
    office?.thumbnail === null || office === null
      ? null
      : thumbnailFrom(office.thumbnail, "office");
  if (dng?.facts.preview !== undefined && dng.facts.preview !== null) {
    thumbnail = thumbnailFrom(dng.facts.preview, "dng-preview");
  }
  if (thumbnail === null && dng === null && office === null) {
    const thumbnailTag = [
      "ThumbnailImage",
      "PreviewImage",
      "MPImage2",
      "CoverArt",
      "Picture",
    ].find((tag) => tagValue(tags, tag) !== undefined);
    if (thumbnailTag !== undefined) {
      thumbnail = thumbnailFrom(
        await engine.extract(engineInput, thumbnailTag, progress),
        ["CoverArt", "Picture"].includes(thumbnailTag) ? "cover-art" : "exif"
      );
    }
  }
  if (
    thumbnail !== null &&
    !fields.some((field) => field.group === "thumbnails")
  ) {
    push(
      dng === null ? (office === null ? "mpf" : "ooxml-app") : "exif",
      "Thumbnail",
      `${thumbnail.bytes} B`
    );
  }
  const dimensions = dng?.facts ?? imageSizeOf(input.bytes);
  const facts: FileFacts = {
    bytes: input.bytes.length,
    family,
    format,
    name: input.name,
    mime: mimeOf(format),
    width: numberTag(tags, "ImageWidth") ?? dimensions?.width ?? null,
    height: numberTag(tags, "ImageHeight") ?? dimensions?.height ?? null,
    orientation: dng?.facts.orientation ?? numberTag(tags, "Orientation") ?? 1,
    frames: numberTag(tags, "FrameCount"),
    durationSeconds: numberTag(tags, "Duration"),
    pageCount: numberTag(tags, "PageCount"),
    sampleRate:
      numberTag(tags, "AudioSampleRate") ?? numberTag(tags, "SampleRate"),
    channels: numberTag(tags, "AudioChannels") ?? numberTag(tags, "Channels"),
    parts: office?.parts ?? null,
  };
  fields.sort(
    (left, right) =>
      METADATA_GROUPS.indexOf(left.group) -
        METADATA_GROUPS.indexOf(right.group) ||
      left.container.localeCompare(right.container) ||
      left.label.localeCompare(right.label)
  );
  const groups: MetadataGroupReport[] = METADATA_GROUPS.map((group) => {
    const inGroup = fields.filter((field) => field.group === group);
    return {
      group,
      count: inGroup.length,
      containers: [...new Set(inGroup.map((field) => field.container))],
      removability:
        group === "display"
          ? "display"
          : canRemoveGroup(format, group)
            ? "removable"
            : "format",
    };
  });
  const notes: ReadNote[] = [];
  if (format === "dng") {
    notes.push({ code: "dng-read-only", detail: null });
  } else if (format === "pdf") {
    notes.push(
      { code: "pdf-clean-unavailable", detail: null },
      { code: "engine-build-limited", detail: null }
    );
  } else if (isReadOnly(format)) {
    notes.push({ code: "read-only-format", detail: null });
  }
  if (family === "office") {
    notes.push(
      { code: "office-properties-only", detail: null },
      { code: "office-preview-unavailable", detail: null }
    );
  }
  if ((family === "video" || family === "audio") && !isReadOnly(format)) {
    notes.push({ code: "media-tags-only", detail: null });
  }
  if (family === "document" || family === "office") {
    notes.push({ code: "c2pa-format-unsupported", detail: null });
  }
  if (fields.some((field) => field.container === "makernote")) {
    notes.push({ code: "maker-note", detail: null });
  }
  if (c2pa !== null && !c2pa.parsed) {
    notes.push({ code: "c2pa-unparsed", detail: null });
  }
  if (format === "jxl") {
    notes.push({ code: "jxl-brotli", detail: null });
  }
  const aiFields = fields.filter((field) => field.group === "ai-provenance");
  return {
    facts,
    fields,
    groups,
    notes,
    thumbnail,
    gps: gpsOf(tags),
    counts: countsOf(fields, groups),
    ai: {
      c2pa:
        c2pa === null
          ? null
          : {
              bytes: c2pa.bytes,
              claimGenerator: c2pa.claimGenerator,
              claimedSigner: c2pa.claimedSigner,
              hasThumbnail: c2pa.hasThumbnail,
              manifests: c2pa.manifests,
            },
      signals: aiFields
        .filter((field) => field.container !== "c2pa")
        .map(({ container, label, value }) => ({ container, label, value })),
      digitalSourceTypes: [
        ...new Set([
          ...(c2pa?.digitalSourceTypes ?? []),
          ...aiFields
            .filter((field) => /digital source type/iu.test(field.label))
            .map((field) => field.value),
        ]),
      ],
      generationParameters: c2pa?.parameters ?? [],
    },
  };
};
