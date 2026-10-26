/* eslint-disable eslint/no-bitwise, eslint/no-shadow, eslint/no-await-in-loop, eslint/prefer-destructuring, unicorn/no-new-array, unicorn/prefer-spread, unicorn/relative-url-style, unicorn/no-array-sort, unicorn/prefer-code-point, unicorn/no-useless-undefined, promise/no-promise-in-callback -- tests build binary fixtures and catch thrown values */
/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unknown-parameters, anti-slop/no-shape-in-symbol-names -- tests narrow data they built or caught */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { FileFormat } from "@/features/expose/expose";
import { payloadHash, payloadOf } from "@/features/expose/expose.payload";

const fixture = (name: string): Uint8Array =>
  new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));

const sample = (name: string): Uint8Array =>
  new Uint8Array(
    readFileSync(
      new URL(`../../../public/samples/expose/${name}`, import.meta.url)
    )
  );

const cases: readonly [string, FileFormat][] = [
  ["metadata.jpg", "jpeg"],
  ["metadata.png", "png"],
  ["metadata.tiff", "tiff"],
  ["metadata.webp", "webp"],
  ["metadata.heic", "heic"],
  ["metadata.avif", "avif"],
  ["metadata.jxl", "jxl"],
  ["metadata.gif", "gif"],
];

describe("payload extraction", () => {
  for (const [name, format] of cases) {
    it(`extracts the ${format} image payload`, () => {
      const payload = payloadOf(fixture(name), format);
      expect(payload).not.toBeNull();
      expect(payload?.length).toBeGreaterThan(0);
    });
  }

  it("hashes the same bytes to the same digest", async () => {
    const bytes = fixture("metadata.jpg");
    expect(await payloadHash(bytes, "jpeg")).toBe(
      await payloadHash(bytes, "jpeg")
    );
    expect(await payloadHash(bytes, "jpeg")).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("does not include a JPEG metadata segment in the payload", () => {
    const camera = sample("camera-nikon-z9-c2pa.jpg");
    const payload = payloadOf(camera, "jpeg");
    expect(payload?.length).toBeGreaterThan(1_000_000);
    expect(Buffer.from(payload ?? []).toString("latin1")).not.toContain(
      "Nikon_Z_9_Sample_for_Adobe_MAX_2022"
    );
  });

  it("falls back to every byte when a container has no known payload box", () => {
    expect(payloadOf(new Uint8Array([1, 2, 3]), "heic")).toBeNull();
    expect(payloadOf(new Uint8Array([1, 2, 3]), "tiff")).toBeNull();
    expect(payloadOf(new Uint8Array([1, 2, 3]), "webp")).toBeNull();
    expect(payloadOf(new Uint8Array([1, 2, 3]), "png")).toBeNull();
    expect(payloadOf(new Uint8Array([1, 2, 3]), "gif")).toBeNull();
  });

  it("hashes all bytes for a format with no payload rule", async () => {
    const digest = await payloadHash(new Uint8Array([1, 2, 3]), "jpeg");
    expect(digest).toMatch(/^[0-9a-f]{64}$/u);
  });
});
