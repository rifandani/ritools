/* eslint-disable promise/no-promise-in-callback, unicorn/no-await-expression-member -- the mock stands in for an async package and tests read members of its result */
/* oxlint-disable anti-slop/no-await-expression-member, anti-slop/no-unknown-parameters, anti-slop/require-safety-comment-for-type-assertion -- tests narrow the caught value */
import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ExposeError } from "@/features/expose/expose";

const { writeMetadataMock } = vi.hoisted(() => ({
  writeMetadataMock: vi.fn(),
}));

vi.mock("@colorhythm/exiftool-wasm", () => ({
  writeMetadata: writeMetadataMock,
}));

const { runExifTool } = await import("@/features/expose/expose.writer.node");

beforeEach(() => {
  writeMetadataMock.mockReset();
});

const input = {
  bytes: new Uint8Array(
    readFileSync(new URL("fixtures/metadata.jpg", import.meta.url))
  ),
  name: "metadata.jpg",
};

const failure = async (): Promise<ExposeError> => {
  const caught = await runExifTool(input, ["EXIF:Artist"]).catch(
    (error: unknown) => error
  );
  expect(caught).toBeInstanceOf(ExposeError);
  return caught as ExposeError;
};

describe("the ExifTool failure map", () => {
  it("names an allocation failure", async () => {
    writeMetadataMock.mockResolvedValueOnce({
      error: "out of memory",
      exitCode: 1,
      success: false,
    });
    expect((await failure()).code).toBe("too-large");
  });

  it("names a missing runtime", async () => {
    writeMetadataMock.mockResolvedValueOnce({
      error: "WebAssembly is unavailable",
      exitCode: 1,
      success: false,
    });
    expect((await failure()).code).toBe("engine-unavailable");
  });

  it("names a network failure", async () => {
    writeMetadataMock.mockResolvedValueOnce({
      error: "fetch failed while offline",
      exitCode: 1,
      success: false,
    });
    expect((await failure()).code).toBe("engine-unavailable");
  });

  it("names an unexpected writer failure", async () => {
    writeMetadataMock.mockResolvedValueOnce({
      error: "the writer gave up",
      exitCode: 1,
      success: false,
    });
    expect((await failure()).code).toBe("engine-failed");
  });

  it("retries after a rejected tag and keeps the rest", async () => {
    writeMetadataMock.mockRejectedValueOnce(
      new Error("Warning: Tag 'EXIF:NoSuchTag' is not defined")
    );
    writeMetadataMock.mockResolvedValueOnce({
      data: new ArrayBuffer(4),
      success: true,
    });
    const output = await runExifTool(input, ["EXIF:NoSuchTag", "EXIF:Artist"]);
    expect(output).toEqual(new Uint8Array(4));
  });

  it("retries after a non-Error rejection", async () => {
    writeMetadataMock.mockRejectedValueOnce(
      "Sorry, EXIF:NoSuchTag doesn't exist or isn't writable"
    );
    writeMetadataMock.mockResolvedValueOnce({
      data: new ArrayBuffer(4),
      success: true,
    });
    const output = await runExifTool(input, ["EXIF:NoSuchTag", "EXIF:Artist"]);
    expect(output).toEqual(new Uint8Array(4));
  });

  it("names a generic rejection", async () => {
    writeMetadataMock.mockRejectedValueOnce(new Error("a plain crash"));
    expect((await failure()).code).toBe("engine-failed");
  });

  it("names a non-Error rejection", async () => {
    writeMetadataMock.mockRejectedValueOnce("a plain crash");
    expect((await failure()).code).toBe("engine-failed");
  });

  it("uses the fallback text for an empty rejection", async () => {
    writeMetadataMock.mockRejectedValueOnce("");
    const caught = await failure();
    expect(caught.code).toBe("engine-failed");
    expect(caught.detail).toBe("ExifTool did not return a file");
  });

  it("rethrows a named engine error unchanged", async () => {
    const named = new ExposeError({
      code: "engine-unavailable",
      detail: "offline",
    });
    writeMetadataMock.mockRejectedValueOnce(named);
    const caught = await failure();
    expect(caught).toBe(named);
  });
});
