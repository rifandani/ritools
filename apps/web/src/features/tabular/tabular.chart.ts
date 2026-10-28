import type * as T from "./tabular";

/**
 * The Chart View contract. Everything here is pure: the Sheet Editor reads the
 * Chart Scope, then this module decides roles, series, gaps, caps, and
 * aggregation. It never writes a column or touches Edit History.
 */
export const chartTypes = ["line", "bar", "area", "donut", "scatter"] as const;
export type ChartType = (typeof chartTypes)[number];
export type ChartScopeKind = "selection" | "view";

const chartLineRowCap = 1000;
const chartBarRowCap = 50;
export const chartSeriesCap = 5;
export const chartSliceCap = 12;
const chartGroupCap = 5;

export interface ChartColumn {
  readonly columnId: T.ColumnId;
  readonly label: string;
}

export interface ChartSourceRow {
  readonly rowId: T.RowId;
  /** The 1-based row number of the Current View, used when no category exists. */
  readonly rowNumber: number;
  /** Cells align with the `columns` passed to `buildChart`. */
  readonly cells: readonly T.Value[];
}

export interface ChartSeries {
  readonly columnId: T.ColumnId;
  readonly label: string;
  readonly values: readonly (number | null)[];
}

export interface ChartPoint {
  readonly x: number;
  readonly y: number;
  readonly group: string;
}

export interface ChartSlice {
  readonly label: string;
  readonly value: number;
}

export type ChartEmptyReason =
  | "no-rows"
  | "no-numbers"
  | "donut-label"
  | "donut-series"
  | "scatter";

export interface ChartEmpty {
  readonly kind: "empty";
  readonly reason: ChartEmptyReason;
  readonly type: ChartType;
  readonly totalRows: number;
}

export interface ChartSeriesModel {
  readonly kind: "series";
  readonly type: "line" | "bar" | "area";
  readonly category: ChartColumn | null;
  readonly categories: readonly string[];
  readonly numericColumns: readonly ChartColumn[];
  readonly series: readonly ChartSeries[];
  readonly totalRows: number;
  readonly shownRows: number;
  readonly cap: "sample" | "bar" | null;
}

export interface ChartDonutModel {
  readonly kind: "donut";
  readonly type: "donut";
  readonly category: ChartColumn;
  readonly seriesColumn: ChartColumn;
  readonly slices: readonly ChartSlice[];
  readonly totalRows: number;
  readonly shownRows: number;
  readonly skipped: number;
  readonly tailCount: number;
  readonly other: string | null;
}

export interface ChartScatterModel {
  readonly kind: "scatter";
  readonly type: "scatter";
  readonly category: ChartColumn | null;
  readonly x: ChartColumn;
  readonly y: ChartColumn;
  readonly points: readonly ChartPoint[];
  readonly groups: readonly string[];
  readonly totalGroups: number;
  readonly totalRows: number;
  readonly shownRows: number;
}

export type ChartModel =
  | ChartEmpty
  | ChartSeriesModel
  | ChartDonutModel
  | ChartScatterModel;

export interface ChartOptions {
  /** Read one comma as the decimal separator in Text cells. */
  readonly decimalComma: boolean;
  /** The localized value for a blank label. */
  readonly blankLabel: string;
  /** The localized value for the row-number axis. */
  readonly rowNumberLabel: string;
  /** The localized name of the single scatter group when no label column exists. */
  readonly seriesLabel: string;
  /** The localized tail label. */
  readonly otherLabel: string;
  /** The localized tail label when `otherLabel` is already a category. */
  readonly otherRestLabel: string;
  readonly numberFormat: (value: number) => string;
}

const dotDecimal = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/u;
const commaDecimal = /^[+-]?(?:\d+(?:,\d+)?|,\d+)$/u;

/**
 * A strict decimal, never a thousands separator, an exponent, or whitespace.
 * The Decimal comma switch turns the comma into the separator and rejects the
 * dot, so `1.000,5` and `1,000.5` both become gaps.
 */
export const parseChartNumber = (
  text: string,
  decimalComma: boolean
): number | null => {
  const pattern = decimalComma ? commaDecimal : dotDecimal;
  if (!pattern.test(text)) {
    return null;
  }
  const normalized = decimalComma ? text.replace(",", ".") : text;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
};

export const numericValue = (
  value: T.Value,
  decimalComma: boolean
): number | null => {
  if (value._tag === "Number") {
    return Number.isFinite(value.value) ? value.value : null;
  }
  if (value._tag === "Text") {
    return parseChartNumber(value.text, decimalComma);
  }
  return null;
};

