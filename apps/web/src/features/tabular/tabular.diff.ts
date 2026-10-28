/* oxlint-disable eslint/complexity -- One plan function owns header checks, keys, row matching, counts, and paging. */
import { clampFileName } from "@/core/libs/files";

import * as T from "./tabular";
import type { FailureContext, ParsedFile, StoredCell } from "./tabular.format";
import { display } from "./tabular.format";
import { foldHeader } from "./tabular.merge";
import { cleanDownloadName } from "./tabular.split";

/** One parsed table for a Diff. The header is separate from the data rows. */
export interface DiffSheet {
  readonly name: string;
  readonly sheetName: string;
  readonly format: T.InputFormat;
  readonly header: readonly T.Value[] | null;
  readonly rows: readonly (readonly T.Value[])[];
  readonly columns: number;
  readonly unresolved: number;
  readonly workbook: boolean;
}
export interface DiffRows {
  readonly added: readonly T.DiffRowItem[];
  readonly removed: readonly T.DiffRowItem[];
  readonly changed: readonly T.DiffRowItem[];
}
export interface DiffPlanData {
  readonly plan: Omit<T.DiffPlan, "planId" | "sessionId" | "revision">;
  readonly rows: DiffRows;
}

const blank: T.Value = { _tag: "Blank" };
const text = (value: string): T.Value => ({ _tag: "Text", text: value });
const isBlankValue = (value: T.Value): boolean =>
  value._tag === "Blank" || (value._tag === "Text" && value.text.trim() === "");
const isEmptyText = (value: T.Value): boolean =>
  value._tag === "Blank" || (value._tag === "Text" && value.text === "");

/**
 * The canonical text of one value for a Diff. Numbers match by value, text
 * matches after outer-space trim, blank matches only blank, and the tag keeps
 * a number and a text value apart.
 */
const canonical = (value: T.Value): string => {
  switch (value._tag) {
    case "Text": {
      return JSON.stringify(["t", value.text.trim()]);
    }
    case "Number": {
      return JSON.stringify(["n", value.value]);
    }
    case "Boolean": {
      return JSON.stringify(["b", value.value]);
    }
    case "Blank": {
      return JSON.stringify(["blank"]);
    }
    case "Unresolved": {
      return JSON.stringify(["u", value.display]);
    }
    default: {
      const unreachable: never = value;
      return unreachable;
    }
  }
};
const sameValue = (a: T.Value, b: T.Value): boolean =>
  canonical(a) === canonical(b);
const keyOf = (
  values: readonly T.Value[],
  indexes: readonly number[]
): string =>
  /* v8 ignore next -- @preserve A valid plan row always holds its key and every compared column. */
  JSON.stringify(indexes.map((index) => canonical(values[index] ?? blank)));
const keyDisplay = (
  values: readonly T.Value[],
  indexes: readonly number[]
  /* v8 ignore next -- @preserve A valid plan row always holds its key and every compared column. */
): string[] => indexes.map((index) => display(values[index] ?? blank));
const rowDisplay = (sheet: DiffSheet, row: readonly T.Value[]): string[] =>
  Array.from({ length: sheet.columns }, (_value, index) =>
    display(row[index] ?? blank)
  );
const countUnresolved = (rows: readonly (readonly StoredCell[])[]): number =>
  rows.reduce(
    (count, row) =>
      count + row.filter((cell) => cell.value._tag === "Unresolved").length,
    0
  );

interface HeaderInfo {
  readonly labels: readonly string[];
  readonly keys: readonly string[];
  readonly indexByKey: ReadonlyMap<string, number>;
  readonly state: T.DiffHeaderState;
}

const headerInfo = (sheet: DiffSheet): HeaderInfo => {
  if (!sheet.header || sheet.columns === 0) {
    return {
      labels: [],
      keys: [],
      indexByKey: new Map(),
      state: { present: false, valid: false, blank: 0, duplicates: [] },
    };
  }
  const labels = Array.from({ length: sheet.columns }, (_value, index) =>
    display(sheet.header?.[index] ?? blank)
  );
  const keys = labels.map(foldHeader);
  let blankCount = 0;
  const seen = new Map<string, number>();
  const duplicates: string[] = [];
  for (const [index, label] of labels.entries()) {
    if (label.trim() === "") {
      blankCount += 1;
      continue;
    }
    /* v8 ignore next -- @preserve The key list and the label list have one entry per column. */
    const key = keys[index] ?? "";
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 1) {
      duplicates.push(label);
    }
  }
  const indexByKey = new Map<string, number>();
  for (const [index, key] of keys.entries()) {
    indexByKey.set(key, index);
  }
  return {
    labels,
    keys,
    indexByKey,
    state: {
      present: true,
      valid: blankCount === 0 && duplicates.length === 0,
      blank: blankCount,
      duplicates,
    },
  };
};

