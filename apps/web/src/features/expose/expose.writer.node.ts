import { writeMetadata } from "@colorhythm/exiftool-wasm";

import { ExposeError } from "@/features/expose/expose";
import type { ExifToolWriter } from "@/features/expose/expose.cleaner";

/** The ExifTool version the WebAssembly package bundles. */
export const EXIFTOOL_VERSION = "13.59";
export const EXIFTOOL_ENGINE = "ExifTool";

const failureOf = (detail: string): ExposeError => {
  const lower = detail.toLowerCase();
  if (lower.includes("memory") || lower.includes("allocation")) {
    return new ExposeError({ code: "too-large", detail });
  }
  if (
    lower.includes("webassembly") ||
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("offline")
  ) {
    return new ExposeError({ code: "engine-unavailable", detail });
  }
  return new ExposeError({ code: "engine-failed", detail });
};

/**
 * Run ExifTool against bytes and return the Cleaned File.
 *
 * The package accepts a file name only to choose a temporary output name. It
 * never receives a shell string, and every argument is a fixed tag name.
 */
/**
 * The tags ExifTool reports as invalid for this file. A tag can be valid in one
 * format and unknown in another, so the engine reads the writer's own answer
 * instead of keeping a per-format table that would drift.
 */
const invalidTagsOf = (detail: string): readonly string[] => {
  const invalid = new Set<string>();
  for (const match of detail.matchAll(/Tag '(?<tag>[^']+)' is not defined/gu)) {
    if (match.groups?.tag !== undefined) {
      invalid.add(match.groups.tag);
    }
  }
  for (const match of detail.matchAll(
    /Sorry, (?<tag>[^\s]+) doesn't exist or isn't writable/gu
  )) {
    if (match.groups?.tag !== undefined) {
      invalid.add(match.groups.tag);
    }
  }
  return [...invalid];
};

/**
 * Run ExifTool against bytes and return the Cleaned File.
 *
 * The package accepts a file name only to choose a temporary output name. It
 * never receives a shell string, and every argument is a fixed tag name.
 *
 * A tag that this format cannot write is removed from the request and the
 * clean runs again. The input bytes are the same on every attempt, so a failed
 * attempt never becomes the Cleaned File.
 */
export const runExifTool = async (
  input: { readonly bytes: Uint8Array; readonly name: string },
  tags: readonly string[],
  fetchModule?: (...args: unknown[]) => Promise<Response>
): Promise<Uint8Array> => {
  let remaining = [...new Set(tags)];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (remaining.length === 0) {
      return input.bytes;
    }
    const values = Object.fromEntries(remaining.map((tag) => [tag, ""]));
    try {
      // oxlint-disable-next-line no-await-in-loop -- each attempt depends on the previous attempt's warnings
      const result = await writeMetadata(
        { data: input.bytes, name: input.name },
        values,
        {
          args: ["-m", "-q"],
          fetch: fetchModule,
        }
      );
      if (result.success) {
        return new Uint8Array(result.data);
      }
      const invalid = invalidTagsOf(result.error);
      if (invalid.length === 0) {
        throw failureOf(result.error);
      }
      const dropped = new Set(invalid);
      remaining = remaining.filter((tag) => !dropped.has(tag));
    } catch (error) {
      if (error instanceof ExposeError) {
        throw error;
      }
      const detail =
        error instanceof Error
          ? error.message
          : String(error) || "ExifTool did not return a file";
      const invalid = invalidTagsOf(detail);
      if (invalid.length === 0) {
        throw failureOf(detail);
      }
      const dropped = new Set(invalid);
      remaining = remaining.filter((tag) => !dropped.has(tag));
    }
  }
  throw new ExposeError({
    code: "engine-failed",
    detail: "ExifTool kept rejecting tags after four attempts",
  });
};

/** The Node writer. Unit tests use this; the browser Worker uses its sibling. */
export const nodeExifToolWriter: ExifToolWriter = {
  name: EXIFTOOL_ENGINE,
  version: EXIFTOOL_VERSION,
  write: (input, tags) => runExifTool(input, tags),
};
