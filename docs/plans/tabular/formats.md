# Formats and fidelity

All policies below are normative. A parser's default behavior cannot override
them. [Evidence](evidence.md) distinguishes a browser check from a required test.

## Conversion matrix

Every `yes` cell is a required pair. `Text` includes CSV, TSV, TAB, and delimited
TXT. TXT is input only; its data can be exported to every listed output.

| Input | CSV | TSV | TAB | XLS | XLSX | JSON | Clipboard |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CSV | yes | yes | yes | yes | yes | yes | yes |
| TSV | yes | yes | yes | yes | yes | yes | yes |
| TAB | yes | yes | yes | yes | yes | yes | yes |
| Delimited TXT | yes | yes | yes | yes | yes | yes | yes |
| XLS | yes | yes | yes | yes | yes | yes | yes |
| XLSX | yes | yes | yes | yes | yes | yes | yes |

JSON input, remote URLs, XLSB, ODS, XLSM, HTML, and fixed-width TXT are outside
the contract. Sniff the container before parsing. A renamed XLSM is not an XLSX.
Accept XLS BIFF2–8 and SpreadsheetML 2003 XML when detected as an XLS Table File;
write BIFF8 for `.xls`. Encrypted files fail as `EncryptedFile`.
Return `UnsupportedFormat` for an unsupported subtype, not a partial Sheet.

