/* oxlint-disable anti-slop/no-chained-type-assertions, anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unknown-parameters -- The test forges bytes and one absent value to reach the parser and layout guards. */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type * as T from "./tabular";
import {
  countPdfUnsupported,
  countUnsupportedCharacters,
  estimatePdfPages,
  pdfColumnWidths,
  pdfPageSize,
  pdfSectionOf,
  readPdfFont,
  replaceUnsupportedCharacters,
} from "./tabular.pdf.metrics";
import type { PdfFontMetrics, PdfSectionInput } from "./tabular.pdf.metrics";

const dir = path.join(import.meta.dirname, "../../../public/fonts/pdf");
const real = new Uint8Array(
  readFileSync(path.join(dir, "archivo-latin-400-normal.ttf"))
);
const text = (value: string): T.Value => ({ _tag: "Text", text: value });
const metrics = (overrides: Partial<PdfFontMetrics> = {}): PdfFontMetrics => ({
  unitsPerEm: 1000,
  glyphs: new Map(
    [..."ABCMMM 0123456789"].map((character) => [
      character.codePointAt(0) ?? 0,
      500,
    ])
  ),
  fallbackAdvance: 500,
  ...overrides,
});
const section = (
  overrides: Partial<PdfSectionInput> = {}
): PdfSectionInput => ({
  name: "data",
  header: true,
  columns: 2,
  headerRow: [text("A"), text("B")],
  rows: [[text("1"), text("2")]],
  ...overrides,
});

/** Copies the real font and changes one table tag in its directory. */
const renameTable = (tag: string, replacement: string): Uint8Array => {
  const bytes = new Uint8Array(real);
  const count = new DataView(bytes.buffer).getUint16(4);
  for (let i = 0; i < count; i += 1) {
    const at = 12 + i * 16;
    const name = String.fromCodePoint(
      bytes[at] ?? 0,
      bytes[at + 1] ?? 0,
      bytes[at + 2] ?? 0,
      bytes[at + 3] ?? 0
    );
    if (name === tag) {
      for (const [index, character] of [...replacement].entries()) {
        bytes[at + index] = character.codePointAt(0) ?? 0;
      }
    }
  }
  return bytes;
};
/** Copies the real font and empties the cmap encoding count. */
const emptyCmap = (): Uint8Array => {
  const bytes = new Uint8Array(real);
  const view = new DataView(bytes.buffer);
  const count = view.getUint16(4);
  for (let i = 0; i < count; i += 1) {
    const at = 12 + i * 16;
    const name = String.fromCodePoint(
      bytes[at] ?? 0,
      bytes[at + 1] ?? 0,
      bytes[at + 2] ?? 0,
      bytes[at + 3] ?? 0
    );
    if (name === "cmap") {
      const offset = view.getUint32(at + 8);
      view.setUint16(offset + 2, 0);
    }
  }
  return bytes;
};

/**
 * Builds a small TTF whose directory has head, maxp, hhea, hmtx, and cmap. The
 * cmap covers a delta segment, a glyph-array segment, a zero glyph, and an
 * out-of-range guard.
 */
