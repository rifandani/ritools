/* oxlint-disable anti-slop/no-shape-in-symbol-names -- Tests use the fixed public export field. */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";
import * as XLSX from "xlsx";

import * as T from "./tabular";
import { parseFile, parseText, writeOutput, display } from "./tabular.format";
import type { FailureContext } from "./tabular.format";
import {
  TabularModel,
  candidate,
  compareValues,
  checkWorkbookDimensions,
} from "./tabular.model";

let serial = 0;
const ctx = (): FailureContext => ({
  requestId: T.RequestId.make(`test-${(serial += 1)}`),
  operation: "test",
  sessionId: null,
});
const source = (text: string, name = "data.csv"): T.Source => {
  const bytes = new TextEncoder().encode(text);
  return { name, bytes, size: bytes.length };
};
const make = (text: string, header = true) =>
  new TabularModel(
    parseFile(source(text), { ...T.defaultParseOptions, header }, ctx()),
    T.CandidateId.make(`test-candidate-${(serial += 1)}`)
  );
const guard = (m: TabularModel) => ({
  sessionId: m.sessionId,
  expectedRevision: m.revision,
  requestId: ctx().requestId,
});
const view = (
  m: TabularModel,
  search = "",
  sort: T.ViewRequest["sort"] = null,
  sheetId = m.summary().sheets[0]?.sheetId
) => {
  if (!sheetId) {
    throw new Error("No Sheet");
  }
  return m.setView(
    { ...guard(m), sheetId, search, sort },
    ctx(),
    async () => {}
  );
};
const rectangle = async (m: TabularModel, sheetId?: T.SheetId) => {
  const v = await view(m, "", null, sheetId);
  return m.viewport(
    {
      ...guard(m),
      viewId: v.viewId,
      rowStart: 0,
      rowCount: 20,
      columnStart: 0,
      columnCount: 20,
    },
    ctx()
  );
};
const edit = (m: TabularModel, e: T.Edit) =>
  m.edit({ ...guard(m), edit: e }, ctx());
const options = (
  sheetId: T.SheetId,
  format: T.OutputFormat = "csv"
): T.ExportOptions => ({
  format,
  scope: { _tag: "WholeSheet", sheetId },
  delimiter:
    format === "tsv" || format === "tab" || format === "clipboard" ? "\t" : ",",
  newline: format === "clipboard" ? "lf" : "crlf",
  bom: false,
  textPolicy: "exact",
  jsonShape: "auto",
});
const output = (m: TabularModel, settings: T.ExportOptions) => {
  const plan = m.planExport({ ...guard(m), options: settings }, ctx());
  const out = m.exportJob(
    { ...guard(m), planId: plan.planId, acknowledgeValuesOnly: true },
    ctx()
  );
  return { plan, bytes: writeOutput(out.job, ctx()) };
};

