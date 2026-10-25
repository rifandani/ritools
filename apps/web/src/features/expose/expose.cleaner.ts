/* eslint-disable eslint/complexity -- the clean enforces the ordered read, selection, writer, count, and content gates */
/* oxlint-disable react-doctor/js-combine-iterations, react-doctor/js-index-maps, react-doctor/js-set-map-lookups -- the group counts are small fixed lists of ten groups */
import type {
  CleanRequest,
  CleanResult,
  CleanWarning,
  ExposeSource,
  GroupChange,
  MetadataGroup,
  ReadReport,
} from "@/features/expose/expose";
import {
  cleanedNameOf,
  ExposeError,
  groupsForPreset,
  isMemoryFailure,
  METADATA_GROUPS,
  mimeOf,
  isReadOnly,
} from "@/features/expose/expose";
import { checkContent } from "@/features/expose/expose.content";
import { nodeMetadataEngine } from "@/features/expose/expose.engine";
import type { MetadataEngine } from "@/features/expose/expose.engine";
import { cleanTagsFor } from "@/features/expose/expose.groups";
import { writeOffice } from "@/features/expose/expose.office";
import { readFile } from "@/features/expose/expose.reader";
import type { ReadFileInput } from "@/features/expose/expose.reader";

/**
 * The clean path: re-read, remove the selected groups, re-read the output, and
 * verify it. The writer sits behind `ExifToolWriter`, so Node tests can run
 * the real engine and the browser can run it inside a Worker.
 */

export interface ExifToolWriter {
  readonly name: string;
  readonly version: string;
  /**
   * Remove the given ExifTool tags from the file. The returned bytes are the
   * Cleaned File. The writer must never re-encode the image.
   */
  readonly write: (
    input: ReadFileInput,
    tags: readonly string[],
    report: (
      loadedBytes: number | null,
      totalBytes: number | null,
      percent: number | null
    ) => void
  ) => Promise<Uint8Array>;
}

const readBytesOf = async (source: Blob): Promise<Uint8Array> => {
  try {
    return new Uint8Array(await source.arrayBuffer());
  } catch (error) {
    throw new ExposeError({
      code: isMemoryFailure(error) ? "too-large" : "unreadable-file",
      detail:
        error instanceof Error ? error.message : "the file could not be read",
    });
  }
};

const selectedGroupsOf = (
  request: CleanRequest,
  before: ReadReport
): readonly MetadataGroup[] => {
  if (request.groups.includes("display")) {
    throw new ExposeError({
      code: "clean-not-supported",
      detail: "Display Metadata is never removable",
      group: "display",
    });
  }
  const resolved =
    request.preset === "custom"
      ? [...request.groups]
      : groupsForPreset(request.preset);
  const present = new Set(
    before.fields
      .filter((field) => field.group !== "display")
      .map((field) => field.group)
  );
  return resolved.filter((group) => group !== "display" && present.has(group));
};

const groupCount = (report: ReadReport, group: MetadataGroup): number =>
  report.groups.find((entry) => entry.group === group)?.count ?? 0;

const changeOf = (
  before: ReadReport,
  after: ReadReport,
  group: MetadataGroup
): GroupChange => ({
  after: groupCount(after, group),
  before: groupCount(before, group),
  group,
});

const warningsOf = (
  makerNote: boolean,
  before: ReadReport,
  after: ReadReport
): readonly CleanWarning[] => {
  const warnings: CleanWarning[] = [];
  if (makerNote) {
    warnings.push({
      code: "maker-note-removed",
      detail:
        "the whole Maker Note was removed with its repeated camera, time, and settings fields",
      group: null,
    });
  }
  if (before.ai.c2pa !== null && after.ai.c2pa !== null) {
    warnings.push({
      code: "c2pa-not-validated",
      detail:
        "presence and claim text only; Expose does not validate the C2PA signature",
      group: null,
    });
  }
  return warnings;
};

