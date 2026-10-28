import { describe, expect, it } from "@effect/vitest";

import { initI18n } from "@/core/libs/i18n/init";
import enUS from "@/core/libs/i18n/locales/en-US";
import idID from "@/core/libs/i18n/locales/id-ID";

import * as T from "./tabular";
import {
  buildChart,
  chartColumnTitle,
  chartEmptyLabelKey,
  chartRowIndices,
  chartTypeLabelKey,
  detectChartRoles,
  isTextLabel,
  numericValue,
  parseChartNumber,
  sampleIndices,
  selectedSeriesIds,
  summarizeChart,
} from "./tabular.chart";
import type { ChartColumn, ChartOptions } from "./tabular.chart";

const column = (id: string, label = id): ChartColumn => ({
  columnId: T.ColumnId.make(id),
  label,
});
const text = (value: string): T.Value => ({ _tag: "Text", text: value });
const number = (value: number): T.Value => ({ _tag: "Number", value });
const blank: T.Value = { _tag: "Blank" };
const unresolved: T.Value = {
  _tag: "Unresolved",
  reason: "missing-formula-result",
  display: "#N/A",
};
const row = (index: number, ...cells: T.Value[]) => ({
  rowId: T.RowId.make(`r-${index}`),
  rowNumber: index + 1,
  cells,
});
const sparseRow = (index: number, cells: Record<number, T.Value>) => {
  const values: T.Value[] = [];
  for (const [position, value] of Object.entries(cells)) {
    values[Number(position)] = value;
  }
  return {
    rowId: T.RowId.make(`r-${index}`),
    rowNumber: index + 1,
    cells: values,
  };
};
const options = (overrides: Partial<ChartOptions> = {}): ChartOptions => ({
  decimalComma: false,
  blankLabel: "Blank",
  rowNumberLabel: "Row number",
  seriesLabel: "Series",
  otherLabel: "Other",
  otherRestLabel: "Other (rest)",
  numberFormat: String,
  ...overrides,
});
const donutChart = (
  rows: ReturnType<typeof row>[],
  extra: Partial<ChartOptions> = {}
) =>
  buildChart(
    "donut",
    [column("label", "Item"), column("value", "Value")],
    rows,
    rows.length,
    options(extra)
  );

describe("strict chart numbers", () => {
  it("reads a dot decimal and rejects separators, spaces, and exponents", () => {
    for (const value of ["0", "12", "-3.5", "+4.25", ".5"]) {
      expect(parseChartNumber(value, false), value).not.toBeNull();
    }
    for (const value of [
      "1,000",
      "1.000,5",
      " 12",
      "12 ",
      "1e3",
      "Infinity",
      "",
      "5.",
    ]) {
      expect(parseChartNumber(value, false), value).toBeNull();
    }
  });

  it("reads one comma as the decimal separator and rejects thousands", () => {
    expect(parseChartNumber("1,5", true)).toBe(1.5);
    expect(parseChartNumber("-0,25", true)).toBe(-0.25);
    for (const value of ["1.000,5", "1,000.5", "1.5", "1,5,5", "1 000"]) {
      expect(parseChartNumber(value, true), value).toBeNull();
    }
  });

  it("readsNumber cells and leaves every other value as a gap", () => {
    expect(numericValue(number(3.5), false)).toBe(3.5);
    expect(numericValue(text("2.25"), false)).toBe(2.25);
    expect(numericValue(text("2,25"), true)).toBe(2.25);
    expect(numericValue(blank, false)).toBeNull();
    expect(numericValue(unresolved, false)).toBeNull();
    expect(numericValue(text("paper"), false)).toBeNull();
    expect(numericValue({ _tag: "Boolean", value: true }, false)).toBeNull();
    expect(numericValue(number(Number.POSITIVE_INFINITY), false)).toBeNull();
    expect(parseChartNumber("9".repeat(400), false)).toBeNull();
  });

  it("only treats a non-numeric, non-empty Text cell as a label", () => {
    expect(isTextLabel(text("Item"), false)).toBe(true);
    expect(isTextLabel(text("  "), false)).toBe(false);
    expect(isTextLabel(text("00104"), false)).toBe(false);
    expect(isTextLabel(number(1), false)).toBe(false);
  });
});

