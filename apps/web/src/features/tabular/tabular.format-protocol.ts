/* oxlint-disable anti-slop/no-shape-in-symbol-names -- The format job uses the public jsonShape setting. */
import { Schema } from "effect";

import * as T from "./tabular";
import type { ParsedFile } from "./tabular.format";

const Context = Schema.Struct({
  requestId: T.RequestId,
  operation: Schema.String,
  sessionId: Schema.NullOr(T.SessionId),
});
export const FormatRequest = Schema.TaggedUnion({
  Parse: { source: T.Source, options: T.ParseOptions, ctx: Context },
  Write: {
    job: Schema.Struct({
      format: T.OutputFormat,
      sourceName: Schema.String,
      sheets: Schema.Array(
        Schema.Struct({
          name: Schema.String,
          visibility: T.Visibility,
          width: T.Count,
          header: Schema.Boolean,
          rows: Schema.Array(Schema.Array(T.Value)),
        })
      ),
      options: T.ExportOptions,
      jsonShape: T.ExportPlan.fields.jsonShape,
      headers: Schema.Boolean,
      locale: T.Locale,
    }),
    ctx: Context,
  },
});

export const PackedFile = Schema.Struct({
  format: T.InputFormat,
  encoding: T.Candidate.fields.encoding,
  delimiter: T.Candidate.fields.delimiter,
  newline: T.Candidate.fields.newline,
  bom: Schema.Boolean,
  sheets: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      visibility: T.Visibility,
      width: T.Count,
      header: Schema.Boolean,
      rows: Schema.Array(
        Schema.Array(
          Schema.Union([
            Schema.String,
            Schema.Struct({ value: T.Value, origin: T.Cell.fields.origin }),
          ])
        )
      ),
      warnings: Schema.Array(
        Schema.Struct({
          code: T.WarningCode,
          count: T.Count,
          sourceRecord: Schema.optionalKey(T.Count),
        })
      ),
    })
  ),
});

export const Written = Schema.Struct({
  bytes: Schema.Uint8Array,
  pages: T.Count,
});
export type Written = typeof Written.Type;

export const FormatReply = Schema.TaggedUnion({
  Success: { payload: Schema.Union([PackedFile, Written]) },
  Failure: { payload: T.EngineError },
});

export type PackedFile = typeof PackedFile.Type;
/** Compact text cells between Workers; keep workbook type/provenance intact. */
export const packFile = (file: ParsedFile): PackedFile => ({
  format: file.format,
  encoding: file.encoding,
  delimiter: file.delimiter,
  newline: file.newline,
  bom: file.bom,
  sheets: file.sheets.map((s) => ({
    ...s,
    rows: s.rows.map((r) =>
      r.map((c) =>
        c.origin === "text" && c.value._tag === "Text" ? c.value.text : c
      )
    ),
  })),
});
export const unpackFile = (file: PackedFile, source: T.Source): ParsedFile => ({
  ...file,
  source,
  sheets: file.sheets.map((s) => ({
    ...s,
    rows: s.rows.map((r) =>
      r.map((c) =>
        // oxlint-disable-next-line anti-slop/no-runtime-typeof -- The packed union was validated by PackedFile at the Worker boundary.
        typeof c === "string"
          ? { value: { _tag: "Text", text: c }, origin: "text" }
          : c
      )
    ),
  })),
});
