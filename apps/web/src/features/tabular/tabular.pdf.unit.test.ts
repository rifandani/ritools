/* oxlint-disable anti-slop/no-shape-in-symbol-names -- PdfOptions is the public export contract. */
import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, it } from "@effect/vitest";
import * as XLSX from "xlsx";

import * as T from "./tabular";
import { parseFile } from "./tabular.format";
import type { FailureContext, WriteJob } from "./tabular.format";
import { TabularModel } from "./tabular.model";
import { verifyPdf, writePdf } from "./tabular.pdf";
import type { PdfAssets } from "./tabular.pdf";
import {
  countPdfUnsupported,
  countUnsupportedCharacters,
  estimatePdfPages,
  pdfSectionOf,
  readPdfFont,
  replaceUnsupportedCharacters,
} from "./tabular.pdf.metrics";
import type { PdfFontMetrics } from "./tabular.pdf.metrics";

const fontDir = path.join(import.meta.dirname, "../../../public/fonts/pdf");
const body = new Uint8Array(
  readFileSync(path.join(fontDir, "archivo-latin-400-normal.ttf"))
);
const title = new Uint8Array(
  readFileSync(path.join(fontDir, "archivo-latin-wdth125-wght900.ttf"))
);
const assets: PdfAssets = { body, title };
const metrics: PdfFontMetrics = readPdfFont(body);
const ctx = (): FailureContext => ({
  requestId: T.RequestId.make("pdf"),
  operation: "test",
  sessionId: null,
});
const source = (text: string, name = "data.csv"): T.Source => {
  const bytes = new TextEncoder().encode(text);
  return { name, bytes, size: bytes.length };
};
const options = (
  sheetId: T.SheetId,
  overrides: Partial<T.ExportOptions> = {}
): T.ExportOptions => ({
  format: "pdf",
  scope: { _tag: "WholeSheet", sheetId },
  delimiter: ",",
  newline: "lf",
  bom: false,
  textPolicy: "exact",
  jsonShape: "auto",
  pdf: { page: "a4", orientation: "portrait" },
  locale: "en-US",
  ...overrides,
});
const model = (text: string, name = "data.csv") =>
  new TabularModel(
    parseFile(source(text, name), T.defaultParseOptions, ctx()),
    T.CandidateId.make(`pdf-${name}`)
  );
const guard = (m: TabularModel): T.Guard => ({
  sessionId: m.sessionId,
  expectedRevision: m.revision,
});
const plan = (
  m: TabularModel,
  settings: T.ExportOptions,
  font: PdfFontMetrics | null = metrics
) =>
  m.planExport(
    { ...guard(m), requestId: ctx().requestId, options: settings },
    ctx(),
    font
  );
const job = (m: TabularModel, settings: T.ExportOptions): WriteJob => {
  const planned = plan(m, settings);
  return m.exportJob(
    {
      ...guard(m),
      requestId: ctx().requestId,
      planId: planned.planId,
      acknowledgeValuesOnly: true,
    },
    ctx()
  ).job;
};

it("reads the cmap and counts every character the font cannot draw", () => {
  expect(metrics.unitsPerEm).toBe(1000);
  expect(metrics.glyphs.has("A".codePointAt(0) ?? 0)).toBe(true);
  expect(metrics.glyphs.has("😀".codePointAt(0) ?? 0)).toBe(false);
  expect(countUnsupportedCharacters(metrics, "A😀中\t\nB")).toBe(3);
  expect(replaceUnsupportedCharacters(metrics, "A😀中\r\nB")).toBe("A??\nB");
});

