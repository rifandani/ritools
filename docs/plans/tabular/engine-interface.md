# Public engine interface, version 1

This is the application-owned contract for issues 19 and 20. Types below describe
the decoded Effect Schema values. Implement the schemas with Effect v4
`Schema.Struct`, `Schema.TaggedUnion`, constrained branded IDs, and
`Schema.TaggedError`. Decode unknown Worker input with
`Schema.decodeUnknownEffect`. Do not export a parser, grid, DOM node, File handle,
or vendor cell type. The UI calls an Effect service; it does not send Worker
messages directly.

## Ownership and lifetime

| Owner | State |
| --- | --- |
| Engine Worker | Retained source bytes, normalized sparse data, stable identities, baseline, patch history, search/sort indexes, export plans |
| Main-thread service | Worker lifecycle, request IDs, interruption, asset loading, response validation, current session token |
| Application Atoms | Session summary, Active Sheet, view descriptions/tokens, bounded viewport cache, busy/progress/failure states, history summary |
| UI component state | Draft text, IME composition, pointer geometry, column widths, focus and rectangular selection by stable IDs |

The Worker stores one accepted dataset. Open/reparse jobs use an isolated
candidate so failure or cancellation cannot destroy the accepted session.
Keep immutable source chunks and sparse patches, structural order vectors, and
inverse patches. Do not copy full Sheets/workbooks per Edit. The viewport cache
is bounded to the requested rectangle plus overscan; no cell values enter
serializable Atoms, route loaders, SSR output, storage, analytics, or logs.
The grid adapter uses lightweight row identity slots and bounded materialized
cells. It must prove this mapping; a grid's `rows` prop is not permission to keep
a second full dataset in an Atom. Keep vendor types inside that adapter.

An application route scope owns the service. On unmount, close the session,
terminate Workers, release candidate buffers, and revoke Blob URLs. Do not use
`Atom.keepAlive` to retain user data across routes. Cache public engine assets
through the existing PWA pattern, separately from session memory. No user data
goes to Cache Storage, IndexedDB, localStorage, service workers, or the server.

## Schema notation

All records are readonly. `Id` means a non-empty branded opaque string, unique
for its kind within an engine lifetime. IDs contain no file text. `Count` and
`Revision` are safe non-negative integers. `Index` is zero-based. Arrays are
ordered. Optional fields below are explicitly marked `?`; other fields are
required. Wire records reject unknown command tags and invalid coordinates.
User text is any Unicode string; do not trim it to pass validation. Numeric
values are finite. Byte buffers are `Uint8Array`, transferred once on the wire.
JSON-based encoding uses a binary attachment, not a base64 workbook copy.

Source-record numbers and error-column numbers are one-based for display.
Viewport indices and internal order indices are zero-based. Source coordinates
include the header record. Validate a source coordinate as an integer ≥1.