describe("Tabular real formats", () => {
  it("keeps all 42 conversion pairs and checks all export scopes", async () => {
    const matrix = [
      ["ID", "n", "flag", "note"],
      ["00123", "42", "true", "=1+1"],
      ["999999999999999999", "0", "false", "  x  "],
    ];
    for (const input of ["csv", "tsv", "tab", "txt", "xls", "xlsx"] as const) {
      let bytes: Uint8Array;
      if (input === "xls" || input === "xlsx") {
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          book,
          XLSX.utils.aoa_to_sheet(matrix),
          "Data"
        );
        XLSX.utils.book_append_sheet(
          book,
          XLSX.utils.aoa_to_sheet([["other"], ["kept"]]),
          "Hidden"
        );
        book.Workbook = {
          Sheets: [
            { name: "Data", Hidden: 0 },
            { name: "Hidden", Hidden: 1 },
          ],
        };
        bytes = new Uint8Array(
          XLSX.write(book, {
            type: "array",
            bookType: input === "xls" ? "biff8" : "xlsx",
          })
        );
      } else {
        bytes = new TextEncoder().encode(
          matrix
            .map((r) =>
              r.join(
                input === "tsv" || input === "tab"
                  ? "\t"
                  : input === "txt"
                    ? "|"
                    : ","
              )
            )
            .join("\r\n")
        );
      }
      const parsed = parseFile(
        { name: `input.${input}`, bytes, size: bytes.length },
        T.defaultParseOptions,
        ctx()
      );
      const m = new TabularModel(parsed, T.CandidateId.make(`pair-${input}`));
      const [sheet] = m.summary().sheets;
      if (!sheet) {
        throw new Error("Missing Sheet");
      }
      expect(
        parsed.sheets[0]?.rows.map((r) => r.map((c) => display(c.value)))
      ).toEqual(matrix);
      for (const format of [
        "csv",
        "tsv",
        "tab",
        "xls",
        "xlsx",
        "json",
        "clipboard",
      ] as const) {
        const settings = options(sheet.sheetId, format);
        const result = output(m, settings);
        if (format === "json") {
          expect(JSON.parse(new TextDecoder().decode(result.bytes))).toEqual(
            matrix
              .slice(1)
              .map((r) =>
                Object.fromEntries(matrix[0]?.map((h, i) => [h, r[i]]) ?? [])
              )
          );
        } else if (format === "xls" || format === "xlsx") {
          expect(
            parseFile(
              {
                name: `read.${format}`,
                size: result.bytes.length,
                bytes: result.bytes,
              },
              T.defaultParseOptions,
              ctx()
            ).sheets[0]?.rows.map((r) => r.map((c) => display(c.value)))
          ).toEqual(matrix);
        } else {
          expect(
            parseText(
              new TextDecoder().decode(result.bytes),
              settings.delimiter,
              ctx()
            )
          ).toEqual(matrix);
        }
        // oxlint-disable-next-line eslint/no-await-in-loop -- Each projection uses the same live session and replaces its active view.
        const v = await view(m, "00123");
        const projected = output(m, {
          ...settings,
          scope: {
            _tag: "CurrentView",
            sheetId: sheet.sheetId,
            viewId: v.viewId,
          },
        });
        expect(projected.plan.sheets[0]?.rows).toBe(1);
        if (format === "xls" || format === "xlsx") {
          const whole = output(m, {
            ...settings,
            scope: { _tag: "WholeWorkbook" },
          });
          expect(whole.plan.sheets.length).toBe(parsed.sheets.length);
        }
      }
    }
  });
  it("keeps BOMs, four encodings, ragged/empty records and strict quotes", () => {
    for (const name of [
      "utf8-bom.csv",
      "utf16le.tab",
      "utf16be.tab",
      "windows1252.csv",
      "empty-record.csv",
      "headers-collision.csv",
      "empty.csv",
    ]) {
      const bytes = new Uint8Array(
        readFileSync(`docs/proofs/tabular/samples/${name}`)
      );
      const file = parseFile(
        { name, bytes, size: bytes.length },
        T.defaultParseOptions,
        ctx()
      );
      expect(file.sheets).toHaveLength(1);
      if (name === "empty.csv") {
        expect(file.sheets[0]?.width).toBe(0);
      }
    }
    expect(parseText("a,b\r\n,\r\n", ",", ctx())).toEqual([
      ["a", "b"],
      ["", ""],
    ]);
    expect(parseText("\n\n", ",", ctx())).toEqual([[""], [""]]);
    expect(parseText('a,b\n"one\r\ntwo","say ""hi"""', ",", ctx())).toEqual([
      ["a", "b"],
      ["one\r\ntwo", 'say "hi"'],
    ]);
    for (const text of [
      'a,b\n"bad,x',
      'a,b\nx"x,y',
      'a,b\n"x"tail,y',
      "a,\u0000",
    ]) {
      expect(() => parseText(text, ",", ctx())).toThrow(T.InvalidDelimitedText);
    }
    const f = parseFile(
      source("a,b,c\n1,2\n,,\n"),
      T.defaultParseOptions,
      ctx()
    );
    expect(f.sheets[0]?.rows[1]?.map((c) => display(c.value))).toEqual([
      "1",
      "2",
      "",
    ]);
    expect(f.sheets[0]?.warnings.some((w) => w.code === "ragged-records")).toBe(
      true
    );
  });
  it("keeps typed values, dates, formulas, hidden and empty Sheets", () => {
    for (const name of ["values-lab.xlsx", "values-lab.xls"]) {
      const bytes = new Uint8Array(
        readFileSync(`docs/proofs/tabular/samples/${name}`)
      );
      const f = parseFile(
        { name, bytes, size: bytes.length },
        T.defaultParseOptions,
        ctx()
      );
      expect(f.sheets.some((s) => s.visibility === "hidden")).toBe(true);
      expect(f.sheets.some((s) => !s.rows.length)).toBe(true);
      expect(
        candidate(f, T.CandidateId.make("preview"))
          .valuesOnlyAcknowledgementRequired
      ).toBe(true);
    }
    for (const date1904 of [false, true]) {
      const book = XLSX.utils.book_new();
      const sheet = XLSX.utils.aoa_to_sheet([
        ["n", "b", "date", "cached", "missing", "error"],
        [42, true, 1, 2, null, null],
      ]);
      Object.assign(sheet, {
        C2: { t: "n", v: 1, z: "yyyy-mm-dd", f: "1" },
        D2: { t: "n", v: 2, f: "1+1" },
        E2: { t: "n", f: "2+2" },
        F2: { t: "e", v: 7, f: "1/0" },
      });
      XLSX.utils.book_append_sheet(book, sheet, "Data");
      book.Workbook = { WBProps: { date1904 } };
      const bytes = new Uint8Array(
        XLSX.write(book, { type: "array", bookType: "xlsx" })
      );
      const f = parseFile(
        { name: "formulas.xlsx", bytes, size: bytes.length },
        T.defaultParseOptions,
        ctx()
      );
      expect(
        f.sheets
          .flatMap((s) => s.warnings)
          .filter((w) => w.code === "stored-formula")
      ).toEqual([{ code: "stored-formula", count: 4 }]);
      const row = f.sheets[0]?.rows[1];
      expect(row?.[0]?.value).toEqual({ _tag: "Number", value: 42 });
      expect(row?.[1]?.value).toEqual({ _tag: "Boolean", value: true });
      expect(row?.[2]?.value).toEqual({
        _tag: "Text",
        text: date1904 ? "1904-01-02" : "1900-01-01",
      });
      expect(row?.[3]?.origin).toBe("stored-formula");
      expect(row?.[4]?.value).toMatchObject({
        _tag: "Unresolved",
        reason: "missing-formula-result",
      });
      expect(row?.[5]?.value).toMatchObject({
        _tag: "Unresolved",
        reason: "formula-error",
      });
      const m = new TabularModel(f, T.CandidateId.make(`formula-${date1904}`));
      const id = m.summary().sheets[0]?.sheetId;
      if (!id) {
        throw new Error("Missing");
      }
      const p = m.planExport(
        { ...guard(m), options: options(id, "xlsx") },
        ctx()
      );
      expect(p.unresolvedCount).toBe(2);
      expect(() =>
        m.exportJob(
          { ...guard(m), planId: p.planId, acknowledgeValuesOnly: true },
          ctx()
        )
      ).toThrow(T.UnresolvedValues);
    }
  });
  it("uses safe JSON keys and lossless array fallback", () => {
    const m = make("__proto__,constructor,prototype\na,b,c");
    const id = m.summary().sheets[0]?.sheetId;
    if (!id) {
      throw new Error("Missing");
    }
    const out = output(m, options(id, "json"));
    expect(
      Object.keys(JSON.parse(new TextDecoder().decode(out.bytes))[0])
    ).toEqual(["__proto__", "constructor", "prototype"]);
    for (const [text, reason] of [
      ["a,a\nx,y", "duplicate-headers"],
      ["a, \nx,y", "blank-headers"],
    ]) {
      const f = make(text ?? "");
      const [s] = f.summary().sheets;
      if (!s) {
        throw new Error("Missing");
      }
      const fallback = output(f, options(s.sheetId, "json"));
      expect(fallback.plan.jsonReason).toBe(reason);
      expect(JSON.parse(new TextDecoder().decode(fallback.bytes))).toHaveLength(
        2
      );
    }
  });
  it("protects spreadsheet text without changing the model", () => {
    const m = make('a,b\n"  =1+1",-text\n@name,+x');
    const [s] = m.summary().sheets;
    if (!s) {
      throw new Error("Missing");
    }
    const out = output(m, {
      ...options(s.sheetId),
      textPolicy: "spreadsheet-safe",
    });
    expect(out.plan.changedOutputCells).toBe(4);
    expect(
      parseText(new TextDecoder().decode(out.bytes), ",", ctx())[1]
    ).toEqual(["'  =1+1", "'-text"]);
    expect(m.summary().history.dirty).toBe(false);
    const wb = output(m, options(s.sheetId, "xlsx"));
    expect(wb.bytes.length).toBeGreaterThan(0);
  });
});

