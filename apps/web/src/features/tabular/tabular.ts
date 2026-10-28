/* oxlint-disable eslint/max-classes-per-file, anti-slop/no-shape-in-symbol-names -- The fixed public contract groups tagged errors and names jsonShape. */
import { Schema } from "effect";

export const Count = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER)
);
export const SessionId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("TabularSession")
);
export type SessionId = typeof SessionId.Type;
export const CandidateId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("TabularCandidate")
);
export type CandidateId = typeof CandidateId.Type;
export const SheetId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("TabularSheet")
);
export type SheetId = typeof SheetId.Type;
export const RowId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("TabularRow")
);
export type RowId = typeof RowId.Type;
export const ColumnId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("TabularColumn")
);
export type ColumnId = typeof ColumnId.Type;
export const RequestId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("TabularRequest")
);
export type RequestId = typeof RequestId.Type;
export const ViewId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("TabularView")
);
export type ViewId = typeof ViewId.Type;
export const PlanId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("TabularPlan")
);
export type PlanId = typeof PlanId.Type;
export const EditId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("TabularEdit")
);
export type EditId = typeof EditId.Type;
export const MergeSourceId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("TabularMergeSource")
);
export type MergeSourceId = typeof MergeSourceId.Type;
export const MergePlanId = Schema.String.check(Schema.isMinLength(1)).pipe(
  Schema.brand("TabularMergePlan")
);
export type MergePlanId = typeof MergePlanId.Type;

export const InputFormat = Schema.Literals([
  "csv",
  "tsv",
  "tab",
  "txt",
  "xls",
  "xlsx",
]);
export const OutputFormat = Schema.Literals([
  "csv",
  "tsv",
  "tab",
  "xls",
  "xlsx",
  "json",
  "clipboard",
  "pdf",
]);
export const PdfOptions = Schema.Struct({
  page: Schema.Literals(["a4", "letter"]),
  orientation: Schema.Literals(["portrait", "landscape"]),
});
export const Locale = Schema.Literals(["en-US", "id-ID"]);
export const Encoding = Schema.Literals([
  "utf-8",
  "utf-16le",
  "utf-16be",
  "windows-1252",
]);
export const Delimiter = Schema.Literals([",", ";", "\t", "|"]);
export const Visibility = Schema.Literals(["visible", "hidden", "very-hidden"]);
export const Value = Schema.TaggedUnion({
  Text: { text: Schema.String },
  Number: { value: Schema.Finite },
  Boolean: { value: Schema.Boolean },
  Blank: {},
  Unresolved: {
    reason: Schema.Literals([
      "missing-formula-result",
      "formula-error",
      "cell-error",
      "unsupported-value",
    ]),
    display: Schema.String,
  },
});
export const Address = Schema.Struct({
  sheetId: SheetId,
  rowId: RowId,
  columnId: ColumnId,
});
export const Guard = Schema.Struct({
  sessionId: SessionId,
  expectedRevision: Count,
});
export const Job = Schema.Struct({ requestId: RequestId });
export const Cell = Schema.Struct({
  rowId: RowId,
  columnId: ColumnId,
  value: Value,
  display: Schema.String,
  origin: Schema.Literals([
    "text",
    "workbook",
    "stored-formula",
    "date-display",
    "edit",
  ]),
  changed: Schema.Boolean,
  canRevert: Schema.Boolean,
});
const Column = Schema.Struct({
  columnId: ColumnId,
  index: Count,
  label: Schema.String,
  blankHeader: Schema.Boolean,
  headerChanged: Schema.Boolean,
  headerValue: Schema.NullOr(Value),
});
export const WarningCode = Schema.Literals([
  "values-only",
  "stored-formula",
  "unresolved-value",
  "date-as-text",
  "merged-cells",
  "hidden-data",
  "ignored-features",
  "encoding-guess",
  "delimiter-guess",
  "ragged-records",
  "all-hidden-output",
  "spreadsheet-safe",
  "source-precision",
]);
export const WarningCount = Schema.Struct({
  code: WarningCode,
  count: Count,
  sheetId: Schema.optionalKey(SheetId),
});
export const Warning = Schema.Struct({
  ...WarningCount.fields,
  address: Schema.optionalKey(Address),
  sourceRecord: Schema.optionalKey(
    Count.check(Schema.isGreaterThanOrEqualTo(1))
  ),
});
const SheetSummary = Schema.Struct({
  sheetId: SheetId,
  name: Schema.String,
  visibility: Visibility,
  header: Schema.Boolean,
  headerRowId: Schema.NullOr(RowId),
  rowCount: Count,
  columnCount: Count,
  unresolvedCount: Count,
  storedFormulaCount: Count,
  changedCellCount: Count,
  structuralEditCount: Count,
});
export const EditKind = Schema.Literals([
  "set-cell",
  "paste",
  "insert-rows",
  "insert-columns",
  "delete-rows",
  "delete-columns",
  "rename-header",
  "revert-cell",
  "revert-all",
]);
const HistoryEntry = Schema.Struct({
  editId: EditId,
  kind: EditKind,
  sheetIds: Schema.Array(SheetId),
});
const History = Schema.Struct({
  canUndo: Schema.Boolean,
  canRedo: Schema.Boolean,
  undoCount: Count,
  redoCount: Count,
  nextUndo: Schema.NullOr(HistoryEntry),
  nextRedo: Schema.NullOr(HistoryEntry),
  estimatedBytes: Count,
  dirty: Schema.Boolean,
  changedCellCount: Count,
  changedHeaderCount: Count,
  structuralEditCount: Count,
});
export const Session = Schema.Struct({
  sessionId: SessionId,
  revision: Count,
  sourceName: Schema.String,
  sourceBytes: Count,
  format: InputFormat,
  sheets: Schema.Array(SheetSummary),
  history: History,
  warningCounts: Schema.Array(WarningCount),
});
export const ParseOptions = Schema.Struct({
  encoding: Schema.Union([Schema.Literal("auto"), Encoding]),
  delimiter: Schema.Union([Schema.Literal("auto"), Delimiter]),
  header: Schema.Boolean,
  sheetHeaders: Schema.Array(
    Schema.Struct({ sheetId: SheetId, header: Schema.Boolean })
  ),
});
export const defaultParseOptions: typeof ParseOptions.Type = {
  encoding: "auto",
  delimiter: "auto",
  header: true,
  sheetHeaders: [],
};
export const Source = Schema.Struct({
  name: Schema.String,
  size: Count,
  bytes: Schema.Uint8Array,
});
const detection = <S extends Schema.Top>(value: S) =>
  Schema.Struct({
    value,
    basis: Schema.Literals([
      "bom",
      "valid-utf8",
      "heuristic",
      "extension",
      "user",
    ]),
    ambiguous: Schema.Boolean,
    alternatives: Schema.Array(value),
  });
