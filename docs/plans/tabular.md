# Tabular: Stage 3 decision contract

Status: scope confirmed on 2026-10-26. PDF output confirmed on 2026-10-27.
Chart View confirmed on 2026-10-28. CSV Split confirmed on 2026-10-28.
CSV Merge confirmed on 2026-10-28. CSV Dedupe confirmed on 2026-10-28.
Planning only; the Tool does not ship yet.

The user requested a browser viewer and editor for CSV, XLS, XLSX, TSV, and TAB, with conversion, search, sorting, row and column insertion, and undo/redo. They authorized recommended defaults and confirmed values-only workbook export. This contract supplies the three Stage 3 issues: shape, engine, then UI. Shape fixes the detailed brief and interface before production work.

## GitHub issues

The detailed issue 18 handoff is the [shape contract](tabular/README.md). It
includes the public interface, format rules, state and copy specifications,
licensed samples, surface captures, and measured disposable proofs. Read its
evidence gates before treating the preferred grid as approved for production.

1. [Shape #18: surface, data contract, and engine interface](https://github.com/rifandani/ritools/issues/18). No prerequisites.
2. [Engine #19: local parsing, editing, and conversion](https://github.com/rifandani/ritools/issues/19). Blocked by #18.
3. [UI #20: browser viewer and editor](https://github.com/rifandani/ritools/issues/20). Blocked by #18 and #19.
4. [Feature #23: export data as PDF](https://github.com/rifandani/ritools/issues/23). Adds the PDF Output Format after the Stage 3 issues. The contract is fixed in this plan and [ADR-0022](../adr/0022-tabular-writes-pdf-reports.md).
5. [Feature #24: show data as a chart](https://github.com/rifandani/ritools/issues/24). Adds a read-only Chart View to the Sheet Editor. The contract is fixed in this plan and the [interaction](tabular/interactions.md) and [copy](tabular/copy.md) specifications.

## Product boundary

- Name: **Tabular**. Route: `/tabular`. Promise: “View, edit, and convert table files on your device.”
- One open Table File per session. Every Sheet is available through a sheet selector, including hidden sheets with a clear label. No batch conversion across Table Files, folder watching, or simultaneous open files. A Merge is the one file action that reads several Table Files; it opens none. See [ADR-0023](../adr/0023-a-merge-reads-several-files-and-opens-none.md).
- Local data only. No accounts, file upload, remote file import, or server storage. Files and edits do not survive a reload or route change. Replacing or leaving an edited session requires a discard warning where the browser permits it.
- Values-only editing and export follow [ADR-0021](../adr/0021-tabular-edits-cell-values.md). Preserve source bytes on disk. Downloads use a new name.
- No formula calculation, workbook chart editing, workbook styling, merged-cell editing, fill handles, sheet creation/deletion, SQL, or batch work across Table Files.
- A Chart View is a read-only rendering of a Chart Scope. It is not a workbook chart and it is not an Export Format. It is built from cell values only. Source chart objects are still not read or preserved. See [Chart View](#chart-view).
- Every required input format must pass the engine proof. A failed proof is a blocker; it is not permission to remove a format silently.

## Format contract

| Format | Input | Output | Scope |
| --- | --- | --- | --- |
| CSV | Yes | Yes | Current View or Whole Sheet |
| TSV / TAB | Yes | Yes | Current View or Whole Sheet |
| TXT | Delimited text | No separate TXT output | One Sheet |
| XLS | Yes | Yes, subject to legacy format bounds | Current View, Whole Sheet, or Whole Workbook |
| XLSX | Yes | Yes | Current View, Whole Sheet, or Whole Workbook |
| JSON | No | Yes | Current View or Whole Sheet |
| PDF | No | Yes | Current View, Whole Sheet, or Whole Workbook |

Current View is the default. It means all matching rows, including rows outside the rendered viewport, in the current sort order, with all columns. The export controls show the scope, sheet name, and row count. Whole Sheet ignores search and sorting. Whole Workbook includes all Sheets and ignores each view's search and sort. For Current View and Whole Sheet, XLS/XLSX contain one Sheet. Whole Workbook is an explicit choice. Never truncate to fit XLS/XLSX limits.

A Chart View is not an Output Format. It never appears in the Format list and it never enters an export.

PDF is a report, not a data format. It writes the rows in the Export Scope as a paginated document with a title, a repeated header row, and page numbers. It keeps values only, is untagged, and names CSV and XLSX as the accessible exact alternatives. A character outside the embedded Latin font becomes `?`, and the plan counts it. The plan warns above 500 pages. Exact text verification is manual until a renderer is added.

Object-row JSON is the default only when headers are unique and non-empty. Otherwise use arrays and state why. Array JSON includes the header row when header mode is on. Keep duplicate and blank source headers; never overwrite a cell to make object keys. JSON import is deferred.

## Data fidelity

- CSV, TSV, TAB, and TXT values stay text. Keep leading zeros, long identifiers, whitespace, and empty cells. Do not infer dates or numbers.
- Workbook cells retain scalar number and boolean values when available. Text stays text. Date-formatted values become their displayed text; do not invent a timezone. An edited value is text unless the user explicitly changes its type in a future release.
- Show formula stored-result warnings and missing-result states. Formula errors retain a distinct warning; no formula code runs. Values that start with `=` remain literal text in XLS/XLSX output.
- Keep source headers separate from stable column identity. Text files open with the first row as headers. Renaming a header must not discard edits.
- Detect comma, semicolon, tab, and pipe delimiters. Support quoted fields, escaped quotes, embedded newlines, BOMs, LF, and CRLF. The detected delimiter is applied when the file opens.
- Support UTF-8, UTF-16 LE/BE, and Windows-1252. Detection is automatic. Ambiguous input opens with a warning; a guess is not a guarantee. Export text as UTF-8, with an optional BOM.
- Default CSV uses comma; TSV and TAB use tab with the matching extension. CSV can use an explicitly selected semicolon or pipe delimiter. Retaining a source dialect is an explicit setting.
- Offer spreadsheet-safe delimited export with a visible setting and affected-cell count. It escapes formula-like text for spreadsheet applications. The preview must explain changed values; an explicit exact-value export remains available. This setting never changes the open Sheet.
- Reject encrypted/password-protected files with a named error. Report corrupt files and unsupported workbook parts clearly. Do not silently return a partly parsed workbook as a complete one.

## Editing and view behavior

- Edit cells; commit with Enter or Tab and cancel with Escape. Support multiline text without confusing newline entry with commit. Keep IME composition intact.
- Select rectangular ranges. Copy and paste tabular values from spreadsheet applications. Paste is plain data, never HTML or executable formulas. Reject or cancel an invalid paste atomically.
- Add rows and columns; insert relative to the active cell or append. Delete selected rows/columns and rename headers. A zero-row Sheet remains usable. Shape fixes how zero columns work.
- Search every column of the Active Sheet, case-insensitive literal text. Show the matched/total count. `/` focuses search outside editing controls; Escape clears it when search owns focus.
- Sort one column ascending, descending, or back to underlying order. Sorting is stable. Text sorts as text; typed workbook numbers sort numerically. Mixed values and blanks need a documented deterministic order.
- Search and sort are view operations. They do not rewrite underlying row order or enter Edit History. Edits address stable row/column identities, so undo still changes the correct cell after sorting or searching.
- One Edit History spans all Sheets in the open file. Cell commit, range paste, row/column insertion or deletion, and header rename are atomic Edits. Switching Sheets keeps history. A new Edit clears redo. Undo/redo reveals and focuses the affected cell or structure.
- Mark changed cells and show a count; provide an individual cell revert and Revert all. Revert all needs confirmation and is one undoable Edit. Shape fixes whether original structural changes count as changed cells.
- Do not silently evict history to hide memory growth. Measure it, store patches rather than full snapshots, and report any proposed history bound before implementation.
- Resizable columns, sticky headers, row numbers, virtual rows and columns, and clipboard export are required. Virtualization must preserve logical focus and accurate row/column counts.

## Chart View

The Sheet Editor adds a Chart button. It opens a menu with Line, Bar, Area,
Donut, and Scatter. The user picks the type; the Tool does not infer it. The
chart replaces the grid, and a Table button returns. The chart is a view, not an
Export Format: it is never written to a file, and the PDF report does not
include it.

The Chart Scope is the Active Sheet only. A Cell Selection of two or more cells wins;
otherwise the Current View. The chart follows edits, search, sort, and Sheet
changes. It keeps the Current View order and does not parse dates or apply a
hidden chronological sort. It reads numeric workbook cells and strict dot-decimal
text cells. A visible Decimal comma switch reads one comma as the decimal
separator and rejects thousands separators. Blank, Unresolved, and non-numeric
cells are gaps, never zero.

Line, Bar, and Area use the first text column as the category and every numeric
column as a series. They turn on the first five series by default; a series
selector swaps them. Donut needs exactly one numeric column and a label column;
it sums duplicate labels, drops zero or negative values with a count, and shows
the top 12 slices plus Other. Scatter needs exactly two numeric columns and uses
the first text column as the group. Every display cap is visible and names the
exact counts.

The chart prints a caption and an accessible name. A collapsible data table
holds the Charted Rows. Color is never the only encoding. Both Locales, both
color modes, and reduced motion apply. The chart does not change Edit History
or dirty state.

## CSV Split

The Sheet Editor adds a Split button in a strip below the toolbar. It opens the
CSV Splitter. The Split reads the Active Sheet, including edits, in Whole Sheet
order and ignores search and sort. It writes exact cell values as CSV Parts. It
does not change the Sheet, the Current View, or Edit History.

A Part holds the repeated header row and up to Rows per Part data rows. The last
Part holds the remainder. Headers off means no header row in any Part. The
default is 1,000 data rows per Part. One Part downloads as a CSV file. More than
one Part downloads as one ZIP built on the device. Part names use the source
stem and the Part number; a workbook also names the Active Sheet.

The Split always writes CSV with an explicit delimiter: comma, semicolon, or
pipe. It keeps the source line endings and BOM when the Table File is delimited;
mixed line endings become LF. A workbook writes LF and no BOM. Tab-delimited
input writes CSV with a comma by default. Split is exact-value only; use Export
for Spreadsheet-safe text. Unresolved values in the Whole Sheet block the Split
with their count and the next unresolved action. A values-only Note applies to a
workbook.

A Split is not an Export Format. It never appears in the Format list, and the
Chart View is not included.

## CSV Merge

The Sheet Editor adds a Merge button next to Split CSV. It opens the CSV
Merger. The Merge reads every Merge Source and appends its rows into one CSV. It
does not change the Active Sheet, the Current View, the Edit History, or the
dirty state.

A Merge Source is the open Table File or a chosen file. The source list starts
empty; the open file is one action away. The open file contributes its Active
Sheet in Whole Sheet order, including edits. A chosen file contributes its only
Sheet, or the first visible Sheet of a workbook. CSV, TSV, TAB, TXT, XLS, and
XLSX are inputs. A Split ZIP expands into its CSV Parts in natural name order.

Columns match by header text, ignoring case and outer spaces. The first
appearance in Merge Order sets the output order. A missing column gives blank
cells; a new column adds at the right. A duplicate or blank header in one source
switches the whole Merge to position. Headers off means the first row is data,
columns align by position, and the output has no header row.

The Merge writes exact values as one CSV. The delimiter is comma, semicolon, or
pipe; the newline is LF or CRLF; the BOM is on or off. The initial values copy
the first source when it is delimited. The name is the first source stem without
a Split part suffix, then `-merged.csv`. The output writes the header row once.

A Merge of the Parts of a Split restores the original header, columns, row
order, and values. The file name, quoting, an empty field as `""`, and a final
newline can differ. A tab-delimited source becomes comma-separated because Split
has no tab delimiter. Exact bytes are not a promise. A Merge of one source is
valid, because a one-Part Split must merge back.

A Split ZIP is an input. `fflate` reads it on the device. A ZIP with no CSV
entry is a named failure. The Merge never opens a session and never changes the
open Table File. The primary action is disabled for zero sources, zero columns,
or unresolved values. Unresolved values name their source. The open file offers
Next unresolved; a chosen file offers Remove. A workbook shows the values-only
Note. Cancel stops the write and keeps the source list.

## CSV Dedupe

The Sheet Editor adds a Dedupe button in the action strip, before Split CSV. It
opens the Dedupe panel. A Dedupe removes rows from the Active Sheet. It reads
the Whole Sheet, including edits, in underlying order. Search and sort do not
change the result. It is one Edit in Edit History, so undo restores every
removed row. It is not an Export Format.

The user compares all columns or chosen columns. A row is a duplicate when its
Dedupe Key repeats an earlier row; the first row stays. A Dedupe Key is the
displayed text of the chosen columns. Values match exactly: case and spaces
count, and blank matches blank. The header row is never a candidate. All
columns means a whole-row Dedupe.

The panel shows the data row count, the duplicate row count, and the rows to
keep before any change. A change to the columns recounts. The Remove action
names the exact number of rows and is disabled for zero duplicates, zero data
rows, or zero columns. The panel states that it reads the Whole Sheet. A
workbook shows the values-only Note. Unresolved values do not block a Dedupe.

The Dedupe runs in the Worker. A memory failure uses the named device memory
state. The count changes nothing. The Sheet changes only after Remove.

## UI direction

Operate mode. Extend Expose and the existing Persona 5 design language. Use the shared Masthead, compact open-file input, square controls, table rules, tokens, notes, progress, focus management, live announcements, mobile actions, and explainer. Keep the table as the main work surface. The Chart View is a read-only mode with a clear return to the table. Where PWA file handling is supported, accepted file types can open into Tabular from the operating system; browse/drop remains the fallback. Do not add a dashboard shell or unrelated metrics.

At 390 px, retain the table relationship with horizontal scrolling inside the editor, a cell-edit control usable by touch, and accessible actions outside context menus. At 1440 px, show the table and compact toolbar without page-level horizontal overflow. Support both color modes, reduced motion, en-us and id-id, and WCAG 2.2 AA. Keep sticky controls clear of the mobile keyboard.

Shape must cover empty, sample, engine loading, reading, open warning, ready, editing, no matches, empty Sheet, unresolved formula, exporting, split plan, splitting, split ready, merge plan, merging, download ready, clipboard denied, discard warning, cancelled, unsupported/encrypted/corrupt input, offline cache miss, engine failure, and device memory failure.

## Library recommendation and proof gates

**React Data Grid + SheetJS CE** is the preferred starting point, not an untested performance claim. React Data Grid provides editing and a controlled grid model. SheetJS CE covers legacy XLS as well as XLSX and text conversion. Keep both behind application-owned interfaces. Use the official SheetJS distribution instructions, pin the exact version, and record the source and licence.

React Aria remains the shared controls system. Its Table supports navigation, resizing, dynamic columns, and sorting events, plus two-axis virtualization through Virtualizer/TableLayout. It does not supply range editing, paste transactions, or history. Retain it as the comparison candidate in the shape proof. Style a dedicated grid with existing tokens; do not replace the core Table for other Tools.

First prove keyboard editing, range paste, touch access, screen-reader navigation, stable focus under virtualization, React 19 compatibility, SSR-safe loading, and the required data scale. Prefer React Data Grid if it passes. If a blocker appears, record the evidence and compare React Aria or Glide before changing the decision. A canvas grid must pass the same accessibility gate.

Use SheetJS alone if its text parser passes the delimiter, encoding, error, and fidelity fixtures. Add Papa Parse only for a measured or demonstrated gap. Encoding detection is separate from Papa Parse's encoding setting. Do not add two parsers without a reason.

WASM is not required. Calamine is read-only; Excelize-WASM does not cover legacy XLS; DuckDB-WASM adds a query engine without supplying editor history. Revisit only after a concrete proof failure or measured benefit. No library is declared fastest or smallest without a common benchmark.

## Engine boundary

Shape fixes schemas for open/parse options, Table File and Sheet summaries, viewport queries, view updates, Edit commands, history state, export requests, warnings, progress, and cancellation. It also fixes named errors and revision checks. The public interface must not leak SheetJS or grid types.

Keep the full data model and history in a Worker where practical. Supply bounded viewport data to the grid; do not copy the full workbook on every keystroke. Use Effect v4 services and Atoms according to apps/web/docs/effect.md. Validate Worker messages by request shape, not a dedicated Worker's empty origin. Cancellation or a stale response must not replace a newer session or corrupt an existing one.

## Test and measurement targets

- Desktop target: 100,000 rows × 20 columns. Mobile target: 10,000 × 20. These are proof fixtures, not hard import caps or published guarantees.
- Add a wide fixture with 1,000 columns and a bounded row count. Record device, browser, fixture bytes, parse/export time, search/sort time, edit latency, rendered-cell count, and memory/history growth where measurable.
- Initial acceptance targets on a named reference desktop: p95 cell commit feedback at most 100 ms; search/sort completion within 1 second on the standard fixture. Mobile targets and import/export budgets are fixed by shape from a measured probe. If the targets fail, report the gap before making product claims.
- Responsive cancellation and progress during expensive work; no arbitrary count cap. A device memory failure has a named state and recovery action. Parser/container safety bounds are separate, documented limits.
- Fixtures cover every format, text dialect, header edge case, multiple and hidden Sheets, stored/missing formula results, dates, long IDs, empty data, mixed types, corrupt input, format bounds, and malicious header names.
- Chart tests cover role detection, the series cap and selector, sampling, the bar cap, donut aggregation and skipped values, gaps, strict number parsing, Decimal comma, empty states, the data table, focus, and the live announcement. Confirm no export contains the chart.
- Split tests cover the Part count, the repeated header, the last Part, edits, headers off, unresolved values, workbook acknowledgement, file names, the ZIP, and cancellation.
- Merge tests cover the round trip, header matching and folding, position fallback, missing and new columns, Merge Order, headers off, one source, zero rows, unresolved values, workbook sources, the Split ZIP, file names, and cancellation. The round-trip test compares the header, columns, rows, values, and dialect. A second test covers byte equality for a canonical file.
- Dedupe tests cover whole-row and chosen-column keys, the first-row rule, exact text and blanks, the header row, counts before removal, one undoable Edit, zero duplicates, zero rows, zero columns, and workbook values.
- Re-read exports and compare their values, dimensions, order, and scope. Confirm formulas were not emitted. Test atomic undo/redo across Sheets, search, and sort, including structural Edits.
- Verify no network request carries file content, cell values, names, or headers. Cache engine assets through the existing PWA pattern; test offline after the first successful engine load. Report a cache miss honestly.

## Sources checked on 2026-10-26

- [Reference Tool](https://csv-viewer-online.github.io/#how-it-works): local text import, detection, virtual rows, search/sort, edit marks, revert, CSV/JSON/clipboard export, and offline use. It does not supply XLS/XLSX or the requested insertion controls.
- [React Aria Table](https://react-aria.adobe.com/Table) and [Virtualizer](https://react-aria.adobe.com/Virtualizer).
- [React Data Grid API and MIT licence](https://github.com/Comcast/react-data-grid).
- [SheetJS formats](https://docs.sheetjs.com/docs/miscellany/formats/), [installation](https://docs.sheetjs.com/docs/getting-started/installation/), [formula limits](https://docs.sheetjs.com/docs/csf/features/formulae/), and [Workers](https://docs.sheetjs.com/docs/demos/bigdata/worker/).
- [Papa Parse docs](https://www.papaparse.com/docs).
- [Calamine](https://github.com/tafia/calamine), [Excelize-WASM](https://github.com/xuri/excelize-wasm), and [DuckDB-WASM](https://github.com/duckdb/duckdb-wasm).
- Existing Stage 3: [shape #4](https://github.com/rifandani/ritools/issues/4), [engine #5](https://github.com/rifandani/ritools/issues/5), [UI #6](https://github.com/rifandani/ritools/issues/6). Their old Expose scope has since changed; only their delivery pattern is reused.
