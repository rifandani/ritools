---
version: 1
slug: "src-features-tabular"
primary_target: "src/features/tabular"
related_targets: ["src/routes/tabular.tsx"]
---

# Tabular (/tabular)

## Job and audience

Mode: **Operate**. A person opens a supplier list, a stock export, or a workbook
received from a colleague. They need to check values, correct a range, find rows,
and download a new file. They can use a spreadsheet but need no account or
desktop installation. Success is a correct export whose scope and losses are
clear before download. There is one Table File and one Edit History.

The promise is “View, edit, and convert table files on your device.” The file and
edits stay in this tab. Files and edits do not survive reload or route change.
The input file is never overwritten. Do not call a download a saved session.

## Selected direction

Extend the existing Expose surface and Persona 5 visual system in
[DESIGN.md](../../DESIGN.md). Use the shared Masthead, Container, Button, Search
Field, Select, Menu, Modal/Sheet, Note, Progress, and explainer patterns. The
table occupies the full available content width. A compact open-file strip sits
above it. A permanent settings sidebar would reduce the work area and is not
needed for this task.

The issue already fixes the world and the composition: shared Expose patterns,
table first, compact input, reachable mobile actions. This is a constrained
extension; there is no new visual-world interview or concept tournament. The
[confirmed plan](../../../../docs/plans/tabular.md) supplies the product decisions.
The source files were inspected because the context launch incorrectly treated
the route `/tabular` as a filesystem root. No missing product context is inferred.

Brand expression stays in the red navbar, Ransom name, square controls, 2px cell
rules, 3px major divisions, and printed focus/selection marks. Use Archivo for
controls and text. Use Martian Mono for row numbers and counters. Cell data uses
the body face, not a second monospace theme. Red selection has an outline and
active-cell bracket; changed cells also have a dot and accessible “Edited” text.
Warnings have words and a symbol, not hue alone. Use existing CSS role tokens
and map grid CSS variables to them. No blue grid theme or private palette ships.

## Sequence and hierarchy

1. Shared navbar and skip link outside `main#content`.
2. Masthead: Tabular, promise, no-upload and session-lifetime line.
3. Empty input: Browse/drop, accepted formats, Try a sample. Once open, shrink
   this to file name, size, Sheet count, Open file, and Sample actions.
4. Workbook values-only Note at the top of the editor. Show stored-result and
   unresolved counts, not a dismissible one-time secret.
5. Toolbar: Sheet selector and search first; Undo/Redo and Export next.
   The selector lists every Sheet in file order, row count, and Hidden/Very hidden.
   It is a labelled select, not a row of tabs that overflows on a phone.
6. No printed count line. The live region announces matching and total rows and
   columns for assistive technology.
7. Editor: sticky column headers and row-number rail; two-axis scrolling inside
   a bounded region. Below it, active-cell address, value summary, Revert cell,
   and a range action. These remain usable with touch.
8. Export strip: explicit Export Scope, Sheet name(s), row counts, Copy, Export.
   Export opens settings and counts; it does not immediately download.
9. Download receipt and explainer: values-only losses, local processing, temporary
   session, first engine download, cache lifetime, and offline recovery.

Column and row menus carry the structural actions, so right-click is a primary
path for them. Sheet names, headers, values, and names
are untrusted text. Never render their HTML, auto-link a cell, or use a name as
a DOM identity.

## Layout matrix and captures

The disposable [surface source](../../../../docs/proofs/tabular/surface.html)
uses illustrative data. It shows the proposed structure, not a functional Tool.

| Width / mode | Structure | Capture |
| --- | --- | --- |
| 1440 / light | Full-width editor; selector/search left; history/structure right; export below | [PNG](../../../../docs/proofs/tabular/evidence/1440-light.png) |
| 1440 / dark | Same structure; Carbon/Carbon Raised, Paper text, light Text Red | [PNG](../../../../docs/proofs/tabular/evidence/1440-dark.png) |
| 390 / light | Stacked masthead; wrapped file actions; selector and full-width search; editor scrolls internally | [PNG](../../../../docs/proofs/tabular/evidence/390-light.png) |
| 390 / dark | Same stacking; raised editor and token-based focus/warning marks | [PNG](../../../../docs/proofs/tabular/evidence/390-dark.png) |

