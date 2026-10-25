/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof -- this adapter validates unknown package output and failures before they cross the engine seam */
import { dispose, parseMetadata } from "@colorhythm/exiftool-wasm";

import { ExposeError, isMemoryFailure } from "@/features/expose/expose";
import type { ExifToolWriter } from "@/features/expose/expose.cleaner";
import type { ReadFileInput } from "@/features/expose/expose.reader";
import {
  runExifTool,
  EXIFTOOL_ENGINE,
  EXIFTOOL_VERSION,
} from "@/features/expose/expose.writer.node";

export type EngineProgress = (
  loaded: number | null,
  total: number | null,
  percent: number | null
) => void;
export interface MetadataEngine extends ExifToolWriter {
  readonly read: (
    input: ReadFileInput,
    report: EngineProgress
  ) => Promise<ReadonlyMap<string, unknown>>;
  readonly extract: (
    input: ReadFileInput,
    tag: string,
    report: EngineProgress
  ) => Promise<Uint8Array>;
}

export const engineFailure = (error: unknown): ExposeError => {
  if (error instanceof ExposeError) {
    return error;
  }
  const detail = error instanceof Error ? error.message : String(error);
  return new ExposeError({
    code: isMemoryFailure(error)
      ? "too-large"
      : /fetch|network|offline|webassembly/iu.test(detail)
        ? "engine-unavailable"
        : "engine-failed",
    detail,
  });
};
export const fatalEngineFailure = (detail: string): boolean =>
  /Failed to reset Perl interpreter|Can't load module mro|unreachable|RuntimeError|out of bounds|interpreter.*poison/iu.test(
    detail
  );

const NUMERIC_TAGS = [
  "GPSLatitude",
  "GPSLongitude",
  "GPSAltitude",
  "Orientation",
  "ImageWidth",
  "ImageHeight",
  "Duration",
  "PageCount",
  "AudioSampleRate",
  "AudioChannels",
  "VideoFrameRate",
];

export const createMetadataEngine = (
  load?: (
    report: EngineProgress
  ) => Promise<(...args: unknown[]) => Promise<Response>>
): MetadataEngine => {
  // The shipped interpreter retains heap pages across resets. Bound its lifetime,
  // not file size. The Worker and browser WASM cache remain alive.
  let calls = 0;
  const run = async <A>(operation: () => Promise<A>): Promise<A> => {
    if (calls >= 32) {
      await dispose();
      calls = 0;
    }
    calls += 1;
    try {
      return await operation();
    } catch (error) {
      const failure = engineFailure(error);
      // Node checks have no Worker host. The public reset releases a failed interpreter.
      // Browser failures go to the host, which terminates and replaces the Worker.
      if (load === undefined && fatalEngineFailure(failure.detail)) {
        await dispose();
        calls = 1;
        return operation();
      }
      throw failure;
    }
  };
  const options = async (report: EngineProgress) =>
    load === undefined ? undefined : await load(report);
  return {
    name: EXIFTOOL_ENGINE,
    version: EXIFTOOL_VERSION,
    read: (input, report) =>
      run(async () => {
        try {
          const fetch = await options(report);
          const result = await parseMetadata(
            { data: input.bytes, name: input.name },
            {
              args: [
                "-json",
                "-G1",
                "-s",
                "-m",
                "-q",
                ...NUMERIC_TAGS.map((tag) => `-${tag}#`),
                "-all",
              ],
              fetch,
            }
          );
          if (!result.success) {
            throw new Error(result.error);
          }
          const data: unknown = JSON.parse(result.data);
          const row: unknown =
            Array.isArray(data) && data.length === 1 ? data[0] : null;
          if (typeof row !== "object" || row === null || Array.isArray(row)) {
            throw new Error("ExifTool returned no metadata record");
          }
          const tags = new Map(Object.entries(row));
          const warning = tags.get("ExifTool:Warning");
          if (
            typeof warning === "string" &&
            /format error|truncated|corrupt|invalid/iu.test(warning)
          ) {
            throw new ExposeError({ code: "unreadable-file", detail: warning });
          }
          const error = tags.get("ExifTool:Error");
          if (typeof error === "string") {
            throw new ExposeError({ code: "unreadable-file", detail: error });
          }
          return tags;
        } catch (error) {
          throw engineFailure(error);
        }
      }),
    extract: (input, tag, report) =>
      run(async () => {
        try {
          const fetch = await options(report);
          const result = await parseMetadata(
            { data: input.bytes, name: input.name },
            { args: ["-b", `-${tag}`, "-m", "-q"], binary: true, fetch }
          );
          if (!result.success) {
            throw new Error(result.error);
          }
          return result.data;
        } catch (error) {
          throw engineFailure(error);
        }
      }),
    write: (input, tags, report) =>
      run(async () => runExifTool(input, tags, await options(report))),
  };
};
export const nodeMetadataEngine = createMetadataEngine();
