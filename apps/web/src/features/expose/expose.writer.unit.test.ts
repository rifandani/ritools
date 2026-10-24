/* eslint-disable eslint/no-bitwise, eslint/no-shadow, eslint/no-await-in-loop, eslint/prefer-destructuring, unicorn/no-new-array, unicorn/prefer-spread, unicorn/relative-url-style, unicorn/no-array-sort, unicorn/prefer-code-point, unicorn/no-useless-undefined, promise/no-promise-in-callback -- tests build binary fixtures and catch thrown values */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unknown-parameters, anti-slop/no-shape-in-symbol-names -- tests narrow data they built or caught */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ExposeError } from "@/features/expose/expose";
import {
  EXIFTOOL_ENGINE,
  EXIFTOOL_VERSION,
  nodeExifToolWriter,
  runExifTool,
} from "@/features/expose/expose.writer.node";

const fixture = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));

describe("the Node ExifTool writer", () => {
  it("names the engine and its version", () => {
    expect(nodeExifToolWriter.name).toBe(EXIFTOOL_ENGINE);
    expect(nodeExifToolWriter.version).toBe(EXIFTOOL_VERSION);
  });

  it("removes a tag without re-encoding the image", async () => {
    const input = fixture("metadata.jpg");
    const output = await runExifTool({ bytes: input, name: "metadata.jpg" }, [
      "EXIF:Artist",
    ]);
    expect(output.length).toBeLessThan(input.length);
    const text = Buffer.from(output).toString("latin1");
    expect(text).not.toContain("Test Artist");
    expect(text).toContain("TestMake");
  });

  it("drops a tag this format cannot write and retries", async () => {
    const output = await runExifTool(
      { bytes: fixture("metadata.jpg"), name: "metadata.jpg" },
      ["EXIF:NoSuchTag", "EXIF:Artist"]
    );
    expect(Buffer.from(output).toString("latin1")).not.toContain("Test Artist");
  });

  it("returns the input when every tag is invalid", async () => {
    const input = fixture("metadata.jpg");
    const output = await runExifTool({ bytes: input, name: "metadata.jpg" }, [
      "EXIF:NoSuchTag",
    ]);
    expect(output).toEqual(input);
  });

  it("names an engine failure", async () => {
    const failure = await runExifTool(
      { bytes: new Uint8Array([1, 2, 3]), name: "bad.jpg" },
      ["EXIF:Artist"]
    ).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ExposeError);
    expect((failure as ExposeError).code).toBe("engine-failed");
  });
});