interface KeyScan {
  readonly blank: number;
  readonly duplicate: number;
  readonly repeated: readonly string[];
}

const scanKeys = (sheet: DiffSheet, indexes: readonly number[]): KeyScan => {
  const seen = new Map<string, number>();
  const repeated = new Map<string, string>();
  let blankCount = 0;
  let duplicate = 0;
  for (const row of sheet.rows) {
    const values = indexes.map((index) => row[index] ?? blank);
    if (values.some(isBlankValue)) {
      blankCount += 1;
      continue;
    }
    const key = values.map(canonical).join("\u0000");
    if (seen.has(key)) {
      duplicate += 1;
      repeated.set(key, values.map(display).join(" | "));
    } else {
      seen.set(key, 1);
    }
  }
  return {
    blank: blankCount,
    duplicate,
    repeated: [...repeated.values()].slice(0, 10),
  };
};

const side = (sheet: DiffSheet, header: HeaderInfo): T.DiffSide => ({
  name: sheet.name,
  sheetName: sheet.sheetName,
  format: sheet.format,
  rows: sheet.rows.length,
  columns: header.labels,
  unresolved: sheet.unresolved,
  workbook: sheet.workbook,
  header: header.state,
});

/** Read one Sheet of a parsed Compared File as a Diff table. */
export const diffSheetFromFile = (
  parsed: ParsedFile,
  sheetName: string,
  ctx: FailureContext
): DiffSheet => {
  const source = parsed.sheets.find((sheet) => sheet.name === sheetName);
  if (!source) {
    throw new T.InvalidRequest({ ...ctx, field: "sheetName" });
  }
  const values = (row: readonly StoredCell[]): T.Value[] =>
    Array.from(
      { length: source.width },
      (_value, index) => row[index]?.value ?? blank
    );
  return {
    name: parsed.source.name,
    sheetName: source.name,
    format: parsed.format,
    header: source.rows[0] ? values(source.rows[0]) : null,
    rows: source.rows.slice(1).map(values),
    columns: source.width,
    unresolved: countUnresolved(source.rows),
    workbook: parsed.format === "xls" || parsed.format === "xlsx",
  };
};

/** The report the Compared File returns before a key or a plan exists. */
export const diffSourceReport = (
  sourceId: T.DiffSourceId,
  parsed: ParsedFile
): T.DiffSourceReport => ({
  sourceId,
  name: parsed.source.name,
  size: parsed.source.size,
  format: parsed.format,
  workbook: parsed.format === "xls" || parsed.format === "xlsx",
  delimiter: parsed.delimiter?.value ?? null,
  newline: parsed.newline,
  bom: parsed.bom,
  sheets: parsed.sheets.map((sheet) => ({
    name: sheet.name,
    visibility: sheet.visibility,
    rows: Math.max(0, sheet.rows.length - 1),
    columns: sheet.width,
    unresolved: countUnresolved(sheet.rows),
    header: sheet.rows.length > 0 && sheet.width > 0,
  })),
});

/**
 * Compare two tables by a Diff Key. Both headers must be present, non-blank,
 * and unique. Shared columns match by folded header text. The result holds
 * Added, Removed, and Changed Rows in that order; an unchanged row is counted
 * and not stored. Counts are null until the key is valid.
 */
