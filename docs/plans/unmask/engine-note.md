# Unmask engine note

Status: implemented (2026-11-01). The engine lives in
`apps/web/src/features/unmask/` behind the seam in
[engine-interface.md](./engine-interface.md). It runs in one Worker and never
sends image bytes over the network.

## Model asset

| Fact | Value |
| --- | --- |
| Model | ISNet General Use, weight-only QDQ int8 |
| Runtime | `onnxruntime-web` 1.31.1, MIT |
| Upstream URL | `https://huggingface.co/xrds/isnet-general-onnx-int8/resolve/main/onnx/model_quantized.onnx` |
| App path | `/unmask/models/isnet-int8.onnx` |
| Bytes | 44,229,662 |
| SHA-256 | `3b21a6706dc8d6e4ba9f5b31ebc6940f6c785b58862e27bb25daa9dd4424b87f` |
| Licence | MIT weights and MIT conversion, `Copyright (c) imgly GmbH` |
| Licence URL | `https://huggingface.co/xrds/isnet-general-onnx-int8` |
| Graph input | `input`, float32 `[1,3,1024,1024]` |
| Graph output | `output`, float32 `[1,1,1024,1024]`, sigmoid already applied |
| Runtime WASM | `ort-wasm-simd-threaded.jsep.wasm` when WebGPU is present, the default build otherwise |

The model is a build input, not a committed blob. `apps/web/scripts/fetch-unmask-model.ts`
downloads it once, verifies the size and SHA-256, and writes
`apps/web/public/unmask/models/isnet-int8.onnx`. `bun web dev` and `bun web build`
run that script first. `apps/web/public/unmask/` is ignored by Git. The script
does not run in the browser and it is not part of the test suite.

The asset is served from the app origin. It is not in the precache list
(`onnx` is not in `globPatterns`) and it is not fetched by the route until the
first Cut out. The Worker loads `onnxruntime-web` lazily, so the empty state
downloads neither the runtime nor the model.

## Preprocessing and postprocessing

The model card numbers are fixed in `unmask.remove.ts`:

- Resize the source to 1024x1024 with bilinear interpolation. The resize is a
  stretch to the square input, not a crop and not a letterbox.
- Layout is NCHW: three float32 planes of 1024x1024, red, green, blue.
- Each sample is `(pixel - 128) / 256`, applied per channel.
- The graph output is `[1,1,1024,1024]`. ISNet already applies sigmoid, so the
  engine uses the values as probabilities and clamps them to 0-1. If a future
  conversion returns logits, the engine detects a value outside 0-1 and applies
  sigmoid before the resize.
- Upsample the soft alpha to the source size with bilinear interpolation. There
  is no global threshold; hair and fur keep their soft values.
- The preview Matte is a box-filter downscale to at most 2048 px on the long
  edge, so the editor never receives a 26 MP Matte.

## Cache and offline

- Cache Storage bucket: `unmask-models-v1`.
- Key: `/unmask/model-cache/isnet-int8-<sha256>.onnx`, contains the model id and
  the SHA-256, never user data.
- The first run fetches with `Content-Length` progress, verifies the SHA-256,
  and stores the bytes. Later runs read the cache and report `ModelCached`.
- A corrupt cache entry fails the size or hash check, is deleted, and is
  fetched again. A cache miss while offline returns `ModelUnavailable` with
  reason `offline`.
- The model request is `credentials: "omit"` and carries no user data.

## Runtime fallback

- WebGPU is tried first when `navigator.gpu` exists. A failed session creation
  falls back to WASM and records `WebGpuFallback` with the reason.
- A lost WebGPU device during inference rebuilds the session on WASM once and
  retries the same input. If the WASM run fails too, the result is
  `ModelFailed`.
- The Worker starts lazily on the first request. The service restarts it once
  after a fatal Worker error; a cancellation terminates it and the next request
  starts with a clean Worker. The model stays loaded between images and across
  a Batch.
- The app does not set cross-origin isolation, so `env.wasm.numThreads = 1`.

## Feather and Blur

Feather is a blur of the Matte alpha, never the colour. The pure operation is
`featherMatte` in `unmask.matte.ts`; the preview and the export call it. It is
three separable box passes with `radius = round(feather / 2.56)`. Three boxes
approximate the named Gaussian; the approximation keeps the composite linear in
the pixel count, so a 26 MP export does not stall. `feather: 0` returns the
input bytes unchanged.

The Blur Backdrop uses the same three-pass box approximation with
`radius = 50` at most and sigma `radius / 2`, after the original is composited
over white when it has alpha. The Subject is then composited over the blurred
original with straight alpha. `radius: 0` keeps the original image.

