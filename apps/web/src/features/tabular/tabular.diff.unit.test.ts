import { describe, expect, it } from "vitest";

import * as T from "./tabular";
import {
  buildDiffPlan,
  diffFileName,
  diffPage,
  diffReportRows,
} from "./tabular.diff";
import type { DiffSheet } from "./tabular.diff";

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