it("plans PDF pages and unsupported characters without changing non-PDF plans", () => {
  const m = model("name,note\nAlice,hello");
  const [sheet] = m.summary().sheets;
  if (!sheet) {
    throw new Error("Missing Sheet");
  }
  const pdf = plan(m, options(sheet.sheetId));
  expect(pdf.estimatedPages).toBe(1);
  expect(pdf.unsupportedCharacters).toBe(0);
  expect(pdf.blockedBy).toEqual([]);

  const text = model("name,note\nAlice,😀中");
  const [textSheet] = text.summary().sheets;
  if (!textSheet) {
    throw new Error("Missing Sheet");
  }
  const counted = plan(text, options(textSheet.sheetId));
  expect(counted.unsupportedCharacters).toBe(2);

  const csv = plan(m, {
    ...options(sheet.sheetId),
    format: "csv",
    pdf: null,
  });
  expect(csv.estimatedPages).toBeNull();
  expect(csv.unsupportedCharacters).toBe(0);
});

it("writes a multi-page PDF with an envelope and a repeated header", () => {
  const rows = ["name,score,note"];
  for (let i = 0; i < 300; i += 1) {
    rows.push(
      `Row ${i},${i},A longer note that should wrap across lines in the table.`
    );
  }
  const m = model(rows.join("\n"));
  const [sheet] = m.summary().sheets;
  if (!sheet) {
    throw new Error("Missing Sheet");
  }
  const settings = options(sheet.sheetId);
  const written = writePdf(job(m, settings), assets, ctx());
  const head = new TextDecoder("latin1").decode(written.bytes.subarray(0, 5));
  const tail = new TextDecoder("latin1")
    .decode(written.bytes.subarray(-32))
    .trimEnd();
  expect(head).toBe("%PDF-");
  expect(tail.endsWith("%%EOF")).toBe(true);
  expect(written.pages).toBeGreaterThan(1);
  expect(written.layout.pages).toHaveLength(written.pages);
  expect(written.layout.pages.every((page) => page.header)).toBe(true);
  expect(written.layout.pages.filter((page) => page.first)).toHaveLength(1);
  expect(
    Math.abs((plan(m, settings).estimatedPages ?? 0) - written.pages)
  ).toBeLessThanOrEqual(2);
});

it("uses the selected page size and orientation", () => {
  const m = model("a\n1");
  const [sheet] = m.summary().sheets;
  if (!sheet) {
    throw new Error("Missing Sheet");
  }
  const written = writePdf(
    job(m, {
      ...options(sheet.sheetId),
      pdf: { page: "letter", orientation: "landscape" },
    }),
    assets,
    ctx()
  );
  expect(written.layout.page).toBe("letter");
  expect(written.layout.orientation).toBe("landscape");
  expect(written.layout.width).toBeGreaterThan(written.layout.height);
});

it("rejects a non-PDF job, a job without PDF options, and an empty report", () => {
  const settings = options(T.SheetId.make("direct"));
  const sheet = {
    name: "Data",
    visibility: "visible" as const,
    width: 1,
    header: false,
    rows: [[{ _tag: "Text" as const, text: "value" }]],
  };
  const base: WriteJob = {
    format: "pdf",
    sourceName: "data.csv",
    sheets: [sheet],
    options: settings,
    jsonShape: null,
    headers: false,
    locale: "en-US",
  };
  expect(() => writePdf({ ...base, format: "csv" }, assets, ctx())).toThrow();
  expect(() =>
    writePdf({ ...base, options: { ...settings, pdf: null } }, assets, ctx())
  ).toThrow();
  expect(() => writePdf({ ...base, sheets: [] }, assets, ctx())).toThrow();
});