```ts
type InputFormat = 'csv' | 'tsv' | 'tab' | 'txt' | 'xls' | 'xlsx';
type OutputFormat = 'csv' | 'tsv' | 'tab' | 'xls' | 'xlsx' | 'json'
  | 'clipboard' | 'pdf';
type Encoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1252';
type Delimiter = ',' | ';' | '\t' | '|';
type Newline = 'lf' | 'crlf' | 'mixed';
type Visibility = 'visible' | 'hidden' | 'very-hidden';
type SessionId = Id<'Session'>;
type CandidateId = Id<'Candidate'>;
type SheetId = Id<'Sheet'>;
type RowId = Id<'Row'>;
type ColumnId = Id<'Column'>;
type RequestId = Id<'Request'>;
type ViewId = Id<'View'>;
type PlanId = Id<'ExportPlan'>;
type EditId = Id<'Edit'>;
type Id<Kind extends string> = string & { readonly kind: Kind };
type Count = number; // validated safe integer >= 0
type Revision = Count;
type Address = { sheetId: SheetId; rowId: RowId; columnId: ColumnId };
type Guard = { sessionId: SessionId; expectedRevision: Revision };
type Job = { requestId: RequestId };

type Value =
  | { _tag: 'Text'; text: string }
  | { _tag: 'Number'; value: number }
  | { _tag: 'Boolean'; value: boolean }
  | { _tag: 'Blank' }
  | { _tag: 'Unresolved'; reason: 'missing-formula-result' | 'formula-error'
      | 'cell-error' | 'unsupported-value'; display: string };
type Cell = {
  rowId: RowId; columnId: ColumnId; value: Value; display: string;
  origin: 'text' | 'workbook' | 'stored-formula' | 'date-display' | 'edit';
  changed: boolean; canRevert: boolean;
};
type Column = { columnId: ColumnId; index: Count; label: string;
  blankHeader: boolean; headerChanged: boolean; headerValue: Value | null };
type SheetSummary = {
  sheetId: SheetId; name: string; visibility: Visibility; header: boolean;
  headerRowId: RowId | null;
  rowCount: Count; columnCount: Count; unresolvedCount: Count;
  storedFormulaCount: Count; changedCellCount: Count; structuralEditCount: Count;
};
type History = {
  canUndo: boolean; canRedo: boolean; undoCount: Count; redoCount: Count;
  nextUndo: null | { editId: EditId; kind: EditKind; sheetIds: readonly SheetId[] };
  nextRedo: null | { editId: EditId; kind: EditKind; sheetIds: readonly SheetId[] };
  estimatedBytes: Count; dirty: boolean; changedCellCount: Count;
  changedHeaderCount: Count; structuralEditCount: Count;
};
type Session = { sessionId: SessionId; revision: Revision; sourceName: string;
  sourceBytes: Count; format: InputFormat; sheets: readonly SheetSummary[];
  history: History; warningCounts: readonly WarningCount[] };
type WarningCount = { code: WarningCode; count: Count; sheetId?: SheetId };
type WarningCode = 'values-only' | 'stored-formula' | 'unresolved-value'
  | 'date-as-text' | 'merged-cells' | 'hidden-data' | 'ignored-features'
  | 'encoding-guess' | 'delimiter-guess' | 'ragged-records'
  | 'all-hidden-output' | 'spreadsheet-safe' | 'source-precision';
type Warning = { code: WarningCode; sheetId?: SheetId; address?: Address;
  sourceRecord?: Count; count: Count };
```

`Warning` contains codes and safe coordinates, not localized prose. UI copy is
selected from the Message Catalog. A separate bounded warning query supplies
details; the session carries counts only. Unresolved values are never represented
by a missing JSON key, `undefined`, or a silent blank.

The header row has a reserved stable RowId when present. It is absent from data
viewports and data-row counts. `headerValue` is null with headers off. It exposes
an unresolved source header so the user can rename or revert that header before
export. `unresolvedCount` includes unresolved headers when enabled. SetCell and
DeleteRows reject the reserved header RowId; RenameHeader edits it and RevertCell
may restore it. Header mode changes still require reparse.

## Open and parse options

```ts
type ParseOptions = {
  encoding: 'auto' | Encoding; delimiter: 'auto' | Delimiter;
  header: boolean; // default true, applied to each Sheet at first open
  sheetHeaders: readonly { sheetId: SheetId; header: boolean }[];
};
type Source = { name: string; size: Count; bytes: Uint8Array };
type Detection<T> = { value: T; basis: 'bom' | 'valid-utf8' | 'heuristic'
  | 'extension' | 'user'; ambiguous: boolean; alternatives: readonly T[] };
type Candidate = { candidateId: CandidateId; sourceName: string;
  format: InputFormat; encoding: Detection<Encoding> | null;
  delimiter: Detection<Delimiter> | null; newline: Newline | null;
  bom: boolean; sheets: readonly { sheetId: SheetId; header: boolean }[] };
type Replacement = null | (Guard & { discardEdits: boolean });
type AcceptOpen = Job & { candidateId: CandidateId; replace: Replacement;
  acknowledgeValuesOnly: boolean };
```

`prepareOpen(source, options, job)` returns a Candidate. Validate source length
against `size`. Sniff bytes rather than trusting extension/MIME. Prepare does
not replace the current session. Return bounded metadata only; retained parsed
data stays in the worker. Full parse on `acceptOpen` must still validate the
entire file; preparation is not a successful open. Workbook open requires
explicit values-only acknowledgement. The UI accepts the detected settings
immediately; the detected settings remain visible.

