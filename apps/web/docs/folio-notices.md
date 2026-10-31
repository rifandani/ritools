# Folio PDF viewer notices and provenance

Folio uses `@embedpdf/viewer-react@3.0.0-next.18` (Apache-2.0), the React
wrapper around the `@embedpdf/viewer` custom element. That package bundles
PDFium compiled to WebAssembly (BSD-3-Clause), runs it in a dedicated Worker,
and ships its own toolbar, panels, annotations, forms, signatures, redaction,
printing, and save flow. No other PDF viewer is included.

OCR adds `tesseract.js@7.0.0` and `tesseract.js-core@7.0.0` (Apache-2.0) with
the `eng` and `ind` traineddata (Apache-2.0), plus `pdf-lib@1.17.1` and
`@pdf-lib/fontkit@1.1.1` (MIT) to write the invisible text layer. The text
uses the Archivo face that already ships for the Tabular PDF Report
(SIL OFL 1.1). The original PDF is never modified.

`@embedpdf/viewer` and `@embedpdf/react` are pinned to the same
`3.0.0-next.18` build. The package manager records their registry integrity
values in `bun.lock`.

## Served assets

Vite emits the viewer code and engine assets into the app's own build:

- `assets/folio-viewer-*.js`, the lazily imported React adapter.
- `assets/embedpdf-worker-*.js`, the PDFium Worker.
- `assets/embedpdf-*.wasm`, the PDFium WebAssembly binary.
- The viewer's own chunks, locales, stamps, and signature fonts.
- `/folio/ocr/`, the OCR worker, the SIMD LSTM core, and the `eng` and `ind`
  traineddata, copied from their packages by
  `scripts/copy-ocr-assets.ts` before `dev` and `build`.

Nothing is fetched from a CDN. `public/folio/notices/` carries the
Apache-2.0 text for EmbedPDF and Tesseract, the BSD-3-Clause text for PDFium,
the MIT texts for `pdf-lib` and `fontkit`, the OFL-1.1 texts for the Allura,
Caveat, Great Vibes, and Archivo faces, and `VERSIONS.txt` with the pins.
`public/folio/sample.pdf` is the generated sample; its content is CC0-1.0.

The build does not claim a complete transitive notice inventory, registry
signatures, or a security audit. The minified viewer bundle keeps its own
source comments; the copied license texts are the provenance record for the
engine and fonts.

## Runtime cache and network

The service worker caches only the generated sample, the notice files, the
hashed viewer and Worker scripts, and the OCR assets under `/folio/ocr/`. The
viewer's WebAssembly binary and the OCR core use the same `CacheFirst` route
as the app's other runtime-cached WASM. It never caches a user PDF, password,
note, form value, output, page image, OCR text, or session state.

The OCR engine reads the traineddata from that cache. Its own IndexedDB cache
is off (`cacheMethod: "none"`), so the model files exist once, and no page
image or OCR text is stored. A selected file is handed to the viewer as a
`File`. The viewer reads the bytes in the page and sends them only to its own
Worker; the OCR Worker receives a PNG of each selected page and returns words
with boxes. The page makes no request that contains a file name, bytes, image,
form value, note, or password. There is no analytics or telemetry call in the
viewer or the OCR packages.

## Browser coverage

The Playwright suite opens the sample, opens several local files in tabs,
fills a form, saves the result under the original file name, reopens the
saved bytes, and closes the last tab back to the picker. One test runs OCR on
`fixtures/scan.pdf`, an image-only page, and checks the new copy, its name,
the `/FolioOCR` marker, and the invisible text operator. `fixtures/` holds
the synthetic inputs; `fixtures/manifest.json` records their hashes and
provenance. The signed and encrypted diagnostics are synthetic and make no
trust claim.

`fixtures/statement.pdf` is a real LaTeX export (Tectonic 0.17.0, Latin
Modern faces), included because a typeset export carries many small text
objects and subset Type1 fonts that a hand-built sample does not. Its words
were written for this suite, and the content is CC0-1.0. The embedded Latin
Modern subset stays under the GUST Font License.