describe("chart roles", () => {
  it("uses the first label column and every other numeric column", () => {
    const columns = [
      column("sku", "SKU"),
      column("item", "Item"),
      column("qty", "Quantity"),
      column("price", "Price"),
    ];
    const rows = [
      row(0, text("00104"), text("Paper clips"), text("48"), text("1.5")),
      row(1, text("00027"), text("Notebook"), text("12"), text("2")),
    ];
    expect(detectChartRoles(columns, rows, false)).toEqual({
      categoryIndex: 1,
      numericIndexes: [0, 2, 3],
    });
  });

  it("stops a role scan once a column has both a label and a number", () => {
    const columns = [column("mixed", "Mixed"), column("value", "Value")];
    const rows = [row(0, text("A"), number(1)), row(1, number(2), number(3))];
    expect(detectChartRoles(columns, rows, false)).toEqual({
      categoryIndex: 0,
      numericIndexes: [1],
    });
  });

  it("skips a missing cell", () => {
    const columns = [column("label", "Item"), column("value", "Value")];
    const rows = [
      { rowId: T.RowId.make("short"), rowNumber: 1, cells: [text("A")] },
      row(1, text("B"), number(2)),
    ];
    expect(detectChartRoles(columns, rows, false)).toEqual({
      categoryIndex: 0,
      numericIndexes: [1],
    });
  });

  it("falls back to the row number when no column has a label", () => {
    const columns = [column("a", "A"), column("b", "B")];
    const rows = [row(0, text("1"), text("2"))];
    expect(detectChartRoles(columns, rows, false)).toEqual({
      categoryIndex: -1,
      numericIndexes: [0, 1],
    });
  });

  it("keeps duplicate and blank headers distinct by column identity", () => {
    const columns = [column("a", ""), column("b", "same"), column("c", "same")];
    const [blankHeader, first, second] = columns;
    if (!blankHeader || !first || !second) {
      throw new Error("Expected three columns");
    }
    expect(chartColumnTitle(blankHeader, "Blank")).toBe("Blank");
    expect(chartColumnTitle(first, "Blank")).toBe("same");
    expect(first.columnId).not.toBe(second.columnId);
  });
});

describe("series selection", () => {
  const numeric = Array.from({ length: 7 }, (_, index) =>
    column(`c${index + 1}`, `C${index + 1}`)
  );

  it("defaults to the first five numeric columns in column order", () => {
    expect(selectedSeriesIds(numeric, [])).toEqual(
      numeric.slice(0, 5).map((entry) => entry.columnId)
    );
  });

  it("keeps a user selection that is still in scope and never exceeds five", () => {
    const selected = [...numeric, ...numeric].map((entry) => entry.columnId);
    expect(selectedSeriesIds(numeric, selected)).toEqual(
      numeric.slice(0, 5).map((entry) => entry.columnId)
    );
    const last = numeric.at(-1);
    if (!last) {
      throw new Error("Expected a last numeric column");
    }
    expect(selectedSeriesIds(numeric, [last.columnId])).toEqual([
      last.columnId,
    ]);
    expect(selectedSeriesIds(numeric, [T.ColumnId.make("gone")])).toEqual(
      numeric.slice(0, 5).map((entry) => entry.columnId)
    );
  });
});

describe("display caps", () => {
  it("keeps the first and last row on an even stride", () => {
    const indices = sampleIndices(10_000, 1000);
    expect(indices).toHaveLength(1000);
    expect(indices[0]).toBe(0);
    expect(indices.at(-1)).toBe(9999);
    expect(new Set(indices).size).toBe(1000);
  });

  it("does not sample a scope that already fits", () => {
    expect(sampleIndices(4, 1000)).toEqual([0, 1, 2, 3]);
    expect(sampleIndices(0, 1000)).toEqual([]);
    expect(sampleIndices(10, 1)).toEqual([0]);
  });

  it("samples line, area, and scatter but keeps the first 50 bar rows", () => {
    expect(chartRowIndices("line", 1200)).toHaveLength(1000);
    expect(chartRowIndices("area", 1200)).toHaveLength(1000);
    expect(chartRowIndices("scatter", 1200)).toHaveLength(1000);
    expect(chartRowIndices("bar", 120)).toEqual(
      Array.from({ length: 50 }, (_, index) => index)
    );
    expect(chartRowIndices("donut", 120)).toHaveLength(120);
  });
});

