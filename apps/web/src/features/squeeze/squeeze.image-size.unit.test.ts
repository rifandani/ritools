/* oxlint-disable eslint/no-bitwise -- the test builds binary image headers byte by byte. */
import { describe, expect, it } from "vitest";

import { imageSizeOf } from "@/features/squeeze/squeeze";

const bufferOf = (bytes: readonly number[]): ArrayBuffer =>
  new Uint8Array(bytes).buffer;
const zeros = (count: number): number[] =>
  Array.from({ length: count }, () => 0);
const be16 = (value: number): number[] => [(value >> 8) & 0xff, value & 0xff];
const le16 = (value: number): number[] => [value & 0xff, (value >> 8) & 0xff];
const le24 = (value: number): number[] => [
  value & 0xff,
  (value >> 8) & 0xff,
  (value >> 16) & 0xff,
];
const be32 = (value: number): number[] => [
  (value >>> 24) & 0xff,
  (value >> 16) & 0xff,
  (value >> 8) & 0xff,
  value & 0xff,
];
const le32 = (value: number): number[] => [
  value & 0xff,
  (value >> 8) & 0xff,
  (value >> 16) & 0xff,
  (value >> 24) & 0xff,
];

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const pngOf = (width: number, height: number): ArrayBuffer =>
  bufferOf([
    ...PNG_SIGNATURE,
    ...zeros(4),
    ..."IHDR".split("").map((char) => char.codePointAt(0) ?? 0),
    ...be32(width),
    ...be32(height),
    ...zeros(4),
  ]);

const jpegOf = (width: number, height: number): ArrayBuffer =>
  bufferOf([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    ...be16(height),
    ...be16(width),
    ...zeros(12),
  ]);

const gifOf = (width: number, height: number): ArrayBuffer =>
  bufferOf([
    ..."GIF89a".split("").map((char) => char.codePointAt(0) ?? 0),
    ...le16(width),
    ...le16(height),
    ...zeros(2),
  ]);

const bmpCoreOf = (width: number, height: number): ArrayBuffer =>
  bufferOf([
    0x42,
    0x4d,
    ...zeros(12),
    ...le32(12),
    ...le16(width),
    ...le16(height),
    ...zeros(6),
  ]);

const bmpInfoOf = (width: number, height: number): ArrayBuffer =>
  bufferOf([
    0x42,
    0x4d,
    ...zeros(12),
    ...le32(40),
    ...le32(width),
    ...le32(height),
    ...zeros(4),
  ]);

const webpOf = (chunk: string, body: readonly number[]): ArrayBuffer =>
  bufferOf([
    ..."RIFF".split("").map((char) => char.codePointAt(0) ?? 0),
    ...le32(0),
    ..."WEBP".split("").map((char) => char.codePointAt(0) ?? 0),
    ...chunk.split("").map((char) => char.codePointAt(0) ?? 0),
    ...body,
  ]);

const vp8xOf = (width: number, height: number): ArrayBuffer =>
  webpOf("VP8X", [
    ...zeros(8),
    ...le24(width - 1),
    ...le24(height - 1),
    ...zeros(3),
  ]);

const vp8lOf = (width: number, height: number): ArrayBuffer =>
  webpOf("VP8L", [
    ...zeros(5),
    ...le32((height - 1) * 16_384 + (width - 1)),
    ...zeros(5),
  ]);

const vp8Of = (width: number, height: number): ArrayBuffer =>
  webpOf("VP8 ", [
    ...zeros(7),
    0x9d,
    0x01,
    0x2a,
    ...le16(width),
    ...le16(height),
    ...zeros(2),
  ]);

const avifOf = (width: number, height: number): ArrayBuffer =>
  bufferOf([
    ...be32(20),
    ..."ispe".split("").map((char) => char.codePointAt(0) ?? 0),
    ...zeros(4),
    ...be32(width),
    ...be32(height),
  ]);

describe("imageSizeOf", () => {
  it("reads the size of every input format", () => {
    expect(imageSizeOf(pngOf(800, 600), "png")).toEqual({
      height: 600,
      width: 800,
    });
    expect(imageSizeOf(jpegOf(800, 600), "jpeg")).toEqual({
      height: 600,
      width: 800,
    });
    expect(imageSizeOf(gifOf(800, 600), "gif")).toEqual({
      height: 600,
      width: 800,
    });
    expect(imageSizeOf(bmpCoreOf(800, 600), "bmp")).toEqual({
      height: 600,
      width: 800,
    });
    expect(imageSizeOf(bmpInfoOf(800, 600), "bmp")).toEqual({
      height: 600,
      width: 800,
    });
    expect(imageSizeOf(vp8xOf(800, 600), "webp")).toEqual({
      height: 600,
      width: 800,
    });
    expect(imageSizeOf(vp8lOf(800, 600), "webp")).toEqual({
      height: 600,
      width: 800,
    });
    expect(imageSizeOf(vp8Of(800, 600), "webp")).toEqual({
      height: 600,
      width: 800,
    });
    expect(imageSizeOf(avifOf(800, 600), "avif")).toEqual({
      height: 600,
      width: 800,
    });
  });

  it("refuses a header it cannot parse", () => {
    expect(imageSizeOf(bufferOf([]), "png")).toBeNull();
    expect(imageSizeOf(bufferOf([0xff, 0xd8, 0x00]), "jpeg")).toBeNull();
    expect(imageSizeOf(bufferOf([0x47, 0x49, 0x46]), "gif")).toBeNull();
    expect(imageSizeOf(bufferOf([0x42, 0x00]), "bmp")).toBeNull();
    expect(
      imageSizeOf(
        bufferOf("RIFF".split("").map((char) => char.codePointAt(0) ?? 0)),
        "webp"
      )
    ).toBeNull();
    expect(imageSizeOf(bufferOf([]), "avif")).toBeNull();
  });

  it("turns a WEBP chunk it does not know into no size", () => {
    expect(imageSizeOf(webpOf("NOPE", zeros(20)), "webp")).toBeNull();
  });

  it("turns a VP8 chunk with a bad start code into no size", () => {
    const broken = webpOf("VP8 ", [...zeros(7), 0, 1, 2, ...zeros(6)]);
    expect(imageSizeOf(broken, "webp")).toBeNull();
  });

  it("returns a zero size as no size", () => {
    expect(imageSizeOf(pngOf(0, 0), "png")).toBeNull();
  });
});
