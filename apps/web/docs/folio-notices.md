# Folio PDF viewer notices and provenance

Folio uses `@embedpdf/viewer-react@3.0.0-next.18` (Apache-2.0), the React
wrapper around the `@embedpdf/viewer` custom element. That package bundles
PDFium compiled to WebAssembly (BSD-3-Clause), runs it in a dedicated Worker,
and ships its own toolbar, panels, annotations, forms, signatures, redaction,
printing, and save flow. No other PDF viewer or writer is included.

`@embedpdf/viewer` and `@embedpdf/react` are pinned to the same
`3.0.0-next.18` build. The package manager records their registry integrity
values in `bun.lock`.

## Served assets

Vite emits the viewer code and engine assets into the app's own build:

- `assets/folio-viewer-*.js`, the lazily imported React adapter.
- `assets/embedpdf-worker-*.js`, the PDFium Worker.
- `assets/embedpdf-*.wasm`, the PDFium WebAssembly binary.
- The viewer's own chunks, locales, stamps, and signature fonts.

Nothing is fetched from a CDN. `public/folio/notices/` carries the
Apache-2.0 text for EmbedPDF, the BSD-3-Clause text for PDFium, the OFL-1.1
texts for the Allura, Caveat, and Great Vibes signature fonts, and
`VERSIONS.txt` with the pins. `public/folio/sample.pdf` is the generated
sample; its content is CC0-1.0.

The build does not claim a complete transitive notice inventory, registry
signatures, or a security audit. The minified viewer bundle keeps its own
source comments; the copied license texts are the provenance record for the
engine and fonts.

## Runtime cache and network

The service worker caches only the generated sample, the notice files, and
the hashed viewer and Worker scripts. The viewer's WebAssembly binary uses
the same `CacheFirst` route as the app's other runtime-cached WASM. It never
caches a user PDF, password, note, form value, output, or session state.

A selected file is handed to the viewer as a `File`. The viewer reads the
bytes in the page and sends them only to its own Worker. The page makes no
request that contains a file name, bytes, form value, note, or password.
There is no analytics or telemetry call in the viewer package.

## Browser coverage

The Playwright suite opens the sample, opens several local files in tabs,
fills a form, saves the result under the original file name, reopens the
saved bytes, and closes the last tab back to the picker. `fixtures/` holds
the synthetic inputs; `fixtures/manifest.json` records their hashes and
provenance. The signed and encrypted diagnostics are synthetic and make no
trust claim.
