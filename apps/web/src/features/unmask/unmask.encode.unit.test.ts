/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-shape-in-symbol-names, eslint/no-await-in-loop, eslint/no-unused-vars, typescript/array-type, typescript/no-non-null-assertion, unicorn/consistent-function-scoping, unicorn/no-useless-undefined -- tests build typed fixtures and replay steps in order. */
import { describe, expect, it } from "vitest";

import {
  cutoutNameOf,
  encodedFileOf,
  hasAnyAlpha,
  outputMimeOf,
  qualityFor,
  sanitizeNameStem,
  tooLargeToEncode,
} from "@/features/unmask/unmask.encode";
import type { RasterImage } from "@/features/unmask/unmask.engine";
import { EncodeFailed } from "@/features/unmask/unmask.engine";

const rasterOf = (alpha: readonly number[]): RasterImage => {
  const rgba = new Uint8Array(alpha.length * 4);
  for (let index = 0; index < alpha.length; index += 1) {
    rgba[index * 4 + 3] = alpha[index] ?? 255;
  }
  return { height: 1, rgba, width: alpha.length };
};

describe("the Cutout name", () => {
  it("removes path text, control text, and a leading dot", () => {
    expect(sanitizeNameStem("../a/b\u0000 c.jpg")).toBe("a b c");
    expect(sanitizeNameStem("   ")).toBe("image");
    expect(sanitizeNameStem(".hidden.png")).toBe("hidden");
    expect(sanitizeNameStem("a".repeat(300))).toHaveLength(120);
  });

  it("owns the extension and the suffix", () => {
    expect(cutoutNameOf("sunset.jpg", "webp")).toBe("sunset-cutout.webp");
    expect(cutoutNameOf("sunset", "jpeg")).toBe("sunset-cutout.jpg");
    expect(cutoutNameOf("sunset", "avif")).toBe("sunset-cutout.avif");
    expect(cutoutNameOf("sunset", "png")).toBe("sunset-cutout.png");
  });

  it("maps the output MIME types", () => {
    expect(outputMimeOf("png")).toBe("image/png");
    expect(outputMimeOf("webp")).toBe("image/webp");
    expect(outputMimeOf("avif")).toBe("image/avif");
    expect(outputMimeOf("jpeg")).toBe("image/jpeg");
  });
});

describe("quality", () => {
  it("is null for PNG and clamped for the lossy formats", () => {
    expect(qualityFor("png", 90)).toBeNull();
    expect(qualityFor("webp", 0)).toBe(1);
    expect(qualityFor("avif", 101)).toBe(100);
    expect(qualityFor("jpeg", 84.6)).toBe(85);
    expect(qualityFor("webp", Number.NaN)).toBe(85);
  });
});

describe("the encoded file", () => {
  it("detects alpha and writes the result facts", () => {
    const image = rasterOf([255, 128]);
    expect(hasAnyAlpha(image)).toBe(true);
    const file = encodedFileOf({
      bytes: Uint8Array.from([1, 2, 3]),
      format: "webp",
      image,
      nameStem: "a",
      quality: 90,
    });
    expect(file).toMatchObject({
      bytesLength: 3,
      format: "webp",
      hasAlpha: true,
      mime: "image/webp",
      name: "a-cutout.webp",
      quality: 90,
    });
  });

  it("does not report alpha for a JPEG", () => {
    const image = rasterOf([255, 255]);
    expect(hasAnyAlpha(image)).toBe(false);
    const file = encodedFileOf({
      bytes: Uint8Array.from([1]),
      format: "jpeg",
      image,
      nameStem: "a",
      quality: 90,
    });
    expect(file.hasAlpha).toBe(false);
  });

  it("refuses an empty codec result", () => {
    expect(() =>
      encodedFileOf({
        bytes: new Uint8Array(0),
        format: "png",
        image: rasterOf([255]),
        nameStem: "a",
        quality: null,
      })
    ).toThrow(EncodeFailed);
  });

  it("rejects an image over the encode limit", () => {
    expect(
      tooLargeToEncode({
        height: 10_000,
        rgba: new Uint8Array(0),
        width: 10_000,
      })
    ).toBe(true);
  });
});
