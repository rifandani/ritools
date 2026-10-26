# Tabular engine handoff

Issue: 19. The engine is in `apps/web/src/features/tabular`. It has no production
route, Tool Catalog entry, or grid. Issue 20 can use this interface.

## Entry points

- `tabular.ts`: application-owned schemas, IDs, values, requests, replies,
  warnings, and tagged errors from the shape contract.
- `tabular.service.ts`: `TabularEngine`, with scoped Worker ownership, typed
  request/reply checks, interruption, progress streams, and asset failures.
- `tabular.atoms.ts`: `makeTabularAtoms`. Make one instance per route. Mount
  its `runtime` for that route lifetime. Call `close` before leaving the route.
  The scope finalizer also terminates the Worker. Do not keep these Atoms alive,
  serialize them, or write them to storage.
- `tabular.worker-client.ts`: browser Worker and same-origin asset loader.
  It creates no Worker during SSR.

The public service follows `engine-interface.md`. `prepareOpen` and
`prepareReparse` use their documented separate arguments. Other request-based
methods accept their corresponding request record. The UI never calls a parser
or sends Worker messages. Start progress observation before the request. A
finished request closes its stream, including an engine-load failure.

The Atoms retain one bounded viewport. `busy` reads their operation states.
`trackProgress` reads the service stream. The operation's AsyncResult contains
its typed failure; the UI must show the paired copy from `copy.md`. On a Sheet
switch or revision change, request a new View and viewport. A viewport response
must match the session, revision, View, and latest viewport request.

## Model and edits

The model Worker holds the accepted source bytes, normalized data, stable row
and column IDs, baseline, Views, export plan, and one Edit History across all
Sheets. Source cells are immutable. Edits use sparse overrides and inverse
patches. Structure commands retain order vectors and deleted identities for
undo. They do not retain a workbook snapshot for each cell commit.

Each Edit stages its changes before one revision commit. Invalid paste or
structure requests leave the accepted model intact. Revert all is one undoable
Edit. Changed-cell counts include surviving changed values. Deleted cells,
renamed headers, and structure counts remain separate. Dirty state compares
the current data and order with the baseline. An insert followed by deletion
can leave the session clean while its history still contains both commands.

Search is literal default-Unicode lowercase across data-cell display values.
Sort uses the fixed mixed-type order in `formats.md` and underlying order for
ties. Neither operation changes source order or history. Current View exports
all matches in that order; Whole Sheet and Whole Workbook use underlying order.

Parser and writer jobs use separate Workers. Cancellation can terminate a
synchronous format job without terminating the accepted model. A failed export
keeps committed edits. Responses from an old session fail after replacement.
An old View or plan cannot become current through a delayed reply.

## Formats and export

SheetJS CE 0.20.3 comes from its official versioned CDN package. The
[official installation guide](https://docs.sheetjs.com/docs/getting-started/installation/)
names that CDN as the primary distribution site. The package is fetched during
installation. Browser code is bundled and served by Ritools.

Papa Parse 5.7.0 handles delimited input. The shape proof found two SheetJS text
gaps: lost explicit empty-field geometry and accepted missing quotes. The engine
adds strict quote validation before Papa Parse. Encoding and delimiter detection
are application-owned and visible through Candidate. Ambiguous detection needs
a preview. Ragged records keep their width through empty Text padding.

Workbooks retain scalar types, displayed date text, hidden and empty Sheets,
and stored-result provenance. Missing or erroneous formula results remain
Unresolved. Export plans count these values in scope and block writing. The
engine never calculates or emits formula code. Values-only acknowledgements are
required on workbook open and each workbook export.

JSON uses object rows only with unique, non-blank headers. It uses
`Object.fromEntries` for header keys. Other cases use arrays with the documented
reason. Delimited and clipboard output can add spreadsheet-safe apostrophes
without changing the model. The plan contains changed-cell counts and examples.
Clipboard output is quoted UTF-8 TSV with LF and no BOM. Issue 20 must call the
browser clipboard from a user gesture and keep the prepared bytes after denial.

XLS/XLSX dimensions, cell text, and Sheet names are checked before writing.
The writer reads the output again and checks values, types, dimensions, Sheet
order, visibility, and absence of formulas. Text and JSON also have read-back
checks. Oversized output returns `FormatLimit`; it is never truncated.

## Assets, lifetime, and proof

The service worker caches hashed Tabular Worker scripts in `web-tabular-v1` on
first use. Vite excludes them from precache. Fetches use fixed same-origin code
URLs and carry no file bytes, names, headers, or cell values. User data stays in
memory. Route disposal terminates Workers. Downloading never marks a session
clean and never writes the original file handle.

The [proof README](../../proofs/tabular-engine/README.md) gives reproduction
commands, fixture recipes, raw measurements, and offline checks. The shape's
physical phone, real IME, and assistive-technology grid gates remain with issue
20. A physical-phone performance result is not claimed here.

The reference desktop is an Apple M2 Mac14,7 with 16 GiB RAM. The browser is
T3 Code's Chromium 152.0.7977.167 / Electron 44.9.3. All three fixture sizes run
on that desktop CPU. Viewport transport checks return 640 cells, within the
4,096-cell and 256-column limits. Grid rendering and paint are outside this
engine proof. Worker heap usage is not available through this browser API.
History bytes are an estimate from retained patches, not a process-memory
measurement. There is no history count limit or silent eviction.

The first 100,000 x 20 text import took 2.77 s and missed the 2 s target. Compact
text transfer removed the large per-cell object clone between the parser and
model Workers. The updated 100,000 x 20 import was 0.63 s. Search p95 was 765 ms and sort p95
was 372 ms over 20 samples. CSV export with verification was 2.65 s; XLSX
export with verification was 7.30 s. These are engineering measurements, not
public speed promises. The updated measurements are in `browser.json`; the earlier
result remains in `before-packing.json`.

The browser checks also cover cancelled format jobs with committed edits,
a real Worker startup crash followed by retry, cached processing and reload
with the origin server stopped, and a named `EngineOffline` cache miss in a
separate profile. This does not claim recovery after a process or OS kill. Such
a kill can lose the sole in-memory model.

## Verification

- `bun test:unit`: 881 tests passed across 71 files during the full-suite run.
- `bun test:unit --project web tabular`: the final fixture run passed 30 tests.
- `bun web typecheck`: passed.
- `bun lint`: passed.
- `bun web build`: passed. The existing ExifTool browser-external warning and
  dependency module-directive warnings remain in the build output.
- Browser production-service matrix: 42 input/output pairs and 96 scope checks passed.
  See `conversion-matrix.json` in the proof directory.
- Standalone production Worker build: passed. It exercises the engine entries
  before issue 20 adds a production route that imports them.

The full-suite run preceded the last UTF-16 SpreadsheetML and untrusted Sheet
name fixtures. Both pass in the focused final run. The shape probe's two known
SheetJS text failures remain recorded and are covered by the selected Papa
Parse path. No required format was removed.
