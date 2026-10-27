# Proof record and decisions

Date: 2026-10-26. Issue: [18](https://github.com/rifandani/ritools/issues/18).
This record separates observed results, design decisions, and open gates. It
does not approve a production implementation or close issue 18.

## Reproduction and reference desktop

- Apple M2, Mac14,7, 16 GiB RAM, macOS 26.5.1 (25F80), arm64. The browser UA reports macOS
  10_15_7 for compatibility; that is not a measured OS version.
- Headless Chromium 153.0.8010.12 from installed Playwright 1.63.0. Bun 1.4.2;
  React and React DOM 19.3.0. Browser viewport 1440×900 for grid measurements.
- Mobile-size lab: 390px wide on the **same desktop CPU**, with 10,000×20 cells.
  This is not physical-phone performance. Touch checks use a separate emulated
  mobile context with `hasTouch: true`.
- Source and commands: [probe README](../../proofs/tabular/README.md).
  Raw records: [grid/browser](../../proofs/tabular/evidence/browser.json),
  [parser](../../proofs/tabular/evidence/parser.json),
  [keyboard/touch/heap](../../proofs/tabular/evidence/extra.json),
  [SSR](../../proofs/tabular/evidence/ssr.json).

T3 browser evaluation worked, but snapshot failed twice with
`Preview automation snapshot timed out after 15000ms.` The installed Playwright
tools supplied the remaining checks. A CLI 5-second click timeout on the large
React Aria collection was recorded, then a bounded script used a 20-second
action timeout. Neither error was treated as an accessibility result.

## Grid choice

**Keep React Data Grid 7.0.0-beta.63 as the preferred grid, conditional on the
manual accessibility gate and the bounded viewport adapter.** It passes the
observed native keyboard and virtualization checks. React Aria remains the
shared controls system. Do not replace core Table components in other Tools.

Both candidates use the same generated matrices, row-reference update strategy,
external text/range controls, and existing design colors. The probe holds its
fixture on the main thread. It does not implement the production Worker model.
The external range controls prove a 2×2 paste is one adapter Edit, but do not
prove native drag selection or a complete clipboard/history integration.

| Workflow | React Data Grid | React Aria Table 1.21.1 + Virtualizer/TableLayout |
| --- | --- | --- |
| React 19.3 mount | Pass in all three fixtures | Pass in all three fixtures |
| Enter commit / Escape cancel | Native editor passed | No native editor; application text control passed |
| 2×2 paste as one Edit | Application adapter passed | Same application adapter passed |
| Arrow navigation | Gridcell focus moved with absolute indices | Gridcell focus moved with absolute indices |
| Two-axis scroll | Focus retained at the same row/column identity; active cell remained mounted | Same observed behavior |
| Ctrl+End | Reached row 100001, column 20 | Stayed at row 2, column 2 in this adapter; shortcut gap |
| Total accessibility counts | 100001 rows / 20 columns, including header | Same |
| Touch event access | Emulated tap and visible text Apply produced one changed cell / one Edit | Same, including the row-header cell |
| Screen-reader spoken output | **Not tested; gate open** | **Not tested; gate open** |
| SSR-safe lazy boundary | Mount-gated shell rendered without evaluating a DOM grid | Same guard applies; TanStack hydration remains a UI check |
| Range / clipboard / multiline | Common interaction adapter passed the automated checks below | Same application-owned adapter passed |
| Real IME / physical touch keyboard | Manual proof pending | Manual proof pending |

Accessibility structure at the terminal position is saved for
[RDG](../../proofs/tabular/evidence/rdg-aria.txt) and
[React Aria](../../proofs/tabular/evidence/aria-aria.txt). This is evidence about
roles and labels only. It cannot stand in for VoiceOver/NVDA output.

### Interaction adapter

The separate [interaction proof](../../proofs/tabular/evidence/interaction.json)
runs a common application-owned adapter on both candidates at 10,000×20. It
passed Shift+arrow selection, Shift+click, pointer drag, quoted-TSV preparation,
synthetic clipboard copy/paste events, one-Edit 2×2 paste, whole-paste undo/redo,
atomic rejection of a shape mismatch, cancelled editing with no Edit, multiline
commit, and synthetic composition suppression. It stores inverse cell patches,
not dataset snapshots. Its expanded textarea supplies edit/IME behavior on both
grids; React Aria does not gain a native editor from this result.

This closes the automated range-adapter proof. It does not test real OS clipboard
permissions, an actual IME, software-keyboard occlusion, or spoken navigation.
The adapter's browser focus is independent from its range anchor. Production
must connect it to stable IDs and revision tokens through the public interface.
The interaction bundle includes both candidates and Papa Parse for comparison;
it is excluded from the per-candidate size table below.

### Grid measurements

Load is navigation to the first rendered cells, including fixture creation.
Commit feedback is Enter capture to two animation frames after the change.
p95 uses nearest rank over 41 commits. Paste has one sample per fixture and is
not a percentile. Search/sort each have 20 samples; they run on the full generated
array without a Worker. Sort uses simple text keys, not the full mixed-type
production comparator. Do not present these as end-to-end engine results.

| Candidate / fixture | First cells ms | Mounted cells before / after scroll | Commit p95 ms | 2×2 paste ms |
| --- | --- | --- | --- | --- |
| RDG · 100,000×20 | 325 | 176 / 177 | 32.9 | 32.7 |
| Aria · 100,000×20 | 4589 | 221 / 141 | Native editor absent | 1035.5 |
| RDG · 10,000×20 at 390px | 48 | 64 / 65 | 32.0 | 30.4 |
| Aria · 10,000×20 at 390px | 443 | 51 / 43 | Native editor absent | 76.6 |
| RDG · 100×1,000 | 67 | 176 / 177 | 32.0 | 32.3 |
| Aria · 100×1,000 | 421 | 221 / 141 | Native editor absent | 55.0 |

RDG desktop search p95 was 68.7ms, and simple sort p95 was 16.6ms. The 390px
10,000-row equivalents were 9.6ms and 0.7ms on the desktop CPU. The initial
desktop goals remain commit p95 ≤100ms and search/sort ≤1s. These probes show
headroom for this fixture; they do not prove the production engine meets them.
The Aria collection rebuild failed the 100ms feedback goal in this adapter.
An optimized Aria adapter could differ; no general speed ranking is claimed.

After forced GC, CDP reported about 101.1 MB JS heap for the RDG fixture and
2083.5 MB for the Aria fixture at 100,000×20. These are whole probe-page heaps,
not library sizes. `performance.memory` returned a constant quantized value and
is not used. Ten thousand retained synthetic cell patches added about 1.04 MB
in both pages. This measures small patch records, not the production Edit
History, deleted-range retention, or worst-case strings. No history bound follows
from it. The production engine must measure those cases and may fail an Edit
before commit if memory is unavailable; it must never silently evict history.

### Incremental JavaScript and CSS

The [size record](../../proofs/tabular/evidence/sizes.json) is a standalone Bun
production build. Baseline contains React, React DOM, and a small shell. Candidate
deltas include that candidate's probe adapter and shared controls. Gzip values
use Node zlib defaults. Source maps and fonts are excluded.

| Build | Minified JS bytes | Gzip bytes | JS delta from baseline / gzip |
| --- | --- | --- | --- |
| Baseline | 211614 | 66533 | — |
| RDG + adapter | 279428 | 91818 | 67814 / 25285 |
| Aria + adapter | 1460218 | 416386 | 1248604 / 349853 |

RDG CSS is 9030 raw bytes and 2225 gzip bytes; its theme is overridden with
existing role colors. The Aria candidate has no vendor CSS; the common probe CSS
provides its rules. `grid.css` is shared, so its incremental candidate delta is
zero. These are **isolated probe deltas**, not app delivery costs: much of React
Aria is already used by the app, and shared-chunk extraction can change either
result. Issue 20 must record the actual route JS/CSS delta in the app build.
Do not call either library smallest or fastest from this table.

## Parser decision and measured gaps

**Use SheetJS CE 0.20.3 for XLS/XLSX. Use Papa Parse 5.7.0 for delimited text.**
The second parser is justified by two browser failures, retained in the record:

1. `a,b\n,\n` did not retain the explicit empty two-field record through the
   SheetJS array projection. It returned an empty row without the field geometry.
2. SheetJS accepted an unclosed quoted field without a named parse failure.

Papa Parse passed the strict missing-quote check and preserved empty fields,
spaces, and the long ID with `dynamicTyping: false`, `header: false`, explicit
delimiter, and `skipEmptyLines: false`. Remove only the terminal parser sentinel
row caused by one final record separator; retain an explicit empty record.
Detection/decoding stay application-owned and separate from either parser.
The encoding probe passed browser TextDecoder UTF-8, UTF-16 LE/BE, and
Windows-1252. It did not prove a heuristic detector.

The browser passed all **42 small input/output pairs** in the conversion matrix.
This is a common text matrix, exact-value output, and value read-back. Additional
tests passed typed XLS/XLSX cells, hidden and empty Sheets, literal `=...` workbook
text without formula fields, cached/missing formula distinction, formula error,
and displayed date text. Missing XLSX caches appeared as error-typed cells with
no scalar value; classify missing cache before error type. Full legacy XLS
variants, every type/dialect corner, safe-text bytes, cancellation, and production
scope/history behavior remain tests for engine issue 19.

### Import/export probe and fixed engineering budgets

These are warm engine calls, excluding network download, full normalization,
Worker transport, output re-read, and browser download. Text has three samples;
workbooks have one sample per size. Workbook writes used SheetJS defaults
without ZIP compression; enabling compression changes both time and byte size.
XLS cannot represent the standard 100,000-row Whole Sheet, so that export must
fail before write; the measured BIFF8 fixture uses 10,000 rows.

| Fixture | Bytes | Measured import ms | Measured export ms |
| --- | --- | --- | --- |
| Text 100,000×20 | 18777799 | 71.9–80.4 | 239.4–259.0 |
| Text 10,000×20 | 1677799 | 6.3–6.6 | 15.9–18.0 |
| XLSX 100,000×20 | 84660434 | 3443.8 | 4749.7 |
| XLSX 10,000×20 | 8070411 | 349.7 | 232.4 |
| XLS BIFF8 10,000×20 | 5603328 | 212.5 | 445.0 |

Fix these initial **engineering targets**, not public guarantees:

| Budget | Reference desktop | Mobile-size lab / physical-device target |
| --- | --- | --- |
| Commit feedback p95 | ≤100ms | ≤150ms |
| Search/sort p95 | ≤1s at 100,000×20 | ≤500ms at 10,000×20 |
| Warm text import / export | ≤2s / ≤3s | ≤2s / ≤3s at 10,000×20 |
| Warm XLSX import / export | ≤10s / ≤15s | ≤3s / ≤5s at 10,000×20 |
| Warm XLS import / export | ≤3s / ≤5s at the measured 10,000×20 legacy fixture | ≤3s / ≤5s at 10,000×20 |
| Job cancellation response | UI acknowledges within 100ms; isolate synchronous parser jobs | UI acknowledges within 150ms; job termination must preserve accepted data |

The import/export margins allow normalization, verification, and Worker work.
They are derived from the measured disposable calls above. Phone budgets are
provisional until a named physical device passes; the emulated viewport does
not settle that gate. Engine download is network-dependent and has byte progress,
not a fixed latency promise. Large-file safety bounds are separate from targets.
If production measurements exceed a target, record the failure and tradeoff
before changing the budget or making a user claim. No import cap is implied.

### Versions, distribution, and licence review

| Package | Exact source | Licence and review requirement |
| --- | --- | --- |
| React Data Grid 7.0.0-beta.63 | [npm release archive](https://registry.npmjs.org/react-data-grid/-/react-data-grid-7.0.0-beta.63.tgz) | MIT; retain Prometheus Research / Comcast notice; beta upgrade needs a repeat of gates |
| React Aria Components 1.21.1 | Existing app pin; installed source, TableLayout and Virtualizer declarations inspected | Apache-2.0; existing dependency, no new install |
| SheetJS CE 0.20.3 | [official archive](https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz) | Apache-2.0; retain upstream licence/notices with shipped distribution |
| Papa Parse 5.7.0 | [npm release archive](https://registry.npmjs.org/papaparse/-/papaparse-5.7.0.tgz) | MIT; retain upstream notice; text-only adapter |
| jsPDF 4.2.1 | [npm release archive](https://registry.npmjs.org/jspdf/-/jspdf-4.2.1.tgz) | MIT; runtime deps @babel/runtime, fflate, fast-png; optional browser plugins are not imported |
| jspdf-autotable 5.0.9 | [npm release archive](https://registry.npmjs.org/jspdf-autotable/-/jspdf-autotable-5.0.9.tgz) | MIT; peer jsPDF; no runtime dependencies |
| Archivo static TTFs | Derived from the existing OFL variable font with the fonttools recipe in `core/libs/brand/faces.ts` | OFL 1.1; body 400 and title 900/125%; committed under `public/fonts/pdf` |

[setup.py](../../proofs/tabular/setup.py) pins SHA-256 for each downloaded archive.
The official SheetJS [installation instructions](https://docs.sheetjs.com/docs/getting-started/installation/frameworks/)
name the CDN release source. Do not assume the npm `xlsx` registry package is
current. Before installing in issue 19, re-check the exact official source,
archive hash, package licence/NOTICE, transitive dependencies, known advisories,
and the repository SCA gate. Pin and serve reviewed assets locally; no runtime
CDN script may receive file names or data. This record is a distribution/licence
inventory, not an advisory-clearance or legal opinion.

One parser was tried first. The two failures above justify a narrow text parser.
Do not add a third parser or WASM engine without a new demonstrated gap. Calamine
is read-only, Excelize-WASM does not cover XLS, and DuckDB-WASM does not supply
Edit History; none is selected. No Glide proof is needed while the preferred
grid has no demonstrated blocking accessibility failure. If the manual gate
fails, record that failure, fix/retest RDG, then prove the Aria alternative or
Glide against the same complete gate. Do not reduce editing/accessibility scope.

## PDF writer decision

The PDF writer is **jsPDF 4.2.1 with jspdf-autotable 5.0.9**. It runs in an
isolated format job Worker. The PDF is a report, not a data format.

Candidates were measured on 2026-10-27 with 1,000 rows x 10 columns, the Archivo
400 TTF, and the same table content in a Chromium Web Worker:

| Stack | Time | PDF | Pages | Writer chunk (gzip) | Table engine |
| --- | --- | --- | --- | --- | --- |
| jsPDF + AutoTable | 318 ms | 139 KB | 26 | 258 KB | yes |
| pdfmake 0.3.13 | 390 ms | 313 KB | 27 | 303 KB | yes |
| pdf-lib 1.17.1 + fontkit 1.1.1 | 428 ms | 204 KB | 13 | 554 KB | no |
| LibPDF 0.5.3 | 121 ms | 1.69 MB | 13 | 259 KB | no |

The pdf-lib and LibPDF rows are raw text drawing, without a table layout. The
jsPDF and pdfmake rows include the table layout. Times are engineering
measurements, not public speed promises.

jsPDF wins on the combined axes: the smallest chunk that includes a table engine
and the brand font, the smallest output, the smallest dependency surface among
the table-capable writers, and the fastest complete table path. pdfmake has the
better document model, but its output is about twice as large and its pdfkit
tree is larger. LibPDF creates one content stream for each `drawText`; the
1,000 x 10 file had 10,029 streams. pdf-lib needs a custom table layout and
fontkit for the brand font.

WOFF2 is not usable. pdfmake accepted the file and produced a PDF whose text did
not render; jsPDF does not read WOFF2. The static TTFs are generated from the
existing OFL variable font with the same fonttools recipe used for the brand
instances. jsPDF exposes the TTF cmap, so the plan counts unsupported characters
exactly.

The runtime check covers the `%PDF-` header, the `%%EOF` trailer, the page count,
and the layout model. It does not extract text. The plan's "re-read exports and
compare values" gate is **manual for PDF** until a renderer or parser is added.
This is an open gate, not a pass. It is the price of the no-extra-parser
decision.

`bun audit` on 2026-10-27 reports no advisory in the PDF runtime packages after
the `fflate` 0.8.3 patch. It still reports five advisories in dev tooling
(`fallow` and `qs`). The source and licence inventory above is not an advisory
clearance or legal opinion.

### PDF manual check

Date: 2026-10-27. The fixture is [pdf-check.pdf](../../proofs/tabular/evidence/pdf-check.pdf),
written by [pdf-check.ts](../../proofs/tabular/pdf-check.ts) with the production
writer and the static Archivo TTFs. The record is
[pdf-check.json](../../proofs/tabular/evidence/pdf-check.json).

- The file has 21,169 bytes and 2 pages. The envelope starts with `%PDF-` and
  ends with `%%EOF`.
- The plan estimated 2 pages and counted 0 unsupported characters for this
  fixture. The unit tests cover the `?` replacement and the count separately.
- Page 1 was rendered in Quick Look. It shows the `Orders` title, the
  `orders-2026.csv` source name, `60 rows`, the red rule, the dark table header,
  and the footer `orders-2026.csv` / `1 / 2`.
- Page 2 was split with pypdf only to render it; no text was extracted or
  compared. It shows the compact `Orders` header, the repeated table header, and
  the footer `2 / 2`.
- The text re-read gate stays **open**. This is a visual check of the rendered
  report, not a value-by-value text comparison.
- The production build emits `tabular.pdf-<hash>.js` as a separate lazy chunk:
  427 KB raw and 137 KB gzip. The format Worker is 605 KB raw and 198 KB gzip.
  Neither the PDF chunk nor `fonts/pdf/**` is in the precache manifest; the
  service worker caches them on first use.

## Surface verification

The four captures show the 390/1440 light/dark surface, with reduced motion.
Measured page widths equal viewport widths. The 390px editor is 354px wide while
its table is 1240px wide, so scrolling remains inside the editor. The specimen
uses a simplified navbar and local fonts; production must use the real shell
and shared controls. The brief, not placeholder button behavior, fixes product
interactions. Both Locales are specified in [copy](copy.md); screenshots are en-us.

The Impeccable detector reported cross-mode static contrast combinations such as
dark muted text on white and black on dark stock. Verify actual composed
backgrounds rather than changing the existing design palette from those pairs.
[Computed colors](../../proofs/tabular/evidence/computed-colors.json) record the
live backgrounds. The [composed contrast check](../../proofs/tabular/evidence/contrast.json)
measured at least 5.33:1 for the ten representative text/control specimens in
both modes. This is not an audit of every state. The placeholder now explicitly uses the mode's muted token.
The complete WCAG audit and both-Locale UI screenshots remain issue 20 checks.

## Open gates and ownership

| Gate | Status | Required evidence / owner |
| --- | --- | --- |
| Product behavior, types, errors, format/scope, history grouping | Fixed by these documents | Engine/UI must consume this contract |
| Surface at 390/1440, both modes | Captured and inspected | Keep screenshots linked to source |
| Grid keyboard, counts, scroll focus, small atomic paste | Observed partial pass | Sources/raw results here; native Aria editor/shortcut gaps recorded |
| Spoken assistive technology | **Pending; blocks final grid approval in #18** | Human VoiceOver/Safari and NVDA/Chrome transcript/version record |
| Physical touch and mobile budgets | **Pending; blocks final #18 device claim** | Named iOS/Android device, software keyboard and range editing run |
| Range selection, copy/paste grouping, undo, multiline | Automated common-adapter pass | Real IME, OS clipboard, and phone keyboard remain part of the manual gates |
| Full required formats, legacy variants, safeguards, read-back | Engine #19 | Every pair plus fixture catalogue; named failures, no silent truncation |
| PDF text re-read | **Pending; manual until a renderer is added** | Open a generated PDF and compare values, order, and scope. The runtime check covers the envelope, page count, and layout model only. |
| Worker ownership / bounded viewport adapter | Engine #19 + UI #20 | No full dataset in Atoms; focus/cache invalidation and stale-token tests |
| Actual route incremental JS/CSS | UI #20 | App build before/after, shared chunks accounted for |
| Offline/installed file handling, privacy, route/discard, hydration | Engine/UI implementation | Browser/network/storage checks on real application |

The issue remains open because the pending #18 gates are not a pass. The
documents, fixtures, and probes are reviewable now. Engine/UI implementation
must not treat a conditional library preference as completed accessibility proof.

## Primary references

- [Reference Tool](https://csv-viewer-online.github.io/#how-it-works): checked for
  local import, edit marks/revert, detection, search/sort, exports, and offline use.
- [React Data Grid source/API](https://github.com/Comcast/react-data-grid): source
  and pinned declaration review; native cell editor, row keys, scroll/focus API.
- [React Aria Table](https://react-aria.adobe.com/Table) and
  [Virtualizer](https://react-aria.adobe.com/Virtualizer): installed components
  used in the same probe; no assumption that Table supplies range history.
- SheetJS [formats](https://docs.sheetjs.com/docs/miscellany/formats/),
  [formula behavior](https://docs.sheetjs.com/docs/csf/features/formulae/), and
  [Workers](https://docs.sheetjs.com/docs/demos/bigdata/worker/): input/output
  coverage, stored-result boundary, and local Worker execution.
- [Papa Parse documentation](https://www.papaparse.com/docs): text parsing options
  and error records. Encoding detection stays outside its parse setting.
- [jsPDF](https://github.com/parallax/jsPDF) and
  [AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable): writer and table
  engine, MIT, Worker check on 2026-10-27.
- [pdfmake](https://github.com/bpampuch/pdfmake),
  [LibPDF](https://github.com/LibPDF-js/core), and
  [pdf-lib](https://github.com/Hopding/pdf-lib): compared and rejected for the
  reasons in the PDF writer decision. pdf.js and unpdf are readers, not writers.