const numericScope = () => ({
  columns: [
    column("label", "Item"),
    column("a", "A"),
    column("b", "B"),
    column("c", "C"),
    column("d", "D"),
    column("e", "E"),
    column("f", "F"),
    column("g", "G"),
  ],
  rows: [
    row(
      0,
      text("One"),
      text("1"),
      text("2"),
      text("3"),
      text("4"),
      text("5"),
      text("6"),
      text("7")
    ),
    row(
      1,
      text("Two"),
      text("2"),
      blank,
      text("4"),
      unresolved,
      text("6"),
      text("8"),
      text("9")
    ),
  ],
});

describe("line, bar, and area", () => {
  it("turns gaps into null values, never zero", () => {
    const { columns, rows } = numericScope();
    const model = buildChart("line", columns, rows, rows.length, options());
    if (model.kind !== "series") {
      throw new Error("Expected a series model");
    }
    expect(model.categories).toEqual(["One", "Two"]);
    expect(model.series).toHaveLength(5);
    expect(model.series[0]?.values).toEqual([1, 2]);
    expect(model.series[1]?.values).toEqual([2, null]);
    expect(model.series[3]?.values).toEqual([4, null]);
  });

  it("labels a category cell that is a number, Boolean, or blank", () => {
    const columns = [column("label", "Item"), column("value", "Value")];
    const rows = [
      row(0, text("A"), number(1)),
      row(1, number(2), number(2)),
      row(2, { _tag: "Boolean", value: true }, number(3)),
      row(3, { _tag: "Boolean", value: false }, number(4)),
      row(4, blank, number(5)),
      row(5, unresolved, number(6)),
    ];
    const model = buildChart("line", columns, rows, rows.length, options());
    if (model.kind !== "series") {
      throw new Error("Expected a series model");
    }
    expect(model.categories).toEqual([
      "A",
      "2",
      "TRUE",
      "FALSE",
      "Blank",
      "Blank",
    ]);
  });

  it("turns a row with a missing cell into a gap", () => {
    const columns = [column("label", "Item"), column("value", "Value")];
    const rows = [sparseRow(0, {}), row(1, text("B"), number(2))];
    const model = buildChart("line", columns, rows, rows.length, options());
    if (model.kind !== "series") {
      throw new Error("Expected a series model");
    }
    expect(model.categories).toEqual(["Blank", "B"]);
    expect(model.series[0]?.values).toEqual([null, 2]);
  });

  it("keeps a chosen series and drops the others", () => {
    const { columns, rows } = numericScope();
    const chosen = columns.at(2);
    if (!chosen) {
      throw new Error("Expected a chosen column");
    }
    const model = buildChart("line", columns, rows, rows.length, options(), [
      chosen.columnId,
    ]);
    if (model.kind !== "series") {
      throw new Error("Expected a series model");
    }
    expect(model.series.map((series) => series.label)).toEqual(["B"]);
  });

  it("uses row numbers for the category when no label column exists", () => {
    const columns = [column("a", "A"), column("b", "B")];
    const rows = [row(0, number(1), number(2)), row(1, number(3), number(4))];
    const model = buildChart("bar", columns, rows, 2, options());
    if (model.kind !== "series") {
      throw new Error("Expected a series model");
    }
    expect(model.category).toBeNull();
    expect(model.categories).toEqual(["1", "2"]);
  });

  it("caps bars at the first 50 categories and names the counts", () => {
    const columns = [column("label", "Item"), column("value", "Value")];
    const rows = Array.from({ length: 51 }, (_, index) =>
      row(index, text(`Row ${index}`), number(index))
    );
    const model = buildChart("bar", columns, rows, rows.length, options());
    if (model.kind !== "series") {
      throw new Error("Expected a series model");
    }
    expect(model.categories).toHaveLength(50);
    expect(model.cap).toBe("bar");
    expect(model.totalRows).toBe(51);
    expect(model.shownRows).toBe(50);
  });

  it("samples a line beyond 1,000 rows", () => {
    const columns = [column("label", "Item"), column("value", "Value")];
    const rows = Array.from({ length: 2000 }, (_, index) =>
      row(index, text(`Row ${index}`), number(index))
    );
    const model = buildChart("line", columns, rows, rows.length, options());
    if (model.kind !== "series") {
      throw new Error("Expected a series model");
    }
    expect(model.categories).toHaveLength(1000);
    expect(model.categories[0]).toBe("Row 0");
    expect(model.categories.at(-1)).toBe("Row 1999");
    expect(model.cap).toBe("sample");
  });
});