/** A Text cell that reads as a label rather than a number. */
export const isTextLabel = (value: T.Value, decimalComma: boolean): boolean =>
  value._tag === "Text" &&
  value.text.trim().length > 0 &&
  parseChartNumber(value.text, decimalComma) === null;

export const chartColumnTitle = (
  column: ChartColumn,
  blankLabel: string
): string => (column.label.trim() ? column.label : blankLabel);

const labelOf = (value: T.Value, blankLabel: string): string => {
  if (value._tag === "Text") {
    return value.text.trim() ? value.text : blankLabel;
  }
  if (value._tag === "Number") {
    return String(value.value);
  }
  if (value._tag === "Boolean") {
    return value.value ? "TRUE" : "FALSE";
  }
  return blankLabel;
};

/** Even stride over the whole scope, keeping the first and the last row. */
export const sampleIndices = (
  total: number,
  cap: number
): readonly number[] => {
  if (total <= 0) {
    return [];
  }
  if (total <= cap || cap <= 1) {
    return Array.from({ length: Math.min(total, cap) }, (_, index) => index);
  }
  return Array.from({ length: cap }, (_, index) =>
    Math.round((index * (total - 1)) / (cap - 1))
  );
};

/** Which rows the Chart View must read, before gaps or aggregation. */
export const chartRowIndices = (
  type: ChartType,
  total: number
): readonly number[] => {
  if (type === "donut") {
    return sampleIndices(total, total);
  }
  if (type === "bar") {
    return Array.from(
      { length: Math.min(total, chartBarRowCap) },
      (_, index) => index
    );
  }
  return sampleIndices(total, chartLineRowCap);
};

export interface ChartRoleDetection {
  readonly categoryIndex: number;
  readonly numericIndexes: readonly number[];
}

/** The first label column is the category; numeric columns exclude it. */
export const detectChartRoles = (
  columns: readonly ChartColumn[],
  rows: readonly ChartSourceRow[],
  decimalComma: boolean
): ChartRoleDetection => {
  let categoryIndex = -1;
  const numericIndexes: number[] = [];
  for (const [index] of columns.entries()) {
    let hasLabel = false;
    let hasNumber = false;
    for (const row of rows) {
      const value = row.cells[index];
      if (value === undefined) {
        continue;
      }
      if (isTextLabel(value, decimalComma)) {
        hasLabel = true;
      }
      if (numericValue(value, decimalComma) !== null) {
        hasNumber = true;
      }
      if (hasLabel && hasNumber) {
        break;
      }
    }
    if (categoryIndex < 0 && hasLabel) {
      categoryIndex = index;
      continue;
    }
    if (hasNumber) {
      numericIndexes.push(index);
    }
  }
  return { categoryIndex, numericIndexes };
};

/** The default is the first five numeric columns in column order. */
export const selectedSeriesIds = (
  numericColumns: readonly ChartColumn[],
  selected: readonly T.ColumnId[] | undefined
): readonly T.ColumnId[] => {
  const available = new Set(numericColumns.map((column) => column.columnId));
  const kept: T.ColumnId[] = [];
  const seen = new Set<T.ColumnId>();
  for (const columnId of selected ?? []) {
    if (available.has(columnId) && !seen.has(columnId)) {
      seen.add(columnId);
      kept.push(columnId);
    }
  }
  const capped = kept.slice(0, chartSeriesCap);
  return capped.length
    ? capped
    : numericColumns.slice(0, chartSeriesCap).map((column) => column.columnId);
};