describe("Tabular edits and views", () => {
  it("restores edits, structure and headers through undo, redo and Revert all", async () => {
    const m = make("name,value\none,01\ntwo,02\nthree,03");
    const initial = await rectangle(m);
    const [row] = initial.rows;
    const [col] = initial.columns;
    if (!row || !col) {
      throw new Error("Missing");
    }
    const address = {
      sheetId: initial.sheetId,
      rowId: row.rowId,
      columnId: col.columnId,
    };
    edit(m, { _tag: "SetCell", address, text: "ONE" });
    expect(m.summary().history.changedCellCount).toBe(1);
    const sorted = await view(m, "", {
      columnId: col.columnId,
      direction: "descending",
    });
    expect(sorted.matchingRows).toBe(3);
    m.history({ ...guard(m), direction: "undo" }, ctx());
    const undone = await rectangle(m);
    expect(undone.rows[0]?.cells[0]?.display).toBe("one");
    m.history({ ...guard(m), direction: "redo" }, ctx());
    edit(m, {
      _tag: "RenameHeader",
      sheetId: initial.sheetId,
      columnId: col.columnId,
      text: "title",
    });
    edit(m, {
      _tag: "InsertRows",
      sheetId: initial.sheetId,
      before: row.rowId,
      count: 1,
    });
    edit(m, {
      _tag: "InsertColumns",
      sheetId: initial.sheetId,
      before: null,
      count: 1,
    });
    const after = await rectangle(m);
    const v = await view(m);
    const ids = after.rows.slice(0, 2).map((r) => r.rowId);
    const cols = after.columns.slice(0, 2).map((c) => c.columnId);
    edit(m, {
      _tag: "Paste",
      sheetId: initial.sheetId,
      viewId: v.viewId,
      rowIds: ids,
      columnIds: cols,
      values: [
        ["new", "x"],
        ["changed", "y"],
      ],
    });
    expect(m.summary().history.undoCount).toBe(5);
    const beforeRevert = await rectangle(m);
    edit(m, { _tag: "RevertAll" });
    expect(m.summary().history.dirty).toBe(false);
    const reverted = await rectangle(m);
    expect(reverted.rows.map((r) => r.cells.map((c) => c.display))).toEqual([
      ["one", "01"],
      ["two", "02"],
      ["three", "03"],
    ]);
    m.history({ ...guard(m), direction: "undo" }, ctx());
    const restored = await rectangle(m);
    expect(restored.rows.map((r) => r.cells.map((c) => c.display))).toEqual(
      beforeRevert.rows.map((r) => r.cells.map((c) => c.display))
    );
    expect(m.summary().history.changedHeaderCount).toBe(1);
    edit(m, { _tag: "RevertCell", address });
    expect(m.summary().history.canRedo).toBe(false);
  });
  it("rejects invalid and stale requests without a partial change", async () => {
    const m = make("a,b\n1,2\n3,4");
    const box = await rectangle(m);
    const v = await view(m);
    const before = m.summary();
    expect(() =>
      edit(m, {
        _tag: "Paste",
        sheetId: box.sheetId,
        viewId: v.viewId,
        rowIds: box.rows.map((r) => r.rowId),
        columnIds: box.columns.map((c) => c.columnId),
        values: [["x", "y"], ["z"]],
      })
    ).toThrow(T.InvalidPaste);
    expect(m.summary()).toEqual(before);
    expect(() =>
      edit(m, {
        _tag: "DeleteRows",
        sheetId: box.sheetId,
        rowIds: [T.RowId.make("missing")],
      })
    ).toThrow(T.MissingIdentity);
    const [row] = box.rows;
    const [c] = box.columns;
    if (!row || !c) {
      throw new Error("Missing");
    }
    edit(m, {
      _tag: "SetCell",
      address: { sheetId: box.sheetId, rowId: row.rowId, columnId: c.columnId },
      text: "x",
    });
    expect(() =>
      m.viewport(
        {
          ...guard(m),
          viewId: v.viewId,
          rowStart: 0,
          rowCount: 10,
          columnStart: 0,
          columnCount: 2,
        },
        ctx()
      )
    ).toThrow(T.StaleView);
    expect(() =>
      m.edit(
        {
          sessionId: m.sessionId,
          expectedRevision: 0,
          requestId: ctx().requestId,
          edit: { _tag: "RevertAll" },
        },
        ctx()
      )
    ).toThrow(T.RevisionConflict);
  });
  it("keeps Current View separate from underlying order and stable identities", async () => {
    const m = make("a,b\nz,001\na,002\nz,003");
    const box = await rectangle(m);
    const [c] = box.columns;
    if (!c) {
      throw new Error("Missing");
    }
    const v = await view(m, "z", {
      columnId: c.columnId,
      direction: "ascending",
    });
    const out = output(m, {
      ...options(box.sheetId),
      scope: { _tag: "CurrentView", sheetId: box.sheetId, viewId: v.viewId },
    });
    expect(parseText(new TextDecoder().decode(out.bytes), ",", ctx())).toEqual([
      ["a", "b"],
      ["z", "001"],
      ["z", "003"],
    ]);
    expect(
      parseText(
        new TextDecoder().decode(output(m, options(box.sheetId)).bytes),
        ",",
        ctx()
      )
    ).toHaveLength(4);
    expect(m.summary().history.canUndo).toBe(false);
    expect(() =>
      m.viewport(
        {
          ...guard(m),
          viewId: v.viewId,
          rowStart: 0,
          rowCount: 100,
          columnStart: 0,
          columnCount: 100,
        },
        ctx()
      )
    ).toThrow(T.InvalidRequest);
  });
  it("handles zero columns and exact restoration after deleting the final column", async () => {
    const m = make("a\n1\n2");
    const b = await rectangle(m);
    edit(m, {
      _tag: "DeleteColumns",
      sheetId: b.sheetId,
      columnIds: b.columns.map((c) => c.columnId),
    });
    expect(m.summary().sheets[0]).toMatchObject({
      rowCount: 0,
      columnCount: 0,
    });
    m.history({ ...guard(m), direction: "undo" }, ctx());
    const restored = await rectangle(m);
    expect(restored.rows.map((r) => r.cells[0]?.display)).toEqual(["1", "2"]);
    const empty = make("");
    const id = empty.summary().sheets[0]?.sheetId;
    if (!id) {
      throw new Error("Missing");
    }
    edit(empty, { _tag: "InsertColumns", sheetId: id, before: null, count: 1 });
    edit(empty, { _tag: "InsertRows", sheetId: id, before: null, count: 1 });
    const inserted = await rectangle(empty);
    expect(inserted.rows[0]?.cells[0]?.value).toEqual({
      _tag: "Text",
      text: "",
    });
  });
  it("sorts mixed values with blanks and unresolved last in both directions", () => {
    const values: T.Value[] = [
      { _tag: "Blank" },
      { _tag: "Text", text: "2" },
      { _tag: "Number", value: 10 },
      { _tag: "Boolean", value: false },
      { _tag: "Unresolved", reason: "cell-error", display: "Cell error" },
      { _tag: "Number", value: 2 },
    ];
    expect(
      [...values]
        .toSorted((a, b) => compareValues(a, b, "ascending"))
        .map((v) => v._tag)
    ).toEqual(["Number", "Number", "Boolean", "Text", "Blank", "Unresolved"]);
    expect(
      [...values]
        .toSorted((a, b) => compareValues(a, b, "descending"))
        .map((v) => v._tag)
    ).toEqual(["Text", "Boolean", "Number", "Number", "Blank", "Unresolved"]);
  });
  it("validates unknown request coordinates and command tags", () => {
    expect(Schema.is(T.Edit)({ _tag: "RunFormula", text: "code" })).toBe(false);
    expect(
      Schema.is(T.ViewportRequest)({
        sessionId: "s",
        expectedRevision: 0,
        requestId: "r",
        viewId: "v",
        rowStart: -1,
        rowCount: 1,
        columnStart: 0,
        columnCount: 1,
      })
    ).toBe(false);
  });
});

