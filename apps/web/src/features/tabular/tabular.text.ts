import Papa from "papaparse";

import * as T from "./tabular";
import type { FailureContext } from "./tabular.format";

/** Papa accepts some illegal quote placements. Validate grammar before parsing. */
// oxlint-disable-next-line eslint/complexity -- This strict CSV state machine rejects quote repair before Papa Parse runs.
export const parseText = (
  text: string,
  delimiter: T.Delimiter,
  ctx: FailureContext
): string[][] => {
  if (!text.length) {
    return [];
  }
  let state: "start" | "plain" | "quoted" | "closed" = "start";
  let record = 1;
  let column = 1;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c && c < " " && c !== "\t" && c !== "\r" && c !== "\n") {
      throw new T.InvalidDelimitedText({ ...ctx, record, column });
    }
    if (state === "quoted") {
      if (c === '"') {
        if (text[i + 1] === '"') {
          i += 1;
        } else {
          state = "closed";
        }
      }
      continue;
    }
    if (c === delimiter) {
      column += 1;
      state = "start";
    } else if (c === "\r" || c === "\n") {
      if (c === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      record += 1;
      column = 1;
      state = "start";
    } else if (c === '"' && state === "start") {
      state = "quoted";
    } else if (c === '"' || state === "closed") {
      throw new T.InvalidDelimitedText({ ...ctx, record, column });
    } else {
      state = "plain";
    }
  }
  if (state === "quoted") {
    throw new T.InvalidDelimitedText({ ...ctx, record, column });
  }
  const result = Papa.parse<string[]>(text, {
    delimiter,
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false,
  });
  if (result.errors.length) {
    throw new T.InvalidDelimitedText({
      ...ctx,
      record: (result.errors[0]?.row ?? 0) + 1,
      column: 1,
    });
  }
  const rows = result.data;
  if (
    /[\r\n]$/u.test(text) &&
    rows.at(-1)?.length === 1 &&
    rows.at(-1)?.[0] === ""
  ) {
    rows.pop();
  }
  return rows;
};