`prepareReparse(guard, options, job)` reads retained original bytes and returns a
new Candidate. Use original Sheet IDs for `sheetHeaders` selection during the
candidate step only. Accepted reparse creates new IDs and resets history. If the
guard is dirty and `discardEdits` is false, fail with `DiscardRequired`.
Stale replacement guards fail. A cancelled/failed accept retains the old session.
`discardCandidate` is idempotent. Candidate lifetime ends on accept, discard,
route disposal, or a newer candidate from the same request owner.

Default `ParseOptions` is encoding auto, delimiter auto, header true, and an empty
`sheetHeaders` array. Sheet overrides refer to the retained source Sheet order
through the engine's source identity map, never a user-controlled name lookup.
`replace: null` is legal only when no accepted session exists. A replacement must
name its old session and revision even when that session has no Edits.

## Views and viewport reads

```ts
type ViewRequest = Guard & Job & { sheetId: SheetId; search: string;
  sort: null | { columnId: ColumnId; direction: 'ascending' | 'descending' } };
type View = { sessionId: SessionId; revision: Revision; viewId: ViewId;
  sheetId: SheetId; search: string; sort: ViewRequest['sort'];
  matchingRows: Count; totalRows: Count; columnCount: Count };
type ViewportRequest = Guard & Job & { viewId: ViewId; rowStart: Count;
  rowCount: Count; columnStart: Count; columnCount: Count };
type Viewport = { sessionId: SessionId; revision: Revision; viewId: ViewId;
  sheetId: SheetId; rowStart: Count; columnStart: Count;
  totalMatchingRows: Count; totalColumns: Count; columns: readonly Column[];
  rows: readonly { rowId: RowId; viewIndex: Count; underlyingIndex: Count;
    cells: readonly Cell[] }[] };
type LocateRequest = Guard & Job & { viewId: ViewId; address: Address };
type Location = { rowIndex: Count; columnIndex: Count } | null;
type WarningQuery = Guard & Job & { code: WarningCode | null;
  sheetId: SheetId | null; offset: Count; limit: Count };
type WarningPage = { items: readonly Warning[]; total: Count; nextOffset: Count | null };
```

`setView` computes the full match/order vector in the Worker. The UI does not
filter its rendered rows. Keep one active View per Sheet. A new request supersedes
an older request for that Sheet. `readViewport` returns at most 4,096 cells and
256 column descriptors per call. These are transport bounds, not file limits.
The UI tiles larger areas. Requests outside the end clamp to the remaining
rectangle; invalid/negative coordinates fail. `locate` returns null when an
address is not in that View. A view token is valid for one data revision only.
Edits invalidate all affected Views and export plans. The next `setView` uses
the retained query and sort. Never accept a response from another session,
revision, View, or superseded request. Column width changes do not require a View.

## Atomic Edits and history

```ts
type EditKind = 'set-cell' | 'paste' | 'insert-rows' | 'insert-columns'
  | 'delete-rows' | 'delete-columns' | 'rename-header' | 'revert-cell' | 'revert-all';
type Edit =
  | { _tag: 'SetCell'; address: Address; text: string }
  | { _tag: 'Paste'; sheetId: SheetId; viewId: ViewId;
      rowIds: readonly RowId[]; columnIds: readonly ColumnId[];
      values: readonly (readonly string[])[] }
  | { _tag: 'InsertRows'; sheetId: SheetId; before: RowId | null; count: Count }
  | { _tag: 'InsertColumns'; sheetId: SheetId; before: ColumnId | null; count: Count }
  | { _tag: 'DeleteRows'; sheetId: SheetId; rowIds: readonly RowId[] }
  | { _tag: 'DeleteColumns'; sheetId: SheetId; columnIds: readonly ColumnId[] }
  | { _tag: 'RenameHeader'; sheetId: SheetId; columnId: ColumnId; text: string }
  | { _tag: 'RevertCell'; address: Address }
  | { _tag: 'RevertAll' };
type EditRequest = Guard & Job & { edit: Edit };
type FocusTarget = null | { sheetId: SheetId; rowId: RowId | null;
  columnId: ColumnId | null; reason: 'changed' | 'inserted' | 'deleted' | 'history' };
type Change = { session: Session; editId: EditId | null;
  affectedSheets: readonly SheetId[]; focus: FocusTarget };
type HistoryRequest = Guard & Job & { direction: 'undo' | 'redo' };
```