The engine does not run an edge-decontamination pass. A halo can remain where
the model keeps a light fringe on glass, hair, or a busy Background. The copy
and the explainer name this limit; the Magic Brush and Feather are the repair
path. Adding a decontamination pass later must be measured against the same
fixtures before it changes the output.

## Names, quality, and forms

- Output name: `<stem>-cutout.<ext>`; the engine sanitizes the stem and owns
  the extension. `jpeg` writes `.jpg`.
- Default quality: 85, from the format matrix and the seam. The engine issue
  text says 90 in one line; the settled matrix says 85 and the copy says 85, so
  85 is the engine default. PNG ignores quality.
- JPEG with a Transparent Backdrop returns `EncodeFailed` with reason
  `jpeg-needs-backdrop`. The service remembers the Backdrop of the last
  composite per image, so an opaque Matte cannot bypass the refusal. A JPEG of
  an image with alpha is refused too. The older seam spelling `jpeg-transparent`
  is still accepted by the schema for compatibility, but the engine never
  returns it.
- PNG is encoded with `@jsquash/png` and optimised with `@jsquash/oxipng` at
  level 3. If the optimiser fails, the valid PNG is kept.
- WebP, AVIF, and JPEG are encoded with `@jsquash/webp`, `@jsquash/avif`, and
  `@jsquash/jpeg`. AVIF input is decoded with `@jsquash/avif/decode`; the other
  five inputs use `createImageBitmap`, which applies the EXIF orientation.

## Measured numbers

The model measurements are from ADR-0030, on the reference device (Apple M2,
10-core GPU, 16 GB, macOS 26.5.1, Chromium 153, `onnxruntime-web` 1.31.1,
single-thread WASM). They are the numbers the engine is designed against.

| Step | WebGPU | WASM |
| --- | ---: | ---: |
| Model bytes on disk | 44,229,662 | 44,229,662 |
| Brotli 11 transfer | 28,092,327 | 28,092,327 |
| gzip -9 transfer | 30,270,840 | 30,270,840 |
| Cold load | 0.664 s | 0.483 s |
| Warm load | 0.217 s | 0.126 s |
| Cold inference at 1024 | 0.582 s | 7.792 s |
| Warm inference at 1024 | 0.498 s | 7.678 s |
| Agent memory after load | 160.6 MB | 160.4 MB |
| Agent memory after inference | 173.5 MB | 542.7 MB |
| Browser peak delta | 0.92 GB | 1.16 GB |

The engine-side steps were measured on 2026-11-01 in Node 26 on the same
machine, from the `portrait-hair.jpg` fixture (2400x1521) and a 1024x1024
synthetic model output. They exclude the model inference above.

| Step | Time |
| --- | ---: |
| JPEG decode at 2400x1521 | 48 ms |
| Model input (1024x1024 NCHW) | 16 ms |
| Model output to the full Matte | 41 ms |
| Preview downscale to 2048 | 19 ms |
| 100 Brush operations on the 2048 preview | 449 ms |
| Composite Solid at 2400x1521 with Feather 50 | 122 ms |

The 100-operation replay is above the 250 ms target for a preview stroke batch.
The measurement uses 100 two-point strokes across the full preview; a real
session seldom replays that many at once. The full-resolution replay is linear
in the source size.

The model download is 44.2 MB on the wire before compression. The copy says
"about 44 MB" and does not promise a transfer size. The download time depends
on the server and the network and is not fixed by the engine.

## Known limits

- WASM inference is the floor for a general audience: about 7.7 s warm at
  1024x1024 on the reference device. The UI must show the indeterminate
  removing state and Cancel.
- The model leaves a halo on glass and a busy Background, and loses some
  flyaway hair. Feather and the Magic Brush are the repair path.
- The preflight rejects a source above 64,000,000 pixels or an estimated
  working set above 1 GiB. A device that reports no memory is treated as
  low-end. The 26.1 MP fixture passes.
- The Batch keeps one operation log per image and one Blob per finished
  Cutout. It does not keep one full Matte per image after the encode; a stale
  row that still has its Matte re-composites from the retained source, and a
  row without a Matte runs the model again. The device sets the true Batch
  size; the UI warns above 512 MB of total input.
- The engine never writes the input file, never stores user data in a cache,
  and never sends a file name as a path, a URL, or a Worker key.

## Verification

- Pure tests run in Node: `bunx vitest run --project web src/features/unmask`.
  They cover the six-format sniffer, the header preflight, the Wand and Brush,
  replay, Feather, the three Backdrops, the codec naming rules, the Batch
  runner, the Worker protocol, and the service over a fake Worker port.
- The browser-only model, codecs, decoder, cache, and fake are excluded from
  unit coverage. The Worker integration and the real model run in the browser
  route.
- The model hash check runs in the build script and again on every cache read.