const seriesModel = (
  type: "line" | "bar" | "area",
  columns: readonly ChartColumn[],
  rows: readonly ChartSourceRow[],
  totalRows: number,
  options: ChartOptions,
  selectedSeries: readonly T.ColumnId[] | undefined
): ChartModel => {
  const { categoryIndex, numericIndexes } = detectChartRoles(
    columns,
    rows,
    options.decimalComma
  );
  const numeric = numericIndexes.flatMap((index) => {
    const column = columns[index];
    return column ? [{ column, index }] : [];
  });
  if (!numeric.length) {
    return { kind: "empty", reason: "no-numbers", type, totalRows };
  }
  const numericColumns = numeric.map((entry) => entry.column);
  const cappedRows =
    type === "bar"
      ? rows.slice(0, chartBarRowCap)
      : sampleIndices(rows.length, chartLineRowCap).flatMap((index) => {
          const row = rows[index];
          return row ? [row] : [];
        });
  const category = categoryIndex >= 0 ? columns[categoryIndex] : undefined;
  const categories = cappedRows.map((row) => {
    if (!category) {
      return options.numberFormat(row.rowNumber);
    }
    const value = row.cells[categoryIndex];
    return value === undefined
      ? options.blankLabel
      : labelOf(value, options.blankLabel);
  });
  const selected = new Set(selectedSeriesIds(numericColumns, selectedSeries));
  const series: ChartSeries[] = [];
  for (const entry of numeric) {
    if (!selected.has(entry.column.columnId)) {
      continue;
    }
    series.push({
      columnId: entry.column.columnId,
      label: chartColumnTitle(entry.column, options.blankLabel),
      values: cappedRows.map((row) => {
        const value = row.cells[entry.index];
        return value === undefined
          ? null
          : numericValue(value, options.decimalComma);
      }),
    });
  }
  return {
    kind: "series",
    type,
    category: category ?? null,
    categories,
    numericColumns,
    series,
    totalRows,
    shownRows: cappedRows.length,
    cap:
      totalRows > cappedRows.length
        ? type === "bar"
          ? "bar"
          : "sample"
        : null,
  };
};

const donutModel = (
  columns: readonly ChartColumn[],
  rows: readonly ChartSourceRow[],
  totalRows: number,
  options: ChartOptions
): ChartModel => {
  const { categoryIndex, numericIndexes } = detectChartRoles(
    columns,
    rows,
    options.decimalComma
  );
  if (!numericIndexes.length) {
    return { kind: "empty", reason: "no-numbers", type: "donut", totalRows };
  }
  const category = categoryIndex >= 0 ? columns[categoryIndex] : undefined;
  if (!category) {
    return { kind: "empty", reason: "donut-label", type: "donut", totalRows };
  }
  if (numericIndexes.length !== 1) {
    return {
      kind: "empty",
      reason: "donut-series",
      type: "donut",
      totalRows,
    };
  }
  // SAFETY: `numericIndexes.length === 1` above, and every index came from `columns`.
  const valueIndex = numericIndexes[0] as number;
  // SAFETY: The same invariant makes the column at that index present.
  const seriesColumn = columns[valueIndex] as ChartColumn;
  const totals = new Map<string, { value: number; order: number }>();
  let skipped = 0;
  for (const [order, row] of rows.entries()) {
    const raw = row.cells[valueIndex];
    const value =
      raw === undefined ? null : numericValue(raw, options.decimalComma);
    if (value === null) {
      continue;
    }
    if (value <= 0) {
      skipped += 1;
      continue;
    }
    const labelValue = row.cells[categoryIndex];
    const label =
      labelValue === undefined
        ? options.blankLabel
        : labelOf(labelValue, options.blankLabel);
    const current = totals.get(label);
    if (current) {
      current.value += value;
    } else {
      totals.set(label, { value, order });
    }
  }
  const ordered = [...totals.entries()]
    .map(([label, entry]) => ({ label, ...entry }))
    .toSorted((a, b) => b.value - a.value || a.order - b.order);
  const top = ordered.slice(0, chartSliceCap);
  const tail = ordered.slice(chartSliceCap);
  const other =
    tail.length === 0
      ? null
      : ordered.some((entry) => entry.label === options.otherLabel)
        ? options.otherRestLabel
        : options.otherLabel;
  const slices = top.map(({ label, value }) => ({ label, value }));
  if (other) {
    slices.push({
      label: other,
      value: tail.reduce((sum, entry) => sum + entry.value, 0),
    });
  }
  if (!slices.length) {
    return { kind: "empty", reason: "no-rows", type: "donut", totalRows };
  }
  return {
    kind: "donut",
    type: "donut",
    category,
    seriesColumn,
    slices,
    totalRows,
    shownRows: slices.length,
    skipped,
    tailCount: tail.length,
    other,
  };
};

