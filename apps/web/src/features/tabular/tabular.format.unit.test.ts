/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-shape-in-symbol-names, anti-slop/no-chained-type-assertions, anti-slop/require-safety-comment-for-type-assertion -- The tests decode malformed container and writer inputs, use the fixed export contract, and forge one non-value tag. */
import { expect, it } from "@effect/vitest";
import { zipSync } from "fflate";
import * as XLSX from "xlsx";

import * as T from "./tabular";
import {
  display,
  equalValue,
  parseFile,
  parseText,
  writeOutput,
} from "./tabular.format";
import type { FailureContext, WriteJob } from "./tabular.format";

const ctx = (): FailureContext => ({
  requestId: T.RequestId.make("format"),
  operation: "test",
  sessionId: null,
});
const source = (text: string, name = "data.csv"): T.Source => {
  const bytes = new TextEncoder().encode(text);
  return { name, bytes, size: bytes.length };
};
const bytes = (name: string, value: Uint8Array): T.Source => ({
  name,
  bytes: value,
  size: value.length,
});
const utf16 = (text: string, little: boolean): Uint8Array => {
  const out = new Uint8Array(text.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < text.length; i += 1) {
    view.setUint16(i * 2, text.codePointAt(i) ?? 0, little);
  }
  return out;
};
const options = (
  overrides: Partial<T.ExportOptions> = {}
): T.ExportOptions => ({
  format: "csv",
  scope: { _tag: "WholeSheet", sheetId: T.SheetId.make("sheet") },
  delimiter: ",",
  newline: "crlf",
  bom: false,
  textPolicy: "exact",
  jsonShape: "auto",
  ...overrides,
});
const job = (overrides: Partial<WriteJob> = {}): WriteJob => ({
  format: "csv",
  sheets: [
    {
      name: "Sheet1",
      visibility: "visible",
      width: 1,
      rows: [[{ _tag: "Text", text: "a" }]],
    },
  ],
  options: options(),
  jsonShape: null,
  headers: false,
  ...overrides,
});
const decode = (value: Uint8Array) => new TextDecoder().decode(value);

it("covers the display and scalar value branches", () => {
  expect(display({ _tag: "Blank" })).toBe("");
  const unknown = { _tag: "Nope" } as unknown as T.Value;
  expect(display(unknown)).toBe(unknown);
  expect(
    equalValue({ _tag: "Text", text: "a" }, { _tag: "Number", value: 1 })
  ).toBe(false);
  const text = decode(
    writeOutput(
      job({
        format: "json",
        jsonShape: "arrays",
        sheets: [
          {
            name: "Sheet1",
            visibility: "visible",
            width: 4,
            rows: [
              [
                { _tag: "Text", text: "a" },
                { _tag: "Number", value: 1 },
                { _tag: "Boolean", value: true },
                { _tag: "Blank" },
              ],
              [unknown],
            ],
          },
        ],
      }),
      ctx()
    )
  );
  expect(JSON.parse(text)).toEqual([["a", 1, true, null], [{ _tag: "Nope" }]]);
  expect(() =>
    writeOutput(
      job({
        format: "json",
        sheets: [
          {
            name: "Sheet1",
            visibility: "visible",
            width: 1,
            rows: [
              [
                {
                  _tag: "Unresolved",
                  reason: "cell-error",
                  display: "Cell error",
                },
              ],
            ],
          },
        ],
      }),
      ctx()
    )
  ).toThrow("Unresolved output reached writer");
  expect(() => writeOutput(job({ sheets: [] }), ctx())).toThrow(
    T.InvalidRequest
  );
});

it("guesses UTF-16 and Windows-1252 encodings without a BOM", () => {
  const le = parseFile(
    bytes("guess.txt", utf16("a,b\n1,2", true)),
    T.defaultParseOptions,
    ctx()
  );
  expect(le.encoding).toMatchObject({
    value: "utf-16le",
    basis: "heuristic",
    ambiguous: true,
  });
  const be = parseFile(
    bytes("guess.txt", utf16("a,b\n1,2", false)),
    T.defaultParseOptions,
    ctx()
  );
  expect(be.encoding).toMatchObject({
    value: "utf-16be",
    basis: "heuristic",
    ambiguous: true,
  });
  const latin = parseFile(
    bytes("latin.csv", new Uint8Array([0xe9])),
    T.defaultParseOptions,
    ctx()
  );
  expect(latin.encoding).toMatchObject({
    value: "windows-1252",
    basis: "heuristic",
    ambiguous: true,
  });
});

