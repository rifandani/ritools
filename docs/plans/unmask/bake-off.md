# Model bake-off

This is the full method and result for the three candidates in issue #43. The
decision is in ADR-0030. The raw data, scripts, mattes, and sheets are in
`artifacts/unmask/bake-off/`.

## Question

Which model gives a useful starting Matte for general-purpose images on the
device, under a permissive licence, on both WebGPU and WASM?

The default candidate is ISNet int8. The gate is:

- ISNet int8 is the default if its edge quality is not worse than BiRefNet lite
  on more than two of eight fixtures.
- ISNet int8 must run on WASM within the named budget.
- No candidate with an AGPL or non-commercial licence can ship.

## Candidates

| Model | File | Licence | Why it is a candidate |
| --- | --- | --- | --- |
| ISNet General Use int8 | 44,229,662 bytes | MIT | The smallest general-purpose model with a permissive licence and a WebGPU-friendly QDQ graph. |
| BiRefNet lite fp16 | 114,538,221 bytes | MIT | A strong dichotomous segmentation model. The fp16 file is the named candidate. |
| MODNet int8 | 6,632,188 bytes | Apache-2.0 | Small and fast. Trained for portraits only. |

The model URLs, SHA-256 values, input shapes, output shapes, and licence chain
are in `model-provenance.json`.

## Environment

- Apple M2, 10-core GPU, 16 GB unified memory, macOS 26.5.1.
- Chromium 153.0.8010.12 through Playwright 1.63.0.
- WebGPU adapter: `apple / metal-3`. Headless Chromium gives a SwiftShader
  adapter, so the WebGPU run used a headed browser window offscreen.
- `onnxruntime-web` 1.31.1, WASM SIMD, one thread, no cross-origin isolation.
- `onnxruntime` 1.31.1 CPUExecutionProvider for the matte images and the
  contact sheets.
- Inference at 1024x1024 for all three models. MODNet's native preprocessor
  uses a shortest edge of 512 px. The 1024 run is a direct comparison, not
  MODNet's best case.

## Fixtures

The eight fixtures are in `artifacts/unmask/fixtures/` with a NOTICE and a
manifest. They are all licence-clean and local. The ninth file is the BMP half
of the GIF/BMP fixture.

1. Portrait with flyaway hair.
2. Pet with fur.
3. Product on a busy Background with glass and reflections.
4. Product on a plain Background with small label text.
5. Low-contrast Subject: a polar bear on snow.
6. Transparent PNG input.
7. Large image above 24 MP: 6000 × 4344 = 26.1 MP.
8. Animated GIF with two frames, plus a BMP of the first frame. The first frame
   is the glass subject; the second frame is a polar bear.

The fixture provenance and SHA-256 values are in `fixtures.md`.

## Method

### CPU mattes

The Python run is the source of the visual scores. It loads each ONNX file
once, creates a session with `CPUExecutionProvider`, and runs each fixture at
1024x1024. It records:

- the session load time, cold and warm;
- the first inference time and the median of three warm runs;
- the peak process resident set;
- a Matte at the source size for each fixture;
- a preview of the Subject over a checkerboard.

The preprocessing follows each model card:

- ISNet: resize to 1024x1024, `(pixel - 128) / 256`.
- BiRefNet: resize to 1024x1024, `pixel / 255`, then ImageNet mean and std.
- MODNet: resize to 1024x1024, `(pixel / 255 - 0.5) / 0.5`.

BiRefNet output is a logit; the script applies a sigmoid. ISNet and MODNet
outputs are already sigmoid.

The CPU numbers are not the product numbers. They are a cross-check for the
mattes and a comparison point for the browser. The browser run is the product
measurement.

### Browser run

The browser page fetches one model from the local server, creates an
`InferenceSession` with `executionProviders: ['webgpu']` or `['wasm']`, and runs
one 1024x1024 input. It records:

- the fetch time and bytes (the file is uncompressed on localhost);
- the cold session load and a second warm session load from the same bytes;
- the first inference and the median of three warm runs;
- one warm inference per fixture;
- the JS heap and the agent memory.

`performance.measureUserAgentSpecificMemory()` runs on a page served with COOP
and COEP. The memory probe samples the sum of Chromium process RSS every 150 ms
and reports the peak delta from the baseline before the page opened. It includes
the GPU process and the browser overhead. It is a browser-level number, not a
tab-level number.

The WASM run uses one thread because the app does not set cross-origin
isolation. A future change to COOP/COEP must measure the threaded path; the
bake-off does not assume a speedup.

### Blind score

The scorer saw eight contact sheets. Each sheet held the original and three
anonymous mattes, labelled A, B, and C. The model mapping was stored in a
separate file and not read until every score was recorded. The rubric:

| Score | Meaning |
| ---: | --- |
| 5 | The edge holds the fine detail. No halo, no holes, no missing Subject. No repair needed. |
| 4 | The Subject is complete. A small loss at the edge or one thin detail. A quick Magic Brush pass repairs it. |
| 3 | The Subject is usable. A visible loss at hair, fur, glass, or a thin structure. A repair is needed. |
| 2 | A large loss. The Subject is hard to use. Most of the Matte needs repair. |
| 1 | Unusable. Empty, inverted, full of holes, or the wrong Subject. |

