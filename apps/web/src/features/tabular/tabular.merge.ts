/* oxlint-disable eslint/complexity -- One plan function owns header matching, position fallback, rows, and counts. */
import { clampFileName } from "@/core/libs/files";

import * as T from "./tabular";
import type { FailureContext } from "./tabular.format";
import { display } from "./tabular.format";
import { cleanDownloadName } from "./tabular.split";

/** One parsed source for a Merge. Rows are values; the header is separate. */
export interface MergeSheet {
  readonly sourceId: T.MergeSourceId;
  readonly name: string;
  readonly sheetName: string;
  readonly origin: T.MergeOrigin;
  readonly format: T.InputFormat;
  readonly size: number;
  readonly header: readonly T.Value[] | null;
  readonly rows: readonly (readonly T.Value[])[];
  readonly columns: number;
  readonly unresolved: number;
  readonly delimiter: T.Delimiter | null;
  readonly newline: "lf" | "crlf" | "mixed" | null;
  readonly bom: boolean;
  readonly warnings: readonly { code: T.WarningCode; count: number }[];
}

export interface MergePlanData {
  readonly plan: Omit<T.MergePlan, "planId">;
  readonly headerRow: readonly T.Value[] | null;
  readonly rows: readonly (readonly T.Value[])[];
  readonly options: T.MergeOptions;
}

const blank: T.Value = { _tag: "Blank" };
const text = (value: string): T.Value => ({ _tag: "Text", text: value });
const splitPartSuffix = /-part-\d+-of-\d+$/u;

/** The Merge name strips a Split part suffix, then adds the new suffix. */
export const mergeFileName = (firstSourceName: string): string => {
  const stem = cleanDownloadName(
    firstSourceName.replace(/\.[^.]*$/u, "").replace(splitPartSuffix, "")
  );
  return clampFileName(`${stem}-merged.csv`, 120);
};

/** Header columns match after case folding and outer space removal. */
export const foldHeader = (label: string): string =>
  label.trim().normalize("NFC").toLowerCase();

interface SourceView {
  readonly sheet: MergeSheet;
  readonly headerRow: readonly T.Value[] | null;
  readonly dataRows: readonly (readonly T.Value[])[];
  readonly labels: readonly string[];
  readonly keys: readonly string[];
  readonly validHeader: boolean;
}

const viewOf = (sheet: MergeSheet, header: boolean): SourceView => {
  const headerRow = header ? (sheet.header ?? sheet.rows[0] ?? null) : null;
  const dataRows = header
    ? sheet.header
      ? sheet.rows
      : sheet.rows.slice(1)
    : sheet.header
      ? [sheet.header, ...sheet.rows]
      : sheet.rows;
  const labels = headerRow
    ? Array.from({ length: sheet.columns }, (_value, index) =>
        display(headerRow[index] ?? blank)
      )
    : [];
  const keys = labels.map(foldHeader);
  const validHeader =
    header &&
    labels.length > 0 &&
    labels.every((label) => label.trim() !== "") &&
    new Set(keys).size === keys.length;
  return { sheet, headerRow, dataRows, labels, keys, validHeader };
};

/**
 * Append the rows of every Merge Source into one matrix. Header columns match
 * by folded text; a duplicate or blank header falls back to position. The
 * result holds the header row once, in Merge Order, and fills missing cells.
 */
