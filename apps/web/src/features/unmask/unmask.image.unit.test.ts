/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-shape-in-symbol-names, eslint/no-await-in-loop, eslint/no-unused-vars, typescript/array-type, typescript/no-non-null-assertion, unicorn/consistent-function-scoping, unicorn/no-useless-undefined -- tests build typed fixtures and replay steps in order. */
/* oxlint-disable eslint/no-bitwise -- the test builds image headers byte by byte. */
import { Option } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  declaredSizeOf,
  deviceMemoryGbOf,
  pixelBudgetOf,
  preflightTooLarge,
  rejectedLabelOf,
  sniffImageFormat,
  workingBytesOf,
} from "@/features/unmask/unmask.image";

const bytesOf = (values: readonly number[]): Uint8Array =>
  Uint8Array.from(values);
const ascii = (text: string): number[] =>
  [...text].map((character) => character.codePointAt(0) ?? 0);
const be32 = (value: number): number[] => [
  (value >>> 24) & 0xff,
  (value >> 16) & 0xff,
  (value >> 8) & 0xff,
  value & 0xff,
];
const le16 = (value: number): number[] => [value & 0xff, (value >> 8) & 0xff];
const le32 = (value: number): number[] => [
  value & 0xff,
  (value >> 8) & 0xff,
  (value >> 16) & 0xff,
  (value >> 24) & 0xff,
];

const pngOf = (width: number, height: number): Uint8Array =>
  bytesOf([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...be32(13),
    ...ascii("IHDR"),
    ...be32(width),
    ...be32(height),
    8,
    6,
    0,
    0,
    0,
  ]);

const jpegOf = (width: number, height: number): Uint8Array =>
  bytesOf([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x10,
    ...ascii("JFIF"),
    0,
    1,
    1,
    0,
    0,
    1,
    0,
    1,
    0,
    0,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    3,
    1,
    0x22,
    0,
    2,
    0x11,
    1,
    3,
    0x11,
    1,
  ]);

const gifOf = (width: number, height: number): Uint8Array =>
  bytesOf([...ascii("GIF89a"), ...le16(width), ...le16(height), 0, 0, 0]);

const bmpOf = (width: number, height: number): Uint8Array => {
  const header = Array.from({ length: 54 }, () => 0);
  header[0] = 0x42;
  header[1] = 0x4d;
  header.splice(18, 4, ...le32(width));
  header.splice(22, 4, ...le32(height));
  return bytesOf(header);
};

const webpOf = (width: number, height: number): Uint8Array =>
  bytesOf([
    ...ascii("RIFF"),
    ...le32(30),
    ...ascii("WEBP"),
    ...ascii("VP8X"),
    ...le32(10),
    0,
    0,
    0,
    0,
    (width - 1) & 0xff,
    ((width - 1) >> 8) & 0xff,
    ((width - 1) >> 16) & 0xff,
    (height - 1) & 0xff,
    ((height - 1) >> 8) & 0xff,
    ((height - 1) >> 16) & 0xff,
  ]);

const avifOf = (brand: string): Uint8Array =>
  bytesOf([
    0,
    0,
    0,
    24,
    ...ascii("ftyp"),
    ...ascii(brand),
    0,
    0,
    0,
    0,
    ...ascii("mif1"),
    ...ascii("avif"),
  ]);

