/* eslint-disable eslint/no-bitwise -- The test builds a PNG header by hand. */

import { describe, expect, it } from "vitest";

import { embedProvenance, PROVENANCE_KEY, readProvenance } from "./og.png";

/** One PNG chunk. The checksum is not read back, so it can be zeroes. */
const chunk = (type: string, data: readonly number[] = []) => {
  const { length } = data;
  return [
    (length >>> 24) & 0xff,
    (length >>> 16) & 0xff,
    (length >>> 8) & 0xff,
    length & 0xff,
    ...[...type].map((char) => char.codePointAt(0) ?? 0),
    ...data,
    0,
    0,
    0,
    0,
  ];
};

/** A PNG as far as the chunk reader is concerned: header, IHDR, IEND. */
const png = () =>
  Uint8Array.from([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    ...chunk(
      "IHDR",
      Array.from({ length: 13 }, () => 0)
    ),
    ...chunk("IDAT", [1, 2, 3]),
    ...chunk("IEND"),
  ]);

describe("embedProvenance", () => {
  it("writes the origin where the design tooling reads it", () => {
    const stamped = embedProvenance(png(), "drawn by a test");

    expect(readProvenance(stamped)).toBe("drawn by a test");
  });

  it("keeps the chunks the image needs", () => {
    const source = png();
    const stamped = embedProvenance(source, "drawn by a test");

    expect(stamped.length).toBeGreaterThan(source.length);
    expect(readProvenance(source)).toBeNull();
  });

  it("rewrites the origin instead of doubling it", () => {
    const once = embedProvenance(png(), "first");
    const twice = embedProvenance(once, "second");

    expect(readProvenance(twice)).toBe("second");
    expect(twice.length).toBe(once.length - "first".length + "second".length);
  });

  it("writes the chunk under the keyword the tooling knows", () => {
    expect(PROVENANCE_KEY).toBe("impeccable:prompt");
  });

  it("refuses an image that has no end chunk", () => {
    expect(() =>
      embedProvenance(Uint8Array.from([137, 80, 78, 71]), "x")
    ).toThrow(/IEND/u);
  });

  it("reads no origin from an image that carries none", () => {
    expect(readProvenance(png())).toBeNull();
  });
});