The scorer is the implementing agent. The sheets and the mapping are committed
so the owner can repeat the score with another scorer. A model that produced an
empty matte still received a score.

## Results

### Size and transfer

| Model | ONNX bytes | gzip -9 | Brotli 11 |
| --- | ---: | ---: | ---: |
| ISNet int8 | 44,229,662 | 30,270,840 | 28,092,327 |
| BiRefNet lite fp16 | 114,538,221 | 82,238,741 | 77,823,553 |
| MODNet int8 | 6,632,188 | 5,228,333 | 5,138,855 |

The browser fetch is localhost. A real first load depends on the network and
the host cache. The copy says "about 44 MB" and does not promise a transfer
size.

### Load and inference

Seconds. Cold is the first session and the first run. Warm is the next run on
the same session. Load is `InferenceSession.create`.

| Model | Backend | Cold load | Warm load | Cold infer | Warm infer |
| --- | --- | ---: | ---: | ---: | ---: |
| ISNet int8 | WebGPU | 0.664 | 0.217 | 0.582 | 0.498 |
| ISNet int8 | WASM | 0.483 | 0.126 | 7.792 | 7.678 |
| BiRefNet lite fp16 | WebGPU | 3.732 | not measured | failed | failed |
| BiRefNet lite fp16 | WASM | 4.485 | not measured | failed | failed |
| MODNet int8 | WebGPU | 0.659 | 0.224 | 4.701 | 4.251 |
| MODNet int8 | WASM | 0.573 | 0.204 | 4.016 | 3.856 |

The BiRefNet browser session was created, and the fail probe records its cold
load. The first `run` failed. The warm load is not measured in the browser; the
Python CPU warm load is 2.25 s.

The per-fixture warm times are in `browser-*.json`. They are close to the
portrait time. The model cost is dominated by the graph, not the fixture.

### Memory

| Model | Backend | Agent memory after load | Agent memory after inference | Browser peak delta |
| --- | --- | ---: | ---: | ---: |
| ISNet int8 | WebGPU | 160.6 MB | 173.5 MB | 0.92 GB |
| ISNet int8 | WASM | 160.4 MB | 542.7 MB | 1.16 GB |
| BiRefNet lite fp16 | WebGPU | 490.7 MB | 503.5 MB | 1.06 GB |
| BiRefNet lite fp16 | WASM | 565.1 MB | 3.94 GB | 3.55 GB |
| MODNet int8 | WebGPU | 44.8 MB | 579.4 MB | 2.06 GB |
| MODNet int8 | WASM | 44.6 MB | 499.3 MB | 0.94 GB |

The agent memory includes the JavaScript heap and the WASM memory. The browser
peak is the sum of Chromium process RSS. GPU buffer memory is not reported by
the page. The Python CPU peak is 1.92 GB for ISNet, 3.42 GB for BiRefNet, and
2.42 GB for MODNet. The BiRefNet browser peak is 1.06 GB on WebGPU and 3.55 GB
on WASM. The WASM run reaches 3.94 GB of agent memory before the failure.

### Blind scores

| Fixture | ISNet int8 | BiRefNet lite fp16 | MODNet int8 |
| --- | ---: | ---: | ---: |
| Portrait with flyaway hair | 5 | 3 | 1 |
| Pet with fur | 4 | 4 | 1 |
| Product on a busy Background | 3 | 3 | 1 |
| Product on a plain Background | 4 | 4 | 1 |
| Low-contrast Subject | 4 | 4 | 1 |
| Transparent PNG input | 4 | 4 | 1 |
| Large image above 24 MP | 5 | 5 | 1 |
| GIF and BMP first frame | 4 | 4 | 2 |
| **Total** | **33 / 40** | **31 / 40** | **9 / 40** |

Notes per fixture are in `scores.json`. The short version:

- **Hair.** ISNet keeps the flyaway strands. BiRefNet loses the outer hair.
  MODNet makes large holes.
- **Fur.** ISNet and BiRefNet keep the fur and the tail. MODNet makes holes.
- **Busy product.** Both general models leave a halo around glass and some
  background. MODNet keeps a large red cloth area.
- **Plain product.** Both general models hold the bottle. MODNet is empty.
- **Low contrast.** Both general models hold the bear; the paw edges are soft.
  MODNet is empty.
- **Alpha input.** Both general models hold the flower. MODNet returns
  fragments. Production uses the input alpha for this case.
- **Large image.** Both general models hold the woman, the dog, and the leash.
  MODNet makes holes and floats the dog.
- **First frame.** Both general models hold the glass, the stem, and the base.
  MODNet keeps only the liquid bowl.

## Failure modes

### BiRefNet lite fp16

- **WebGPU.** `Too many storage buffers in shader. Current: 11, Max is 10` on
  the Apple M2 `metal-3` adapter. The WebGPU default limit is 10 storage
  buffers per shader stage. A GPU with a higher limit may run it. A general
  default cannot depend on that.
