/* oxlint-disable anti-slop/no-shape-in-symbol-names -- Tests use the fixed public export field. */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import * as XLSX from "xlsx";

import * as T from "./tabular";
import { parseFile, parseText, writeOutput, display } from "./tabular.format";
import type { FailureContext } from "./tabular.format";
import {
  TabularModel,
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
  pdf: null,
  locale: "en-US",
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
  it("counts duplicate rows, keeps the first, and undoes one Dedupe", async () => {
    const m = make(
      "name,city\nAda,London\nAda,London\nBob,Paris\nAda,London\nBob,Paris\nada,London"
    );
    const box = await rectangle(m);
    const preview = m.dedupePreview(
      { ...guard(m), options: { sheetId: box.sheetId, columnIds: null } },
      ctx()
    );
    expect(preview).toEqual({
      sessionId: m.sessionId,
      revision: m.revision,
      sheetId: box.sheetId,
      columnIds: null,
      rows: 6,
      duplicates: 3,
      remaining: 3,
    });
    const change = edit(m, {
      _tag: "Dedupe",
      sheetId: box.sheetId,
      columnIds: null,
    });
    expect(change.editId).not.toBeNull();
    expect(change.session.history.dirty).toBe(true);
    expect(change.session.history.nextUndo?.kind).toBe("dedupe");
    expect(change.session.sheets[0]?.rowCount).toBe(3);
    const after = await rectangle(m);
    expect(after.rows.map((r) => r.cells.map((c) => c.display))).toEqual([
      ["Ada", "London"],
      ["Bob", "Paris"],
      ["ada", "London"],
    ]);
    m.history({ ...guard(m), direction: "undo" }, ctx());
    expect(m.summary().sheets[0]?.rowCount).toBe(6);
    m.history({ ...guard(m), direction: "redo" }, ctx());
    expect(m.summary().sheets[0]?.rowCount).toBe(3);
  });
  it("dedupes by chosen columns and rejects an empty or unknown selection", async () => {
    const m = make("id,note\n1,a\n1,b\n2,c\n3,d\n3,d");
    const box = await rectangle(m);
    const [id] = box.columns;
    if (!id) {
      throw new Error("Missing");
    }
    const preview = m.dedupePreview(
      {
        ...guard(m),
        options: { sheetId: box.sheetId, columnIds: [id.columnId] },
      },
      ctx()
    );
    expect(preview).toEqual({
      sessionId: m.sessionId,
      revision: m.revision,
      sheetId: box.sheetId,
      columnIds: [id.columnId],
      rows: 5,
      duplicates: 2,
      remaining: 3,
    });
    expect(() =>
      m.dedupePreview(
        { ...guard(m), options: { sheetId: box.sheetId, columnIds: [] } },
        ctx()
      )
    ).toThrow(T.InvalidRequest);
    expect(() =>
      m.dedupePreview(
        {
          ...guard(m),
          options: {
            sheetId: box.sheetId,
            columnIds: [T.ColumnId.make("missing")],
          },
        },
        ctx()
      )
    ).toThrow(T.MissingIdentity);
    edit(m, {
      _tag: "Dedupe",
      sheetId: box.sheetId,
      columnIds: [id.columnId],
    });
    const after = await rectangle(m);
    expect(after.rows.map((r) => r.cells.map((c) => c.display))).toEqual([
      ["1", "a"],
      ["2", "c"],
      ["3", "d"],
    ]);
  });
  it("keeps the header row and leaves a clean Sheet alone", async () => {
    const m = make("a,b\na,b\na,b");
    const box = await rectangle(m);
    const preview = m.dedupePreview(
      { ...guard(m), options: { sheetId: box.sheetId, columnIds: null } },
      ctx()
    );
    expect(preview.rows).toBe(2);
    expect(preview.duplicates).toBe(1);
    edit(m, { _tag: "Dedupe", sheetId: box.sheetId, columnIds: null });
    const after = await rectangle(m);
    expect(after.rows.map((r) => r.cells.map((c) => c.display))).toEqual([
      ["a", "b"],
    ]);
    expect(m.summary().sheets[0]?.header).toBe(true);
    const clean = make("a\n1\n2\n3");
    const cleanBox = await rectangle(clean);
    const before = clean.summary();
    const change = edit(clean, {
      _tag: "Dedupe",
      sheetId: cleanBox.sheetId,
      columnIds: null,
    });
    expect(change.editId).toBeNull();
    expect(change.session.revision).toBe(before.revision);
    expect(change.session.history.undoCount).toBe(before.history.undoCount);
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

it("pages warnings, locates coordinates, and renders headerless columns", async () => {
  const book = XLSX.utils.book_new();
  const first = XLSX.utils.aoa_to_sheet([["name"], ["one"], ["two"]]);
  Object.assign(first, {
    A2: { t: "n", f: "1+1" },
    A3: { t: "n", f: "2+2" },
  });
  const second = XLSX.utils.aoa_to_sheet([["other"], ["row"]]);
  XLSX.utils.book_append_sheet(book, first, "Data");
  XLSX.utils.book_append_sheet(book, second, "Other");
  book.Workbook = {
    Sheets: [
      { name: "Data", Hidden: 0 },
      { name: "Other", Hidden: 1 },
    ],
  };
  const bytes = new Uint8Array(
    XLSX.write(book, { type: "array", bookType: "xlsx" })
  );
  const m = new TabularModel(
    parseFile(
      { name: "warnings.xlsx", bytes, size: bytes.length },
      T.defaultParseOptions,
      ctx()
    ),
    T.CandidateId.make("warnings")
  );
  const [a, b] = m.summary().sheets;
  if (!a || !b) {
    throw new Error("Missing Sheets");
  }
  const page = m.warnings(
    {
      ...guard(m),
      code: null,
      sheetId: null,
      offset: 0,
      limit: 1,
    },
    ctx()
  );
  expect(page.items).toHaveLength(1);
  expect(page.total).toBeGreaterThan(1);
  expect(page.nextOffset).toBe(1);
  expect(
    m.warnings(
      {
        ...guard(m),
        code: "stored-formula",
        sheetId: b.sheetId,
        offset: 0,
        limit: 100,
      },
      ctx()
    ).items
  ).toEqual([]);
  const unresolved = m.warnings(
    {
      ...guard(m),
      code: "unresolved-value",
      sheetId: null,
      offset: 0,
      limit: 100,
    },
    ctx()
  );
  expect(unresolved.items.some((w) => w.address)).toBe(true);

  const box = await rectangle(m, a.sheetId);
  const v = await view(m, "", null, a.sheetId);
  const [row] = box.rows;
  const [column] = box.columns;
  if (!row || !column) {
    throw new Error("Missing cell");
  }
  const address = {
    sheetId: a.sheetId,
    rowId: row.rowId,
    columnId: column.columnId,
  };
  expect(m.locate({ ...guard(m), viewId: v.viewId, address }, ctx())).toEqual({
    rowIndex: 0,
    columnIndex: 0,
  });
  expect(
    m.locate(
      {
        ...guard(m),
        viewId: v.viewId,
        address: { ...address, sheetId: b.sheetId },
      },
      ctx()
    )
  ).toBeNull();
  expect(
    m.locate(
      {
        ...guard(m),
        viewId: v.viewId,
        address: { ...address, rowId: T.RowId.make("missing-row") },
      },
      ctx()
    )
  ).toBeNull();
  expect(
    m.locate(
      {
        ...guard(m),
        viewId: v.viewId,
        address: { ...address, columnId: T.ColumnId.make("missing-column") },
      },
      ctx()
    )
  ).toBeNull();
  await expect(
    m.setView(
      {
        ...guard(m),
        sheetId: a.sheetId,
        search: "",
        sort: {
          columnId: T.ColumnId.make("missing-column"),
          direction: "ascending",
        },
      },
      ctx(),
      async () => {}
    )
  ).rejects.toThrow(T.MissingIdentity);

  const headerless = make("a\n1", false);
  const headerlessBox = await rectangle(headerless);
  expect(headerlessBox.columns[0]?.label).toBe("A");
  expect(headerlessBox.columns[0]?.headerValue).toBeNull();
});

it("rejects invalid edits and accepts header and column edits", async () => {
  const m = make("a,b\n1,2\n3,4");
  const [summary] = m.summary().sheets;
  if (!summary?.headerRowId) {
    throw new Error("Missing Sheet");
  }
  const { headerRowId } = summary;
  const box = await rectangle(m);
  const [row] = box.rows;
  const [column, secondColumn] = box.columns;
  if (!row || !column || !secondColumn) {
    throw new Error("Missing cell");
  }
  expect(() =>
    edit(m, {
      _tag: "SetCell",
      address: {
        sheetId: T.SheetId.make("missing-sheet"),
        rowId: row.rowId,
        columnId: column.columnId,
      },
      text: "x",
    })
  ).toThrow(T.MissingIdentity);
  edit(m, {
    _tag: "RevertCell",
    address: {
      sheetId: box.sheetId,
      rowId: headerRowId,
      columnId: column.columnId,
    },
  });
  expect(() =>
    edit(m, {
      _tag: "RevertCell",
      address: {
        sheetId: box.sheetId,
        rowId: headerRowId,
        columnId: T.ColumnId.make("missing-column"),
      },
    })
  ).toThrow(T.MissingIdentity);
  expect(() =>
    edit(m, {
      _tag: "RevertCell",
      address: {
        sheetId: box.sheetId,
        rowId: T.RowId.make("missing-row"),
        columnId: column.columnId,
      },
    })
  ).toThrow(T.MissingIdentity);

  const headerless = make("a\n1", false);
  const [headerlessSheet] = headerless.summary().sheets;
  if (!headerlessSheet) {
    throw new Error("Missing Sheet");
  }
  expect(() =>
    edit(headerless, {
      _tag: "RenameHeader",
      sheetId: headerlessSheet.sheetId,
      columnId: T.ColumnId.make("missing"),
      text: "x",
    })
  ).toThrow(T.InvalidRequest);
  expect(() =>
    edit(m, {
      _tag: "RenameHeader",
      sheetId: box.sheetId,
      columnId: T.ColumnId.make("missing-column"),
      text: "x",
    })
  ).toThrow(T.InvalidRequest);
  expect(() =>
    edit(m, {
      _tag: "InsertRows",
      sheetId: box.sheetId,
      before: null,
      count: 0,
    })
  ).toThrow(T.InvalidRequest);
  const empty = make("");
  const [emptySheet] = empty.summary().sheets;
  if (!emptySheet) {
    throw new Error("Missing Sheet");
  }
  expect(() =>
    edit(empty, {
      _tag: "InsertRows",
      sheetId: emptySheet.sheetId,
      before: null,
      count: 1,
    })
  ).toThrow(T.InvalidRequest);
  expect(() =>
    edit(m, {
      _tag: "InsertRows",
      sheetId: box.sheetId,
      before: T.RowId.make("missing-row"),
      count: 1,
    })
  ).toThrow(T.MissingIdentity);
  expect(() =>
    edit(m, {
      _tag: "InsertColumns",
      sheetId: box.sheetId,
      before: T.ColumnId.make("missing-column"),
      count: 1,
    })
  ).toThrow(T.MissingIdentity);
  edit(m, {
    _tag: "InsertColumns",
    sheetId: box.sheetId,
    before: secondColumn.columnId,
    count: 1,
  });
  expect(() =>
    edit(m, {
      _tag: "DeleteRows",
      sheetId: box.sheetId,
      rowIds: [],
    })
  ).toThrow(T.InvalidRequest);
  expect(() =>
    edit(m, {
      _tag: "DeleteRows",
      sheetId: box.sheetId,
      rowIds: [row.rowId, row.rowId],
    })
  ).toThrow(T.InvalidRequest);
  expect(() =>
    edit(m, {
      _tag: "DeleteColumns",
      sheetId: box.sheetId,
      columnIds: [T.ColumnId.make("missing-column")],
    })
  ).toThrow(T.MissingIdentity);
  expect(() =>
    edit(m, {
      _tag: "DeleteColumns",
      sheetId: box.sheetId,
      columnIds: [secondColumn.columnId],
    })
  ).not.toThrow();

  const pasteModel = make("a,b\n1,2");
  const pasteBox = await rectangle(pasteModel);
  const pasteView = await view(pasteModel);
  const [pasteRow] = pasteBox.rows;
  const [pasteColumn] = pasteBox.columns;
  if (!pasteRow || !pasteColumn) {
    throw new Error("Missing cell");
  }
  expect(() =>
    edit(pasteModel, {
      _tag: "Paste",
      sheetId: pasteBox.sheetId,
      viewId: pasteView.viewId,
      rowIds: [],
      columnIds: [pasteColumn.columnId],
      values: [],
    })
  ).toThrow(T.InvalidPaste);
  expect(() =>
    edit(pasteModel, {
      _tag: "Paste",
      sheetId: pasteBox.sheetId,
      viewId: pasteView.viewId,
      rowIds: [pasteRow.rowId, pasteRow.rowId],
      columnIds: [pasteColumn.columnId],
      values: [["x"], ["y"]],
    })
  ).toThrow(T.InvalidPaste);

  const clean = make("a\n1");
  expect(edit(clean, { _tag: "RevertAll" }).editId).toBeNull();
  expect(() =>
    clean.history({ ...guard(clean), direction: "undo" }, ctx())
  ).toThrow(T.HistoryEmpty);
  const deleted = make("a\n1");
  const deletedBox = await rectangle(deleted);
  edit(deleted, {
    _tag: "DeleteColumns",
    sheetId: deletedBox.sheetId,
    columnIds: deletedBox.columns.map((c) => c.columnId),
  });
  expect(edit(deleted, { _tag: "RevertAll" }).focus).toMatchObject({
    rowId: null,
    columnId: null,
  });
});

it("plans every export scope and rejects invalid options", async () => {
  const m = make("a,b\n1,2");
  const [sheet] = m.summary().sheets;
  if (!sheet) {
    throw new Error("Missing Sheet");
  }
  const invalid = [
    { ...options(sheet.sheetId, "csv"), delimiter: "\t" as const },
    { ...options(sheet.sheetId, "tsv"), delimiter: "," as const },
    { ...options(sheet.sheetId, "clipboard"), bom: true },
    { ...options(sheet.sheetId, "json"), bom: true },
    {
      ...options(sheet.sheetId, "csv"),
      scope: { _tag: "WholeWorkbook" as const },
    },
  ];
  for (const settings of invalid) {
    expect(() =>
      m.planExport(
        { ...guard(m), requestId: ctx().requestId, options: settings },
        ctx()
      )
    ).toThrow(T.InvalidRequest);
  }
  const arrays = output(m, {
    ...options(sheet.sheetId, "json"),
    jsonShape: "arrays",
  });
  expect(arrays.plan.jsonReason).toBe("user-arrays");

  const headerless = make("a,b\n1,2", false);
  const [headerlessSheet] = headerless.summary().sheets;
  if (!headerlessSheet) {
    throw new Error("Missing Sheet");
  }
  const headersOff = output(
    headerless,
    options(headerlessSheet.sheetId, "json")
  );
  expect(headersOff.plan.jsonReason).toBe("headers-off");
  expect(
    output(headerless, options(headerlessSheet.sheetId, "xlsx")).bytes.length
  ).toBeGreaterThan(0);

  const currentView = await view(m);
  const multiBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    multiBook,
    XLSX.utils.aoa_to_sheet([["a"], ["1"]]),
    "One"
  );
  XLSX.utils.book_append_sheet(
    multiBook,
    XLSX.utils.aoa_to_sheet([["b"], ["2"]]),
    "Two"
  );
  const multiBytes = new Uint8Array(
    XLSX.write(multiBook, { type: "array", bookType: "xlsx" })
  );
  const multi = new TabularModel(
    parseFile(
      { name: "multi.xlsx", bytes: multiBytes, size: multiBytes.length },
      T.defaultParseOptions,
      ctx()
    ),
    T.CandidateId.make("multi")
  );
  const [firstSheet, secondSheet] = multi.summary().sheets;
  if (!firstSheet || !secondSheet) {
    throw new Error("Missing Sheets");
  }
  const firstView = await view(multi, "", null, firstSheet.sheetId);
  expect(() =>
    multi.planExport(
      {
        ...guard(multi),
        requestId: ctx().requestId,
        options: {
          ...options(secondSheet.sheetId, "csv"),
          scope: {
            _tag: "CurrentView",
            sheetId: secondSheet.sheetId,
            viewId: firstView.viewId,
          },
        },
      },
      ctx()
    )
  ).toThrow(T.StaleView);

  const hiddenBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    hiddenBook,
    XLSX.utils.aoa_to_sheet([["a"], ["1"]]),
    "Hidden"
  );
  hiddenBook.Workbook = { Sheets: [{ name: "Hidden", Hidden: 1 }] };
  const hiddenBytes = new Uint8Array(
    XLSX.write(hiddenBook, { type: "array", bookType: "xlsx" })
  );
  const hidden = new TabularModel(
    parseFile(
      { name: "hidden.xlsx", bytes: hiddenBytes, size: hiddenBytes.length },
      T.defaultParseOptions,
      ctx()
    ),
    T.CandidateId.make("hidden")
  );
  const [hiddenSheet] = hidden.summary().sheets;
  if (!hiddenSheet) {
    throw new Error("Missing Sheet");
  }
  const hiddenPlan = hidden.planExport(
    {
      ...guard(hidden),
      requestId: ctx().requestId,
      options: {
        ...options(hiddenSheet.sheetId, "xlsx"),
        scope: { _tag: "WholeWorkbook" },
      },
    },
    ctx()
  );
  expect(hiddenPlan.warnings).toContainEqual({
    code: "all-hidden-output",
    count: 1,
  });
  expect(hiddenPlan.sheets[0]?.visibility).toBe("visible");
  const hiddenOutput = hidden.exportJob(
    {
      ...guard(hidden),
      planId: hiddenPlan.planId,
      acknowledgeValuesOnly: true,
    },
    ctx()
  );
  expect(hiddenOutput.filename.endsWith(".xlsx")).toBe(true);

  expect(() =>
    m.exportJob(
      {
        ...guard(m),
        planId: output(m, options(sheet.sheetId, "xlsx")).plan.planId,
        acknowledgeValuesOnly: false,
      },
      ctx()
    )
  ).toThrow(T.InvalidRequest);

  const longName = parseFile(source("a\n1"), T.defaultParseOptions, ctx());
  const renamed = new TabularModel(
    {
      ...longName,
      sheets: longName.sheets.map((s) => ({ ...s, name: "x".repeat(32) })),
    },
    T.CandidateId.make("long-name")
  );
  const [renamedSheet] = renamed.summary().sheets;
  if (!renamedSheet) {
    throw new Error("Missing Sheet");
  }
  const limited = renamed.planExport(
    {
      ...guard(renamed),
      requestId: ctx().requestId,
      options: {
        ...options(renamedSheet.sheetId, "xlsx"),
        scope: { _tag: "WholeWorkbook" },
      },
    },
    ctx()
  );
  expect(limited.blockedBy[0]).toMatchObject({
    _tag: "FormatLimit",
    dimension: "sheet-name",
  });

  const viewOutput = output(m, {
    ...options(sheet.sheetId, "csv"),
    scope: {
      _tag: "CurrentView",
      sheetId: sheet.sheetId,
      viewId: currentView.viewId,
    },
  });
  expect(viewOutput.plan.planId).toBe(viewOutput.plan.planId);
  const viewJob = m.exportJob(
    {
      ...guard(m),
      planId: viewOutput.plan.planId,
      acknowledgeValuesOnly: false,
    },
    ctx()
  );
  expect(viewJob.filename).toContain("-view.csv");

  const cleaned = new TabularModel(
    parseFile(
      { name: "   .csv", bytes: new TextEncoder().encode("a\n1"), size: 3 },
      T.defaultParseOptions,
      ctx()
    ),
    T.CandidateId.make("cleaned")
  );
  const [cleanedSheet] = cleaned.summary().sheets;
  if (!cleanedSheet) {
    throw new Error("Missing Sheet");
  }
  const cleanedPlan = cleaned.planExport(
    {
      ...guard(cleaned),
      requestId: ctx().requestId,
      options: options(cleanedSheet.sheetId, "csv"),
    },
    ctx()
  );
  expect(
    cleaned.exportJob(
      {
        ...guard(cleaned),
        planId: cleanedPlan.planId,
        acknowledgeValuesOnly: false,
      },
      ctx()
    ).filename
  ).toBe("tabular-Sheet1-sheet.csv");
});

const splitOptions = (sheetId: T.SheetId, rowsPerPart = 2): T.SplitOptions => ({
  sheetId,
  rowsPerPart,
  delimiter: ",",
  newline: "lf",
  bom: false,
  locale: "en-US",
});

describe("CSV Split", () => {
  it.effect("repeats the header and keeps an edit in its Part", () =>
    Effect.gen(function* () {
      const m = make("name,value\na,1\nb,2\nc,3\nd,4\ne,5");
      const [sheet] = m.summary().sheets;
      if (!sheet) {
        throw new Error("Missing Sheet");
      }
      const box = yield* Effect.promise(() => rectangle(m));
      const [, row] = box.rows;
      const [, column] = box.columns;
      if (!row || !column) {
        throw new Error("Missing cell");
      }
      edit(m, {
        _tag: "SetCell",
        address: {
          sheetId: sheet.sheetId,
          rowId: row.rowId,
          columnId: column.columnId,
        },
        text: "20",
      });
      const prepared = m.splitJob(
        {
          ...guard(m),
          options: splitOptions(sheet.sheetId, 2),
          acknowledgeValuesOnly: false,
        },
        ctx()
      );
      expect(prepared.dataRows).toBe(5);
      expect(prepared.jobs.map((entry) => entry.rows)).toEqual([2, 2, 1]);
      expect(prepared.jobs.map((entry) => entry.filename)).toEqual([
        "data-part-1-of-3.csv",
        "data-part-2-of-3.csv",
        "data-part-3-of-3.csv",
      ]);
      const parts = prepared.jobs.map((entry) =>
        new TextDecoder().decode(writeOutput(entry.job, ctx()))
      );
      expect(parts[0]).toBe("name,value\na,1\nb,20\n");
      expect(parts[2]).toBe("name,value\ne,5\n");
      expect(prepared.zipName).toBe("data-split.zip");
    })
  );

  it("blocks a Part when the Sheet has unresolved values", () => {
    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([["name"], ["one"]]);
    Object.assign(sheet, {
      A2: { t: "n", f: "1+1" },
    });
    XLSX.utils.book_append_sheet(book, sheet, "Data");
    const bytes = new Uint8Array(
      XLSX.write(book, { type: "array", bookType: "xlsx" })
    );
    const m = new TabularModel(
      parseFile(
        { name: "unresolved.xlsx", bytes, size: bytes.length },
        T.defaultParseOptions,
        ctx()
      ),
      T.CandidateId.make("split-unresolved")
    );
    const [summary] = m.summary().sheets;
    if (!summary) {
      throw new Error("Missing Sheet");
    }
    expect(() =>
      m.splitJob(
        {
          ...guard(m),
          options: splitOptions(summary.sheetId, 1),
          acknowledgeValuesOnly: true,
        },
        ctx()
      )
    ).toThrow(T.UnresolvedValues);
  });

  it("requires the values-only acknowledgement for a workbook", () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([["a"], ["1"]]),
      "Data"
    );
    const bytes = new Uint8Array(
      XLSX.write(book, { type: "array", bookType: "xlsx" })
    );
    const m = new TabularModel(
      parseFile(
        { name: "values.xlsx", bytes, size: bytes.length },
        T.defaultParseOptions,
        ctx()
      ),
      T.CandidateId.make("split-values")
    );
    const [summary] = m.summary().sheets;
    if (!summary) {
      throw new Error("Missing Sheet");
    }
    expect(() =>
      m.splitJob(
        {
          ...guard(m),
          options: splitOptions(summary.sheetId, 1),
          acknowledgeValuesOnly: false,
        },
        ctx()
      )
    ).toThrow(T.InvalidRequest);
  });

  it("rejects an empty Sheet and a tab delimiter", () => {
    const empty = make("a,b");
    const [emptySheet] = empty.summary().sheets;
    if (!emptySheet) {
      throw new Error("Missing Sheet");
    }
    expect(() =>
      empty.splitJob(
        {
          ...guard(empty),
          options: splitOptions(emptySheet.sheetId, 2),
          acknowledgeValuesOnly: false,
        },
        ctx()
      )
    ).toThrow(T.InvalidRequest);

    const text = make("a,b\n1,2");
    const [textSheet] = text.summary().sheets;
    if (!textSheet) {
      throw new Error("Missing Sheet");
    }
    expect(() =>
      text.splitJob(
        {
          ...guard(text),
          options: { ...splitOptions(textSheet.sheetId, 2), delimiter: "\t" },
          acknowledgeValuesOnly: false,
        },
        ctx()
      )
    ).toThrow(T.InvalidRequest);
  });
});

