import type {
  CleanPreset,
  FileFormat,
  MetadataContainer,
  MetadataGroup,
  MetadataGroupReport,
  ReadNoteCode,
  ReadReport,
  Verification,
} from "@/features/expose/expose";
import {
  groupsForPreset,
  METADATA_GROUPS,
  isReadOnly,
  familyOf,
} from "@/features/expose/expose";

/**
 * The view model of Expose: small, pure functions that turn a `ReadReport`
 * into the words and figures the page prints. Nothing here reads a file or
 * touches a browser API, so the rules can be tested without a Worker.
 */

/** The Translation Key of each Metadata Group's name. */
export const GROUP_KEY = {
  "ai-provenance": "exposeGroupAi",
  location: "exposeGroupLocation",
  time: "exposeGroupTime",
  "device-identity": "exposeGroupDevice",
  "camera-settings": "exposeGroupCamera",
  authorship: "exposeGroupAuthorship",
  "software-history": "exposeGroupSoftware",
  thumbnails: "exposeGroupThumbnails",
  "other-text": "exposeGroupOther",
  display: "exposeGroupDisplay",
} as const satisfies Record<MetadataGroup, string>;

/** The Translation Key of each Clean Preset's name. */
export const PRESET_KEY = {
  "ai-only": "exposePresetAi",
  personal: "exposePresetPersonal",
  everything: "exposePresetEverything",
  custom: "exposePresetCustom",
} as const satisfies Record<CleanPreset, string>;

/** The one-line note each Clean Preset prints. */
export const PRESET_NOTE_KEY = {
  "ai-only": "exposePresetAiNote",
  personal: "exposePresetPersonalNote",
  everything: "exposePresetEverythingNote",
  custom: "exposePresetCustomNote",
} as const satisfies Record<CleanPreset, string>;

/** The four presets in the order the order prints them. */
export const PRESET_ORDER: readonly CleanPreset[] = [
  "ai-only",
  "personal",
  "everything",
  "custom",
];

/**
 * Container families are proper names, not words to translate. A family is
 * what the field came from, never a library tag name.
 */
export const CONTAINER_LABEL = {
  c2pa: "C2PA",
  exif: "EXIF",
  file: "File",
  gps: "GPS",
  icc: "ICC",
  iptc: "IPTC",
  makernote: "Maker Note",
  mpf: "MPF",
  xmp: "XMP",
  "pdf-info": "PDF Info",
  "pdf-xmp": "PDF XMP",
  quicktime: "QuickTime",
  "item-list": "ItemList",
  id3: "ID3",
  vorbis: "Vorbis",
  "riff-info": "RIFF Info",
  matroska: "Matroska",
  "ooxml-core": "OOXML Core",
  "ooxml-app": "OOXML App",
  "ooxml-custom": "OOXML Custom",
} as const satisfies Record<MetadataContainer, string>;

/** The Translation Key of each Read Note. */
export const NOTE_KEY = {
  "dng-read-only": "exposeDngReadOnlyBody",
  "c2pa-unparsed": "exposeNoteC2paUnparsed",
  "read-only-format": "exposeReadOnlyFormat",
  "pdf-clean-unavailable": "exposePdfCleanUnavailable",
  "office-properties-only": "exposeOfficePropertiesOnly",
  "media-tags-only": "exposeMediaTagsOnly",
  "c2pa-format-unsupported": "exposeC2paUnsupported",
  "pdf-preview-unavailable": "exposePreviewUnavailable",
  "media-preview-unavailable": "exposePreviewUnavailable",
  "office-preview-unavailable": "exposePreviewUnavailable",
  "engine-build-limited": "exposeEngineBuildLimited",
  "icc-not-read": "exposeNoteIccNotRead",
  "jxl-brotli": "exposeNoteJxlBrotli",
  "maker-note": "exposeNoteMakerNote",
  "tiff-no-file-details": "exposeNoteTiffNoFileDetails",
} as const satisfies Record<ReadNoteCode, string>;

/** The formats a browser cannot draw, so the exhibit prints a plate. */
const NO_PREVIEW: ReadonlySet<string> = new Set(["dng", "heic", "jxl", "tiff"]);

/** Whether the exhibit can try the browser's own image decoder. */
export const canPreview = (format: string): boolean =>
  ["jpeg", "png", "webp", "avif", "gif"].includes(format) &&
  !NO_PREVIEW.has(format);
export const viewerFor = (
  format: FileFormat
): "image" | "pdf" | "video" | "audio" | "plate" => {
  const family = familyOf(format);
  if (format === "pdf") {
    return "pdf";
  }
  if (family === "video" || family === "audio") {
    return family;
  }
  return canPreview(format) ? "image" : "plate";
};

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/**
 * A byte count in decimal units, at most one decimal place. Files are sold and
 * quoted in decimal units, so 1,530,098 bytes prints as 1.5 MB.
 */
