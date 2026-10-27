# States and interaction contract

This contract uses the schemas in [engine-interface](engine-interface.md) and the
terms in the [web glossary](../../../apps/web/GLOSSARY.md). The UI uses
application-owned Atoms and the existing shell. It does not reimplement parser
or history decisions in React event handlers.

## State transitions and focus

| State | UI and available actions | Focus / exit |
| --- | --- | --- |
| Empty | Masthead, full input, formats, samples, explainer | Browse is the main action; no autofocus on route entry |
| Sample | Same open pipeline, labelled sample name/provenance | Warn before replacing edits; no special bypass |
| Engine load | Named engine phase, byte progress if known, Cancel | Keep initiator focus; announce phase |
| Parse preview | First 20×20 cells, sampled label, encoding/delimiter/header controls, Apply/Cancel | Focus preview heading; modal only if replacing work |
| Reading | Retain prior accepted session behind busy state; disable writes | Cancel returns to prior state; do not replace with skeleton-only data |
| Warning | Values-only, cache/encoding/ragged/hidden counts with detail | Workbook acknowledgement required before accept; details do not steal focus |
| Ready | Sheet selector, search/sort, editor, history, export | On accepted open, focus first data cell; zero data focuses Add row/column |
| Cell edit | Draft, inline/expanded editor, Apply/Cancel | Commit once; Escape returns to original address |
| Range edit | Rectangle outline, dimensions, Copy/Paste/Delete actions | Cancel restores anchor; valid paste is one Edit |
| No matches | `0 / total`, query, Clear search; retain headers | Keep search focus; Clear search restores first matching cell |
| Empty Sheet | Header rail if present, Add row and Add column | Never show No matches for an empty underlying Sheet |
| Unresolved formula | Distinct cell mark and reason, count, Replace, next unresolved | Keep selectable/editable; export blocked only when in scope |
| Planning export | Counts and exact changed-cell scan, Cancel | Keep export panel focus; no download yet |
| Exporting | Phase/progress, Cancel; disable data writes to preserve revision | Cancellation retains prior valid session; no false success |
| Download ready | Format/scope/Sheet/count receipt, Download, Export again | Announce and focus Download; no automatic navigation |
| Cancelled | Brief status, prior valid session or Empty | Return focus to initiating action |
| Unsupported | Supported formats, Choose another | Error heading then recovery action; old session stays |
| Encrypted | Explain local unencrypted copy needed; Choose another | Never ask for or store a password |
| Corrupt | Explain full open failed; Choose another | Never present a partial workbook as complete |
| Memory failure | Name phase; Download current state if it still exists; Cancel/retry smaller file | Atomic Edit failure leaves old revision; worker loss warns honestly |
| Offline cache miss | Engine not cached; connect once, Retry, Cancel | Distinguish missing asset from bad input |
| Engine failure | Retry engine load, Choose another; keep valid session if possible | Error heading; do not discard data as retry side effect |
| Clipboard denial | Select text, Download TSV, Retry from click | Focus fallback text; do not clear the selection |
| Discard | Change counts and session warning; Keep working, Discard and continue | Default focus Keep working; Escape keeps work |

An Edit failure is not a new Ready session. Show its reason near the action and
retain the selected address where possible. No transient failure silently
switches the Active Sheet, resets parsing, or clears Edit History.

## PDF options

When the Output Format is PDF, the export panel shows Page size (A4 or Letter)
and Orientation (Portrait or Landscape). It hides the delimiter, newline, BOM,
spreadsheet-safe, and JSON controls. The plan shows the page estimate and the
unsupported-character count. Above 500 pages it shows a warning, but it keeps
Create download enabled. The untagged note stays visible. Create download still
requires the values-only acknowledgement. The receipt adds the page count.

Whole Workbook remains one PDF. Cancel terminates the PDF format job and keeps
the accepted session and Edit History. The download is one file. A failed
envelope or page-count check shows ExportVerificationFailed and no download.

The exact text check is manual until a renderer is added. Automated checks cover
the plan data, the `%PDF-`/`%%EOF` envelope, the page count, and the layout
model. Do not mark the text re-read gate as passed.

## Focus when a View changes

An edited cell is addressed by stable identity. After commit, recompute the
Current View. If its row still matches, keep that address visible in its new
sort position. If the row no longer matches, use the row that now occupies the
previous view index; otherwise use the last matching row. Keep the same column.
Announce “The edited row no longer matches the search.” If no rows match, focus
Clear search. Never send focus to `body` when a virtual cell unmounts.

During typing, draft changes do not run search/sort. Recompute once after commit.
When an explicit search or sort changes the View, reset a range selection and
keep the active identity if it matches. Otherwise select the first matching row.
Search retains focus while results arrive. A late result from an earlier query
must not move focus or change the count.

