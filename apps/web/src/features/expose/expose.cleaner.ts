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
} from "@/features/expose/expose";
import { cleanTagsFor } from "@/features/expose/expose.groups";
import { payloadHash } from "@/features/expose/expose.payload";
import { readImage } from "@/features/expose/expose.reader";
import type { ReadImageInput } from "@/features/expose/expose.reader";

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
    input: ReadImageInput,
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
  writer: ExifToolWriter
): Promise<CleanResult> => {
  const input = {
    bytes: await readBytesOf(source.bytes),
    name: source.name,
    type: source.type,
  };
  const before = readImage(input);

  if (before.facts.bytes > 200_000_000) {
    request.report?.({
      loadedBytes: null,
      percent: null,
      phase: "cleaning",
      totalBytes: null,
    });
  }

  const selected = selectedGroupsOf(request, before);
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
  if (tags.length > 0) {
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

  const after = readImage({
    bytes: cleanedBytes,
    name: cleanedNameOf(source.name, before.facts.format),
    type: mimeOf(before.facts.format),
  });

  const [beforeHash, afterHash] = await Promise.all([
    payloadHash(input.bytes, before.facts.format),
    payloadHash(cleanedBytes, before.facts.format),
  ]);

  const selectedChanges = selected.map((group) =>
    changeOf(before, after, group)
  );
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
      payload: {
        afterHash,
        beforeHash,
        unchanged: afterHash === beforeHash,
      },
      read: after,
      selected: selectedChanges,
    },
    warnings: warningsOf(makerNote, before, after),
  };
};