export const Candidate = Schema.Struct({
  candidateId: CandidateId,
  sourceName: Schema.String,
  format: InputFormat,
  encoding: Schema.NullOr(detection(Encoding)),
  delimiter: Schema.NullOr(detection(Delimiter)),
  newline: Schema.NullOr(Schema.Literals(["lf", "crlf", "mixed"])),
  bom: Schema.Boolean,
  sheets: Schema.Array(
    Schema.Struct({ sheetId: SheetId, header: Schema.Boolean })
  ),
});
export const AcceptOpen = Schema.Struct({
  ...Job.fields,
  candidateId: CandidateId,
  replace: Schema.NullOr(
    Schema.Struct({ ...Guard.fields, discardEdits: Schema.Boolean })
  ),
  acknowledgeValuesOnly: Schema.Boolean,
});
const Sort = Schema.NullOr(
  Schema.Struct({
    columnId: ColumnId,
    direction: Schema.Literals(["ascending", "descending"]),
  })
);
export const ViewRequest = Schema.Struct({
  ...Guard.fields,
  ...Job.fields,
  sheetId: SheetId,
  search: Schema.String,
  sort: Sort,
});
export const View = Schema.Struct({
  sessionId: SessionId,
  revision: Count,
  viewId: ViewId,
  sheetId: SheetId,
  search: Schema.String,
  sort: Sort,
  matchingRows: Count,
  totalRows: Count,
  columnCount: Count,
});
export const ViewportRequest = Schema.Struct({
  ...Guard.fields,
  ...Job.fields,
  viewId: ViewId,
  rowStart: Count,
  rowCount: Count,
  columnStart: Count,
  columnCount: Count,
});
export const Viewport = Schema.Struct({
  sessionId: SessionId,
  revision: Count,
  viewId: ViewId,
  sheetId: SheetId,
  rowStart: Count,
  columnStart: Count,
  totalMatchingRows: Count,
  totalColumns: Count,
  columns: Schema.Array(Column),
  rows: Schema.Array(
    Schema.Struct({
      rowId: RowId,
      viewIndex: Count,
      underlyingIndex: Count,
      cells: Schema.Array(Cell),
    })
  ),
});
export const LocateRequest = Schema.Struct({
  ...Guard.fields,
  ...Job.fields,
  viewId: ViewId,
  address: Address,
});
export const Location = Schema.NullOr(
  Schema.Struct({ rowIndex: Count, columnIndex: Count })
);
export const WarningQuery = Schema.Struct({
  ...Guard.fields,
  ...Job.fields,
  code: Schema.NullOr(WarningCode),
  sheetId: Schema.NullOr(SheetId),
  offset: Count,
  limit: Count.check(
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(100)
  ),
});
export const WarningPage = Schema.Struct({
  items: Schema.Array(Warning),
  total: Count,
  nextOffset: Schema.NullOr(Count),
});
export const Edit = Schema.TaggedUnion({
  SetCell: { address: Address, text: Schema.String },
  Paste: {
    sheetId: SheetId,
    viewId: ViewId,
    rowIds: Schema.Array(RowId),
    columnIds: Schema.Array(ColumnId),
    values: Schema.Array(Schema.Array(Schema.String)),
  },
  InsertRows: { sheetId: SheetId, before: Schema.NullOr(RowId), count: Count },
  InsertColumns: {
    sheetId: SheetId,
    before: Schema.NullOr(ColumnId),
    count: Count,
  },
  DeleteRows: { sheetId: SheetId, rowIds: Schema.Array(RowId) },
  DeleteColumns: { sheetId: SheetId, columnIds: Schema.Array(ColumnId) },
  RenameHeader: { sheetId: SheetId, columnId: ColumnId, text: Schema.String },
  RevertCell: { address: Address },
  RevertAll: {},
});
export const EditRequest = Schema.Struct({
  ...Guard.fields,
  ...Job.fields,
  edit: Edit,
});
export const FocusTarget = Schema.NullOr(
  Schema.Struct({
    sheetId: SheetId,
    rowId: Schema.NullOr(RowId),
    columnId: Schema.NullOr(ColumnId),
    reason: Schema.Literals(["changed", "inserted", "deleted", "history"]),
  })
);
export const Change = Schema.Struct({
  session: Session,
  editId: Schema.NullOr(EditId),
  affectedSheets: Schema.Array(SheetId),
  focus: FocusTarget,
});
export const HistoryRequest = Schema.Struct({
  ...Guard.fields,
  ...Job.fields,
  direction: Schema.Literals(["undo", "redo"]),
});
const ExportScope = Schema.TaggedUnion({
  CurrentView: { sheetId: SheetId, viewId: ViewId },
  WholeSheet: { sheetId: SheetId },
  WholeWorkbook: {},
});
export const ExportOptions = Schema.Struct({
  format: OutputFormat,
  scope: ExportScope,
  delimiter: Delimiter,
  newline: Schema.Literals(["lf", "crlf"]),
  bom: Schema.Boolean,
  textPolicy: Schema.Literals(["spreadsheet-safe", "exact"]),
  jsonShape: Schema.Literals(["auto", "arrays"]),
  pdf: Schema.NullOr(PdfOptions),
  locale: Locale,
});
export const ExportRequest = Schema.Struct({
  ...Guard.fields,
  ...Job.fields,
  options: ExportOptions,
});
export const Progress = Schema.Struct({
  requestId: RequestId,
  sessionId: Schema.NullOr(SessionId),
  phase: Schema.Literals([
    "loading-engine",
    "detecting",
    "reading",
    "view",
    "editing",
    "planning-export",
    "writing",
    "verifying",
  ]),
  completed: Count,
  total: Schema.NullOr(Count),
  unit: Schema.Literals(["bytes", "rows", "cells", "sheets"]),
  cancellable: Schema.Boolean,
});
const errorCommon = {
  requestId: RequestId,
  operation: Schema.String,
  sessionId: Schema.NullOr(SessionId),
};
export class UnsupportedFormat extends Schema.TaggedError<UnsupportedFormat>()(
  "UnsupportedFormat",
  { ...errorCommon, detected: Schema.String }
) {}
export class EncryptedFile extends Schema.TaggedError<EncryptedFile>()(
  "EncryptedFile",
  { ...errorCommon }
) {}
export class CorruptFile extends Schema.TaggedError<CorruptFile>()(
  "CorruptFile",
  { ...errorCommon, sheetId: Schema.optionalKey(SheetId) }
) {}
export class InvalidEncoding extends Schema.TaggedError<InvalidEncoding>()(
  "InvalidEncoding",
  { ...errorCommon, encoding: Encoding, byteOffset: Count }
) {}
export class InvalidDelimitedText extends Schema.TaggedError<InvalidDelimitedText>()(
  "InvalidDelimitedText",
  { ...errorCommon, record: Count, column: Count }
) {}
export class InvalidRequest extends Schema.TaggedError<InvalidRequest>()(
  "InvalidRequest",
  { ...errorCommon, field: Schema.String }
) {}
export class MissingIdentity extends Schema.TaggedError<MissingIdentity>()(
  "MissingIdentity",
  {
    ...errorCommon,
    sheetId: Schema.optionalKey(SheetId),
    rowId: Schema.optionalKey(RowId),
    columnId: Schema.optionalKey(ColumnId),
  }
) {}
export class StaleSession extends Schema.TaggedError<StaleSession>()(
  "StaleSession",
  { ...errorCommon, currentSessionId: Schema.NullOr(SessionId) }
) {}
export class RevisionConflict extends Schema.TaggedError<RevisionConflict>()(
  "RevisionConflict",
  { ...errorCommon, expected: Count, actual: Count }
) {}
export class StaleView extends Schema.TaggedError<StaleView>()("StaleView", {
  ...errorCommon,
  viewId: ViewId,
}) {}
export class StaleExportPlan extends Schema.TaggedError<StaleExportPlan>()(
  "StaleExportPlan",
  { ...errorCommon, planId: PlanId }
) {}
export class DiscardRequired extends Schema.TaggedError<DiscardRequired>()(
  "DiscardRequired",
  { ...errorCommon, changedCells: Count, structuralEdits: Count }
) {}
export class UnresolvedValues extends Schema.TaggedError<UnresolvedValues>()(
  "UnresolvedValues",
  { ...errorCommon, count: Count, first: Address }
) {}
export class FormatLimit extends Schema.TaggedError<FormatLimit>()(
  "FormatLimit",
  {
    ...errorCommon,
    sheetId: SheetId,
    dimension: Schema.Literals(["rows", "columns", "cell-text", "sheet-name"]),
    actual: Count,
    limit: Count,
  }
) {}
export class InvalidPaste extends Schema.TaggedError<InvalidPaste>()(
  "InvalidPaste",
  {
    ...errorCommon,
    reason: Schema.Literals(["ragged", "bounds", "syntax", "stale-range"]),
  }
) {}
export class HistoryEmpty extends Schema.TaggedError<HistoryEmpty>()(
  "HistoryEmpty",
  { ...errorCommon, direction: Schema.Literals(["undo", "redo"]) }
) {}
export class MemoryLimit extends Schema.TaggedError<MemoryLimit>()(
  "MemoryLimit",
  {
    ...errorCommon,
    phase: Progress.fields.phase,
    estimatedBytes: Schema.NullOr(Count),
  }
) {}
export class EngineOffline extends Schema.TaggedError<EngineOffline>()(
  "EngineOffline",
  { ...errorCommon, asset: Schema.String }
) {}
export class EngineFailed extends Schema.TaggedError<EngineFailed>()(
  "EngineFailed",
  { ...errorCommon, phase: Progress.fields.phase }
) {}
export class ExportVerificationFailed extends Schema.TaggedError<ExportVerificationFailed>()(
  "ExportVerificationFailed",
  { ...errorCommon, format: OutputFormat }
) {}
export class Cancelled extends Schema.TaggedError<Cancelled>()("Cancelled", {
  ...errorCommon,
  phase: Progress.fields.phase,
}) {}
export const EngineError = Schema.Union([
  UnsupportedFormat,
  EncryptedFile,
  CorruptFile,
  InvalidEncoding,
  InvalidDelimitedText,
  InvalidRequest,
  MissingIdentity,
  StaleSession,
  RevisionConflict,
  StaleView,
  StaleExportPlan,
  DiscardRequired,
  UnresolvedValues,
  FormatLimit,
  InvalidPaste,
  HistoryEmpty,
  MemoryLimit,
  EngineOffline,
  EngineFailed,
  ExportVerificationFailed,
  Cancelled,
]);
export const ExportPlan = Schema.Struct({
  planId: PlanId,
  sessionId: SessionId,
  revision: Count,
  options: ExportOptions,
  sheets: Schema.Array(
    Schema.Struct({
      sheetId: SheetId,
      name: Schema.String,
      rows: Count,
      columns: Count,
      header: Schema.Boolean,
      visibility: Visibility,
    })
  ),
  unresolvedCount: Count,
  changedOutputCells: Count,
  jsonShape: Schema.NullOr(Schema.Literals(["objects", "arrays"])),
  jsonReason: Schema.NullOr(
    Schema.Literals([
      "unique-headers",
      "duplicate-headers",
      "blank-headers",
      "headers-off",
      "user-arrays",
    ])
  ),
  examples: Schema.Array(
    Schema.Struct({ before: Schema.String, after: Schema.String })
  ),
  estimatedPages: Schema.NullOr(Count),
  unsupportedCharacters: Count,
  warnings: Schema.Array(WarningCount),
  blockedBy: Schema.Array(EngineError),
});
export const ExportCommit = Schema.Struct({
  ...Guard.fields,
  ...Job.fields,
  planId: PlanId,
  acknowledgeValuesOnly: Schema.Boolean,
});
export const ExportBytes = Schema.Struct({
  sessionId: SessionId,
  revision: Count,
  planId: PlanId,
  filename: Schema.String,
  mime: Schema.String,
  bytes: Schema.Uint8Array,
  writtenRows: Count,
  writtenSheets: Count,
  writtenPages: Count,
  warnings: Schema.Array(WarningCount),
});
export const SplitOptions = Schema.Struct({
  sheetId: SheetId,
  rowsPerPart: Count.check(Schema.isGreaterThanOrEqualTo(1)),
  delimiter: Delimiter,
  newline: Schema.Literals(["lf", "crlf"]),
  bom: Schema.Boolean,
  locale: Locale,
});
export const SplitRequest = Schema.Struct({
  ...Guard.fields,
  ...Job.fields,
  options: SplitOptions,
  acknowledgeValuesOnly: Schema.Boolean,
});
export const SplitPart = Schema.Struct({
  filename: Schema.String,
  mime: Schema.String,
  rows: Count,
  bytes: Schema.Uint8Array,
});
export const SplitBytes = Schema.Struct({
  sessionId: SessionId,
  revision: Count,
  parts: Schema.Array(SplitPart),
  writtenRows: Count,
  zipName: Schema.String,
  warnings: Schema.Array(WarningCount),
});
export const MergeOrigin = Schema.Literals(["file", "session"]);
export const MergeSourceRequest = Schema.TaggedUnion({
  File: { source: Source },
  Session: { sessionId: SessionId, sheetId: SheetId },
});
export const MergeSourceReport = Schema.Struct({
  sourceId: MergeSourceId,
  name: Schema.String,
  sheetName: Schema.String,
  origin: MergeOrigin,
  format: InputFormat,
  size: Count,
  rows: Count,
  columns: Count,
  unresolved: Count,
  workbook: Schema.Boolean,
  delimiter: Schema.NullOr(Delimiter),
  newline: Schema.NullOr(Schema.Literals(["lf", "crlf", "mixed"])),
  bom: Schema.Boolean,
});
export const MergeOptions = Schema.Struct({
  header: Schema.Boolean,
  delimiter: Delimiter,
  newline: Schema.Literals(["lf", "crlf"]),
  bom: Schema.Boolean,
  locale: Locale,
});
export const MergePlanRequest = Schema.Struct({
  sourceIds: Schema.Array(MergeSourceId),
  options: MergeOptions,
  ...Job.fields,
});
const MergePlanSource = Schema.Struct({
  sourceId: MergeSourceId,
  name: Schema.String,
  sheetName: Schema.String,
  origin: MergeOrigin,
  format: InputFormat,
  rows: Count,
  columns: Count,
  matchedColumns: Count,
  newColumns: Count,
  unresolved: Count,
  workbook: Schema.Boolean,
});
export const MergePlan = Schema.Struct({
  planId: MergePlanId,
  filename: Schema.String,
  mime: Schema.String,
  sources: Schema.Array(MergePlanSource),
  columns: Schema.Array(Schema.String),
  header: Schema.Boolean,
  positional: Schema.Boolean,
  totalRows: Count,
  totalColumns: Count,
  blankCells: Count,
  unresolved: Count,
  valuesOnly: Schema.Boolean,
  warnings: Schema.Array(WarningCount),
});
export const MergeCommit = Schema.Struct({
  planId: MergePlanId,
  ...Job.fields,
});
export const MergeBytes = Schema.Struct({
  planId: MergePlanId,
  filename: Schema.String,
  mime: Schema.String,
  bytes: Schema.Uint8Array,
  writtenRows: Count,
  writtenColumns: Count,
  blankCells: Count,
  warnings: Schema.Array(WarningCount),
});
export const Cancel = Schema.Struct({ requestId: RequestId });
export type InputFormat = typeof InputFormat.Type;
export type OutputFormat = typeof OutputFormat.Type;
export type Encoding = typeof Encoding.Type;
export type Delimiter = typeof Delimiter.Type;
export type Visibility = typeof Visibility.Type;
export type Value = typeof Value.Type;
export type Address = typeof Address.Type;
export type Guard = typeof Guard.Type;
export type Job = typeof Job.Type;
export type Cell = typeof Cell.Type;
type Column = typeof Column.Type;
export type WarningCode = typeof WarningCode.Type;
export type WarningCount = typeof WarningCount.Type;
export type Warning = typeof Warning.Type;
type SheetSummary = typeof SheetSummary.Type;
export type EditKind = typeof EditKind.Type;
type History = typeof History.Type;
export type Session = typeof Session.Type;
export type ParseOptions = typeof ParseOptions.Type;
export type Source = typeof Source.Type;
export type Candidate = typeof Candidate.Type;
export type AcceptOpen = typeof AcceptOpen.Type;
export type ViewRequest = typeof ViewRequest.Type;
export type View = typeof View.Type;
export type ViewportRequest = typeof ViewportRequest.Type;
export type Viewport = typeof Viewport.Type;
export type LocateRequest = typeof LocateRequest.Type;
export type Location = typeof Location.Type;
export type WarningQuery = typeof WarningQuery.Type;
export type WarningPage = typeof WarningPage.Type;
export type Edit = typeof Edit.Type;
export type EditRequest = typeof EditRequest.Type;
export type FocusTarget = typeof FocusTarget.Type;
export type Change = typeof Change.Type;
export type HistoryRequest = typeof HistoryRequest.Type;
type ExportScope = typeof ExportScope.Type;
export type PdfOptions = typeof PdfOptions.Type;
export type Locale = typeof Locale.Type;
export type ExportOptions = typeof ExportOptions.Type;
export type ExportRequest = typeof ExportRequest.Type;
export type Progress = typeof Progress.Type;
export type EngineError = typeof EngineError.Type;
export type ExportPlan = typeof ExportPlan.Type;
export type ExportCommit = typeof ExportCommit.Type;
export type ExportBytes = typeof ExportBytes.Type;
export type SplitOptions = typeof SplitOptions.Type;
export type SplitRequest = typeof SplitRequest.Type;
export type SplitPart = typeof SplitPart.Type;
export type SplitBytes = typeof SplitBytes.Type;
export type MergeOrigin = typeof MergeOrigin.Type;
export type MergeSourceRequest = typeof MergeSourceRequest.Type;
export type MergeSourceReport = typeof MergeSourceReport.Type;
export type MergeOptions = typeof MergeOptions.Type;
export type MergePlanRequest = typeof MergePlanRequest.Type;
export type MergePlan = typeof MergePlan.Type;
export type MergeCommit = typeof MergeCommit.Type;
export type MergeBytes = typeof MergeBytes.Type;
export type Cancel = typeof Cancel.Type;
