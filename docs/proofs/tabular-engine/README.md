# Tabular engine proof

This is the engine proof for issue 19. It has no production route or grid.
The source fixtures contain generated data. No user file is needed.

## Run

From the repo root:

```sh
rtk bun docs/proofs/tabular-engine/build.mjs
```

Open `http://127.0.0.1:4319/docs/proofs/tabular-engine/index.html` in the
collaborative browser. Run these calls through browser evaluation. Start each
Promise without waiting in a tool call, then read its result in a later call:

```js
window.runTabularEngineProof().then(value => window.engineResult = value);
window.runConversionMatrixProof().then(value => window.matrixResult = value);
window.runSmallEngineProof(true).then(value => window.cancellationResult = value);
window.runWorkerRecoveryProof().then(value => window.recoveryResult = value);
```

The benchmark closes each session before the next fixture. Do not run these
calls at the same time. The small proof can use `false` to skip its
cancellation job. This is useful for an offline reload.

The build uses the installed, pinned application packages and the production
Worker code. Vite builds into `/tmp/ritools-tabular-engine`. The service worker
is the application's `apps/web/src/sw.ts`, built with Workbox. It excludes the
Tabular Worker assets from precache and caches them on first use.

The input recipes are in `probe.ts`: a header followed by `v<row>_<column>`
text. The fixtures are 100,000 x 20, 10,000 x 20, and 100 x 1,000. The first
record is a header and is additional to each data-row count. Fixture text is
UTF-8 with LF. Each benchmark exports CRLF CSV, compressed XLSX, and BIFF8 XLS
when the format bounds permit it. Each writer reads its bytes again before it
returns. XLS plans for 100,000 rows or 1,000 columns must return `FormatLimit`.

Import includes the service request, asset load where needed, isolated parser
job, transfer, normalization, and acceptance. Export includes planning, Worker
transfer, writing, and read-back verification. Search/sort p95 uses nearest rank
on 20 samples. Commit p95 uses nearest rank on 41 commits. Commit feedback here
ends at the service response; grid paint belongs to issue 20. Viewport byte
counts are JSON-size diagnostics, not the size of structured-clone messages.

`before-packing.json` records the first full-data transfer. It exceeded the
2-second text import target. `browser.json` records the compact text transfer.
Text fields cross the internal parser boundary as strings, then become typed
cells in the model Worker. Workbook cells keep their types and provenance.
The public schemas did not change.

The conversion-matrix call uses the production service for 42 input/output pairs
and 96 scope checks. It reopens written files through the engine and compares
all small fixture values. JSON compares parsed object rows. Every workbook
export also verifies that it has no formula fields inside the writer.

## Offline checks

Register `/sw.js`, wait for activation, then reload under its control. Run the
small proof once. Check that `web-tabular-v1` has only hashed Worker asset URLs.
Stop the loopback proof server and run the small proof again. Reload the page
and repeat. Use a separate browser profile for the cache-miss check: register
and reload the page, but do not load an engine before stopping the server.
That first engine request must fail as `EngineOffline`.

These checks stop the origin server. They do not change `navigator.onLine` or
claim that the physical network was disconnected. The result record states
which condition was tested.

The recovery proof starts a real local Worker whose script throws. It checks
`EngineFailed`, then retries with the production Worker. This proves startup
recovery. A process or OS kill can lose the sole in-memory model; the engine
does not claim to recover committed edits after such a kill.

## Formats and source licences

The format preflight is
[`../tabular/evidence/engine-preflight.json`](../tabular/evidence/engine-preflight.json).
It reruns the existing shape probe with the pinned official SheetJS package.
It contains 42 small conversion pairs, typed workbook values, hidden and empty
Sheets, encodings, dates, and formula-cache checks. It retains the two known
SheetJS text failures. Papa Parse passes those cases.

The application fixture tests are `tabular.model.unit.test.ts` and
`tabular.controller.unit.test.ts`. They use the same packages, with no mocked
parser. They check every conversion pair and scope, global history, structure,
headers, safe text, malicious headers, dates, unresolved results, and bounds.
BIFF2, BIFF3, BIFF4, BIFF5, BIFF8, and SpreadsheetML fixtures are generated with SheetJS.
`generate-legacy.mjs` writes these fixtures and their SHA-256 manifest. The
encrypted CFB fixture has synthetic encryption streams; it contains no private
workbook data and is not a complete encrypted workbook.
The source bytes for the shape fixtures, their hashes, and their redistribution
notice remain in `../tabular/samples`. New generated fixtures are MIT, like this
repository. No third-party workbook or private data was copied.