Each accepted request commits all patches and inverse patches together. Increment
the global revision once. Reject duplicates, missing identities, invalid ranges,
shape mismatches, zero counts, and allocation failure **before** mutation. Same-value
cell commits are no-ops: no history entry, unchanged revision, `editId: null`.
Paste addresses a rectangle of the View's stable row IDs and ordered column IDs;
validate it against the View and dimensions. It is one Edit, never one per cell.
Insertion returns newly allocated IDs in the next viewport; deleted IDs remain
reserved for undo and are never reused for other data.

Insertion uses underlying order: `before: null` appends. Under active sort/search,
the UI explains that new blank rows may move or not match, then clears that
Sheet's view before focusing the inserted row. Paste overflow never auto-inserts;
offer one explicit **Expand and paste** request in the UI by sending an
`InsertRows`/`InsertColumns` first only after the user requests expansion. This
creates two or three Edits and is labelled as such; the paste remains one Edit.
The first release may instead offer Add rows/columns then retry. Do not silently
turn a paste into multiple history entries.

One Edit History spans all Sheets. Undo/redo change the global revision and return
the affected Sheet/focus target. A new Edit clears redo. Search/sort, Sheet changes,
selection, column resizing, export settings, and downloads are outside history.
Revert cell restores the normalized source value and provenance. An added cell
reverts to empty Text. Revert all restores every Sheet's baseline, including
deleted structure and renamed headers, as one undoable Edit. It does not clear
history. The UI confirms Revert all before dispatch.

`dirty` is comparison to the accepted baseline, not `undoCount > 0`. Changed-cell
count includes surviving cells whose values differ, including non-empty new
cells. Empty inserted cells, deleted cells/rows/columns, and renamed headers
are not counted as changed cells. Show changed headers and structural Edits
separately. Structural count is the number of still-applied structure commands
since baseline; Revert all resets it to zero, and undo restores it. Track these
with history metadata, not a full-workbook scan on each render.

There is no fixed history count/byte bound and no silent eviction. A failed
allocation returns `MemoryLimit` with the prior revision intact. Keep the last
valid state downloadable. A process/OS kill can lose memory and cannot promise
rollback. A future history bound requires an explicit recorded decision.

## Export, progress, and cancellation

```ts
type ExportScope =
  | { _tag: 'CurrentView'; sheetId: SheetId; viewId: ViewId }
  | { _tag: 'WholeSheet'; sheetId: SheetId }
  | { _tag: 'WholeWorkbook' };
type PdfOptions = { page: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape' };
type ExportOptions = { format: OutputFormat; scope: ExportScope;
  delimiter: Delimiter; newline: 'lf' | 'crlf'; bom: boolean;
  textPolicy: 'spreadsheet-safe' | 'exact'; jsonShape: 'auto' | 'arrays';
  pdf: PdfOptions | null; locale: 'en-US' | 'id-ID' };
type ExportRequest = Guard & Job & { options: ExportOptions };
type ExportPlan = { planId: PlanId; sessionId: SessionId; revision: Revision;
  options: ExportOptions; sheets: readonly { sheetId: SheetId; name: string;
    rows: Count; columns: Count; header: boolean; visibility: Visibility }[];
  unresolvedCount: Count; changedOutputCells: Count;
  jsonShape: 'objects' | 'arrays' | null;
  jsonReason: 'unique-headers' | 'duplicate-headers' | 'blank-headers'
    | 'headers-off' | 'user-arrays' | null;
  examples: readonly { before: string; after: string }[];
  estimatedPages: Count | null; unsupportedCharacters: Count;
  warnings: readonly WarningCount[]; blockedBy: readonly EngineError[] };
type ExportCommit = Guard & Job & { planId: PlanId; acknowledgeValuesOnly: boolean };
type ExportBytes = { sessionId: SessionId; revision: Revision; planId: PlanId;
  filename: string; mime: string; bytes: Uint8Array; writtenRows: Count;
  writtenSheets: Count; writtenPages: Count;
  warnings: readonly WarningCount[] };
type Progress = { requestId: RequestId; sessionId: SessionId | null;
  phase: 'loading-engine' | 'detecting' | 'reading' | 'view'
    | 'editing' | 'planning-export' | 'writing' | 'verifying';
  completed: Count; total: Count | null; unit: 'bytes' | 'rows' | 'cells' | 'sheets';
  cancellable: boolean };
type Cancel = { requestId: RequestId };
```

