# Disposable Tabular proofs

These files support [issue 18](https://github.com/rifandani/ritools/issues/18).
They are not application source. No application manifest or lockfile changes.
Use the existing Bun, Node, Python, and Playwright installations. Downloaded
packages and build output stay under `/tmp/ritools-tabular-18`.

The `.tsx.txt` files are source templates. `build.ts` copies them to the temporary
directory before bundling. The repository's automatic `fallow fix` removes
exports from modules outside its entry graph; templates prevent that cleanup
from breaking an intentionally separate disposable program.

## Run

From the repository root:

```sh
rtk python3 docs/proofs/tabular/setup.py
rtk bun docs/proofs/tabular/build.ts
```

The second command serves `http://127.0.0.1:4188`. In another terminal:

```sh
rtk node docs/proofs/tabular/browser.mjs
rtk node docs/proofs/tabular/parser-browser.mjs
rtk node docs/proofs/tabular/interaction-browser.mjs
rtk node docs/proofs/tabular/extra-browser.mjs
rtk node docs/proofs/tabular/ssr.mjs
rtk node docs/proofs/tabular/generate-samples.mjs
rtk python3 docs/proofs/tabular/check-contract.py
```

`TABULAR_PROBE_DIR` can select another temporary directory. Use the same value
for every command. Do not point it into the application. Stop the probe server
with Ctrl+C. It is loopback-only and has no upload/write endpoint.

The T3 preview was tried first. Snapshot failed twice with
`Preview automation snapshot timed out after 15000ms.` The workflow then used
the installed Playwright browser. The CLI was also tried; its default click
timeout expired while React Aria rebuilt the large collection. The bounded
script uses a 20-second action timeout and records failures rather than hiding
them. It does not install another browser or change application browser config.

## What the probe does

- Builds equal standalone React baselines and grid candidates with Bun 1.4.2,
  minification, and production React. `sizes.json` records raw and gzip bytes.
- Uses controlled row arrays and a small range-paste adapter on both grids.
  Paste clones the row-reference vector and changed rows, not each workbook.
  This is not the production Worker/viewport adapter.
- Checks native keyboard commit/cancel for React Data Grid. React Aria has no
  native editor in this comparison; visible coordinate/text controls supply
  the same application-owned cell/paste path. That does not prove inline parity.
- Runs 100,000×20, 10,000×20 at 390px, and 100×1,000 fixtures. Records mounted
  cells, total ARIA counts, absolute indices, and focus before/after two-axis
  scroll. Records simple full-array search/sort timing separately from rendering.
- Measures Enter-to-two-animation-frame feedback for repeated grid commits.
  This is a disposable main-thread adapter measurement, not engine acceptance.
- Exercises SheetJS in a browser for required text dialects, typed XLS/XLSX
  roundtrips, encodings, missing/cached formulas, errors, and date display.
- Retains the two **expected SheetJS text failures** as evidence. A narrow Papa
  Parse proof demonstrates the proposed text-parser fallback. Detection remains
  separate; explicit delimiters avoid treating a heuristic warning as corruption.
- Renders the surface at 390/1440 in light/dark, with reduced motion. Checks
  page overflow. The surface is illustrative; several buttons are layout marks.
- Proves a mount gate renders a server shell without evaluating a DOM grid.
  This does not replace a TanStack route hydration test in issue 20.

`interaction-browser.mjs` checks a second, common adapter on both grids: keyboard
rectangle selection, copied TSV, atomic paste and undo/redo, rejected paste,
expanded multiline editing, cancel, and a synthetic composition guard. It does
not claim a real IME, physical touch, or screen-reader pass. The main timing
probe stays separate, so these controls do not change its recorded size deltas.
`parser-browser.mjs` can rerun formats/performance without rerunning grid timing.
`extra-browser.mjs` records structural accessibility, touch events, and CDP heap.

## Required manual gate

Run both candidates on VoiceOver + Safari/macOS and NVDA + Chrome/Windows.
Record exact OS/browser/reader versions and spoken output. Test grid entry,
headers, total counts, row/column navigation, entering/cancelling/committing an
editor, selecting/pasting 2×2 as one Edit, scrolling the focused cell out of both
axes, undo on another Sheet, and leaving the grid with Tab. A DOM role snapshot
is not a spoken-output test. Do not mark this passed without a human run.

Run the 10,000×20 fixture on a named physical iOS or Android device. Test touch
selection by hold and drag, visible Edit cell/Paste text, software keyboard
avoidance, Apply/Cancel, horizontal scroll, and export controls. Browser touch
emulation is evidence of event access only, not hardware performance or
accessibility.

See [evidence and decisions](../../plans/tabular/evidence.md) for gate ownership,
measured limits, budgets, licence review, and known failures. Do not publish a
fastest/smallest claim from these numbers.