const buildFont = (options: {
  readonly format: 4 | 12;
  readonly hMetrics?: number;
}): Uint8Array => {
  const bytes = new Uint8Array(1024);
  const view = new DataView(bytes.buffer);
  const tags = ["head", "maxp", "hhea", "hmtx", "cmap"];
  const offsets = [100, 160, 200, 240, 300];
  view.setUint16(4, tags.length);
  for (const [index, tag] of tags.entries()) {
    const at = 12 + index * 16;
    for (const [i, character] of [...tag].entries()) {
      bytes[at + i] = character.codePointAt(0) ?? 0;
    }
    view.setUint32(at + 8, offsets[index] ?? 0);
    view.setUint32(at + 12, 64);
  }
  view.setUint16(100 + 18, options.format === 12 ? 2048 : 0);
  view.setUint16(160 + 4, options.format === 12 ? 30 : 3);
  view.setUint16(200 + 34, options.hMetrics ?? 2);
  view.setUint16(240, 500);
  view.setUint16(244, 700);
  const records = options.format === 12 ? 2 : 3;
  view.setUint16(300 + 2, records);
  view.setUint16(304, 0);
  view.setUint16(306, 1);
  view.setUint32(308, 200);
  view.setUint16(312, 3);
  view.setUint16(314, options.format === 12 ? 10 : 1);
  view.setUint32(316, 200);
  if (options.format === 4) {
    view.setUint16(320, 0);
    view.setUint16(322, 3);
    view.setUint32(324, 200);
  }
  if (options.format === 12) {
    view.setUint16(500, 12);
    view.setUint32(500 + 12, 3);
    view.setUint32(500 + 16, 0x41);
    view.setUint32(500 + 20, 0x42);
    view.setUint32(500 + 24, 10);
    view.setUint32(500 + 28, 0x43);
    view.setUint32(500 + 32, 0x43);
    view.setUint32(500 + 36, 0);
    view.setUint32(500 + 40, 0x3f);
    view.setUint32(500 + 44, 0x3f);
    view.setUint32(500 + 48, 20);
    return bytes;
  }
  const segments = 5;
  const base = 500;
  view.setUint16(base, 4);
  view.setUint16(base + 6, segments * 2);
  const end = base + 14;
  const start = end + segments * 2 + 2;
  const delta = start + segments * 2;
  const range = delta + segments * 2;
  const ends = [0x41, 0x42, 0x44, 0x45, 0xff_ff];
  const starts = [0x41, 0x42, 0x44, 0x45, 0xff_ff];
  const deltas = [-0x40, 0, 0, 0, 1];
  const ranges = [0, segments * 2 - 2, segments * 2 - 2, 60_000, 0];
  for (let i = 0; i < segments; i += 1) {
    view.setUint16(end + i * 2, ends[i] ?? 0);
    view.setUint16(start + i * 2, starts[i] ?? 0);
    view.setInt16(delta + i * 2, deltas[i] ?? 0);
    view.setUint16(range + i * 2, ranges[i] ?? 0);
  }
  view.setUint16(range + segments * 2, 5);
  view.setUint16(range + segments * 2 + 2, 0);
  return bytes;
};

describe("Font parsing", () => {
  it("rejects a font without a required table and a font without a cmap", () => {
    expect(() => readPdfFont(renameTable("head", "nope"))).toThrow(
      "Invalid PDF font"
    );
    expect(() => readPdfFont(emptyCmap())).toThrow("Invalid PDF font cmap");
    const short = new Uint8Array(14);
    new DataView(short.buffer).setUint16(4, 1);
    short[12] = 0x68;
    expect(() => readPdfFont(short)).toThrow("Invalid PDF font");
    const partial = new Uint8Array(13);
    new DataView(partial.buffer).setUint16(4, 1);
    partial[12] = 0x68;
    expect(() => readPdfFont(partial)).toThrow("Invalid PDF font");
    const emptyRecord = new Uint8Array(12);
    new DataView(emptyRecord.buffer).setUint16(4, 1);
    expect(() => readPdfFont(emptyRecord)).toThrow("Invalid PDF font");
  });

  it("reads a format 4 cmap with delta, glyph array, and guard segments", () => {
    const bytes = buildFont({ format: 4 });
    const font = readPdfFont(bytes);
    expect(font.unitsPerEm).toBe(1000);
    expect(font.glyphs.get(0x41)).toBe(700);
    expect(font.glyphs.get(0x42)).toBeUndefined();
    expect(font.glyphs.has(0x43)).toBe(false);
    expect(font.fallbackAdvance).toBe(500);
  });

  it("reads a font without horizontal metrics", () => {
    const font = readPdfFont(buildFont({ format: 4, hMetrics: 0 }));
    expect(font.fallbackAdvance).toBe(0);
    expect(font.glyphs.get(0x41)).toBe(0);
  });

  it("reads a format 12 cmap and keeps the question mark advance", () => {
    const bytes = buildFont({ format: 12 });
    const font = readPdfFont(bytes);
    expect(font.unitsPerEm).toBe(2048);
    expect(font.glyphs.get(0x41)).toBe(700);
    expect(font.glyphs.get(0x42)).toBe(700);
    expect(font.glyphs.has(0x43)).toBe(false);
    expect(font.fallbackAdvance).toBe(700);
  });
});