describe("donut", () => {
  it("sums duplicate labels and keeps first appearance for ties", () => {
    const model = donutChart([
      row(0, text("A"), number(1)),
      row(1, text("B"), number(2)),
      row(2, text("A"), number(3)),
      row(3, text("C"), number(2)),
    ]);
    if (model.kind !== "donut") {
      throw new Error("Expected a donut model");
    }
    expect(model.slices).toEqual([
      { label: "A", value: 4 },
      { label: "B", value: 2 },
      { label: "C", value: 2 },
    ]);
  });

  it("skips zero and negative values and counts them", () => {
    const model = donutChart([
      row(0, text("A"), number(0)),
      row(1, text("B"), number(-2)),
      row(2, text("C"), number(4)),
      row(3, text("D"), blank),
    ]);
    if (model.kind !== "donut") {
      throw new Error("Expected a donut model");
    }
    expect(model.skipped).toBe(2);
    expect(model.slices).toEqual([{ label: "C", value: 4 }]);
  });

  it("shows the top 12 and sums the tail as Other", () => {
    const rows = Array.from({ length: 14 }, (_, index) =>
      row(index, text(`S${index}`), number(100 - index))
    );
    const model = donutChart(rows);
    if (model.kind !== "donut") {
      throw new Error("Expected a donut model");
    }
    expect(model.slices).toHaveLength(13);
    expect(model.tailCount).toBe(2);
    expect(model.other).toBe("Other");
    expect(model.slices.at(-1)).toEqual({ label: "Other", value: 88 + 87 });
  });

  it("uses Other (rest) when Other is already a category", () => {
    const rows = Array.from({ length: 13 }, (_, index) =>
      row(index, text(index === 0 ? "Other" : `S${index}`), number(100 - index))
    );
    const model = donutChart(rows);
    if (model.kind !== "donut") {
      throw new Error("Expected a donut model");
    }
    expect(model.other).toBe("Other (rest)");
    expect(model.slices.at(-1)?.label).toBe("Other (rest)");
  });

  it("names no numeric column", () => {
    expect(
      buildChart(
        "donut",
        [column("label", "Item"), column("value", "Value")],
        [row(0, text("A"), text("paper"))],
        1,
        options()
      )
    ).toMatchObject({ kind: "empty", reason: "no-numbers" });
  });

  it("skips a missing value or label cell", () => {
    const model = donutChart([
      row(0, text("A"), number(2)),
      row(1, text("B")),
      sparseRow(2, { 1: number(4) }),
    ]);
    if (model.kind !== "donut") {
      throw new Error("Expected a donut model");
    }
    expect(model.slices).toEqual([
      { label: "Blank", value: 4 },
      { label: "A", value: 2 },
    ]);
  });

  it("has no slices when every value is zero or negative", () => {
    expect(
      donutChart([row(0, text("A"), number(0)), row(1, text("B"), number(-1))])
    ).toMatchObject({ kind: "empty", reason: "no-rows" });
  });

  it("keeps blank labels under the localized Blank value", () => {
    const model = donutChart([
      row(0, text("A"), number(2)),
      row(1, text(""), number(3)),
    ]);
    if (model.kind !== "donut") {
      throw new Error("Expected a donut model");
    }
    expect(model.slices).toEqual([
      { label: "Blank", value: 3 },
      { label: "A", value: 2 },
    ]);
  });
});