Insertion under active sort/search is explicit: show “Rows are added in Sheet
order. Search and sort will be cleared to show the new rows.” Cancel does nothing.
After insertion, clear that Sheet's View and focus the first inserted cell. This
View change is outside history. Columns insert relative to the active column;
they retain the search/sort if the sorted column still exists. Deleting the sorted
column clears sort. Deleting the active row/column focuses the next underlying
neighbor, then the previous neighbor, then Add row/column if none remains.

Undo/redo across Sheets activates the affected Sheet. Clear its search/sort if
needed to reveal the returned focus target, and announce both the Sheet and the
operation. Keep queries for other Sheets. A deleted target falls back to the
nearest restored structure. Revert all spans every Sheet as one Edit; focus the
first affected Sheet in file order. Its undo restores all changes together.

## Selection and paste

A range is one rectangle in Current View row order and column order. Store its
anchor/extent IDs and view token. A view revision change invalidates its geometry;
resolve or reset it before another paste. Selection can include blank cells.
Headers and data are separate; a header rename is not a range paste.

Keyboard: arrows move, Shift+arrows extends, Ctrl/Cmd+arrows jumps to the last
row or column, Ctrl/Cmd+Home goes to the first cell, Ctrl/Cmd+End to the final
data cell, Page Up/Down moves one viewport. The active cell follows the extent,
so the primary border and the address box mark the latest placement. Home/
End move to row start/end. Tab enters once and can leave the grid at its final
cell. Alt+Backspace reverts the active cell when it holds a source value. The
grid must not trap focus. These shortcuts do not run while editing a
draft or using IME composition. On touch, hold a cell until the range starts,
then drag to the opposite corner; a quick drag scrolls the grid instead.

Paste uses one anchor for a 1×1 selection. For a larger selection, pasted shape
must match the rectangle. Reject other dimension mismatches with dimensions and
a recovery. Out-of-bounds paste does not silently grow a Sheet. Offer Add
rows/columns and retry, with separate Edit counts stated. A malformed quoted
paste is rejected without partial writes.

The browser's clipboard API is optional. Ctrl/Cmd+V uses the trusted paste event
and pastes the block directly. If the block does not fit the selection, the
paste is rejected with a reason and no cells change. Ctrl/Cmd+C copies the
selected range automatically: it serializes values using the same quoted-TSV
rules as export, and unresolved selected values block copy with a reason.
Keyboard copy inside a draft copies draft text normally.

## History and dirty state

One cell commit, one paste, one insert/delete command, one rename, one Revert
cell, or Revert all is one Edit. Search, sort, selection, width, and Sheet changes
are not Edits. Undo/redo uses the global history, except inside an uncommitted
editor where native text undo operates on the draft. Commit the draft before
running global history from a toolbar, or cancel it explicitly.

Dirty comparison is against accepted source data. Undo to baseline clears dirty;
redo can restore it. Individual source-value reverts can also clear dirty. A
download never clears dirty, including Whole Workbook, because download initiation
does not prove a saved file. There is no history eviction. A proposed bound
requires a new recorded decision and a visible contract change.

## Replacement, navigation, offline, and installed handling

Opening another file or sample, applying parse settings/header changes, closing
the file, or route navigation first resolves any draft. If the session is dirty,
show the discard dialog with edited-cell, header, and structural counts. Keep
working preserves the old session and cancels the pending intent. Discard applies
only to that captured intent and revision; edits made after the dialog invalidate
the confirmation. A failed new open does not discard the old accepted session.

Register `beforeunload` only while dirty and use the browser's native message.
Use the router blocker for internal navigation. Browsers can skip unload prompts,
especially on mobile/process termination. The persistent lifetime line remains
visible; do not promise recovery after a reload.

On supported installed browsers, register CSV/XLS/XLSX/TSV/TAB/TXT file handling.
A launch with multiple files asks the user to choose one. It never batches them.
An arriving launch during an edited session follows the same discard flow.
Browse/drop remains available everywhere. The route shell and tiny local sample
recipes are precached; the engine loads lazily and caches after first success.
Offline before cache availability has the named cache-miss state. Never cache a
user file to make installed launches survive reload.

## Implementation handoff checks

The UI and engine issues must test stale session/revision rejection, atomic
failed paste, cross-Sheet undo with an active search, dirty comparison after
revert, the last-column deletion, final empty records, and export outside the
viewport. Verify user data is absent from request URLs/bodies, storage, logs,
telemetry, SSR, and service-worker caches. Asset requests are allowed. Keep
navigation, clipboard, worker-loss, and physical-device checks in browser tests.
For PDF, test the envelope, page count, header repeat, page-size and orientation
options, unsupported-character count, cancelled job, and the manual text gate.