/** Clean one file. Every failure is a named `ExposeError`. */
export const cleanFile = async (
  source: ExposeSource,
  request: CleanRequest,
  writer: ExifToolWriter,
  reader: MetadataEngine = nodeMetadataEngine
): Promise<CleanResult> => {
  const input = {
    bytes: await readBytesOf(source.bytes),
    name: source.name,
    type: source.type,
  };
  const before = await readFile(input, reader, request.report);
  const selected = [...new Set(selectedGroupsOf(request, before))];

  // Block even an empty selection: a DNG must never produce a Cleaned File.
  if (isReadOnly(before.facts.format)) {
    throw new ExposeError({
      code: "clean-not-supported",
      detail: "This format is read only",
      format: before.facts.format,
    });
  }

  if (before.facts.bytes > 200_000_000) {
    request.report?.({
      loadedBytes: null,
      percent: null,
      phase: "cleaning",
      totalBytes: null,
    });
  }

  if (selected.length === 0) {
    throw new ExposeError({
      code: "clean-not-supported",
      format: before.facts.format,
      group: request.groups[0],
      detail: "No selected group has a removable field",
    });
  }
  for (const group of selected) {
    const report = before.groups.find((entry) => entry.group === group);
    if (report?.removability === "format") {
      throw new ExposeError({
        code: "clean-not-supported",
        detail: `this format cannot remove the ${group} group without changing the image`,
        format: before.facts.format,
        group,
      });
    }
  }

  const { tags, makerNote } = cleanTagsFor(selected, before);
  request.report?.({
    loadedBytes: null,
    percent: null,
    phase: "cleaning",
    totalBytes: null,
  });

  let cleanedBytes = input.bytes;
  if (before.facts.family === "office") {
    cleanedBytes = writeOffice(input.bytes, tags);
  } else if (tags.length > 0) {
    cleanedBytes = await writer.write(input, tags, (loaded, total, percent) => {
      request.report?.({
        loadedBytes: loaded,
        percent,
        phase: "loading-engine",
        totalBytes: total,
      });
    });
    request.report?.({
      loadedBytes: null,
      percent: null,
      phase: "cleaning",
      totalBytes: null,
    });
  }

  request.report?.({
    loadedBytes: null,
    percent: null,
    phase: "verifying",
    totalBytes: null,
  });

  if (
    cleanedBytes.length === input.bytes.length &&
    cleanedBytes.every((byte, index) => byte === input.bytes[index])
  ) {
    throw new ExposeError({
      code: "clean-not-supported",
      format: before.facts.format,
      detail: "The writer returned identical bytes",
    });
  }
  // oxlint-disable-next-line react-doctor/server-sequential-independent-await -- the engine must finish its read before verification can inspect the resulting report
  const after = await readFile(
    {
      bytes: cleanedBytes,
      name: cleanedNameOf(source.name, before.facts.format),
      type: mimeOf(before.facts.format),
    },
    reader
  );

  const selectedChanges = selected.map((group) =>
    changeOf(before, after, group)
  );
  for (const change of selectedChanges) {
    if (change.after >= change.before) {
      throw new ExposeError({
        code: "clean-not-supported",
        format: before.facts.format,
        group: change.group,
        detail: "The selected group did not shrink",
      });
    }
  }
  // oxlint-disable-next-line react-doctor/server-sequential-independent-await -- the second read establishes the output format before the content check
  const content = await checkContent(
    input.bytes,
    cleanedBytes,
    before.facts.format
  );
  if (!content.unchanged) {
    throw new ExposeError({
      code: "engine-failed",
      format: before.facts.format,
      detail: `${content.kind}: content changed`,
    });
  }

  const kept = METADATA_GROUPS.filter(
    (group) => group !== "display" && !selected.includes(group)
  ).map((group) => changeOf(before, after, group));

  return {
    engine: { name: writer.name, version: writer.version },
    file: {
      bytes: cleanedBytes,
      name: cleanedNameOf(source.name, before.facts.format),
      type: mimeOf(before.facts.format),
    },
    kept,
    removed: selectedChanges,
    verification: {
      c2pa: {
        afterBytes: after.ai.c2pa?.bytes ?? 0,
        beforeBytes: before.ai.c2pa?.bytes ?? 0,
      },
      display: changeOf(before, after, "display"),
      kept,
      content,
      read: after,
      selected: selectedChanges,
    },
    warnings: [
      ...warningsOf(makerNote, before, after),
      ...(before.facts.family === "office"
        ? [
            {
              code: "office-properties-only" as const,
              detail: null,
              group: null,
            },
            { code: "container-rebuilt" as const, detail: null, group: null },
          ]
        : before.facts.family === "video" || before.facts.family === "audio"
          ? [{ code: "media-tags-only" as const, detail: null, group: null }]
          : []),
    ],
  };
};
