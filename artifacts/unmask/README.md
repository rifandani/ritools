# Unmask proof

This folder holds the evidence for the Unmask shape issue (#43): the fixtures,
the model bake-off data, the scripts, and the blind score sheets. It holds no
production code.

- `fixtures/` — the eight fixtures (nine files) with `NOTICE.txt` and
  `manifest.json`.
- `bake-off/` — the raw JSON, the model provenance, the transfer sizes, the
  fixture check, the scripts, the browser page, and the contact sheets.
- `bake-off/sheets/` — the eight blind contact sheets and the A/B/C mapping.
- `bake-off/scripts/` — the Python scripts that fetch and build the fixtures,
  run the CPU mattes, and build the sheets.
- `bake-off/web/` — the browser benchmark page, the Playwright runners, the
  COOP/COEP server, and the run-all script.

The decision is in `docs/adr/0030-unmask-ships-isnet-int8.md`. The method and
the full result are in `docs/plans/unmask/bake-off.md`. The fixtures are
recorded in `docs/plans/unmask/fixtures.md`.

The model files are not committed. Download them from the URLs in
`bake-off/model-provenance.json`; the sizes and SHA-256 values are there. The
fixtures are committed and need no network request.

The numbers come from one device: Apple M2, 10-core GPU, 16 GB, macOS 26.5.1,
Chromium 153.0.8010.12, `onnxruntime-web` 1.31.1. The WebGPU run used a headed
browser because headless Chromium reports a SwiftShader adapter. The WASM run
used one thread because the app does not set cross-origin isolation.
