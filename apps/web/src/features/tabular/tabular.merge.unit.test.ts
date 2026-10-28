import { describe, expect, it } from "vitest";

import * as T from "./tabular";
import type { FailureContext } from "./tabular.format";
import { buildMergePlan, foldHeader, mergeFileName } from "./tabular.merge";
import type { MergeSheet } from "./tabular.merge";

const ctx = (): FailureContext => ({
  requestId: T.RequestId.make("merge-test"),
  operation: "planMerge",
  sessionId: null,
});
const text = (value: string): T.Value => ({ _tag: "Text", text: value });
const blank: T.Value = { _tag: "Blank" };
let serial = 0;
const source = (overrides: Partial<MergeSheet> = {}): MergeSheet => ({
  sourceId: T.MergeSourceId.make(`merge-source-${(serial += 1)}`),
  name: "data.csv",
  sheetName: "data",
  origin: "file",
  format: "csv",
  size: 10,
  header: [text("a"), text("b")],
  rows: [[text("1"), text("2")]],
  columns: 2,
  unresolved: 0,
  delimiter: ",",
  newline: "lf",
  bom: false,
  warnings: [],
  ...overrides,
});
const options = (overrides: Partial<T.MergeOptions> = {}): T.MergeOptions => ({
  header: true,
  delimiter: ",",
  newline: "lf",
  bom: false,
  locale: "en-US",
  ...overrides,
});

describe("Merge file names", () => {
  it("restores the stem of a Split Part", () => {
    expect(mergeFileName("data-part-01-of-12.csv")).toBe("data-merged.csv");
    expect(mergeFileName("data-part-3-of-3.csv")).toBe("data-merged.csv");
    expect(mergeFileName("report-Q1-part-2-of-4.csv")).toBe(
      "report-Q1-merged.csv"
    );
  });

  it("uses a general first source and clamps the name", () => {
    expect(mergeFileName("data.csv")).toBe("data-merged.csv");
    expect(mergeFileName("data")).toBe("data-merged.csv");
    const name = mergeFileName(`${"a".repeat(300)}.csv`);
    expect(name.length).toBeLessThanOrEqual(120);
    expect(name.endsWith(".csv")).toBe(true);
  });

  it("folds case and outer spaces for header matching", () => {
    expect(foldHeader("  Email ")).toBe("email");
    expect(foldHeader("EMAIL")).toBe("email");
    expect(foldHeader("E mail")).not.toBe("email");
  });
});

