/* oxlint-disable anti-slop/no-chained-type-assertions, anti-slop/require-safety-comment-for-type-assertion -- The tests forge one non-value tag and decode a sparse parsed file. */
import { describe, expect, it } from "vitest";

import * as T from "./tabular";
import {
  buildDiffPlan,
  diffFileName,
  diffPage,
  diffReportRows,
  diffSheetFromFile,
  diffSourceReport,
} from "./tabular.diff";
import type { DiffSheet } from "./tabular.diff";
import { parseFile } from "./tabular.format";

const text = (value: string): T.Value => ({ _tag: "Text", text: value });
const number = (value: number): T.Value => ({ _tag: "Number", value });
const blank: T.Value = { _tag: "Blank" };
let serial = 0;
const sheet = (overrides: Partial<DiffSheet> = {}): DiffSheet => ({
  name: `data-${(serial += 1)}.csv`,
  sheetName: "data",
  format: "csv",
  header: [text("id"), text("name")],
  rows: [[text("1"), text("Ada")]],
  columns: 2,
  unresolved: 0,
  workbook: false,
  ...overrides,
});
const options = (
  keys: readonly string[] = ["id"],
  direction: T.DiffDirection = "forward"
): T.DiffOptions => ({
  sheetId: T.SheetId.make("sheet"),
  sourceId: T.DiffSourceId.make("source"),
  sheetName: "data",
  direction,
  keys,
});