describe("Page layout", () => {
  it("reads a headerless section and a section without rows", () => {
    expect(
      pdfSectionOf({ name: "data", header: true, width: 1, rows: [] })
    ).toMatchObject({ headerRow: null, rows: [] });
    expect(
      pdfSectionOf({
        name: "data",
        header: true,
        width: 1,
        rows: [[text("head")], [text("value")]],
      })
    ).toMatchObject({ headerRow: [text("head")], rows: [[text("value")]] });
    expect(
      pdfSectionOf({
        name: "data",
        header: false,
        width: 1,
        rows: [[text("a")]],
      })
    ).toMatchObject({ headerRow: null, rows: [[text("a")]] });
  });

  it("measures short rows, short headers, and the 40 percent cap", () => {
    const widths = pdfColumnWidths(
      metrics(),
      section({ headerRow: [text("AAAAAA")], rows: [[]] }),
      100
    );
    expect(widths).toHaveLength(2);
    expect(Math.max(...widths)).toBeLessThanOrEqual(40);
    expect(widths[1]).toBeCloseTo(40);
  });

  it("scales wide columns down and fills narrow columns to the page", () => {
    const wide = pdfColumnWidths(
      metrics(),
      section({ columns: 3, headerRow: [text("A"), text("B"), text("C")] }),
      10
    );
    expect(wide.reduce((sum, width) => sum + width, 0)).toBeCloseTo(10);
    const narrow = pdfColumnWidths(metrics(), section({ rows: [] }), 100);
    expect(narrow.every((width) => width <= 40)).toBe(true);
    expect(narrow.every((width) => width > 6)).toBe(true);
  });

  it("estimates a header with more cells than columns and a missing value", () => {
    const font = metrics();
    const pages = estimatePdfPages(
      font,
      [
        {
          name: "data",
          header: true,
          columns: 1,
          headerRow: [text("A"), text("BBBBBB"), text("CCCCCC")],
          rows: [[undefined as unknown as T.Value, text("ignored")]],
        },
        { name: "empty", header: false, columns: 0, headerRow: null, rows: [] },
      ],
      { page: "a4", orientation: "portrait" }
    );
    expect(pages).toBeGreaterThanOrEqual(2);
    expect(countPdfUnsupported(font, [], "ABC")).toBe(0);
    expect(
      countPdfUnsupported(
        font,
        [{ name: "😀", header: false, columns: 1, headerRow: null, rows: [] }],
        "ABC"
      )
    ).toBe(1);
    expect(countUnsupportedCharacters(font, "A\r\n😀")).toBe(1);
    expect(replaceUnsupportedCharacters(font, "A\r\n😀")).toBe("A\n?");
    expect(
      countPdfUnsupported(
        font,
        [
          {
            name: "ABC",
            header: true,
            columns: 2,
            headerRow: [text("A")],
            rows: [[text("B"), text("😀")]],
          },
        ],
        "ABC"
      )
    ).toBe(1);
  });

  it("wraps a word longer than the column and reports page sizes", () => {
    const pages = estimatePdfPages(
      metrics(),
      [
        section({
          header: false,
          columns: 1,
          headerRow: null,
          rows: [[text("AB AB")]],
        }),
        section({
          header: false,
          columns: 1,
          headerRow: null,
          rows: [
            [text(`AB ${"A".repeat(120)}`)],
            [text(`A${"A".repeat(120)}`)],
            [text(`${"A".repeat(48)} BBB`)],
            [text("😀 A")],
            [text("A".repeat(6000))],
          ],
        }),
      ],
      { page: "a4", orientation: "portrait" }
    );
    expect(pages).toBeGreaterThanOrEqual(1);
    expect(pdfPageSize({ page: "a4", orientation: "portrait" })).toEqual([
      210, 297,
    ]);
    expect(pdfPageSize({ page: "a4", orientation: "landscape" })).toEqual([
      297, 210,
    ]);
  });
});