it("reads the active Sheet as a Merge Source with edits", async () => {
  const m = make("a,b\n1,2\n3,4");
  const [summary] = m.summary().sheets;
  if (!summary) {
    throw new Error("Missing Sheet");
  }
  const box = await rectangle(m, summary.sheetId);
  const [row] = box.rows;
  const [column] = box.columns;
  if (!row || !column) {
    throw new Error("Missing cell");
  }
  edit(m, {
    _tag: "SetCell",
    address: {
      sheetId: summary.sheetId,
      rowId: row.rowId,
      columnId: column.columnId,
    },
    text: "ONE",
  });
  const merged = m.mergeSheet(
    T.MergeSourceId.make("merge-source"),
    summary.sheetId,
    ctx()
  );
  expect(merged.origin).toBe("session");
  expect(merged.header).toEqual([
    { _tag: "Text", text: "a" },
    { _tag: "Text", text: "b" },
  ]);
  expect(merged.rows[0]?.[0]).toEqual({ _tag: "Text", text: "ONE" });
  expect(merged.rows[1]?.[0]).toEqual({ _tag: "Text", text: "3" });
  expect(merged.columns).toBe(2);
});

it("recounts unresolved cells after a structural edit", () => {
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([["name"], ["one"], ["two"]]);
  Object.assign(sheet, {
    A1: { t: "n", f: "1+1" },
    A3: { t: "n", f: "2+2" },
  });
  XLSX.utils.book_append_sheet(book, sheet, "Data");
  const bytes = new Uint8Array(
    XLSX.write(book, { type: "array", bookType: "xlsx" })
  );
  const m = new TabularModel(
    parseFile(
      { name: "recount.xlsx", bytes, size: bytes.length },
      T.defaultParseOptions,
      ctx()
    ),
    T.CandidateId.make("recount")
  );
  const [summary] = m.summary().sheets;
  if (!summary) {
    throw new Error("Missing Sheet");
  }
  expect(summary.unresolvedCount).toBeGreaterThan(0);
  edit(m, {
    _tag: "InsertRows",
    sheetId: summary.sheetId,
    before: null,
    count: 1,
  });
  expect(m.summary().sheets[0]?.unresolvedCount).toBe(summary.unresolvedCount);
});
