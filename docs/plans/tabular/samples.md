# Samples and fixture specifications

The checked-in [fixtures](../../proofs/tabular/samples/) are synthetic original
data. [NOTICE](../../proofs/tabular/samples/NOTICE.txt) records origin and licence.
[manifest.json](../../proofs/tabular/samples/manifest.json) records SHA-256 and byte
size. The [generator](../../proofs/tabular/generate-samples.mjs) is the source.
No user dataset, vendor test workbook, or unknown web sample is redistributed.

Use the repository MIT licence for the original recipes and generated values.
SheetJS CE writes the workbook containers under Apache-2.0; its code is not
embedded in a workbook. Keep the generator version/source in provenance. Public
sample assets and recipes move to the application only in issue 20.

## Small offline sample flows

| Sample | Contents | Suggested flow |
| --- | --- | --- |
| Stock list, `stock-check.csv` | 12 data rows, four columns; leading zeros, 18-digit ID, quoted newline/quote, spaces, empty text, formula-like strings | Open, inspect detected settings, search `Packing`, edit Count as text, undo, export Current View as exact CSV and spreadsheet-safe CSV; compare changed-cell count |
| Values workbook, `values-lab.xlsx` | Values, hidden Archive, very hidden Sheet, Empty; typed numbers/booleans, displayed dates, stored zero/result, missing cache, error | Acknowledge values-only, select hidden/empty Sheets, replace unresolved cells, undo across Sheets, export Whole Workbook as XLSX and XLS |

Both are small local assets. Precache them with the route shell. The sample
buttons explain that an engine may need a first download. With no cached engine,
offline sample open shows EngineOffline rather than pretending to work. Once
cached, the full sample flow makes no network request. Opening a sample uses the
same replacement/discard pipeline as opening a user file. No auto-opening sample
may discard edits or silently change a parse setting.

The `.xls` workbook is a format fixture, not a second public sample button. Its
read-back must check missing-cache semantics; a writer can synthesize a stored
result. Do not assert that the XLS sample proves a missing result until the
engine reads the BIFF formula record and compares it with the recipe.

## Fidelity fixture catalogue

| Fixture | Exact expectation |
| --- | --- |
| stock-check.csv / .tsv / .tab / .txt | Comma/tab/tab/semicolon dialect, same text matrix, CRLF, no BOM |
| utf8-bom.csv | Remove one UTF-8 BOM; preserve all fields |
| utf16le.tab / utf16be.tab | BOM selects byte order; café and multiline fields survive |
| windows1252.csv | Invalid UTF-8; propose Windows-1252 in preview; `café` preserved |
| headers-collision.csv | Keep `__proto__`, `constructor`, blank and duplicate `same`; JSON arrays with header row; no prototype write |
| empty-record.csv | Header plus two explicit empty records, including one delimiter-only row |
| invalid-quotes.txt | Named InvalidDelimitedText; zero partial acceptance |
| empty.csv | One zero-dimension Sheet; all output paths have explicit empty behavior |
| values-lab.xls / .xlsx | Four Sheets, hidden labels, source scalar types, dates as display text; stored-result warnings; unresolved/error states |

## Generated scale and boundary recipes

These are disposable, generated at runtime; do not commit multi-megabyte data.
Use zero-based row `r`, column `c`, text `v${r}_${c}` with comma separators. The
grid fixture uses padded nine-digit IDs and `value r c` strings. Dimensions count
data rows; add a header separately when testing file-format row bounds.

| Recipe | Size / purpose |
| --- | --- |
| Desktop | 100,000 × 20; commit, search, sort, full Current View export |
| Mobile | 10,000 × 20; same checks on named physical touch hardware |
| Wide | 100 × 1,000; horizontal virtualization, logical focus, counts |
| XLS rows | 65,535 data + header succeeds; 65,536 + header fails FormatLimit |
| XLS columns | 256 succeeds; 257 fails FormatLimit; never truncate |
| XLSX rows/columns | 1,048,576 physical rows / 16,384 columns; validate bounds without allocating a giant fixture |
| Cell text | 32,767 UTF-16 units succeeds; 32,768 fails before workbook write |
| Header off | Same source; first row becomes data; array JSON omits generated labels |
| Mixed sort | Number -1/0/10, Boolean false/true, Text `02`/`2`/`A`/`a`/empty, Blank, Unresolved; exact order follows formats.md |
| Formula caches | Explicit stored zero, Boolean, text, missing result, error, shared/array formula; compare raw XLS/XLSX storage rather than a writer's invented value |
| Dates | 1900/1904 workbooks, time-only, source display format, serial 60; no timezone conversion |
| Corrupt/encrypted | Locally create truncated ZIP/CFB, invalid relationships and encrypted workbook; named whole-file failure |
| Container safety | Declared expansion/dimensions checked before allocation; document any separate safety bound and rejection reason |
| Malicious names | HTML-like values, control characters, duplicate names, `__proto__`/`constructor`; render as text, reject invalid output names |

Use the same logical matrices in all conversion pairs. Re-read exports and compare
values, scalar types, dimensions, order, Sheet names, scopes, and the absence of
formula fields. For text compare UTF-8 bytes, BOM, quoting, newlines, and the exact
safe-text change count. For clipboard test permission denial and manual fallback.
The engine issue owns the full format proof, including the old XLS variants;
the shape probe fixes the starting choices and records known failures.