describe("scatter", () => {
  it("uses the first two numeric columns and groups by the first label column", () => {
    const columns = [
      column("group", "Group"),
      column("x", "X"),
      column("y", "Y"),
    ];
    const rows = [
      row(0, text("A"), number(1), number(2)),
      row(1, text("B"), number(3), number(4)),
      row(2, text("A"), number(5), blank),
    ];
    const model = buildChart("scatter", columns, rows, rows.length, options());
    if (model.kind !== "scatter") {
      throw new Error("Expected a scatter model");
    }
    expect(model.groups).toEqual(["A", "B"]);
    expect(model.points).toEqual([
      { x: 1, y: 2, group: "A" },
      { x: 3, y: 4, group: "B" },
    ]);
    expect(model.x.label).toBe("X");
    expect(model.y.label).toBe("Y");
  });

  it("names no numeric column", () => {
    expect(
      buildChart(
        "scatter",
        [column("label", "Item"), column("value", "Value")],
        [row(0, text("A"), text("paper"))],
        1,
        options()
      )
    ).toMatchObject({ kind: "empty", reason: "no-numbers" });
  });

  it("skips a point with a missing x or y cell", () => {
    const columns = [
      column("group", "Group"),
      column("x", "X"),
      column("y", "Y"),
    ];
    const model = buildChart(
      "scatter",
      columns,
      [
        row(0, text("A"), number(1), number(2)),
        sparseRow(1, { 0: text("A"), 2: number(3) }),
        sparseRow(2, { 0: text("A"), 1: number(4) }),
      ],
      3,
      options()
    );
    if (model.kind !== "scatter") {
      throw new Error("Expected a scatter model");
    }
    expect(model.points).toEqual([{ x: 1, y: 2, group: "A" }]);
  });

  it("uses the localized series name when no group column exists", () => {
    const model = buildChart(
      "scatter",
      [column("x", "X"), column("y", "Y")],
      [row(0, number(1), number(2))],
      1,
      options()
    );
    if (model.kind !== "scatter") {
      throw new Error("Expected a scatter model");
    }
    expect(model.category).toBeNull();
    expect(model.groups).toEqual(["Series"]);
    expect(summarizeChart(model, options())).toMatchObject({
      category: "Row number",
      series: ["Series"],
    });
  });

  it("shows only the first five groups and names the rest", () => {
    const columns = [
      column("group", "Group"),
      column("x", "X"),
      column("y", "Y"),
    ];
    const rows = Array.from({ length: 7 }, (_, index) =>
      row(index, text(`G${index}`), number(index), number(index + 1))
    );
    const model = buildChart("scatter", columns, rows, rows.length, options());
    if (model.kind !== "scatter") {
      throw new Error("Expected a scatter model");
    }
    expect(model.groups).toEqual(["G0", "G1", "G2", "G3", "G4"]);
    expect(model.totalGroups).toBe(7);
    expect(model.points).toHaveLength(5);
  });
});

describe("empty states", () => {
  const columns = [column("label", "Item"), column("value", "Value")];

  it("names no rows", () => {
    expect(buildChart("line", columns, [], 0, options())).toMatchObject({
      kind: "empty",
      reason: "no-rows",
    });
  });

  it("names no numeric column", () => {
    expect(
      buildChart(
        "line",
        columns,
        [row(0, text("A"), text("paper"))],
        1,
        options()
      )
    ).toMatchObject({ kind: "empty", reason: "no-numbers" });
  });

  it("names a missing donut label and the wrong series count", () => {
    expect(
      buildChart(
        "donut",
        [column("value", "Value")],
        [row(0, number(1))],
        1,
        options()
      )
    ).toMatchObject({ kind: "empty", reason: "donut-label" });
    expect(
      buildChart(
        "donut",
        [column("label", "Item"), column("a", "A"), column("b", "B")],
        [row(0, text("A"), number(1), number(2))],
        1,
        options()
      )
    ).toMatchObject({ kind: "empty", reason: "donut-series" });
  });

  it("names the scatter requirement", () => {
    expect(
      buildChart(
        "scatter",
        [column("label", "Item"), column("value", "Value")],
        [row(0, text("A"), number(1))],
        1,
        options()
      )
    ).toMatchObject({ kind: "empty", reason: "scatter" });
  });
});