describe("the format sniffer", () => {
  it("reads the six input formats from magic bytes", () => {
    expect(Option.getOrNull(sniffImageFormat(jpegOf(10, 10)))).toBe("jpeg");
    expect(Option.getOrNull(sniffImageFormat(pngOf(10, 10)))).toBe("png");
    expect(Option.getOrNull(sniffImageFormat(gifOf(10, 10)))).toBe("gif");
    expect(Option.getOrNull(sniffImageFormat(bmpOf(10, 10)))).toBe("bmp");
    expect(Option.getOrNull(sniffImageFormat(webpOf(10, 10)))).toBe("webp");
    expect(Option.getOrNull(sniffImageFormat(avifOf("avif")))).toBe("avif");
    expect(Option.getOrNull(sniffImageFormat(avifOf("avis")))).toBe("avif");
  });

  it("reads an AVIF brand from the compatible-brand list", () => {
    expect(Option.getOrNull(sniffImageFormat(avifOf("heic")))).toBe("avif");
  });

  it("rejects a format outside the six", () => {
    expect(Option.isNone(sniffImageFormat(bytesOf(ascii("hello"))))).toBe(true);
    expect(
      Option.isNone(
        sniffImageFormat(bytesOf([0, 0, 0, 20, ...ascii("ftypheic")]))
      )
    ).toBe(true);
  });

  it("names the family of a rejected file for the error facts", () => {
    expect(rejectedLabelOf(bytesOf([0, 0, 0, 20, ...ascii("ftypheic")]))).toBe(
      "heic"
    );
    expect(rejectedLabelOf(bytesOf([...ascii("%PDF-1.7")]))).toBe("pdf");
    expect(rejectedLabelOf(bytesOf(ascii("<svg")))).toBe("svg");
    expect(rejectedLabelOf(bytesOf([0x49, 0x49, 0x2a, 0]))).toBe("tiff");
    expect(rejectedLabelOf(bytesOf(ascii("hello")))).toBe("unknown");
    expect(rejectedLabelOf(jpegOf(1, 1))).toBe("jpeg");
    expect(rejectedLabelOf(pngOf(1, 1))).toBe("png");
    expect(rejectedLabelOf(webpOf(1, 1))).toBe("riff");
    expect(rejectedLabelOf(bytesOf([0, 0, 0, 20, ...ascii("ftypavif")]))).toBe(
      "avif"
    );
  });
});

describe("the device memory hint", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the Chromium hint", () => {
    vi.stubGlobal("navigator", { deviceMemory: 8 });
    expect(deviceMemoryGbOf()).toBe(8);
  });

  it("returns undefined without a hint or a navigator", () => {
    vi.stubGlobal("navigator", {});
    expect(deviceMemoryGbOf()).toBeUndefined();
    vi.stubGlobal("navigator", undefined);
    expect(deviceMemoryGbOf()).toBeUndefined();
  });
});

describe("the header guard", () => {
  it("reads the declared size before decode", () => {
    expect(declaredSizeOf(pngOf(321, 123), "png")).toEqual({
      height: 123,
      width: 321,
    });
    expect(declaredSizeOf(jpegOf(321, 123), "jpeg")).toEqual({
      height: 123,
      width: 321,
    });
    expect(declaredSizeOf(gifOf(321, 123), "gif")).toEqual({
      height: 123,
      width: 321,
    });
    expect(declaredSizeOf(bmpOf(321, 123), "bmp")).toEqual({
      height: 123,
      width: 321,
    });
    expect(declaredSizeOf(webpOf(321, 123), "webp")).toEqual({
      height: 123,
      width: 321,
    });
  });

  it("returns null for a header it cannot read", () => {
    expect(declaredSizeOf(bytesOf([1, 2, 3]), "png")).toBeNull();
  });

  it("reuses the Squeeze budget and caps it at 64 MP", () => {
    expect(pixelBudgetOf()).toBe(64_000_000);
    expect(pixelBudgetOf(2)).toBe(48_000_000);
    expect(pixelBudgetOf(100)).toBe(64_000_000);
    expect(workingBytesOf(1_000_000)).toBe(6_000_000);
  });

  it("rejects a source over the preflight before decode", () => {
    const tooLarge = preflightTooLarge({
      bytes: pngOf(10_000, 10_000),
      format: "png",
    });
    expect(tooLarge?._tag).toBe("TooLarge");
    expect(tooLarge?.pixels).toBe(100_000_000);
    expect(tooLarge?.neededBytes).toBe(600_000_000);
  });

  it("accepts a source inside the preflight", () => {
    expect(
      preflightTooLarge({
        bytes: pngOf(2000, 1500),
        deviceMemoryGb: 4,
        format: "png",
      })
    ).toBeNull();
  });

  it("uses the low-end budget when the device reports little memory", () => {
    expect(
      preflightTooLarge({
        bytes: pngOf(7000, 7000),
        deviceMemoryGb: 2,
        format: "png",
      })?._tag
    ).toBe("TooLarge");
  });

  it("does not refuse a header it cannot read", () => {
    expect(
      preflightTooLarge({ bytes: bytesOf([1, 2, 3]), format: "png" })
    ).toBeNull();
  });
});