| Output | Current View | Whole Sheet | Whole Workbook | Extension / MIME |
| --- | --- | --- | --- | --- |
| CSV | default | choice | disabled | `.csv` / `text/csv;charset=utf-8` |
| TSV | default | choice | disabled | `.tsv` / `text/tab-separated-values;charset=utf-8` |
| TAB | default | choice | disabled | `.tab` / `text/tab-separated-values;charset=utf-8` |
| JSON | default | choice | disabled | `.json` / `application/json;charset=utf-8` |
| Clipboard | default | choice | disabled | `text/plain`, quoted TSV |
| XLS | default | choice | explicit choice | `.xls` / `application/vnd.ms-excel` |
| XLSX | default | choice | explicit choice | `.xlsx` / `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

Current View exports **all matching rows** in sort order and **all columns**.
It never means the viewport or the selected range. Whole Sheet uses underlying
row order and ignores search and sort. Whole Workbook includes every Sheet,
including hidden and very hidden Sheets, in source Sheet order. It ignores all
view operations. Current View and Whole Sheet produce one Sheet in XLS/XLSX.
Workbook output keeps names and hidden labels; make the first output Sheet
visible if all included Sheets were hidden, with a warning. Do not hide data
from a single-Sheet output. Counts exclude a header row and list every Sheet.

## Cell types and source normalization

| Source | Engine value | Output |
| --- | --- | --- |
| Delimited field | Text, including `00123`, long IDs, spaces and empty strings | Text in workbooks and JSON; exact characters in text export |
| Workbook text | Text, no trimming or Unicode normalization | Text; strings starting with `=` never become workbook formulas |
| Finite workbook number | Number | Number in XLS/XLSX/JSON; canonical decimal string in text |
| Workbook boolean | Boolean | Boolean in XLS/XLSX/JSON; `true` or `false` in text |
| Absent workbook cell | Blank | Blank in workbook; `null` in JSON; empty text field |
| Empty workbook text | Text `""` | `""` in JSON; distinct from Blank in the model |
| Date/time-formatted number | Displayed text from the source format and date system | Same text; no JS Date or timezone conversion |
| Stored formula scalar | The scalar type above, plus `stored-formula` metadata | Values only; warning that results can be stale |
| Formula with no stored scalar | Unresolved `missing-formula-result` | Export blocked if in Export Scope |
| Formula or cell error | Unresolved `formula-error` or `cell-error`, with safe error text | Export blocked if in Export Scope |
| Unsupported/rich non-scalar value | Unresolved `unsupported-value` | Export blocked if in Export Scope |
| Committed edit or paste | Text, including an empty string | Literal text; no formula calculation |

Never fabricate a cached zero. An unresolved value can be replaced with text,
reverted, removed by deleting its row/column, or left outside Current View by
search. The export plan counts unresolved values **in scope**. Whole Sheet does
not inherit a search exclusion. Do not offer a lossy "skip errors" export.
Keep source provenance after an edit so Revert cell restores the original value.
Check formula cache presence before classifying a parser error cell: the probe
returns a missing formula result as an error-typed cell with no scalar value.
An unresolved header also blocks export when header mode is on. Rename header
replaces it with text; Revert header restores its original unresolved state.
Do not expose the formula expression to the interface; a count and cache state
are sufficient. Do not execute external links or formula code.

Read merged ranges as an anchor value and blank covered cells, with a warning.
Export does not recreate merges. Ignore charts, macros, and styling after their
loss is disclosed. Read hidden rows and columns as ordinary data and warn that
they are included. A detected unreadable Sheet fails the whole open; never
present a partly read workbook as complete. Keep empty and hidden Sheets.
Workbook geometry starts at A1 and includes the declared data rectangle, not
format-only trailing cells. Reject corrupt dimensions instead of allocating an
unbounded rectangle from unchecked metadata.

## Header mode and dimensions

- Initial mode is **on** for each non-empty Sheet. Show the first physical row
  in the parse preview and let the user turn it off before acceptance.
- With headers on, the first physical row remains in the engine. It is excluded
  from data-row counts, search, and sort. Headers are text labels derived from
  the source scalar's display string; keep the typed source value for Revert.
- Duplicate, blank, whitespace-only, `__proto__`, and `constructor` headers stay
  unchanged. A blank header is shown as “Blank header · column N” for navigation,
  but the label is not written into the file.
- With headers off, all physical rows are data. UI labels are A, B, …, AA, …;
  generated labels are never exported. Header rename is disabled.
- Changing header mode is a reparse from retained source bytes, with preview.
  It starts a new session. If edited, require discard confirmation before the
  new parse is accepted. This prevents edited cells from becoming hidden headers.
- Empty input has zero rows and zero columns. Keep the Sheet selectable. **Add
  column** creates one blank column; **Add row** then creates a data row. With
  headers on, a new column has an empty header. Deleting the final column also
  removes its row geometry as one Edit; undo restores all rows and values.
- Ragged text rows are padded with empty Text cells to maximum field count.
  Report padding with source row numbers. Trailing empty fields are retained.
  Preserve internal and explicit final blank records. A single terminal newline
  closes the preceding record; it does not create an extra blank record. `\n\n`
  contains a blank record. A zero-byte file is a zero-dimension Sheet.

## Delimited input

Decode bytes before delimiter detection. Remove one leading BOM marker only.
UTF-8 BOM, UTF-16 LE BOM, and UTF-16 BE BOM are strong evidence. Without a BOM,
try fatal UTF-8; show valid UTF-8 as detected, not certain. If it fails, propose
Windows-1252 with a warning. UTF-16 without a BOM can be suggested by zero-byte
patterns, but always needs preview confirmation. A user can override any of the
four encodings. Never silently substitute replacement characters. A selected
encoding that cannot decode fails as `InvalidEncoding` with a preview recovery.

Rank comma, semicolon, tab, and pipe by consistent quote-aware record widths in
the first 64 KiB, at complete-record boundaries. A tie, one-column result,
inconsistent widths, or encoding fallback requires a preview. Display the
encoding, BOM, delimiter, newline style, header mode, sample counts, and the first
20 physical rows × 20 columns. This is a sample, not an import cap. Preview
counts are labelled sampled until the full parse finishes. Always provide
**Parse settings** after open. Do not automatically apply a different dialect.

Quoted fields allow delimiters and newlines. `""` inside quotes is one quote.
Keep embedded LF/CRLF characters. An unclosed quote, illegal quote placement,
or NUL/control ambiguity requires `InvalidDelimitedText`; identify record and
column without sending content to logs. Do not accept permissive parser repair
without a visible, explicit decision. A `sep=` line is ordinary data; it must not
silently remove the first row. TXT with no delimiter opens as one column only
after preview confirmation.

## Text, JSON, and clipboard output

Text files are UTF-8. BOM is off by default; optional UTF-8 BOM is exactly
`EF BB BF`. Newline defaults to CRLF; LF is a visible choice. A file ends with
one record separator when there is at least one row. Quote fields containing
the delimiter, quote, CR, LF, or leading/trailing whitespace. Double quotes
inside a quoted field. Zero rows with headers on still export the header row.
Zero dimensions export zero bytes, plus a BOM only if selected. These are value
exports, not byte-identical rewrites of the source.

CSV defaults to comma; semicolon or pipe requires an explicit choice. TSV and
TAB always use tab. **Use source dialect** copies the source delimiter/newline
settings only for CSV and always shows them. If the source delimiter is tab,
offer TSV or TAB explicitly instead of writing a tab-delimited CSV. The extension continues to match
the selected format. JSON has no BOM and uses two-space indentation with a final
LF. JSON numbers must be finite; do not serialize NaN/Infinity as `null`.

Object-row JSON is allowed only with header mode on and every header non-empty,
not whitespace-only, and unique by exact code-point equality. Keep the original
key text, including spaces. Use `Object.fromEntries` or `Map`, never untrusted
bracket assignment. A zero-data-row object export is `[]`. Otherwise choose array
JSON automatically and explain the cause. Include the header row as text when
header mode is on. With headers off include data only. The user may explicitly
choose arrays even when objects are available. Never suffix, deduplicate, or
overwrite keys. Preserve column order in arrays; object member order is not a
portable column-order guarantee, especially for integer-like headers.

For an explicit array choice, the reason is `user-arrays`. Otherwise resolve
the automatic reason in this order: headers off, blank/whitespace header,
duplicate header, unique headers. This fixes the explanation when more than one
header condition applies.

Clipboard export is quoted TSV, with LF and no BOM. Copy Range uses the selected
rectangle in Current View order; Copy export uses its stated Export Scope.
Clipboard denial leaves the session and prepared text available; offer Select
text and a `.tsv` download. Paste reads plain text only, parses quoted TSV, and
never uses HTML. A plain value is a 1×1 range. A trailing record separator does
not add a pasted row. Reject an invalid matrix as one failure with no Edit.

### Spreadsheet-safe text

Delimited and clipboard export default to **Spreadsheet-safe text**. For each
Text field and header, test the first non-space/control character after leading
U+0000–U+0020. If it is `=`, `+`, `-`, or `@`, or the original first character is
TAB/CR/LF, prefix one ASCII apostrophe to the **whole** original string before
normal quoting. Do not change Number/Boolean/Blank values. Count each altered
output cell, including headers. Show the count and a before/after preview in the
export panel. **Exact values** is an explicit alternative with an explanation.
This protection reduces formula interpretation; it does not guarantee behavior
in every spreadsheet program. It never changes the open Sheet or Edit History.
Workbook text is emitted with a string type and no formula field. JSON never
uses spreadsheet escaping. The output plan records the exact setting used.

## Search and sorting

Search is a case-insensitive literal substring across displayed values in all
data columns of the Active Sheet. Use Unicode default lowercase, no locale
collation, regex, accent folding, or trimming. A blank query matches every row.
Unresolved values search their displayed error label. Recompute after an Edit.

Sort one column. Ascending group order is Number, Boolean, Text, Blank,
Unresolved. Descending reverses each non-empty group's values and the order of
the first three groups; Blank then Unresolved still follow them. Numbers sort
numerically; false precedes true. Text compares Unicode code points after
default lowercase, then exact original code points. Empty Text sorts with Text;
it is not Blank. Within equal values and within Blank/Unresolved, use current
underlying row order. No locale-dependent or natural-number sorting. Clearing
sort restores underlying order. Search/sort never enter Edit History.

## Legacy bounds and file names

BIFF8 has 65,536 physical rows and 256 columns per Sheet. XLSX has 1,048,576
physical rows and 16,384 columns. A header consumes one physical row. Validate
each output Sheet before writing. Check 32,767 UTF-16 code units per workbook
cell and valid workbook Sheet names (31 characters, no `[]:*?/\\`, unique
case-insensitively). These are format bounds, not import caps. Older XLS input
versions use their detected limits. Numeric workbook precision already lost
by the source cannot be recovered; long identifiers in text remain text.

Return `FormatLimit` with the Sheet, dimension/cell, actual count, and limit.
Never truncate, split Sheets, rename a Sheet, shorten text, or drop hidden data
silently. Offer another format or a smaller Current View. Workbook-empty-sheet
serialization must retain the zero-data-row Sheet on read-back.

Download names use `<source-stem>-<sheet>-view.<ext>`,
`<source-stem>-<sheet>-sheet.<ext>`, or `<source-stem>-workbook.<ext>`.
Remove path separators/control characters from a derived file name only; do not
change Sheet labels. Fall back to `tabular`. The browser handles collisions.
Never use the input file handle to write. Browser download completion is not
proof that the user saved the file.