`planExport` checks format bounds, scope, unresolved cells, JSON choice, PDF
options, and exact escaped-cell count without changing the dataset. It returns a
blocked plan for remediable export problems so the UI can show counts and
locations. `exportBytes` requires an unblocked, current plan; it repeats the
guard checks. Workbook output requires the values-only acknowledgement for every
export panel confirmation. Plan options must obey the [format matrix](formats.md);
reject incompatible settings instead of ignoring them. Ignore no hidden Sheet by
accident. Limit examples to five truncated display samples; full output remains
exact.

`pdf` is null for every format except PDF. A PDF request without page and
orientation options is invalid. `locale` supplies the PDF `/Lang` metadata; it
does not localize the data-derived chrome. `estimatedPages` is null for non-PDF
plans and a prediction for PDF. `unsupportedCharacters` is zero for non-PDF
plans. It counts every character that the embedded font cannot draw.
`writtenPages` is zero for non-PDF output.

The Worker writes and re-reads values-only output to check dimensions and counts
for CSV, TSV, TAB, XLS, XLSX, JSON, and Clipboard. PDF has no parser in the
runtime. Its check covers the `%PDF-` header, the `%%EOF` trailer, the page
count, and the layout model. Exact text verification is manual until a parser is
added. This is an open gate, not a pass. A failed check returns
`ExportVerificationFailed`, with no downloadable success. Bytes transfer to the
main thread once; the service creates a Blob URL. Clipboard text is UTF-8 bytes
decoded by the service, written only from a user gesture. Clipboard permissions
are UI/browser failures, not parser errors. Export does not mark the session
clean: a partial export cannot save the whole session.

Public service operations return `Effect.Effect<Result, EngineError>`.
`progress(requestId)` returns `Stream.Stream<Progress, EngineError>` scoped to the
request. Provide `prepareOpen`, `prepareReparse`, `acceptOpen`, `discardCandidate`,
`setView`, `readViewport`, `locate`, `warnings`, `edit`, `history`, `planExport`,
`exportBytes`, `cancel`, and `close`. Register as
`Context.Service` with ID `@ritools/web/TabularEngine`, with a static Layer.
`close(sessionId)` is idempotent. Do not create a server function for local data.

Progress is monotonic within a phase. Unknown totals are indeterminate, never a
fabricated percentage. Coalesce updates to at most ten per second and announce
phase changes/counts politely. A terminal response closes the progress stream.
Cancellation interrupts the owning Effect fiber and sends `Cancel` to its job.
Cancel is idempotent; an already committed Edit returns success, not a false
rollback. Long sync parser/writer calls run in isolated job Workers that can be
terminated. They must not own the sole accepted dataset. Between chunked view,
edit, and serialization phases, check interruption. Cancellation before commit
leaves the accepted revision intact. Do not claim parser-internal percent
progress or immediate interruption unless the probe supports it.

Wire envelopes are `{version: 1, requestId, operation, payload}` and responses
are `{version: 1, requestId, _tag: 'Success'|'Failure'|'Progress', payload}`.
Each operation payload has the corresponding schema above. A known request
shape is required before a Worker message handler runs. A dedicated Worker's
`event.origin` is empty and is not an authorization check. Queue mutating requests
per session, with compare-and-swap revision checks at commit. Request IDs are
unique per invocation. A retransmitted mutating request ID returns its original
result while the session lives; it never commits twice. Stale views and superseded
read/search responses cannot replace newer Atoms.

| Method | Input | Result |
| --- | --- | --- |
| prepareOpen | Source, ParseOptions, Job | Candidate |
| prepareReparse | Guard, ParseOptions, Job | Candidate |
| acceptOpen | AcceptOpen | Session |
| discardCandidate | CandidateId, Job | void |
| summary | SessionId, Job (no expected revision) | Session |
| setView | ViewRequest | View |
| readViewport | ViewportRequest | Viewport |
| locate | LocateRequest | Location |
| warnings | WarningQuery, limit 1–100 | WarningPage |
| edit | EditRequest | Change |
| history | HistoryRequest | Change |
| planExport | ExportRequest | ExportPlan |
| exportBytes | ExportCommit | ExportBytes |
| progress | RequestId | scoped Stream of Progress |
| cancel | Cancel | void |
| close | SessionId | void |