it("uses explicit and heuristic delimiters, including a long sample cut", () => {
  const explicit = parseFile(
    source("a;b\n1;2"),
    { ...T.defaultParseOptions, delimiter: ";" },
    ctx()
  );
  expect(explicit.delimiter).toMatchObject({
    value: ";",
    basis: "user",
    ambiguous: false,
  });
  const quoted = parseFile(
    source('a,b\n"x\ny",z\n'),
    T.defaultParseOptions,
    ctx()
  );
  expect(quoted.delimiter?.value).toBe(",");
  const long = parseFile(
    source(`${"x".repeat(70_000)}\na,b\n1,2`),
    T.defaultParseOptions,
    ctx()
  );
  expect(long.delimiter?.value).toBe(",");
  expect(long.sheets[0]?.rows).toHaveLength(3);
});

it("names corrupt, encrypted, and unsupported zip containers", () => {
  expect(() =>
    parseFile(
      bytes("broken.xlsx", new Uint8Array([0x50, 0x4b, 3, 4, 0])),
      T.defaultParseOptions,
      ctx()
    )
  ).toThrow(T.CorruptFile);
  const encrypted = zipSync({
    "[Content_Types].xml": new Uint8Array(),
    EncryptionInfo: new Uint8Array(),
    EncryptedPackage: new Uint8Array(),
  });
  expect(() =>
    parseFile(bytes("encrypted.xlsx", encrypted), T.defaultParseOptions, ctx())
  ).toThrow(T.EncryptedFile);
  const unsupported = zipSync({
    "[Content_Types].xml": new TextEncoder().encode("<Types/>"),
    "xl/workbook.xml": new TextEncoder().encode("<workbook/>"),
  });
  expect(() =>
    parseFile(
      bytes("unsupported.xlsx", unsupported),
      T.defaultParseOptions,
      ctx()
    )
  ).toThrow(T.UnsupportedFormat);
});

it("warns about merged cells and unsafe integers", () => {
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([["a", "b"], [9_007_199_254_740_992]]);
  sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  XLSX.utils.book_append_sheet(book, sheet, "Data");
  const value = new Uint8Array(
    XLSX.write(book, { type: "array", bookType: "xlsx" })
  );
  const parsed = parseFile(
    bytes("warnings.xlsx", value),
    T.defaultParseOptions,
    ctx()
  );
  const codes = parsed.sheets[0]?.warnings.map((w) => w.code) ?? [];
  expect(codes).toContain("merged-cells");
  expect(codes).toContain("source-precision");
});

it("rejects a mismatched source size before sniffing", () => {
  expect(() =>
    parseFile(
      { name: "size.csv", size: 99, bytes: new Uint8Array() },
      T.defaultParseOptions,
      ctx()
    )
  ).toThrow(T.InvalidRequest);
});

it("writes CSV with a BOM and the tab-shaped formats", () => {
  const bomBytes = writeOutput(job({ options: options({ bom: true }) }), ctx());
  expect([bomBytes[0], bomBytes[1], bomBytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
  const bom = decode(bomBytes);
  expect(bom).toBe("a\r\n");
  const tsv = decode(
    writeOutput(
      job({ format: "tsv", options: options({ delimiter: "\t" }) }),
      ctx()
    )
  );
  expect(tsv).toBe("a\r\n");
  const tab = decode(
    writeOutput(
      job({ format: "tab", options: options({ delimiter: "\t" }) }),
      ctx()
    )
  );
  expect(tab).toBe("a\r\n");
  const clipboard = decode(
    writeOutput(
      job({
        format: "clipboard",
        options: options({ delimiter: "\t", newline: "lf" }),
      }),
      ctx()
    )
  );
  expect(clipboard).toBe("a\n");
  const objects = decode(
    writeOutput(
      job({
        format: "json",
        jsonShape: "objects",
        sheets: [
          {
            name: "Sheet1",
            visibility: "visible",
            width: 2,
            rows: [
              [
                { _tag: "Text", text: "a" },
                { _tag: "Text", text: "b" },
              ],
              [
                { _tag: "Text", text: "one" },
                { _tag: "Number", value: 2 },
              ],
            ],
          },
        ],
      }),
      ctx()
    )
  );
  expect(JSON.parse(objects)).toEqual([{ a: "one", b: 2 }]);
  expect(parseText("a\tb\n1\t2", "\t", ctx())).toEqual([
    ["a", "b"],
    ["1", "2"],
  ]);
});