describe("Diff plan", () => {
  it("reports added, removed, changed, and unchanged rows by key", () => {
    const before = sheet({
      header: [text("id"), text("name"), text("price")],
      rows: [
        [text("1"), text("Ada"), text("10")],
        [text("2"), text("Bob"), text("20")],
        [text("3"), text("Cyd"), text("30")],
      ],
      columns: 3,
    });
    const after = sheet({
      header: [text("id"), text("name"), text("price")],
      rows: [
        [text("1"), text("Ada"), text("10")],
        [text("3"), text("Cyd"), text("31")],
        [text("4"), text("Dee"), text("40")],
      ],
      columns: 3,
    });
    const { plan, rows } = buildDiffPlan(before, after, options());
    expect(plan.counts).toEqual({
      added: 1,
      removed: 1,
      changed: 1,
      unchanged: 1,
    });
    expect(plan.keys).toEqual(["id"]);
    expect(plan.columns).toEqual(["name", "price"]);
    expect(rows.added.map((row) => row.key)).toEqual([["4"]]);
    expect(rows.removed.map((row) => row.key)).toEqual([["2"]]);
    expect(rows.changed.map((row) => row.key)).toEqual([["3"]]);
    expect(rows.changed[0]?.changes).toEqual([
      {
        column: "price",
        before: "30",
        after: "31",
        beforeBlank: false,
        afterBlank: false,
      },
    ]);
    expect(rows.changed[0]?.before).toEqual(["3", "Cyd", "30"]);
    expect(rows.changed[0]?.after).toEqual(["3", "Cyd", "31"]);
    expect(rows.added[0]?.before).toBeNull();
    expect(rows.removed[0]?.after).toBeNull();
  });

  it("matches a composite key and ignores key order changes", () => {
    const before = sheet({
      header: [text("id"), text("country"), text("value")],
      rows: [
        [text("1"), text("ID"), text("a")],
        [text("1"), text("SG"), text("b")],
      ],
      columns: 3,
    });
    const after = sheet({
      header: [text("country"), text("id"), text("value")],
      rows: [
        [text("SG"), text("1"), text("b")],
        [text("ID"), text("1"), text("a")],
      ],
      columns: 3,
    });
    const result = buildDiffPlan(before, after, options(["id", "country"]));
    expect(result.plan.counts).toEqual({
      added: 0,
      removed: 0,
      changed: 0,
      unchanged: 2,
    });
  });

  it("uses typed values for equality", () => {
    const before = sheet({
      header: [text("id"), text("value"), text("note")],
      rows: [
        [number(1), number(10), text(" a ")],
        [number(2), text("1"), text("")],
        [number(3), blank, text("")],
      ],
      columns: 3,
      workbook: true,
      format: "xlsx",
    });
    const after = sheet({
      header: [text("id"), text("value"), text("note")],
      rows: [
        [number(1), number(10), text("a")],
        [number(2), text("1.0"), text("")],
        [number(3), text(""), text("")],
      ],
      columns: 3,
      workbook: true,
      format: "xlsx",
    });
    const { plan, rows } = buildDiffPlan(before, after, options());
    expect(plan.counts).toEqual({
      added: 0,
      removed: 0,
      changed: 2,
      unchanged: 1,
    });
    expect(rows.changed[0]?.key).toEqual(["2"]);
    expect(rows.changed[0]?.changes[0]).toMatchObject({
      column: "value",
      before: "1",
      after: "1.0",
    });
  });

  it("blocks a repeated key or a blank key value", () => {
    const repeated = buildDiffPlan(
      sheet({
        rows: [
          [text("1"), text("Ada")],
          [text("1"), text("Bob")],
        ],
      }),
      sheet(),
      options()
    );
    expect(repeated.plan.counts).toBeNull();
    expect(repeated.plan.key.duplicateBefore).toBe(1);
    expect(repeated.plan.key.valid).toBe(false);
    const blankKey = buildDiffPlan(
      sheet({ rows: [[text(""), text("Ada")]] }),
      sheet(),
      options()
    );
    expect(blankKey.plan.counts).toBeNull();
    expect(blankKey.plan.key.blankBefore).toBe(1);
    expect(blankKey.plan.key.valid).toBe(false);
  });

  it("requires a chosen key and reports a missing key", () => {
    const noKey = buildDiffPlan(sheet(), sheet(), options([]));
    expect(noKey.plan.key.valid).toBe(false);
    expect(noKey.plan.counts).toBeNull();
    const missing = buildDiffPlan(sheet(), sheet(), options(["email"]));
    expect(missing.plan.key.missing).toEqual(["email"]);
    expect(missing.plan.counts).toBeNull();
  });

  it("matches folded headers and reports one-sided columns", () => {
    const before = sheet({
      header: [text("ID"), text("Name"), text("Old")],
      rows: [[text("1"), text("Ada"), text("x")]],
      columns: 3,
    });
    const after = sheet({
      header: [text("id"), text("NAME"), text("New")],
      rows: [[text("1"), text("Ada"), text("y")]],
      columns: 3,
    });
    const { plan } = buildDiffPlan(before, after, options(["ID"]));
    expect(plan.shared).toEqual(["ID", "Name"]);
    expect(plan.columns).toEqual(["Name"]);
    expect(plan.oneSidedBefore).toEqual(["Old"]);
    expect(plan.oneSidedAfter).toEqual(["New"]);
    expect(plan.counts).toEqual({
      added: 0,
      removed: 0,
      changed: 0,
      unchanged: 1,
    });
  });

  it("reports a key-only Diff and blank or repeated headers", () => {
    const keyOnly = buildDiffPlan(
      sheet({ header: [text("id")], rows: [[text("1")]], columns: 1 }),
      sheet({ header: [text("id")], rows: [[text("1")]], columns: 1 }),
      options()
    );
    expect(keyOnly.plan.columns).toEqual([]);
    expect(keyOnly.plan.counts).toEqual({
      added: 0,
      removed: 0,
      changed: 0,
      unchanged: 1,
    });
    const badHeader = buildDiffPlan(
      sheet({
        header: [text("id"), text("")],
        rows: [[text("1"), text("Ada")]],
      }),
      sheet({ header: [text("id"), text("name")] }),
      options()
    );
    expect(badHeader.plan.before.header.valid).toBe(false);
    expect(badHeader.plan.before.header.blank).toBe(1);
    expect(badHeader.plan.counts).toBeNull();
    const duplicate = buildDiffPlan(
      sheet({ header: [text("id"), text("id")], columns: 2 }),
      sheet(),
      options()
    );
    expect(duplicate.plan.before.header.valid).toBe(false);
    expect(duplicate.plan.before.header.duplicates).toEqual(["id"]);
  });

  it("blocks unresolved values", () => {
    const { plan } = buildDiffPlan(
      sheet(),
      sheet({
        unresolved: 1,
        rows: [
          [
            text("1"),
            { _tag: "Unresolved", reason: "formula-error", display: "#ERR" },
          ],
        ],
      }),
      options()
    );
    expect(plan.counts).toBeNull();
    expect(plan.after.unresolved).toBe(1);
  });

  it("pages each filter and keeps Added before Removed and Changed", () => {
    const before = sheet({
      header: [text("id"), text("name")],
      rows: [
        [text("1"), text("Ada")],
        [text("2"), text("Bob")],
        [text("3"), text("Cyd")],
      ],
    });
    const after = sheet({
      header: [text("id"), text("name")],
      rows: [
        [text("1"), text("Ada")],
        [text("3"), text("Cyd2")],
        [text("4"), text("Dee")],
      ],
    });
    const data = buildDiffPlan(before, after, options());
    const planId = T.DiffPlanId.make("plan");
    const page = diffPage(planId, data, "all", 0, 2);
    expect(page.total).toBe(3);
    expect(page.items.map((row) => row.status)).toEqual(["added", "removed"]);
    expect(page.nextOffset).toBe(2);
    const next = diffPage(planId, data, "all", 2, 2);
    expect(next.items.map((row) => row.status)).toEqual(["changed"]);
    expect(next.nextOffset).toBeNull();
    expect(diffPage(planId, data, "changed", 0, 10).items).toHaveLength(1);
  });

  it("writes a report with folded After columns and one row per difference", () => {
    const before = sheet({
      header: [text("ID"), text("Price")],
      rows: [
        [text("1"), text("10")],
        [text("2"), text("20")],
      ],
    });
    const after = sheet({
      header: [text("id"), text("PRICE")],
      rows: [
        [text("1"), text("12")],
        [text("3"), text("30")],
      ],
    });
    const data = buildDiffPlan(before, after, options(["ID"]));
    const rows = diffReportRows(data);
    expect(rows[0]).toEqual([
      text("status"),
      text("ID"),
      text("changed_columns"),
      text("Price (before)"),
      text("Price (after)"),
    ]);
    expect(rows[1]).toEqual([
      text("added"),
      text("3"),
      text(""),
      blank,
      text("30"),
    ]);
    expect(rows[2]).toEqual([
      text("removed"),
      text("2"),
      text(""),
      text("20"),
      blank,
    ]);
    expect(rows[3]).toEqual([
      text("changed"),
      text("1"),
      text("Price"),
      text("10"),
      text("12"),
    ]);
  });
});