/* oxlint-disable-next-line eslint/complexity -- A scatter branches once per fixed role and group cap. */
const scatterModel = (
  columns: readonly ChartColumn[],
  rows: readonly ChartSourceRow[],
  totalRows: number,
  options: ChartOptions
): ChartModel => {
  const { categoryIndex, numericIndexes } = detectChartRoles(
    columns,
    rows,
    options.decimalComma
  );
  if (!numericIndexes.length) {
    return { kind: "empty", reason: "no-numbers", type: "scatter", totalRows };
  }
  if (numericIndexes.length !== 2) {
    return { kind: "empty", reason: "scatter", type: "scatter", totalRows };
  }
  // SAFETY: `numericIndexes.length === 2` above, and every index came from `columns`.
  const [xIndex, yIndex] = numericIndexes as [number, number];
  // SAFETY: The same invariant makes both columns present.
  const x = columns[xIndex] as ChartColumn;
  // SAFETY: The same invariant makes both columns present.
  const y = columns[yIndex] as ChartColumn;
  const category = categoryIndex >= 0 ? columns[categoryIndex] : undefined;
  const allGroups: string[] = [];
  const grouped = new Map<string, ChartPoint[]>();
  for (const row of rows) {
    const rawX = row.cells[xIndex];
    const rawY = row.cells[yIndex];
    const pointX =
      rawX === undefined ? null : numericValue(rawX, options.decimalComma);
    const pointY =
      rawY === undefined ? null : numericValue(rawY, options.decimalComma);
    if (pointX === null || pointY === null) {
      continue;
    }
    let group = options.seriesLabel;
    if (category) {
      const label = row.cells[categoryIndex];
      group =
        label === undefined
          ? options.blankLabel
          : labelOf(label, options.blankLabel);
    }
    if (!grouped.has(group)) {
      grouped.set(group, []);
      allGroups.push(group);
    }
    grouped.get(group)?.push({ x: pointX, y: pointY, group });
  }
  const groups = allGroups.slice(0, chartGroupCap);
  const points = groups.flatMap((group) => grouped.get(group) ?? []);
  return {
    kind: "scatter",
    type: "scatter",
    category: category ?? null,
    x,
    y,
    points,
    groups,
    totalGroups: allGroups.length,
    totalRows,
    shownRows: points.length,
  };
};

/**
 * Build the read-only model from rows the Sheet Editor already read. The
 * builder applies the display cap itself, so callers may pass the whole scope
 * or only the sampled rows.
 */
/* oxlint-disable eslint/complexity -- The fixed five-type contract branches once per type and empty role. */
export const buildChart = (
  type: ChartType,
  columns: readonly ChartColumn[],
  rows: readonly ChartSourceRow[],
  totalRows: number,
  options: ChartOptions,
  selectedSeries?: readonly T.ColumnId[]
): ChartModel => {
  if (!rows.length) {
    return { kind: "empty", reason: "no-rows", type, totalRows };
  }
  if (type === "donut") {
    return donutModel(columns, rows, totalRows, options);
  }
  if (type === "scatter") {
    return scatterModel(columns, rows, totalRows, options);
  }
  return seriesModel(type, columns, rows, totalRows, options, selectedSeries);
};

export interface ChartSummary {
  readonly type: ChartType;
  readonly rows: number;
  readonly category: string;
  readonly series: readonly string[];
}

export const summarizeChart = (
  model: ChartModel,
  options: Pick<ChartOptions, "rowNumberLabel" | "blankLabel">
): ChartSummary => {
  if (model.kind === "empty") {
    return {
      type: model.type,
      rows: 0,
      category: options.rowNumberLabel,
      series: [],
    };
  }
  if (model.kind === "series") {
    return {
      type: model.type,
      rows: model.categories.length,
      category: model.category
        ? chartColumnTitle(model.category, options.blankLabel)
        : options.rowNumberLabel,
      series: model.series.map((series) => series.label),
    };
  }
  if (model.kind === "donut") {
    return {
      type: model.type,
      rows: model.slices.length,
      category: chartColumnTitle(model.category, options.blankLabel),
      series: [chartColumnTitle(model.seriesColumn, options.blankLabel)],
    };
  }
  return {
    type: model.type,
    rows: model.points.length,
    category: model.category
      ? chartColumnTitle(model.category, options.blankLabel)
      : options.rowNumberLabel,
    series: model.groups,
  };
};

export const chartTypeLabelKey = {
  area: "tabularChartArea",
  bar: "tabularChartBar",
  donut: "tabularChartDonut",
  line: "tabularChartLine",
  scatter: "tabularChartScatter",
} as const satisfies Record<ChartType, string>;

export const chartEmptyLabelKey = {
  "no-rows": "tabularChartEmptyNoRows",
  "no-numbers": "tabularChartEmptyNoNumbers",
  "donut-label": "tabularChartEmptyDonutLabel",
  "donut-series": "tabularChartEmptyDonutSeries",
  scatter: "tabularChartEmptyScatter",
} as const satisfies Record<ChartEmptyReason, string>;
