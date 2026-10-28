import type * as T from "./tabular";

export interface DedupeRow {
  readonly rowId: T.RowId;
  readonly values: readonly string[];
}
export interface DedupeResult {
  readonly rows: number;
  readonly duplicates: number;
  readonly remaining: number;
  readonly duplicateIds: readonly T.RowId[];
}

/**
 * One Dedupe key: the displayed values at the chosen indexes, in column order.
 * JSON keeps the field boundaries, so `["a,b"]` and `["a","b"]` differ.
 */
export const dedupeKey = (
  values: readonly string[],
  indexes: readonly number[]
): string => JSON.stringify(indexes.map((index) => values[index] ?? ""));

/**
 * The rows whose key repeats an earlier row. The first row of each key stays.
 * `indexes` is never empty; every column index means a whole-row Dedupe.
 */
export const findDuplicates = (
  rows: readonly DedupeRow[],
  indexes: readonly number[]
): DedupeResult => {
  const seen = new Set<string>();
  const duplicateIds: T.RowId[] = [];
  for (const row of rows) {
    const key = dedupeKey(row.values, indexes);
    if (seen.has(key)) {
      duplicateIds.push(row.rowId);
    } else {
      seen.add(key);
    }
  }
  return {
    rows: rows.length,
    duplicates: duplicateIds.length,
    remaining: rows.length - duplicateIds.length,
    duplicateIds,
  };
};