it("keeps one history across Sheets and excludes unresolved cells only by scope", async () => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([["name"], ["one"], ["two"]]),
    "First"
  );
  const second = XLSX.utils.aoa_to_sheet([["value"], [null], ["keep"]]);
  Object.assign(second, { A2: { t: "n", f: "1+1" } });
  XLSX.utils.book_append_sheet(book, second, "Second");
  const bytes = new Uint8Array(
    XLSX.write(book, { type: "array", bookType: "xlsx" })
  );
  const m = new TabularModel(
    parseFile(
      { name: "source.xlsx", bytes, size: bytes.length },
      T.defaultParseOptions,
      ctx()
    ),
    T.CandidateId.make("cross-sheet")
  );
  const [a, b] = m.summary().sheets;
  if (!a || !b) {
    throw new Error("Missing Sheets");
  }
  const first = await rectangle(m, a.sheetId);
  const secondBox = await rectangle(m, b.sheetId);
  const [row] = first.rows;
  const [column] = first.columns;
  if (!row || !column) {
    throw new Error("Missing cell");
  }
  const address = {
    sheetId: a.sheetId,
    rowId: row.rowId,
    columnId: column.columnId,
  };
  edit(m, { _tag: "SetCell", address, text: "edited" });
  edit(m, {
    _tag: "RenameHeader",
    sheetId: b.sheetId,
    columnId: secondBox.columns[0]?.columnId ?? T.ColumnId.make("missing"),
    text: "renamed",
  });
  const undo = m.history({ ...guard(m), direction: "undo" }, ctx());
  expect(undo.affectedSheets).toEqual([b.sheetId]);
  m.history({ ...guard(m), direction: "undo" }, ctx());
  const restored = await rectangle(m, a.sheetId);
  expect(restored.rows[0]?.rowId).toBe(address.rowId);
  expect(restored.rows[0]?.cells[0]?.display).toBe("one");
  const filtered = await view(m, "keep", null, b.sheetId);
  const current = output(m, {
    ...options(b.sheetId, "xlsx"),
    scope: { _tag: "CurrentView", sheetId: b.sheetId, viewId: filtered.viewId },
  });
  expect(current.plan.unresolvedCount).toBe(0);
  const whole = m.planExport(
    {
      ...guard(m),
      options: {
        ...options(b.sheetId, "xlsx"),
        scope: { _tag: "WholeWorkbook" },
      },
    },
    ctx()
  );
  expect(whole.unresolvedCount).toBe(1);
});
it("keeps dirty state and changed counts correct through deleted-cell restoration", async () => {
  const m = make("a\noriginal");
  const b = await rectangle(m);
  const [row] = b.rows;
  const [col] = b.columns;
  if (!row || !col) {
    throw new Error("Missing");
  }
  const address = {
    sheetId: b.sheetId,
    rowId: row.rowId,
    columnId: col.columnId,
  };
  edit(m, { _tag: "SetCell", address, text: "changed" });
  edit(m, { _tag: "DeleteRows", sheetId: b.sheetId, rowIds: [row.rowId] });
  expect(m.summary().history.changedCellCount).toBe(0);
  edit(m, { _tag: "RevertAll" });
  m.history({ ...guard(m), direction: "undo" }, ctx());
  expect(m.summary().history.changedCellCount).toBe(0);
  m.history({ ...guard(m), direction: "undo" }, ctx());
  expect(m.summary().history.changedCellCount).toBe(1);
  const clean = make("a\n1");
  const [s] = clean.summary().sheets;
  if (!s) {
    throw new Error("Missing");
  }
  edit(clean, {
    _tag: "InsertRows",
    sheetId: s.sheetId,
    before: null,
    count: 1,
  });
  const inserted = await rectangle(clean);
  const last = inserted.rows.at(-1);
  if (!last) {
    throw new Error("Missing");
  }
  edit(clean, { _tag: "DeleteRows", sheetId: s.sheetId, rowIds: [last.rowId] });
  expect(clean.summary().history.dirty).toBe(false);
  expect(clean.summary().history.structuralEditCount).toBe(2);
});
it("rejects macro-enabled containers, invalid encodings, corrupt workbooks and oversized output", () => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([["a"], ["value"]]),
    "Data"
  );
  const macro = new Uint8Array(
    XLSX.write(book, { type: "array", bookType: "xlsm" })
  );
  expect(() =>
    parseFile(
      { name: "renamed.xlsx", bytes: macro, size: macro.length },
      T.defaultParseOptions,
      ctx()
    )
  ).toThrow(T.UnsupportedFormat);
  const invalid = new Uint8Array([0xc3, 0x28]);
  expect(() =>
    parseFile(
      { name: "bad.csv", bytes: invalid, size: 2 },
      { ...T.defaultParseOptions, encoding: "utf-8" },
      ctx()
    )
  ).toThrow(T.InvalidEncoding);
  expect(() =>
    parseFile(source("broken", "bad.xlsx"), T.defaultParseOptions, ctx())
  ).toThrow(T.CorruptFile);
  expect(() =>
    parseFile(source("data", "input.json"), T.defaultParseOptions, ctx())
  ).toThrow(T.UnsupportedFormat);
  const m = make(`a\n${"x".repeat(32_768)}`);
  const [s] = m.summary().sheets;
  if (!s) {
    throw new Error("Missing");
  }
  const p = m.planExport(
    { ...guard(m), options: options(s.sheetId, "xlsx") },
    ctx()
  );
  expect(p.blockedBy[0]).toMatchObject({
    _tag: "FormatLimit",
    dimension: "cell-text",
    actual: 32_768,
    limit: 32_767,
  });
});
it("reads generated BIFF2, BIFF5, BIFF8 and SpreadsheetML input", () => {
  for (const bookType of ["biff2", "biff5", "biff8", "xlml"] as const) {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([
        ["text", "n", "b"],
        ["00123", 42, true],
      ]),
      "Data"
    );
    const bytes = new Uint8Array(XLSX.write(book, { type: "array", bookType }));
    const f = parseFile(
      { name: "legacy.xls", bytes, size: bytes.length },
      T.defaultParseOptions,
      ctx()
    );
    expect(f.format).toBe("xls");
    expect(f.sheets[0]?.rows[1]?.map((c) => display(c.value))).toEqual([
      "00123",
      "42",
      "true",
    ]);
  }
});