At 390 px, the page width remains 390 px. Keep `min-width: 0` on every editor
ancestor. The data rectangle can be wider than the page; its scroll container
must not enlarge the page. Row height is at least 44px on touch layouts. Toolbar
controls wrap and keep a 44px target. A dialog fits the visual viewport and can
scroll above the software keyboard. Do not pin a bottom bar over the keyboard.
If mobile export actions become sticky, reserve their full height and hide that
bar while a dialog owns focus. The action moves focus to the real export
controls before starting work, as Expose does for its mobile action.

At 1440 px, use the shared 48px gutter and available width. Keep descriptions
under 75ch, while the table uses the full width. Column widths start at 144px,
clamp to 80–640px, and can be resized by pointer. Resizing is view state and stays outside Edit History.

## Editing and input

Click/tap selects a cell. Double-click, Enter, F2, Space, or typing starts inline
editing. Printable typing replaces the draft only when composition is not active.
Enter commits and moves down; Shift+Enter or Alt+Enter adds a newline; Tab commits
and moves right; Shift reverses direction. Escape cancels and restores focus to
the same cell. A same-value commit is no Edit. Reaching the final cell never
creates a row implicitly.

The inline editor is a labelled textarea with no separate dialog or expand action.
During IME composition, Enter/Tab/Escape belong to the IME. Commit only after
`compositionend`; do not dispatch on both composition end and blur. Blur commits
once unless Cancel has already run.

Shift+arrows extends a rectangular selection in Current View order. Shift+click
extends from the anchor. Drag selects with edge auto-scroll; touch has **Select
range** with start/end addresses and an Apply action. Selection is geometric UI
state backed by stable row/column IDs; it is reset on search/sort or Sheet change.
Copy works through Ctrl/Cmd+C, and paste through Ctrl/Cmd+V and the visible Paste
text action. Copy writes the selected range as quoted TSV, the same text as an
export, and says how many rows it copied.
The Paste text dialog supports clipboard-denied browsers. All cells in one paste
commit together. Show dimensions before a large paste. Never interpret HTML.

Column header menus give Rename header, Insert before/after, and Delete. The
row-number header adds a row at the end. Header rename is an inline labelled
text field opened from the menu or with F2; duplicates and blanks are allowed.
Undo shortcuts are Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z; Ctrl+Y is an additional redo
shortcut. While a textarea owns focus, its native draft undo stays local until
commit.

## Export controls

Use one export panel for format, Export Scope, Sheet/count list, delimiter,
newline, BOM, JSON shape, and Spreadsheet-safe text. Show only relevant settings;
never silently keep an incompatible Whole Workbook scope after choosing CSV.
Ask the user to choose Current View or Whole Sheet. Current View is the initial
default. Do not suggest that selection controls export scope.

Explain automatic array JSON for duplicate/blank headers or headers off. Show
the changed output-cell count and samples for Spreadsheet-safe text. **Exact
values** is an explicit alternative. The workbook values-only notice and stale
result warning appear again before creating a download. Unresolved/format-limit
plans show recovery links and disable Create download. On success, announce
counts and focus Download. Keep the download available until another export,
an Edit, session replacement, or navigation invalidates it.

## Accessibility and state contract

Use WCAG 2.2 AA in both modes. Focus has a visible bracket/outline. The grid has
one entry tab stop, a labelled name, correct total row/column counts, absolute
indices, and a stable logical active-cell address under virtualization. Keep
the active cell mounted or restore it when it returns. Do not focus a recycled
node by viewport index. A focus fallback must announce the row change.

Announce open/read/export phases and counts politely. Use assertive announcements
only for blocking failures. Do not announce every virtual row or search keystroke.
Debounce search by 150ms and announce only the latest result. With reduced motion,
use composed Ransom letters and stationary progress text. No table-entry motion.

The full [state and focus contract](../../../../docs/plans/tabular/interactions.md),
[copy](../../../../docs/plans/tabular/copy.md), and
[format policies](../../../../docs/plans/tabular/formats.md) are part of this brief.
Follow the measured [gates](../../../../docs/plans/tabular/evidence.md). A DOM
accessibility snapshot alone is not a screen-reader pass.