export const buildDiffPlan = (
  beforeSheet: DiffSheet,
  afterSheet: DiffSheet,
  options: T.DiffOptions
): DiffPlanData => {
  const beforeHeader = headerInfo(beforeSheet);
  const afterHeader = headerInfo(afterSheet);
  const sharedKeys: string[] = [];
  for (const key of beforeHeader.indexByKey.keys()) {
    if (afterHeader.indexByKey.has(key)) {
      sharedKeys.push(key);
    }
  }
  const shared = sharedKeys.map(
    /* v8 ignore next -- @preserve The key map and the label list have one entry per column. */
    (key) => beforeHeader.labels[beforeHeader.indexByKey.get(key) ?? 0] ?? ""
  );
  const oneSidedBefore: string[] = [];
  for (const [key, index] of beforeHeader.indexByKey) {
    if (!afterHeader.indexByKey.has(key)) {
      /* v8 ignore next -- @preserve The key map and the label list have one entry per column. */
      oneSidedBefore.push(beforeHeader.labels[index] ?? "");
    }
  }
  const oneSidedAfter: string[] = [];
  for (const [key, index] of afterHeader.indexByKey) {
    if (!beforeHeader.indexByKey.has(key)) {
      /* v8 ignore next -- @preserve The key map and the label list have one entry per column. */
      oneSidedAfter.push(afterHeader.labels[index] ?? "");
    }
  }
  const keyFolded = options.keys.map(foldHeader);
  const keys: string[] = [];
  const seenKeys = new Set<string>();
  for (const key of keyFolded) {
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);
    if (beforeHeader.indexByKey.has(key) && afterHeader.indexByKey.has(key)) {
      keys.push(key);
    }
  }
  const missing = options.keys.filter((label) => {
    const key = foldHeader(label);
    return (
      !beforeHeader.indexByKey.has(key) || !afterHeader.indexByKey.has(key)
    );
  });
  /* v8 ignore next -- @preserve The key was checked against both header maps above. */
  const keyBefore = keys.map((key) => beforeHeader.indexByKey.get(key) ?? -1);
  /* v8 ignore next -- @preserve The key was checked against both header maps above. */
  const keyAfter = keys.map((key) => afterHeader.indexByKey.get(key) ?? -1);
  const keySet = new Set(keys);
  const comparedKeys = sharedKeys.filter((key) => !keySet.has(key));
  const comparedLabels = comparedKeys.map(
    /* v8 ignore next -- @preserve The key map and the label list have one entry per column. */
    (key) => beforeHeader.labels[beforeHeader.indexByKey.get(key) ?? 0] ?? ""
  );
  const comparedBefore = comparedKeys.map(
    /* v8 ignore next -- @preserve The key was checked against both header maps above. */
    (key) => beforeHeader.indexByKey.get(key) ?? -1
  );
  const comparedAfter = comparedKeys.map(
    /* v8 ignore next -- @preserve The key was checked against both header maps above. */
    (key) => afterHeader.indexByKey.get(key) ?? -1
  );
  const beforeScan = keys.length > 0 ? scanKeys(beforeSheet, keyBefore) : null;
  const afterScan = keys.length > 0 ? scanKeys(afterSheet, keyAfter) : null;
  const repeated = [
    ...new Set([
      ...(beforeScan?.repeated ?? []),
      ...(afterScan?.repeated ?? []),
    ]),
  ].slice(0, 10);
  const keyState: T.DiffKeyState = {
    valid:
      keys.length > 0 &&
      missing.length === 0 &&
      /* v8 ignore next -- @preserve A scan exists whenever the key list is not empty. */
      (beforeScan?.blank ?? 1) === 0 &&
      /* v8 ignore next -- @preserve A scan exists whenever the key list is not empty. */
      (afterScan?.blank ?? 1) === 0 &&
      /* v8 ignore next -- @preserve A scan exists whenever the key list is not empty. */
      (beforeScan?.duplicate ?? 1) === 0 &&
      /* v8 ignore next -- @preserve A scan exists whenever the key list is not empty. */
      (afterScan?.duplicate ?? 1) === 0,
    missing,
    blankBefore: beforeScan?.blank ?? 0,
    blankAfter: afterScan?.blank ?? 0,
    duplicateBefore: beforeScan?.duplicate ?? 0,
    duplicateAfter: afterScan?.duplicate ?? 0,
    repeated,
  };
  const valid =
    beforeHeader.state.valid &&
    afterHeader.state.valid &&
    keyState.valid &&
    beforeSheet.unresolved === 0 &&
    afterSheet.unresolved === 0 &&
    comparedBefore.every((index) => index >= 0) &&
    comparedAfter.every((index) => index >= 0) &&
    keyBefore.every((index) => index >= 0) &&
    keyAfter.every((index) => index >= 0);
  const plan: DiffPlanData["plan"] = {
    direction: options.direction,
    before: side(beforeSheet, beforeHeader),
    after: side(afterSheet, afterHeader),
    keys: keys.map(
      /* v8 ignore next -- @preserve The key map and the label list have one entry per column. */
      (key) => beforeHeader.labels[beforeHeader.indexByKey.get(key) ?? 0] ?? ""
    ),
    shared,
    columns: comparedLabels,
    oneSidedBefore,
    oneSidedAfter,
    key: keyState,
    counts: null,
  };
  if (!valid) {
    return {
      plan,
      rows: { added: [], removed: [], changed: [] },
    };
  }
  const afterByKey = new Map<string, number>();
  for (const [index, row] of afterSheet.rows.entries()) {
    afterByKey.set(keyOf(row, keyAfter), index);
  }
  const beforeByKey = new Map<string, number>();
  for (const [index, row] of beforeSheet.rows.entries()) {
    beforeByKey.set(keyOf(row, keyBefore), index);
  }
  const added: T.DiffRowItem[] = [];
  const removed: T.DiffRowItem[] = [];
  const changed: T.DiffRowItem[] = [];
  let unchanged = 0;
  for (const row of beforeSheet.rows) {
    const key = keyOf(row, keyBefore);
    const afterIndex = afterByKey.get(key);
    if (afterIndex === undefined) {
      removed.push({
        status: "removed",
        key: keyDisplay(row, keyBefore),
        before: rowDisplay(beforeSheet, row),
        after: null,
        changes: [],
      });
      continue;
    }
    /* v8 ignore next -- @preserve The index comes from the row map of this Sheet. */
    const afterRow = afterSheet.rows[afterIndex] ?? [];
    const changes: T.DiffChange[] = [];
    for (const [position, label] of comparedLabels.entries()) {
      /* v8 ignore next -- @preserve The key was checked against both header maps above. */
      const beforeIndex = comparedBefore[position] ?? -1;
      /* v8 ignore next -- @preserve The key was checked against both header maps above. */
      const afterColumn = comparedAfter[position] ?? -1;
      const beforeValue = row[beforeIndex] ?? blank;
      const afterValue = afterRow[afterColumn] ?? blank;
      if (!sameValue(beforeValue, afterValue)) {
        changes.push({
          column: label,
          before: display(beforeValue),
          after: display(afterValue),
          beforeBlank: isEmptyText(beforeValue),
          afterBlank: isEmptyText(afterValue),
        });
      }
    }
    if (changes.length === 0) {
      unchanged += 1;
    } else {
      changed.push({
        status: "changed",
        key: keyDisplay(row, keyBefore),
        before: rowDisplay(beforeSheet, row),
        after: rowDisplay(afterSheet, afterRow),
        changes,
      });
    }
  }
  for (const row of afterSheet.rows) {
    const key = keyOf(row, keyAfter);
    if (!beforeByKey.has(key)) {
      added.push({
        status: "added",
        key: keyDisplay(row, keyAfter),
        before: null,
        after: rowDisplay(afterSheet, row),
        changes: [],
      });
    }
  }
  return {
    plan: {
      ...plan,
      counts: {
        added: added.length,
        removed: removed.length,
        changed: changed.length,
        unchanged,
      },
    },
    rows: { added, removed, changed },
  };
};

