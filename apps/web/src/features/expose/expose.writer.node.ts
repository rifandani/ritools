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

/** A rejected tag fails the whole clean. There is no partial retry. */
export const runExifTool = async (
  input: { readonly bytes: Uint8Array; readonly name: string },
  tags: readonly string[],
  fetchModule?: (...args: unknown[]) => Promise<Response>
): Promise<Uint8Array> => {
  if (tags.length === 0) {
    throw new ExposeError({
      code: "clean-not-supported",
      detail: "No tags were selected",
    });
  }
  try {
    const result = await writeMetadata(
      { data: input.bytes, name: input.name },
      Object.fromEntries([...new Set(tags)].map((tag) => [tag, ""])),
      { args: ["-m", "-q"], fetch: fetchModule }
    );
    if (!result.success) {
      throw failureOf(result.error);
    }
    return new Uint8Array(result.data);
  } catch (error) {
    if (error instanceof ExposeError) {
      throw error;
    }
    throw failureOf(
      error instanceof Error
        ? error.message
        : String(error) || "ExifTool did not return a file"
    );
  }
};

/** The Node writer. Unit tests use this; the browser Worker uses its sibling. */
export const nodeExifToolWriter: ExifToolWriter = {
  name: EXIFTOOL_ENGINE,
  version: EXIFTOOL_VERSION,
  write: (input, tags) => runExifTool(input, tags),
};
