# Unmask ships ISNet int8

Unmask ships the weight-only QDQ int8 conversion of ISNet General Use as its
only model in v1. It is the default candidate from issue #43. The bake-off on
2026-11-01 confirms the gate: ISNet int8 is not worse than BiRefNet lite on any
of the eight fixtures, it is better on one, and it runs on WASM within the named
budget. A model picker is out of scope.

The full method, per-fixture notes, and limitations are in
`docs/plans/unmask/bake-off.md`. This ADR keeps the decision tables and the
failure modes. The raw run is in `artifacts/unmask/bake-off/`; the fixtures are
in `artifacts/unmask/fixtures/`. The model URLs, sizes, and SHA-256 values are
in `artifacts/unmask/bake-off/model-provenance.json`.

## Environment

- Apple M2, 10-core GPU, 16 GB unified memory, macOS 26.5.1.
- Chromium 153.0.8010.12 through Playwright 1.63.0.
- WebGPU adapter: `apple / metal-3`.
- `onnxruntime-web` 1.31.1, WASM SIMD, one thread, no cross-origin isolation.
- `onnxruntime` 1.31.1 CPUExecutionProvider for the matte images and the
  quality sheets.
- Inference at 1024x1024 for all three models, including MODNet. MODNet's
  native preprocessor uses 512 px; 1024 is a direct comparison, not its best
  case.

## Model size and transfer

| Model | ONNX bytes | gzip -9 | Brotli 11 | Licence |
| --- | ---: | ---: | ---: | --- |
| ISNet int8 | 44,229,662 | 30,270,840 | 28,092,327 | MIT |
| BiRefNet lite fp16 | 114,538,221 | 82,238,741 | 77,823,553 | MIT |
| MODNet int8 | 6,632,188 | 5,228,333 | 5,138,855 | Apache-2.0 |

The browser bake-off reads the uncompressed file from localhost. The transfer
numbers are file compression, not a network measurement. The model is not
precached (ADR-0029).

## Load and inference

Times are seconds. Cold means the first session and the first run. Warm means
the next run on the same session. Load is `InferenceSession.create`. The
browser numbers are the median of three warm runs on one 1024x1024 input.

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
Python CPU warm load is 2.25 s. The failure is the result that matters.

## Peak memory

The browser peak is the sum of the Chromium process RSS during one load and one
inference, minus the baseline before the page opened. It includes the GPU
process and the browser overhead. The agent memory is
`performance.measureUserAgentSpecificMemory()` after the run; it includes the
JavaScript heap and the WASM memory. GPU buffer memory is not reported by the
page.

| Model | Backend | Agent memory after load | Agent memory after inference | Browser peak delta |
| --- | --- | ---: | ---: | ---: |
| ISNet int8 | WebGPU | 160.6 MB | 173.5 MB | 0.92 GB |
| ISNet int8 | WASM | 160.4 MB | 542.7 MB | 1.16 GB |
| BiRefNet lite fp16 | WebGPU | 490.7 MB | 503.5 MB | 1.06 GB |
| BiRefNet lite fp16 | WASM | 565.1 MB | 3.94 GB | 3.55 GB |
| MODNet int8 | WebGPU | 44.8 MB | 579.4 MB | 2.06 GB |
| MODNet int8 | WASM | 44.6 MB | 499.3 MB | 0.94 GB |

The Python CPU peak resident set is 1.92 GB for ISNet, 3.42 GB for BiRefNet,
and 2.42 GB for MODNet. The BiRefNet browser peak is 1.06 GB on WebGPU and
3.55 GB on WASM. The Python run is a cross-check for the matte images; the
browser numbers are the product numbers.

## Blind edge quality

The scorer saw eight contact sheets. Each sheet held the original and three
anonymous mattes, labelled A, B, and C. The scorer did not see the mapping until
every score was recorded. The rubric is in `scores.json`. A score of 5 is a
clean edge; 1 is unusable.

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

ISNet is not worse than BiRefNet on seven fixtures and better on one. It never
loses to BiRefNet. MODNet is a portrait model. It returns an empty matte on the
plain product, the low-contrast bear, and the alpha input. It keeps only the
liquid bowl of the glass. It is not a general-purpose model.

The mattes are in `artifacts/unmask/bake-off/sheets/`. The mapping is in
`sheets/mapping.json`. The scorer is the implementing agent. The owner can
repeat the score with another scorer; the sheets hide the model names.

## Failure modes

- **BiRefNet lite fp16 on WebGPU.** The first run fails with `Too many storage
  buffers in shader. Current: 11, Max is 10` on the Apple M2 `metal-3` adapter.
  The WebGPU default limit is 10 storage buffers per shader stage. A GPU with a
  higher limit may run it. A default for a general audience cannot depend on a
  non-default limit.
- **BiRefNet lite fp16 on WASM.** The first run fails with `std::bad_alloc` at
  1024x1024 on a 16 GB Mac. The agent memory reaches 3.94 GB and the browser
  peak delta is 3.55 GB. The fp16 weights force a large CPU expansion. It may
  run at 512, but the product runs 1024 and a general audience cannot be asked
  for a GPU.
- **MODNet int8.** It runs on both backends. It is fast on WASM (3.86 s) but
  slow on WebGPU (4.25 s) at 1024 because part of the graph falls back to the
  CPU. It is portrait-only and fails every non-portrait fixture. It is not the
  default.
- **ISNet int8.** It leaves a halo on glass and a busy Background, and it loses
  some flyaway hair. The Magic Brush and Feather exist for these cases. Its
  WASM path is 7.68 s warm at 1024, so the UI must show progress and Cancel.

## Gate

The issue gate is: ISNet int8 is the default if its edge quality is not worse
than BiRefNet lite on more than two of eight fixtures, and if it runs on WASM
within the named budget.

- Edge quality: ISNet is worse on 0 of 8. Pass.
- WASM budget: 7.68 s warm at 1024x1024 on the reference device, against a
  named budget of 10 s. Pass.
- Licence: MIT weights, MIT conversion, Apache-2.0 upstream code. Pass.

Decision: **ISNet int8 is the default and the only model in v1.**

## Considered options

The three candidates are compared above. The runtime decision is ADR-0029. The
runtimes and models that were rejected before the bake-off are:

- `@imgly/background-removal` is AGPL-3.0. The runtime cannot ship it under the
  Ritools licence.
- BRIA RMBG-1.4 and RMBG-2.0 are non-commercial. A general Tool must work for
  any user.
- `@huggingface/transformers` is not used in v1. The full graph is heavy, and
  its ISNet background-removal example uses an AGPL-3.0 model.
- A server-side model would send image bytes over the network and break
  ADR-0007.

## Consequences

- The engine downloads 44.2 MB once, then reads the runtime cache. The UI does
  not promise a transfer size.
- WebGPU is the fast path. WASM is the floor. A failure falls back to WASM.
- The model info line shows "ISNet int8 · MIT" and links to the licence in the
  explainer.
- A future model must pass the same gate on the same fixtures before it can
  replace ISNet. A model that cannot run on WASM is not the default.
- The quality gate does not promise a perfect Cutout. The copy names the known
  limits: hair, fur, glass, motion blur, low contrast, and thin straps.