- **WASM.** `std::bad_alloc` at 1024x1024 on a 16 GB Mac. The agent memory
  reaches 3.94 GB and the browser peak delta is 3.55 GB. The fp16 weights
  force a large CPU expansion. It may run at 512, but the product runs 1024 and
  a general audience cannot be asked for a GPU.
- **Size.** 114.5 MB is 2.6× ISNet. The cold load is 2.16 s on CPU.

### MODNet int8

- It runs on both backends, but it is a portrait model. It returns an empty
  matte on the plain product, the low-contrast bear, and the alpha input. It
  keeps only the liquid bowl of the glass.
- It is fast on WASM (3.86 s warm) but slower on WebGPU (4.25 s warm) at 1024
  because part of the graph falls back to the CPU.
- It cannot be the default for general-purpose images.

### ISNet int8

- It leaves a halo on glass and a busy Background, and it loses some flyaway
  hair. The Magic Brush and Feather exist for these cases.
- Its WASM path is 7.68 s warm at 1024, so the UI must show progress and
  Cancel.
- It is 44.2 MB, so it is not precached. The first run needs a connection.

## Gate

| Check | Result |
| --- | --- |
| ISNet worse than BiRefNet on more than two of eight | No. Worse on 0, equal on 7, better on 1. |
| ISNet runs on WASM within 10 s warm at 1024 | Yes. 7.68 s. |
| Permissive licence | Yes. MIT weights and conversion; Apache-2.0 upstream code. |
| No AGPL or non-commercial model | Yes. The three candidates are MIT or Apache-2.0. |

Decision: **ISNet int8 is the default and the only model in v1.**

## Limitations

- One device, one browser, one run. No phone, no low-end laptop, no Safari, and
  no Firefox. A later issue must measure the named budget on a phone.
- The WebGPU adapter is an Apple M2. A different GPU may change the BiRefNet
  shader limit and the WebGPU times.
- The browser model fetch is localhost, not a real network. The transfer table
  is file compression, not a first-load measurement.
- The peak memory is process RSS, not GPU memory. The agent memory is a point
  sample after the run, not a true peak.
- The visual scores come from the Python CPU Mattes. The browser Mattes were not
  pixel-compared. The same weights and preprocessing are used, but a backend
  can differ in the last bit. The engine issue inherits a backend parity test:
  a browser Matte must match the CPU reference within one alpha level.
- The scorer is the implementing agent. The sheets are committed so the owner
  can repeat the score.
- The 26.1 MP fixture is the largest measured. A 64 MP source is the preflight
  limit; it was not run.

## Reproduce

The scripts are in `artifacts/unmask/bake-off/scripts/` and
`artifacts/unmask/bake-off/web/`. The model files are not committed. Download
them from the URLs in `model-provenance.json` and put them in a work directory:

```text
work/
  models/isnet-int8.onnx
  models/birefnet-lite-fp16.onnx
  models/modnet-int8.onnx
  fixtures/...
  out/
  web/bench.html
  web/node_modules/onnxruntime-web/...
```

Then:

```sh
# CPU mattes and sheets
python3 -m venv .venv
.venv/bin/pip install onnxruntime pillow numpy psutil brotli
.venv/bin/python scripts/bench_cpu.py
.venv/bin/python scripts/sheets.py

# Browser run
cd web
bun add onnxruntime-web
python3 -m http.server 8766   # serve the work directory or web/
node run-browser.cjs isnet-int8 webgpu
node run-browser.cjs isnet-int8 wasm
node run-browser.cjs modnet-int8 webgpu
node run-browser.cjs modnet-int8 wasm
```

The scripts use relative paths and write to `out/`. The Playwright scripts
resolve `@playwright/test` from the repo `apps/web/node_modules`; set
`NODE_PATH` to that folder, or run the script from there. The model files are
large and must not be committed. The fixtures are committed; the scripts can
rebuild them from Wikimedia Commons with `fetch_fixtures.py` and
`build_fixtures.py`.

## Evidence files

| File | What it is |
| --- | --- |
| `cpu-bench.json` | Python CPU load, inference, coverage, and peak RSS per model and fixture. |
| `browser-isnet-int8-webgpu.json` | WebGPU load, inference, fetch, and heap for ISNet. |
| `browser-isnet-int8-wasm.json` | WASM load, inference, fetch, and heap for ISNet. |
| `browser-modnet-int8-webgpu.json` | WebGPU load and inference for MODNet. |
| `browser-modnet-int8-wasm.json` | WASM load and inference for MODNet. |
| `mem-*.json` | Agent memory and browser peak RSS for the four working combinations and the two BiRefNet failures. |
| `scores.json` | Blind scores, rubric, notes, totals, and the gate. |
| `sheets/*.jpg` | The eight contact sheets. |
| `sheets/mapping.json` | The A/B/C model mapping. |
| `model-provenance.json` | Model URLs, sizes, SHA-256, licences, and input shapes. |
| `transfer.json` | gzip and Brotli sizes. |
| `fixtures-check.json` | The fixture hashes, dimensions, GIF frames, BMP match, alpha, and 24 MP check. |