it("checks XLSX and XLS bounds from dimensions without allocating oversized files", () => {
  const sheetId = T.SheetId.make("bounds");
  expect(
    checkWorkbookDimensions(
      "xlsx",
      { sheetId, physicalRows: 1_048_576, columns: 16_384 },
      ctx()
    )
  ).toEqual([]);
  expect(
    checkWorkbookDimensions(
      "xlsx",
      { sheetId, physicalRows: 1_048_577, columns: 16_385 },
      ctx()
    ).map((e) => e.dimension)
  ).toEqual(["rows", "columns"]);
  expect(
    checkWorkbookDimensions(
      "xls",
      { sheetId, physicalRows: 65_537, columns: 257 },
      ctx()
    ).map((e) => e.limit)
  ).toEqual([65_536, 256]);
});

it("reads BIFF3/4 fixtures and names an encrypted CFB input", () => {
  for (const name of ["biff3.xls", "biff4.xls"]) {
    const bytes = new Uint8Array(
      readFileSync(`docs/proofs/tabular-engine/fixtures/${name}`)
    );
    const f = parseFile(
      { name, bytes, size: bytes.length },
      T.defaultParseOptions,
      ctx()
    );
    expect(f.sheets[0]?.rows[1]?.map((c) => display(c.value))).toEqual([
      "00123",
      "42",
      "true",
    ]);
  }
  const bytes = new Uint8Array(
    readFileSync("docs/proofs/tabular-engine/fixtures/encrypted-container.xls")
  );
  expect(() =>
    parseFile(
      { name: "encrypted.xls", bytes, size: bytes.length },
      T.defaultParseOptions,
      ctx()
    )
  ).toThrow(T.EncryptedFile);
});