export const buildMergePlan = (
  sources: readonly MergeSheet[],
  options: T.MergeOptions,
  ctx: FailureContext
): MergePlanData => {
  if (sources.length === 0) {
    throw new T.InvalidRequest({ ...ctx, field: "sources" });
  }
  if (options.delimiter === "\t") {
    throw new T.InvalidRequest({ ...ctx, field: "options.delimiter" });
  }
  const views = sources.map((sheet) => viewOf(sheet, options.header));
  const positional =
    !options.header ||
    views.some(
      (view) =>
        view.sheet.columns > 0 &&
        (view.headerRow !== null || view.dataRows.length > 0) &&
        !view.validHeader
    );
  let outputWidth = 0;
  let columns: string[] = [];
  const mappings: number[][] = [];
  const matched: number[] = [];
  const added: number[] = [];
  if (positional) {
    outputWidth = views.reduce(
      (width, view) => Math.max(width, view.sheet.columns),
      0
    );
    columns = options.header
      ? Array.from(
          { length: outputWidth },
          (_value, index) =>
            views.find(
              (view) =>
                index < view.sheet.columns && view.labels[index] !== undefined
            )?.labels[index] ?? ""
        )
      : [];
    let previousWidth = 0;
    for (const view of views) {
      const width = view.sheet.columns;
      mappings.push(Array.from({ length: width }, (_value, index) => index));
      const newColumns = Math.max(0, width - previousWidth);
      added.push(newColumns);
      matched.push(width - newColumns);
      previousWidth = Math.max(previousWidth, width);
    }
  } else {
    const indexByKey = new Map<string, number>();
    const labelByKey = new Map<string, string>();
    const keys: string[] = [];
    for (const view of views) {
      let newColumns = 0;
      const mapping: number[] = [];
      for (const [index, key] of view.keys.entries()) {
        let target = indexByKey.get(key);
        if (target === undefined) {
          target = keys.length;
          indexByKey.set(key, target);
          labelByKey.set(key, view.labels[index] ?? "");
          keys.push(key);
          newColumns += 1;
        }
        mapping.push(target);
      }
      mappings.push(mapping);
      added.push(newColumns);
      matched.push(view.keys.length - newColumns);
    }
    outputWidth = keys.length;
    columns = keys.map((key) => labelByKey.get(key) ?? "");
  }
  const rows: T.Value[][] = [];
  let blankCells = 0;
  for (const [index, view] of views.entries()) {
    const width = view.sheet.columns;
    const mapping = mappings[index] ?? [];
    for (const row of view.dataRows) {
      const output: T.Value[] = Array.from(
        { length: outputWidth },
        () => blank
      );
      for (let column = 0; column < width; column += 1) {
        const target = mapping[column];
        if (target !== undefined) {
          output[target] = row[column] ?? blank;
        }
      }
      blankCells += Math.max(0, outputWidth - width);
      rows.push(output);
    }
  }
  if (!options.header && rows.length === 0) {
    outputWidth = 0;
  }
  const headerRow =
    options.header && outputWidth > 0
      ? columns.map((label) => text(label))
      : null;
  const warningCounts = new Map<T.WarningCode, number>();
  for (const view of views) {
    for (const warning of view.sheet.warnings) {
      if (warning.code !== "unresolved-value") {
        warningCounts.set(
          warning.code,
          (warningCounts.get(warning.code) ?? 0) + warning.count
        );
      }
    }
  }
  const unresolved = views.reduce(
    (count, view) => count + view.sheet.unresolved,
    0
  );
  const valuesOnly = views.some(
    (view) => view.sheet.format === "xls" || view.sheet.format === "xlsx"
  );
  return {
    plan: {
      filename: mergeFileName(views[0]?.sheet.name ?? "merged"),
      mime: "text/csv;charset=utf-8",
      sources: views.map((view, index) => ({
        sourceId: view.sheet.sourceId,
        name: view.sheet.name,
        sheetName: view.sheet.sheetName,
        origin: view.sheet.origin,
        format: view.sheet.format,
        rows: view.dataRows.length,
        columns: view.sheet.columns,
        matchedColumns: matched[index] ?? 0,
        newColumns: added[index] ?? 0,
        unresolved: view.sheet.unresolved,
        workbook: view.sheet.format === "xls" || view.sheet.format === "xlsx",
      })),
      columns,
      header: options.header,
      positional,
      totalRows: rows.length,
      totalColumns: outputWidth,
      blankCells,
      unresolved,
      valuesOnly,
      warnings: [...warningCounts].map(([code, count]) => ({ code, count })),
    },
    headerRow,
    rows,
    options,
  };
};
