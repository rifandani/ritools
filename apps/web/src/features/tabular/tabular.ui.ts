import { Effect, Schema } from "effect";

import * as T from "./tabular";

export interface GridPosition {
  readonly row: number;
  readonly column: number;
}
export interface GridRange {
  readonly anchor: GridPosition;
  readonly extent: GridPosition;
}
export const requestId = () => T.RequestId.make(crypto.randomUUID());
export const boundsOf = (range: GridRange) => ({
  rowStart: Math.min(range.anchor.row, range.extent.row),
  rowEnd: Math.max(range.anchor.row, range.extent.row),
  columnStart: Math.min(range.anchor.column, range.extent.column),
  columnEnd: Math.max(range.anchor.column, range.extent.column),
});
export const columnName = (index: number): string => {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    n -= 1;
    name = String.fromCodePoint(65 + (n % 26)) + name;
    n = Math.floor(n / 26);
  }
  return name;
};
export const displayValue = (value: T.Value): string => {
  switch (value._tag) {
    case "Text": {
      return value.text;
    }
    case "Number": {
      return String(value.value);
    }
    case "Boolean": {
      return value.value ? "TRUE" : "FALSE";
    }
    case "Unresolved": {
      return value.display;
    }
    case "Blank": {
      return "";
    }
    default: {
      const unreachable: never = value;
      return unreachable;
    }
  }
};
export const quotedTsv = (values: readonly (readonly string[])[]) =>
  values
    .map((row) =>
      row
        .map((value) =>
          /[\t\r\n"]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value
        )
        .join("\t")
    )
    .join("\n");

export const readLocalFile = Effect.fn("Tabular.UI.readLocalFile")(function* (
  file: File
) {
  const bytes = yield* Effect.tryPromise({
    try: async () => new Uint8Array(await file.arrayBuffer()),
    catch: () =>
      new T.CorruptFile({
        requestId: requestId(),
        operation: "read-file",
        sessionId: null,
      }),
  });
  return { name: file.name, size: file.size, bytes } satisfies T.Source;
});
export const parsePaste = Effect.fn("Tabular.UI.parsePaste")(function* (
  text: string
) {
  const { parseText } = yield* Effect.promise(() => import("./tabular.text"));
  const ctx = { requestId: requestId(), operation: "paste", sessionId: null };
  return yield* Effect.try({
    try: () => {
      const values = parseText(text, "\t", ctx);
      if (
        !values.length ||
        values.some((row) => row.length !== values[0]?.length)
      ) {
        throw new Error("Invalid rectangle");
      }
      return values;
    },
    catch: () => new T.InvalidPaste({ ...ctx, reason: "syntax" }),
  });
});
export const writeClipboard = Effect.fn("Tabular.UI.writeClipboard")(
  (text: string) =>
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(text),
      catch: () => "clipboard-denied" as const,
    })
);
/**
 * Copy text that a Worker still reads. The copy event runs inside the browser's
 * trusted gesture, so a promised `ClipboardItem` keeps that trust while the
 * text settles. A plain `writeText` after an await can lose the gesture.
 */
export const writeClipboardWhenReady = Effect.fn(
  "Tabular.UI.writeClipboardWhenReady"
)((text: Promise<string | null>) =>
  Effect.tryPromise({
    try: async () => {
      if (globalThis.ClipboardItem && navigator.clipboard) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/plain": text.then((value) => {
                if (value === null) {
                  throw new Error("No text");
                }
                return new Blob([value], { type: "text/plain" });
              }),
            }),
          ]);
          return true;
        } catch {
          // Some browsers refuse a promised item. Write the settled text below.
        }
      }
      const value = await text;
      if (value === null) {
        return false;
      }
      await navigator.clipboard.writeText(value);
      return true;
    },
    catch: () => "clipboard-denied" as const,
  })
);

/** Atom promise rejections can contain an Effect Cause. Never print the rejection. */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- This function decodes the unknown rejection from an Atom or Effect promise.
export const engineFailure = (error: unknown): T.EngineError | null => {
  if (Schema.is(T.EngineError)(error)) {
    return error;
  }
  if (Schema.is(Schema.Struct({ cause: Schema.Unknown }))(error)) {
    const { cause } = error;
    if (
      Schema.is(Schema.Struct({ reasons: Schema.Array(Schema.Unknown) }))(cause)
    ) {
      for (const reason of cause.reasons) {
        if (Schema.is(Schema.Struct({ error: T.EngineError }))(reason)) {
          return reason.error;
        }
      }
    }
  }
  return null;
};

export const stockSample = (): T.Source => {
  const text =
    'SKU,Item,Location,Quantity,Note\n00104,Paper clips,A-03,48,"Keep leading zeros"\n00027,Notebook,B-12,12,"Two lines:\ncheck stock"\n00931,Pencil,A-01,120,"  keep spaces  "\n00008,Marker,C-02,0,\n';
  const bytes = new TextEncoder().encode(text);
  return { name: "stock-list.csv", size: bytes.length, bytes };
};