describe("Merge column alignment", () => {
  it("joins header columns across sources in first-appearance order", () => {
    const a = source({
      name: "a.csv",
      header: [text("Name"), text("Email")],
      rows: [[text("Ada"), text("ada@example.com")]],
    });
    const b = source({
      name: "b.csv",
      header: [text("email"), text("Phone")],
      rows: [[text("bob@example.com"), text("123")]],
    });
    const { plan, rows, headerRow } = buildMergePlan([a, b], options(), ctx());
    expect(plan.positional).toBe(false);
    expect(plan.columns).toEqual(["Name", "Email", "Phone"]);
    expect(plan.totalRows).toBe(2);
    expect(plan.totalColumns).toBe(3);
    expect(plan.blankCells).toBe(2);
    expect(headerRow).toEqual([text("Name"), text("Email"), text("Phone")]);
    expect(rows).toEqual([
      [text("Ada"), text("ada@example.com"), blank],
      [blank, text("bob@example.com"), text("123")],
    ]);
    expect(plan.sources.map((entry) => entry.matchedColumns)).toEqual([0, 1]);
    expect(plan.sources.map((entry) => entry.newColumns)).toEqual([2, 1]);
  });

  it("falls back to position for a duplicate header", () => {
    const a = source({
      header: [text("a"), text("a")],
      rows: [[text("1"), text("2")]],
    });
    const b = source({
      header: [text("a"), text("a")],
      rows: [[text("3"), text("4")]],
    });
    const { plan, headerRow } = buildMergePlan([a, b], options(), ctx());
    expect(plan.positional).toBe(true);
    expect(plan.columns).toEqual(["a", "a"]);
    expect(plan.totalColumns).toBe(2);
    expect(headerRow).toEqual([text("a"), text("a")]);
  });

  it("falls back to position for a blank header", () => {
    const a = source({
      header: [text("a"), text("")],
      rows: [[text("1"), text("2")]],
    });
    const { plan } = buildMergePlan([a], options(), ctx());
    expect(plan.positional).toBe(true);
    expect(plan.columns).toEqual(["a", ""]);
  });

  it("appends a missing column and fills blanks", () => {
    const a = source({
      header: [text("a"), text("b")],
      rows: [[text("1"), text("2")]],
    });
    const b = source({
      header: [text("b"), text("c")],
      rows: [[text("3"), text("4")]],
    });
    const { plan, rows } = buildMergePlan([a, b], options(), ctx());
    expect(plan.columns).toEqual(["a", "b", "c"]);
    expect(rows).toEqual([
      [text("1"), text("2"), blank],
      [blank, text("3"), text("4")],
    ]);
    expect(plan.blankCells).toBe(2);
  });

  it("extends positional headers past an empty source", () => {
    const empty = source({ header: null, rows: [], columns: 2 });
    const other = source({
      header: [text("x"), text("x")],
      rows: [[text("1"), text("2")]],
    });
    const { plan } = buildMergePlan([empty, other], options(), ctx());
    expect(plan.positional).toBe(true);
    expect(plan.columns).toEqual(["x", "x"]);
    expect(plan.totalRows).toBe(1);
  });

  it("leaves positional headers blank past a source without a header row", () => {
    const a = source({ header: null, rows: [], columns: 3 });
    const b = source({
      header: [text("x"), text("")],
      rows: [],
      columns: 2,
    });
    const { plan } = buildMergePlan([a, b], options(), ctx());
    expect(plan.positional).toBe(true);
    expect(plan.columns).toEqual(["x", "", ""]);
  });

  it("treats the first row as a header when the source has none", () => {
    const a = source({
      header: null,
      columns: 3,
      rows: [[text("Name")], [text("Ada")]],
    });
    const { plan, rows, headerRow } = buildMergePlan(
      [a],
      options({ header: true }),
      ctx()
    );
    expect(plan.positional).toBe(true);
    expect(plan.columns).toEqual(["Name", "", ""]);
    expect(headerRow).toEqual([text("Name"), text(""), text("")]);
    expect(rows).toEqual([[text("Ada"), blank, blank]]);
  });

  it("reads every row as data when the header is off", () => {
    const a = source({
      header: null,
      rows: [
        [text("a"), text("b")],
        [text("1"), text("2")],
      ],
    });
    const { plan, rows } = buildMergePlan(
      [a],
      options({ header: false }),
      ctx()
    );
    expect(plan.positional).toBe(true);
    expect(plan.columns).toEqual([]);
    expect(plan.header).toBe(false);
    expect(rows).toEqual([
      [text("a"), text("b")],
      [text("1"), text("2")],
    ]);
  });

  it("has no columns for a headerless empty Merge", () => {
    const empty = source({ header: null, rows: [], columns: 2 });
    const { plan } = buildMergePlan([empty], options({ header: false }), ctx());
    expect(plan.totalRows).toBe(0);
    expect(plan.totalColumns).toBe(0);
    expect(plan.columns).toEqual([]);
  });

  it("counts unresolved values and workbook sources", () => {
    const unresolved: T.Value = {
      _tag: "Unresolved",
      reason: "missing-formula-result",
      display: "#N/A",
    };
    const a = source({
      format: "xlsx",
      rows: [[unresolved, text("2")]],
      unresolved: 1,
    });
    const { plan } = buildMergePlan([a], options(), ctx());
    expect(plan.unresolved).toBe(1);
    expect(plan.valuesOnly).toBe(true);
    expect(plan.sources[0]?.unresolved).toBe(1);
  });

  it("aggregates warnings without the unresolved count", () => {
    const a = source({
      warnings: [
        { code: "ragged-records", count: 2 },
        { code: "unresolved-value", count: 9 },
      ],
    });
    const { plan } = buildMergePlan([a], options(), ctx());
    expect(plan.warnings).toEqual([{ code: "ragged-records", count: 2 }]);
  });

  it("rejects an empty Merge and the tab delimiter", () => {
    expect(() => buildMergePlan([], options(), ctx())).toThrow(
      T.InvalidRequest
    );
    expect(() =>
      buildMergePlan([source()], options({ delimiter: "\t" }), ctx())
    ).toThrow(T.InvalidRequest);
  });
});
