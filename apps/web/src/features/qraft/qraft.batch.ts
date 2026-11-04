import Papa from "papaparse";

import type { BatchEntry } from "./qraft";

export const parseBatchLines = (text: string): BatchEntry[] =>
  text
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => ({ label: "", payload: line }));

const isHeader = (row: readonly string[]): boolean => {
  const first = (row[0] ?? "").trim().toLowerCase();
  const second = (row[1] ?? "").trim().toLowerCase();
  return (
    (first === "payload" && (second === "label" || second === "")) ||
    (first === "label" && second === "payload")
  );
};

/**
 * A CSV of Payloads, with an optional `label` column.
 *
 * The header is optional. With one, the columns are read by name. Without
 * one, the first column is the Payload and the second is the label.
 */
export const parseBatchCsv = (text: string): BatchEntry[] => {
  const rows = Papa.parse<string[]>(text.replace(/^\uFEFF/u, ""), {
    skipEmptyLines: "greedy",
  }).data;
  const [first, ...rest] = rows;
  if (first === undefined) {
    return [];
  }
  const header = isHeader(first);
  const columns = header
    ? {
        label: first.findIndex((cell) => cell.trim().toLowerCase() === "label"),
        payload: first.findIndex(
          (cell) => cell.trim().toLowerCase() === "payload"
        ),
      }
    : { label: 1, payload: 0 };
  const body = header ? rest : rows;
  const entries: BatchEntry[] = [];
  for (const row of body) {
    const payload = (row[columns.payload] ?? "").trim();
    if (payload !== "") {
      entries.push({
        label: columns.label < 0 ? "" : (row[columns.label] ?? "").trim(),
        payload,
      });
    }
  }
  return entries;
};

/**
 * Reads pasted Batch text.
 *
 * A header row means a CSV; anything else is one Payload per line. A pasted
 * CSV without a header is read as lines on purpose, because a Payload may
 * itself hold a comma.
 */
export const parseBatchText = (text: string): BatchEntry[] => {
  const [first] = Papa.parse<string[]>(text, { preview: 1 }).data;
  return first !== undefined && isHeader(first)
    ? parseBatchCsv(text)
    : parseBatchLines(text);
};
