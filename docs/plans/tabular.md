# Tabular: Stage 3 decision contract

Status: scope confirmed on 2026-10-26. Planning only; the Tool does not ship yet.

The user requested a browser viewer and editor for CSV, XLS, XLSX, TSV, and TAB, with conversion, search, sorting, row and column insertion, and undo/redo. They authorized recommended defaults and confirmed values-only workbook export. This contract supplies the three Stage 3 issues: shape, engine, then UI. Shape fixes the detailed brief and interface before production work.

## GitHub issues

1. [Shape #18: surface, data contract, and engine interface](https://github.com/rifandani/ritools/issues/18). No prerequisites.
2. [Engine #19: local parsing, editing, and conversion](https://github.com/rifandani/ritools/issues/19). Blocked by #18.
3. [UI #20: browser viewer and editor](https://github.com/rifandani/ritools/issues/20). Blocked by #18 and #19.

## Product boundary

- Name: **Tabular**. Route: `/tabular`. Promise: “View, edit, and convert table files on your device.”
- One open Table File per session. Every Sheet is available through a sheet selector, including hidden sheets with a clear label. No batch conversion, folder watching, or simultaneous open files.
- Local data only. No accounts, file upload, remote file import, or server storage. Files and edits do not survive a reload or route change. Replacing or leaving an edited session requires a discard warning where the browser permits it.
- Values-only editing and export follow [ADR-0021](../adr/0021-tabular-edits-cell-values.md). Preserve source bytes on disk. Downloads use a new name.
- No formula calculation, chart editing, workbook styling, merged-cell editing, fill handles, sheet creation/deletion, deduplication, SQL, or batch work.
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

Current View is the default. It means all matching rows, including rows outside the rendered viewport, in the current sort order, with all columns. The export controls show the scope, sheet name, and row count. Whole Sheet ignores search and sorting. Whole Workbook includes all Sheets and ignores each view's search and sort. For Current View and Whole Sheet, XLS/XLSX contain one Sheet. Whole Workbook is an explicit choice. Never truncate to fit XLS/XLSX limits.

Object-row JSON is the default only when headers are unique and non-empty. Otherwise use arrays and state why. Array JSON includes the header row when header mode is on. Keep duplicate and blank source headers; never overwrite a cell to make object keys. JSON import is deferred.

## Data fidelity

- CSV, TSV, TAB, and TXT values stay text. Keep leading zeros, long identifiers, whitespace, and empty cells. Do not infer dates or numbers.
- Workbook cells retain scalar number and boolean values when available. Text stays text. Date-formatted values become their displayed text; do not invent a timezone. An edited value is text unless the user explicitly changes its type in a future release.
- Show formula stored-result warnings and missing-result states. Formula errors retain a distinct warning; no formula code runs. Values that start with `=` remain literal text in XLS/XLSX output.
- Keep source headers separate from stable column identity. Header mode can be on or off. Changing it or reparsing must not silently discard edits.
- Detect comma, semicolon, tab, and pipe delimiters. Support quoted fields, escaped quotes, embedded newlines, BOMs, LF, and CRLF. Show the detected delimiter and allow an override.
- Support UTF-8, UTF-16 LE/BE, and Windows-1252. Show the detected encoding and allow an override. Ambiguous input needs a preview; a guess is not a guarantee. Export text as UTF-8, with an optional BOM.
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

## UI direction

Operate mode. Extend Expose and the existing Persona 5 design language. Use the shared Masthead, compact open-file input, square controls, table rules, tokens, notes, progress, focus management, live announcements, mobile actions, and explainer. Keep the table as the main work surface. Where PWA file handling is supported, accepted file types can open into Tabular from the operating system; browse/drop remains the fallback. Do not add a dashboard shell or unrelated metrics.

At 390 px, retain the table relationship with horizontal scrolling inside the editor, a cell-edit control usable by touch, and accessible actions outside context menus. At 1440 px, show the table and compact toolbar without page-level horizontal overflow. Support both color modes, reduced motion, en-us and id-id, and WCAG 2.2 AA. Keep sticky controls clear of the mobile keyboard.

Shape must cover empty, sample, engine loading, reading, parsing preview, parse warnings, ready, editing, no matches, empty Sheet, unresolved formula, exporting, download ready, clipboard denied, discard warning, cancelled, unsupported/encrypted/corrupt input, offline cache miss, engine failure, and device memory failure.

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
