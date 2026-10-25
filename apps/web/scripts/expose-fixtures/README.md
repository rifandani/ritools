# Expose fixture and engine checks

Run from the repository root:

```sh
python3 apps/web/scripts/expose-fixtures/generate.py
node apps/web/scripts/expose-fixtures/tag-media.mjs
node apps/web/scripts/expose-fixtures/engine-gate.mjs
bun test:unit --project web apps/web/src/features/expose
```

Generation needs FFmpeg. All generated content is released under CC0-1.0. There are no downloaded inputs. `fixtures/FILES.json` records source, licence, size, and SHA-256 for each new-format fixture. `cover.jpg` is a generated blue 32×24 image, also CC0-1.0. Existing image fixtures keep their existing provenance. Office files are minimal property-container fixtures, not document-rendering examples. The PDF gate must run in its own process because it poisons Perl. The application disables that write path.

Run the sequential 100-image benchmark from the repository root:

```sh
bun build apps/web/scripts/expose-fixtures/benchmark.ts --target=node --external @colorhythm/exiftool-wasm --outfile=apps/web/node_modules/.cache/expose-benchmark.mjs
node apps/web/node_modules/.cache/expose-benchmark.mjs
```

Add `--camera` to the Node command to measure the camera sample instead of the mixed small fixtures. Record the fixture names and memory with the elapsed time.

For a browser transfer check, build and serve the Node production app on port 4216. Start the proxy in another terminal, then run the throttled test:

```sh
node apps/web/scripts/expose-fixtures/throttle.mjs http://localhost:4216 4317
PW_PORT=4317 PW_OFFLINE=1 PW_THROTTLE_BYTES=2000000 bun web test --project=chromium e2e/expose-offline.spec.ts --grep 'records a throttled' --workers=1
```

The proxy limits only WASM transfers to 2,000,000 bytes/s. It adds no latency. The other two tests in that suite check the warm offline cache and the uncached engine error. Run them against the production app with `PW_PORT=4216 PW_OFFLINE=1`.