/** One page of the Diff rows for the chosen filter. */
export const diffPage = (
  planId: T.DiffPlanId,
  data: DiffPlanData,
  filter: T.DiffFilter,
  offset: number,
  limit: number
): T.DiffPage => {
  const rows =
    filter === "all"
      ? [...data.rows.added, ...data.rows.removed, ...data.rows.changed]
      : data.rows[filter];
  return {
    planId,
    filter,
    offset,
    total: rows.length,
    nextOffset: offset + limit < rows.length ? offset + limit : null,
    items: rows.slice(offset, offset + limit),
  };
};

/** The Diff Report rows: header, then Added, Removed, and Changed Rows. */
export const diffReportRows = (data: DiffPlanData): T.Value[][] => {
  const { plan, rows } = data;
  const header: T.Value[] = [
    text("status"),
    ...plan.keys.map(text),
    text("changed_columns"),
    ...plan.columns.flatMap((label) => [
      text(`${label} (before)`),
      text(`${label} (after)`),
    ]),
  ];
  const beforeIndex = new Map(
    plan.before.columns.map((label, index) => [foldHeader(label), index])
  );
  const afterIndex = new Map(
    plan.after.columns.map((label, index) => [foldHeader(label), index])
  );
  const cell = (
    indexes: ReadonlyMap<string, number>,
    values: readonly string[] | null,
    label: string
  ): T.Value => {
    if (!values) {
      return blank;
    }
    const index = indexes.get(foldHeader(label));
    if (index === undefined) {
      return blank;
    }
    return text(values[index] ?? "");
  };
  return [
    header,
    ...[...rows.added, ...rows.removed, ...rows.changed].map(
      (row): T.Value[] => [
        text(row.status),
        ...row.key.map(text),
        text(row.changes.map((change) => change.column).join("; ")),
        ...plan.columns.flatMap((label) => [
          cell(beforeIndex, row.before, label),
          cell(afterIndex, row.after, label),
        ]),
      ]
    ),
  ];
};

/** The Diff Report name is the After source stem, then `-diff.csv`. */
export const diffFileName = (afterName: string): string => {
  const stem = cleanDownloadName(afterName.replace(/\.[^.]*$/u, ""));
  const suffix = "-diff.csv";
  const room = Math.max(1, 120 - suffix.length);
  return `${clampFileName(stem, room)}${suffix}`;
};
