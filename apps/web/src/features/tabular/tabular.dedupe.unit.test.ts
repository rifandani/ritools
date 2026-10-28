import { describe, expect, it } from "@effect/vitest";

import * as T from "./tabular";
import { dedupeKey, findDuplicates } from "./tabular.dedupe";

const row = (id: string, ...values: string[]) => ({
  rowId: T.RowId.make(id),
  values,
});

describe("dedupe", () => {
  it("keeps the field boundaries in one key", () => {
    expect(dedupeKey(["a,b", "c"], [0])).toBe('["a,b"]');
    expect(dedupeKey(["a", "b"], [0, 1])).toBe('["a","b"]');
    expect(dedupeKey(["a"], [0, 1])).toBe('["a",""]');
  });
  it("keeps the first row of each exact key", () => {
    const result = findDuplicates(
      [
        row("1", "a", "x"),
        row("2", "a", "x"),
        row("3", "b", "x"),
        row("4", "a", "x"),
      ],
      [0, 1]
    );
    expect(result).toEqual({
      rows: 4,
      duplicates: 2,
      remaining: 2,
      duplicateIds: [T.RowId.make("2"), T.RowId.make("4")],
    });
  });
  it("compares only the chosen columns", () => {
    const rows = [row("1", "a", "x"), row("2", "a", "y"), row("3", "b", "z")];
    expect(findDuplicates(rows, [0]).duplicates).toBe(1);
    expect(findDuplicates(rows, [0, 1]).duplicates).toBe(0);
  });
  it("matches case, spaces, and blanks exactly", () => {
    const rows = [
      row("1", "a", ""),
      row("2", "A", ""),
      row("3", " a", ""),
      row("4", "a", " "),
    ];
    expect(findDuplicates(rows, [0, 1]).duplicates).toBe(0);
    const blanks = [row("1", "", ""), row("2", "", "")];
    expect(findDuplicates(blanks, [0, 1]).duplicateIds).toEqual([
      T.RowId.make("2"),
    ]);
  });
  it("reports no duplicates for no rows", () => {
    expect(findDuplicates([], [0])).toEqual({
      rows: 0,
      duplicates: 0,
      remaining: 0,
      duplicateIds: [],
    });
  });
});