describe("Diff file names", () => {
  it("uses the After stem and a diff suffix", () => {
    expect(diffFileName("data.csv")).toBe("data-diff.csv");
    expect(diffFileName("data")).toBe("data-diff.csv");
    const name = diffFileName(`${"a".repeat(300)}.csv`);
    expect(name.length).toBeLessThanOrEqual(120);
    expect(name.endsWith("-diff.csv")).toBe(true);
  });
});

describe("Diff value and shape guards", () => {
  it("compares Boolean and Unresolved values and reports unknown tags", () => {
    const unknownBefore = { _tag: "Nope", value: 1 } as unknown as T.Value;
    const unknownAfter = { _tag: "Nope", value: 2 } as unknown as T.Value;
    const before = sheet({
      header: [text("id"), text("flag"), text("formula"), text("odd")],
      rows: [
        [
          text("1"),
          { _tag: "Boolean", value: true },
          { _tag: "Unresolved", reason: "formula-error", display: "#ERR" },
          unknownBefore,
        ],
      ],
      columns: 4,
    });
    const after = sheet({
      header: [text("id"), text("flag"), text("formula"), text("odd")],
      rows: [
        [
          text("1"),
          { _tag: "Boolean", value: false },
          {
            _tag: "Unresolved",
            reason: "missing-formula-result",
            display: "#N/A",
          },
          unknownAfter,
        ],
      ],
      columns: 4,
    });
    const { plan, rows } = buildDiffPlan(before, after, options());
    expect(plan.counts).toEqual({
      added: 0,
      removed: 0,
      changed: 1,
      unchanged: 0,
    });
    expect(rows.changed[0]?.changes.map((change) => change.column)).toEqual([
      "flag",
      "formula",
      "odd",
    ]);
  });

  it("handles a missing header and a header shorter than the columns", () => {
    const headerless = buildDiffPlan(
      sheet({ header: null, columns: 2 }),
      sheet({ header: null, columns: 2 }),
      options(["id"])
    );
    expect(headerless.plan.before.header.present).toBe(false);
    expect(headerless.plan.keys).toEqual([]);
    const short = buildDiffPlan(
      sheet({ header: [text("id")], rows: [[text("1")]], columns: 3 }),
      sheet({ header: [text("id")], rows: [[text("1")]], columns: 3 }),
      options(["id"])
    );
    expect(short.plan.before.columns).toEqual(["id", "", ""]);
    expect(short.plan.before.header.valid).toBe(false);
    expect(short.plan.counts).toBeNull();
  });

  it("keeps a valid key while a non-key cell is absent", () => {
    const before = sheet({
      header: [text("id"), text("name")],
      rows: [[text("1")]],
      columns: 2,
    });
    const after = sheet({
      header: [text("id"), text("name")],
      rows: [[text("1"), text("Ada")], [text("2")]],
      columns: 2,
    });
    const removed = buildDiffPlan(before, after, options());
    expect(removed.plan.counts).toEqual({
      added: 1,
      removed: 0,
      changed: 1,
      unchanged: 0,
    });
    expect(removed.rows.changed[0]?.before).toEqual(["1", ""]);
    expect(removed.rows.added[0]?.after).toEqual(["2", ""]);
    const backward = buildDiffPlan(after, before, options());
    expect(backward.rows.removed[0]?.before).toEqual(["2", ""]);
  });

  it("ignores a repeated requested key and counts a short key row", () => {
    const repeated = buildDiffPlan(sheet(), sheet(), options(["id", "ID"]));
    expect(repeated.plan.keys).toEqual(["id"]);
    const short = buildDiffPlan(
      sheet({ rows: [[text("1")], []] }),
      sheet(),
      options()
    );
    expect(short.plan.counts).toBeNull();
    expect(short.plan.key.blankBefore).toBe(1);
  });

  it("reads a parsed file with missing sheets, short rows, and no delimiter", () => {
    const bytes = new TextEncoder().encode("id,name\n1,Ada");
    const parsed = parseFile(
      { name: "parsed.csv", bytes, size: bytes.length },
      T.defaultParseOptions,
      {
        requestId: T.RequestId.make("diff-parse"),
        operation: "test",
        sessionId: null,
      }
    );
    const ctx = {
      requestId: T.RequestId.make("diff-file"),
      operation: "test",
      sessionId: null,
    };
    const [sheetOne] = parsed.sheets;
    if (!sheetOne) {
      throw new Error("Missing Sheet");
    }
    const sparse = {
      ...parsed,
      delimiter: null,
      sheets: [
        {
          ...sheetOne,
          rows: [
            ...sheetOne.rows,
            [
              {
                value: {
                  _tag: "Unresolved" as const,
                  reason: "formula-error" as const,
                  display: "#ERR",
                },
                origin: "stored-formula" as const,
              },
            ],
          ],
        },
      ],
    };
    const fromFile = diffSheetFromFile(sparse, sheetOne.name, ctx);
    expect(fromFile.unresolved).toBe(1);
    expect(fromFile.rows.length).toBe(2);
    expect(diffSheetFromFile(sparse, sheetOne.name, ctx).header).toHaveLength(
      2
    );
    expect(() => diffSheetFromFile(parsed, "missing", ctx)).toThrow(
      T.InvalidRequest
    );
    const empty = {
      ...parsed,
      sheets: [{ ...sheetOne, rows: [] }],
    };
    expect(diffSheetFromFile(empty, sheetOne.name, ctx).header).toBeNull();
    const report = diffSourceReport(T.DiffSourceId.make("source"), sparse);
    expect(report.delimiter).toBeNull();
    expect(report.sheets[0]?.unresolved).toBe(1);
    expect(report.sheets[0]?.header).toBe(true);
    const workbook = diffSourceReport(T.DiffSourceId.make("source"), {
      ...sparse,
      format: "xlsx",
      delimiter: {
        value: ";",
        basis: "user",
        ambiguous: false,
        alternatives: [],
      },
      sheets: [{ ...sheetOne, rows: [] }],
    });
    expect(workbook.workbook).toBe(true);
    expect(workbook.delimiter).toBe(";");
    expect(workbook.sheets[0]?.header).toBe(false);
  });

  it("renders a forged report with an absent column and a short value list", () => {
    const data = buildDiffPlan(sheet(), sheet(), options());
    const forged = {
      plan: {
        ...data.plan,
        counts: { added: 1, removed: 0, changed: 0, unchanged: 0 },
        columns: ["id", "Ghost"],
        before: { ...data.plan.before, columns: ["id"] },
        after: { ...data.plan.after, columns: ["id", "Ghost"] },
      },
      rows: {
        added: [
          {
            status: "added" as const,
            key: ["9"],
            before: null,
            after: ["9"],
            changes: [],
          },
        ],
        removed: [],
        changed: [],
      },
    };
    const report = diffReportRows(forged);
    expect(report[1]?.slice(0, 3)).toEqual([
      text("added"),
      text("9"),
      text(""),
    ]);
    expect(report[1]?.at(-2)).toEqual(blank);
    expect(report[1]?.at(-1)).toEqual(text(""));
  });
});