export const formatBytes = (bytes: number, locale: string): string => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < BYTE_UNITS.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : value < 10 ? 1 : 0;
  const figure = new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
  return `${figure} ${BYTE_UNITS[unit]}`;
};

/** A coordinate at the fixed precision the copy prints. */
export const formatCoordinate = (value: number): string =>
  Number.isFinite(value) ? value.toFixed(6) : "0.000000";

/** The GPS point as one copyable line, longitude signed. */
export const coordinateLine = (latitude: number, longitude: number): string =>
  `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`;

/** The GPS point as one line with the altitude, when it is known. */
export const altitudeLine = (meters: number | null): string | null =>
  meters === null || !Number.isFinite(meters) ? null : `${meters} m`;

/** The group report for one group, even when the report omits the row. */
export const groupReportOf = (
  report: ReadReport,
  group: MetadataGroup
): MetadataGroupReport =>
  report.groups.find((entry) => entry.group === group) ?? {
    containers: [],
    count: 0,
    group,
    removability: group === "display" ? "display" : "removable",
  };

/** One selection's effect, in fields and groups. */
export interface SelectionSummary {
  readonly displayFields: number;
  readonly fields: number;
  readonly groups: number;
  readonly keptFields: number;
  readonly keptGroups: number;
}

/** The fields and groups a selection would remove, and what it would keep. */
export const summaryOf = (
  report: ReadReport,
  groups: readonly MetadataGroup[]
): SelectionSummary => {
  const selected = new Set(isReadOnly(report.facts.format) ? [] : groups);
  // Display Metadata is never in a selection and never in the keep line: the
  // Display lock prints its own figure.
  const present = report.groups.filter(
    (entry) => entry.count > 0 && entry.group !== "display"
  );
  const chosen = present.filter((entry) => selected.has(entry.group));
  const kept = present.filter((entry) => !selected.has(entry.group));
  return {
    displayFields: groupReportOf(report, "display").count,
    fields: chosen.reduce((total, entry) => total + entry.count, 0),
    groups: chosen.length,
    keptFields: kept.reduce((total, entry) => total + entry.count, 0),
    keptGroups: kept.length,
  };
};

/** Why a preset cannot be chosen. `null` means it is available. */
export type PresetReason = "empty" | "format-limit" | null;

/**
 * A preset is available when at least one of its groups has a field and every
 * present group is removable. A format-limited group blocks the preset.
 */
export const presetReasonOf = (
  report: ReadReport,
  preset: CleanPreset,
  custom: readonly MetadataGroup[] = []
): PresetReason => {
  if (isReadOnly(report.facts.format)) {
    return "format-limit";
  }
  const groups = groupsForPreset(preset, custom);
  let present = 0;
  for (const group of groups) {
    const entry = groupReportOf(report, group);
    if (entry.count === 0) {
      continue;
    }
    if (entry.removability === "format") {
      return "format-limit";
    }
    present += 1;
  }
  return present === 0 ? "empty" : null;
};

/** The preset a fresh report starts on: the least destructive available one. */
export const defaultPresetOf = (report: ReadReport): CleanPreset =>
  PRESET_ORDER.find(
    (preset) => preset !== "custom" && presetReasonOf(report, preset) === null
  ) ?? "custom";

/** Whether the Clean mark can start: something to remove, and no format block. */
export const canClean = (
  report: ReadReport,
  groups: readonly MetadataGroup[]
): boolean => {
  const summary = summaryOf(report, groups);
  return (
    !isReadOnly(report.facts.format) &&
    summary.fields > 0 &&
    groups.every((group) => {
      const entry = groupReportOf(report, group);
      return entry.count === 0 || entry.removability !== "format";
    })
  );
};

/** Whether the receipt may offer the Cleaned File. */
export const verificationPassed = (verification: Verification): boolean =>
  verification.selected.length > 0 &&
  verification.selected.every((entry) => entry.after === 0) &&
  verification.content.unchanged;

/** The names of the kept groups, in glossary order. */
export const keptGroupNames = (
  report: ReadReport,
  selected: readonly MetadataGroup[],
  nameOf: (group: MetadataGroup) => string
): readonly string[] => {
  const chosen = new Set(selected);
  const names: string[] = [];
  for (const group of METADATA_GROUPS) {
    if (
      group !== "display" &&
      !chosen.has(group) &&
      groupReportOf(report, group).count > 0
    ) {
      names.push(nameOf(group));
    }
  }
  return names;
};

/** The container badges one group prints, at most three plus a "+N". */
export interface ContainerBadges {
  readonly more: number;
  readonly shown: readonly string[];
}

export const containerBadgesOf = (
  entry: MetadataGroupReport
): ContainerBadges => {
  const labels = entry.containers.map(
    (container) => CONTAINER_LABEL[container]
  );
  return {
    more: Math.max(0, labels.length - 3),
    shown: labels.slice(0, 3),
  };
};
