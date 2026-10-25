import {
  fingerprintOf,
  uniqueZipPath,
  safeZipSegments,
  clampFileName,
} from "@/core/libs/files";
import type { DroppedFile } from "@/core/libs/files";
import type {
  CleanPreset,
  CleanResult,
  ExposeSource,
  MetadataGroup,
  ReadReport,
  ExposeErrorCode,
} from "@/features/expose/expose";
import { groupsForPreset, isReadOnly } from "@/features/expose/expose";
import type { PresetReason } from "@/features/expose/expose.view";
import {
  canClean,
  PRESET_ORDER,
  presetReasonOf,
  summaryOf,
  verificationPassed,
} from "@/features/expose/expose.view";

export interface ExposeFailure {
  readonly code: ExposeErrorCode;
  readonly detail: string;
  readonly format: ReadReport["facts"]["format"] | null;
  readonly group: MetadataGroup | null;
}

/** A session holds the file as a Blob, not a second full byte array. */
export interface StoredCleanResult extends Omit<CleanResult, "file"> {
  readonly file: {
    readonly bytes: Blob;
    readonly name: string;
    readonly type: string;
  };
}

export type ExposeRowState =
  | "ready"
  | "cleaning"
  | "cleaned"
  | "incomplete"
  | "not-supported"
  | "too-large"
  | "rejected"
  | "failed"
  | "stale";
export interface ExposeItem {
  readonly id: string;
  readonly folderPath: string | null;
  readonly source: ExposeSource;
  readonly report: ReadReport | null;
  readonly reading: boolean;
  readonly error: ExposeFailure | null;
  readonly result: StoredCleanResult | null;
  readonly resultKey: string | null;
  readonly state: ExposeRowState;
}

export const selectionKeyOf = (
  preset: CleanPreset,
  custom: readonly MetadataGroup[]
): string => [...groupsForPreset(preset, custom)].toSorted().join(",");

export const storeCleanResult = (result: CleanResult): StoredCleanResult => ({
  ...result,
  file: {
    ...result.file,
    bytes: new Blob([new Uint8Array(result.file.bytes)], {
      type: result.file.type,
    }),
  },
});

export const resultStateOf = (
  result: CleanResult | StoredCleanResult
): ExposeRowState =>
  verificationPassed(result.verification) ? "cleaned" : "incomplete";

export const failureStateOf = (
  code: ExposeErrorCode,
  reading = false
): ExposeRowState => {
  if (code === "too-large") {
    return "too-large";
  }
  if (reading || code === "unsupported-format" || code === "unreadable-file") {
    return "rejected";
  }
  return code === "clean-not-supported" ? "not-supported" : "failed";
};

export const staleItem = (item: ExposeItem, key: string): ExposeItem => {
  if (item.report !== null && isReadOnly(item.report.facts.format)) {
    return item;
  }
  if (item.result !== null) {
    return {
      ...item,
      state: item.resultKey === key ? resultStateOf(item.result) : "stale",
    };
  }
  // A different selection may make a previously blocked format usable.
  return item.state === "not-supported"
    ? { ...item, state: "ready", error: null }
    : item;
};

export const cleanableItem = (item: ExposeItem): boolean =>
  !item.reading &&
  item.report !== null &&
  !isReadOnly(item.report.facts.format) &&
  ["ready", "stale", "failed"].includes(item.state);

/** Squeeze's identity ignores the folder path: name, size, and last modified. */
export const incomingExposeItems = (
  existing: readonly ExposeItem[],
  incoming: readonly DroppedFile[],
  nextId: () => string
) => {
  const seen = new Set(
    existing.map((item) =>
      fingerprintOf({
        name: item.source.name,
        size: item.source.bytes.size,
        lastModified: item.source.lastModified,
      })
    )
  );
  const accepted: ExposeItem[] = [];
  let duplicates = 0;
  let skipped = 0;
  for (const { file, folderPath } of incoming) {
    if (
      folderPath !== null &&
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/") &&
      !file.type.startsWith("audio/") &&
      !/\.(?:jpe?g|jpe|jfif|jxl|tiff?|dng|png|heic|heif|hif|avif|webp|gif|pdf|mp4|mov|m4v|webm|mkv|avi|m4a|mp3|wav|flac|ogg|opus|docx|xlsx|pptx)$/iu.test(
        file.name
      )
    ) {
      skipped += 1;
      continue;
    }
    const key = fingerprintOf(file);
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    accepted.push({
      id: nextId(),
      folderPath,
      source: {
        bytes: file,
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
      },
      report: null,
      reading: true,
      error: null,
      result: null,
      resultKey: null,
      state: "ready",
    });
  }
  return { accepted, duplicates, skipped };
};

export const batchSummaryOf = (
  items: readonly ExposeItem[],
  groups: readonly MetadataGroup[]
) =>
  items.reduce(
    (total, item) => {
      if (item.report === null) {
        return total;
      }
      const summary = summaryOf(item.report, groups);
      return {
        displayFields: total.displayFields + summary.displayFields,
        fields: total.fields + summary.fields,
        groups: total.groups + summary.groups,
        keptFields: total.keptFields + summary.keptFields,
        keptGroups: total.keptGroups + summary.keptGroups,
      };
    },
    { displayFields: 0, fields: 0, groups: 0, keptFields: 0, keptGroups: 0 }
  );

/** Reserve the whole path, including generated suffixes, to avoid overwrites. */
export const exposeZipPlan = (items: readonly ExposeItem[]) => {
  const taken = new Set<string>();
  const entries: { readonly name: string; readonly input: Blob }[] = [];
  for (const item of items) {
    if (item.state !== "cleaned" || item.result === null) {
      continue;
    }
    const folder = safeZipSegments(item.folderPath ?? "");
    const name = clampFileName(
      safeZipSegments(clampFileName(item.result.file.name, 64)).at(-1) ??
        "image-clean.jpg"
    );
    const dot = name.lastIndexOf(".");
    const stem = dot <= 0 ? name : name.slice(0, dot);
    const ext = dot <= 0 ? "" : name.slice(dot);
    const path = uniqueZipPath(folder, stem, ext, taken);
    entries.push({ name: path, input: item.result.file.bytes });
  }
  return { entries, leftOut: items.length - entries.length };
};

export const activeItemOf = (
  items: readonly ExposeItem[],
  activeId: string | null
): ExposeItem | undefined =>
  items.find((item) => item.id === activeId) ??
  (items.length === 1 ? items[0] : undefined);

export const canStartItem = (
  item: ExposeItem | undefined,
  groups: readonly MetadataGroup[],
  cleaning: boolean
): boolean =>
  item !== undefined &&
  item.report !== null &&
  !cleaning &&
  (item.result === null || item.state === "stale") &&
  canClean(item.report, groups);

// SAFETY: PRESET_ORDER contains each CleanPreset once, so every record key is present.
export const presetReasonsFor = (
  item: ExposeItem | undefined,
  custom: readonly MetadataGroup[]
) =>
  Object.fromEntries(
    PRESET_ORDER.map((preset) => [
      preset,
      item?.report === null || item?.report === undefined
        ? "empty"
        : presetReasonOf(item.report, preset, custom),
    ])
  ) as Record<CleanPreset, PresetReason>;

export const activeViewOf = (item: ExposeItem | undefined) => ({
  activeId: item?.id ?? null,
  readError: item?.report === null ? item.error : null,
  reading: item?.reading ?? false,
  report: item?.report ?? null,
  result: item?.state === "stale" ? null : (item?.result ?? null),
  source: item?.source ?? null,
  cleanError: item?.report === null ? null : (item?.error ?? null),
});