it("sniffs a UTF-16 SpreadsheetML workbook by its bytes", () => {
  const xml = readFileSync(
    "docs/proofs/tabular-engine/fixtures/xlml.xls",
    "utf-8"
  );
  const bytes = new Uint8Array(2 + xml.length * 2);
  bytes.set([0xff, 0xfe]);
  const dataView = new DataView(bytes.buffer);
  for (let i = 0; i < xml.length; i += 1) {
    // oxlint-disable-next-line unicorn/prefer-code-point -- UTF-16 fixture encoding writes code units, including surrogate pairs.
    dataView.setUint16(2 + i * 2, xml.charCodeAt(i), true);
  }
  const parsed = parseFile(
    { name: "utf16.xls", size: bytes.length, bytes },
    T.defaultParseOptions,
    ctx()
  );
  expect(parsed.format).toBe("xls");
  expect(parsed.sheets[0]?.rows[1]?.map((c) => display(c.value))).toEqual([
    "00123",
    "42",
    "true",
  ]);
});

it("retains untrusted workbook Sheet names without prototype setters", () => {
  const names = ["__proto__", "constructor"];
  const book: XLSX.WorkBook = {
    SheetNames: names,
    Sheets: Object.fromEntries(
      names.map((name) => [name, XLSX.utils.aoa_to_sheet([["a"], [name]])])
    ),
  };
  const bytes = new Uint8Array(
    XLSX.write(book, { type: "array", bookType: "xlsx" })
  );
  const m = new TabularModel(
    parseFile(
      { name: "names.xlsx", bytes, size: bytes.length },
      T.defaultParseOptions,
      ctx()
    ),
    T.CandidateId.make("untrusted-names")
  );
  const [first] = m.summary().sheets;
  if (!first) {
    throw new Error("Missing Sheet");
  }
  const result = output(m, {
    ...options(first.sheetId, "xlsx"),
    scope: { _tag: "WholeWorkbook" },
  });
  const parsed = parseFile(
    { name: "result.xlsx", size: result.bytes.length, bytes: result.bytes },
    T.defaultParseOptions,
    ctx()
  );
  expect(parsed.sheets.map((s) => s.name)).toEqual(names);
  expect(parsed.sheets.map((s) => s.rows[1]?.[0]?.value)).toEqual(
    names.map((text) => ({ _tag: "Text", text }))
  );
});
