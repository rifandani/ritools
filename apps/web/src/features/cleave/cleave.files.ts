import { Schema } from "effect";

import { canonicalLanguage } from "./cleave.languages";

const Resolution = Schema.Struct({
  id: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  choice: Schema.Literals(["before", "after", "both"]),
});
export type Resolution = Schema.Schema.Type<typeof Resolution>;

export const ComparisonFile = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.NonEmptyString,
  number: Schema.Int.check(Schema.isGreaterThan(0)),
  texts: Schema.Struct({
    before: Schema.String,
    after: Schema.String,
    beforeName: Schema.optional(Schema.String),
    afterName: Schema.optional(Schema.String),
  }),
  compared: Schema.Boolean,
  resolving: Schema.Boolean,
  language: Schema.String,
  choices: Schema.Array(Resolution),
});
export type ComparisonFile = Schema.Schema.Type<typeof ComparisonFile>;

export interface Files {
  readonly entries: readonly ComparisonFile[];
  readonly selected: string | null;
  readonly nextNumber: number;
}
export const emptyFiles: Files = { entries: [], selected: null, nextNumber: 1 };
export const newComparison = (id: string, number: number): ComparisonFile => ({
  version: 1,
  id,
  number,
  texts: { before: "", after: "" },
  compared: false,
  resolving: false,
  language: "auto",
  choices: [],
});
export const fileLanguage = (file: ComparisonFile) =>
  file.language === "auto"
    ? "auto"
    : (canonicalLanguage(file.language) ?? "auto");

export const closeComparison = (files: Files, id: string): Files => {
  const index = files.entries.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return files;
  }
  const entries = files.entries.filter((entry) => entry.id !== id);
  return {
    ...files,
    entries,
    selected:
      files.selected === id
        ? (entries[Math.min(index, entries.length - 1)]?.id ?? null)
        : files.selected,
  };
};

export class CleaveStorageError extends Schema.TaggedError<CleaveStorageError>()(
  "CleaveStorageError",
  { reason: Schema.Literals(["read", "write"]) }
) {}