it("verifies the envelope, page count, and layout indexes", () => {
  const page = {
    index: 1,
    section: 0,
    sheet: "Data",
    header: false,
    first: true,
  };
  const layout = {
    page: "a4" as const,
    orientation: "portrait" as const,
    width: 210,
    height: 297,
    pages: [page],
  };
  const bytes = new TextEncoder().encode("%PDF-1.4\n%%EOF");
  expect(() => verifyPdf(bytes, 1, layout, ctx())).not.toThrow();
  expect(() =>
    verifyPdf(new TextEncoder().encode("nope"), 1, layout, ctx())
  ).toThrow(T.ExportVerificationFailed);
  expect(() => verifyPdf(bytes, 2, layout, ctx())).toThrow(
    T.ExportVerificationFailed
  );
  expect(() =>
    verifyPdf(bytes, 1, { ...layout, pages: [{ ...page, index: 2 }] }, ctx())
  ).toThrow(T.ExportVerificationFailed);
  expect(() => verifyPdf(new Uint8Array(0), 1, layout, ctx())).toThrow(
    T.ExportVerificationFailed
  );
});

it("writes an id-ID report and pads a short header row", () => {
  const settings = options(T.SheetId.make("direct"), {
    pdf: { page: "a4", orientation: "portrait" },
  });
  const written = writePdf(
    {
      format: "pdf",
      sourceName: "data.csv",
      sheets: [
        {
          name: "Data",
          visibility: "visible",
          width: 2,
          header: true,
          rows: [[{ _tag: "Text", text: "only" }]],
        },
        {
          name: "Empty",
          visibility: "visible",
          width: 0,
          header: false,
          rows: [],
        },
      ],
      options: settings,
      jsonShape: null,
      headers: true,
      locale: "id-ID",
    },
    assets,
    ctx()
  );
  expect(written.pages).toBeGreaterThan(0);
  expect(written.layout.pages.some((page) => page.section === 1)).toBe(true);
});

it("writes one section per Sheet in source order", () => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      ["name", "score"],
      ...Array.from({ length: 80 }, (_, i) => [`A${i}`, i]),
    ]),
    "First"
  );
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      ["name", "score"],
      ...Array.from({ length: 80 }, (_, i) => [`B${i}`, i]),
    ]),
    "Second"
  );
  const bytes = new Uint8Array(
    XLSX.write(book, { type: "array", bookType: "xlsx" })
  );
  const m = new TabularModel(
    parseFile(
      { name: "book.xlsx", bytes, size: bytes.length },
      T.defaultParseOptions,
      ctx()
    ),
    T.CandidateId.make("pdf-book")
  );
  const [first] = m.summary().sheets;
  if (!first) {
    throw new Error("Missing Sheet");
  }
  const settings: T.ExportOptions = {
    ...options(first.sheetId),
    scope: { _tag: "WholeWorkbook" },
  };
  const written = writePdf(job(m, settings), assets, ctx());
  expect(new Set(written.layout.pages.map((page) => page.section))).toEqual(
    new Set([0, 1])
  );
  for (const section of [0, 1]) {
    const pages = written.layout.pages.filter(
      (page) => page.section === section
    );
    expect(pages[0]?.first).toBe(true);
    expect(pages.slice(1).every((page) => !page.first)).toBe(true);
    expect(pages.every((page) => page.header)).toBe(true);
  }
});

it("counts and estimates a headerless Sheet without a header row", () => {
  const rows = Array.from({ length: 120 }, (_, i) => `value ${i}`);
  const m = new TabularModel(
    parseFile(
      source(rows.join("\n")),
      { ...T.defaultParseOptions, header: false },
      ctx()
    ),
    T.CandidateId.make("pdf-headerless")
  );
  const [sheet] = m.summary().sheets;
  if (!sheet) {
    throw new Error("Missing Sheet");
  }
  const section = pdfSectionOf({
    name: sheet.name,
    header: false,
    width: 1,
    rows: rows.map((value) => [{ _tag: "Text", text: value }]),
  });
  expect(countPdfUnsupported(metrics, [section], "data.csv")).toBe(0);
  expect(
    estimatePdfPages(metrics, [section], {
      page: "a4",
      orientation: "portrait",
    })
  ).toBeGreaterThan(0);
  const written = writePdf(job(m, options(sheet.sheetId)), assets, ctx());
  expect(written.layout.pages.every((page) => !page.header)).toBe(true);
});