describe("summary and message keys", () => {
  const { columns, rows } = numericScope();

  it("summarizes the charted rows, category, and series", () => {
    const model = buildChart("line", columns, rows, rows.length, options());
    expect(summarizeChart(model, options())).toEqual({
      type: "line",
      rows: 2,
      category: "Item",
      series: ["A", "B", "C", "D", "E"],
    });
  });

  it("summarizes a series without a category", () => {
    const model = buildChart(
      "line",
      [column("a", "A"), column("b", "B")],
      [row(0, number(1), number(2))],
      1,
      options()
    );
    expect(summarizeChart(model, options())).toMatchObject({
      category: "Row number",
    });
  });

  it("summarizes empty, donut, and scatter models", () => {
    expect(
      summarizeChart(buildChart("line", columns, [], 0, options()), options())
    ).toEqual({
      type: "line",
      rows: 0,
      category: "Row number",
      series: [],
    });
    const donut = buildChart(
      "donut",
      [column("label", "Item"), column("value", "Value")],
      [row(0, text("A"), number(2))],
      1,
      options()
    );
    expect(summarizeChart(donut, options())).toEqual({
      type: "donut",
      rows: 1,
      category: "Item",
      series: ["Value"],
    });
    const scatter = buildChart(
      "scatter",
      [column("group", "Group"), column("x", "X"), column("y", "Y")],
      [row(0, text("A"), number(1), number(2))],
      1,
      options()
    );
    expect(summarizeChart(scatter, options())).toEqual({
      type: "scatter",
      rows: 1,
      category: "Group",
      series: ["A"],
    });
  });

  it("matches the caption and aria strings in both catalogs", () => {
    const en = initI18n({
      locale: "en-us",
      fallbackLocale: ["en-us"],
      translations: { "en-us": enUS },
    });
    const id = initI18n({
      locale: "id-id",
      fallbackLocale: ["id-id"],
      translations: { "id-id": idID },
    });
    const model = buildChart("line", columns, rows, rows.length, options());
    const summary = summarizeChart(model, options());
    const args = {
      type: en.t(chartTypeLabelKey[summary.type]),
      sheet: "stock-list.csv",
      scope: en.t("tabularCurrentView"),
      rows: summary.rows.toLocaleString("en-US"),
    };
    expect(
      en.t("tabularChartCaption", { sheet: args.sheet, rows: args.rows })
    ).toBe("stock-list.csv · 2 rows");
    expect(
      en.t("tabularChartAria", {
        type: args.type,
        scope: args.scope,
        sheet: args.sheet,
        rows: args.rows,
        category: summary.category,
        series: summary.series.join(", "),
      })
    ).toBe(
      "Line chart. Current View in stock-list.csv. 2 rows. Category: Item. Series: A, B, C, D, E."
    );
    expect(
      id.t("tabularChartAria", {
        type: id.t(chartTypeLabelKey[summary.type]),
        scope: id.t("tabularCurrentView"),
        sheet: "stock-list.csv",
        rows: summary.rows.toLocaleString("id-ID"),
        category: summary.category,
        series: summary.series.join(", "),
      })
    ).toContain("Bagan garis. Tampilan Saat Ini di stock-list.csv.");
  });

  it("maps every empty reason to a catalog key", () => {
    for (const key of Object.values(chartEmptyLabelKey)) {
      expect(key in enUS).toBe(true);
      expect(key in idID).toBe(true);
    }
  });
});