`summary` supports recovery from RevisionConflict without a stale guard. All
methods other than `progress` return Effects. Limit one export plan per session;
a new plan invalidates the previous plan. Close invalidates every token.

## Named errors

Every error is a `Schema.TaggedError` with `_tag` from this table, `requestId`,
`operation`, `sessionId: SessionId | null`, and the typed fields listed below.
Never include raw file contents, formula expressions, paths, or unsanitized
exception strings in a public error. The UI supplies localized recovery text.

| Tag | Additional fields | Recovery |
| --- | --- | --- |
| UnsupportedFormat | `detected: string` | Choose a supported file |
| EncryptedFile | none | Save an unencrypted local copy |
| CorruptFile | `sheetId?: SheetId` | Open another file; retain old session |
| InvalidEncoding | `encoding: Encoding; byteOffset: Count` | Open another file |
| InvalidDelimitedText | `record: Count; column: Count` | Fix local text or open another file |
| InvalidRequest | `field: string` | Fix adapter input; no mutation |
| MissingIdentity | `sheetId?: SheetId; rowId?: RowId; columnId?: ColumnId` | Refresh viewport |
| StaleSession | `currentSessionId: SessionId | null` | Drop obsolete response |
| RevisionConflict | `expected: Revision; actual: Revision` | Refresh summary and retry explicit intent |
| StaleView | `viewId: ViewId` | Rebuild View |
| StaleExportPlan | `planId: PlanId` | Replan and confirm counts |
| DiscardRequired | `changedCells: Count; structuralEdits: Count` | Keep working or confirm discard |
| UnresolvedValues | `count: Count; first: Address` | Replace or exclude before export |
| FormatLimit | `sheetId: SheetId; dimension: 'rows'|'columns'|'cell-text'|'sheet-name'; actual: Count; limit: Count` | Change format or scope |
| InvalidPaste | `reason: 'ragged'|'bounds'|'syntax'|'stale-range'` | Correct selection/text; no Edit |
| HistoryEmpty | `direction: 'undo'|'redo'` | Disable that action |
| MemoryLimit | `phase: Progress['phase']; estimatedBytes: Count | null` | Download current state or open smaller data |
| EngineOffline | `asset: string` | Connect once and retry asset load |
| EngineFailed | `phase: Progress['phase']` | Retry; old valid session stays when possible |
| ExportVerificationFailed | `format: OutputFormat` | Keep editing or try another format |
| Cancelled | `phase: Progress['phase']` | Resume current session |

Error payloads are schemas. The UI must not parse human exception messages.

The table has this type-level union. Each `ErrorFields` member becomes one
`Schema.TaggedError` with the common fields when the engine is implemented.

```ts
type ErrorFields = {
  UnsupportedFormat: { detected: string };
  EncryptedFile: {};
  CorruptFile: { sheetId?: SheetId };
  InvalidEncoding: { encoding: Encoding; byteOffset: Count };
  InvalidDelimitedText: { record: Count; column: Count };
  InvalidRequest: { field: string };
  MissingIdentity: { sheetId?: SheetId; rowId?: RowId; columnId?: ColumnId };
  StaleSession: { currentSessionId: SessionId | null };
  RevisionConflict: { expected: Revision; actual: Revision };
  StaleView: { viewId: ViewId };
  StaleExportPlan: { planId: PlanId };
  DiscardRequired: { changedCells: Count; structuralEdits: Count };
  UnresolvedValues: { count: Count; first: Address };
  FormatLimit: { sheetId: SheetId; dimension: 'rows' | 'columns' | 'cell-text'
    | 'sheet-name'; actual: Count; limit: Count };
  InvalidPaste: { reason: 'ragged' | 'bounds' | 'syntax' | 'stale-range' };
  HistoryEmpty: { direction: 'undo' | 'redo' };
  MemoryLimit: { phase: Progress['phase']; estimatedBytes: Count | null };
  EngineOffline: { asset: string };
  EngineFailed: { phase: Progress['phase'] };
  ExportVerificationFailed: { format: OutputFormat };
  Cancelled: { phase: Progress['phase'] };
};
type EngineError = { [Tag in keyof ErrorFields]: {
  _tag: Tag; requestId: RequestId; operation: string;
  sessionId: SessionId | null;
} & ErrorFields[Tag] }[keyof ErrorFields];
```
