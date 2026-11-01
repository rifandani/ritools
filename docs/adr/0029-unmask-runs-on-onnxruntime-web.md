# Unmask runs on ONNX Runtime Web

Unmask uses `onnxruntime-web` 1.31.1 (MIT) to run one self-hosted
background-removal model in the browser. It uses the WebGPU execution provider
when the browser exposes an adapter, and the WASM execution provider otherwise.
The engine owns the runtime and the model. The UI sees a `ModelInfo` value, not
an ORT session, an ORT tensor, or a model path.

The model is not precached. The first run fetches it with a progress report and
caches the bytes in the Cache API. Later runs read the cache and work offline
while the cache remains present. This follows the codec WASM pattern in
ADR-0010 and the metadata engine pattern in ADR-0020. The model is served from
the app origin. There is no third-party model CDN at runtime, and the model
request carries no user data.

## Considered options

- **`@imgly/background-removal`.** Rejected. The package is AGPL-3.0. Ritools
  cannot ship it under the repository licence.
- **BRIA RMBG-1.4 and RMBG-2.0.** Rejected. The weights are for
  non-commercial use only. A general Tool must work for any user.
- **`@huggingface/transformers`.** Rejected for v1. The full graph is heavy,
  and its ISNet background-removal example uses an AGPL-3.0 model. Unmask
  needs one model and one small runtime, not a general pipeline.
- **A server-side model.** Rejected. It sends image bytes over the network and
  breaks ADR-0007. The product promise is local-only.
- **A native desktop model.** Rejected. The Tool runs in a browser tab, and
  installation is not part of the product.

## Licence and provenance

The default model is the weight-only QDQ int8 conversion of
`imgly/isnet-general-onnx` by `xrds/isnet-general-onnx-int8`. The xrds
repository contains the conversion script and an MIT `LICENSE` file with
`Copyright (c) imgly GmbH`. The imgly model card declares MIT. The upstream
DIS code and evaluation metric are Apache-2.0. The weights are MIT. The
conversion is reproducible from the base ONNX file.

The exact URL, file size, SHA-256, input shape, output shape, and licence
links are in `artifacts/unmask/bake-off/model-provenance.json`. A model update
must update that record and the ADR.

## Dependencies and licence

`onnxruntime-web` 1.31.1 is the only new runtime dependency for Unmask. It is
MIT. Its transitive graph is `onnxruntime-common` 1.31.1 (MIT), `flatbuffers`
(Apache-2.0), `guid-typescript` (ISC), `long` (Apache-2.0), `platform` (MIT), and
`protobufjs` (BSD-3-Clause). Every one is permissive; none is copyleft. The model
weights and the conversion are MIT (ADR-0030). The jsquash codecs were already a
Squeeze dependency and are unchanged.

## The shipped engine

The numbers below are the bake-off run on the reference device (Apple M2,
10-core GPU, 16 GB, macOS 26.5.1, Chromium 153.0.8010.12, `onnxruntime-web`
1.31.1). The engine ships the same model, preprocessing, and input size, so they
are the product measurements, not a separate estimate.

| Measure | WebGPU | WASM (1 thread) |
| --- | ---: | ---: |
| Compressed transfer (Brotli 11) | 28,092,327 B | 28,092,327 B |
| Cold load | 0.664 s | 0.483 s |
| Warm load | 0.217 s | 0.126 s |
| Per image at 1024 px, cold | 0.582 s | 7.792 s |
| Per image at 1024 px, warm | 0.498 s | 7.678 s |
| Browser peak delta | 0.92 GB | 1.16 GB |
| Agent memory after inference | 173.5 MB | 542.7 MB |

The model is read from `/unmask/models/isnet-int8.onnx` and cached under the
`unmask-models-v1` Cache Storage key
`/unmask/model-cache/isnet-int8-<sha256>.onnx`. The ONNX Runtime WASM and its
`.mjs` loader are Vite assets under `/assets/`; the service worker caches them in
`web-codecs-v1` after the first use. Neither the model nor the runtime is in the
precache manifest. The first run needs the network; a reload after it works
offline while both caches remain.

## Consequences

- The model file is 44,229,662 bytes. Brotli quality 11 is 28,092,327 bytes.
  The UI says the model is fetched once and cached. It does not promise a
  transfer size.
- On the reference device, the first WebGPU inference is 0.582 s and a warm
  inference is 0.498 s at 1024x1024. The first WASM inference is 7.792 s and a
  warm inference is 7.678 s with one thread.
- The WASM path is the floor for a general audience. It runs, but it is slow.
  The UI shows a progress state and a Cancel mark. The named WASM budget is
  10 s warm at 1024x1024 on the reference device.
- The app does not set cross-origin isolation, so the WASM runtime uses one
  thread. If a later issue enables COOP/COEP, measure the threaded path before
  changing the budget. Do not assume a speedup.
- WebGPU is preferred, not required. A missing adapter, a lost device, or a
  shader limit falls back to WASM. A model that cannot run on WASM is not the
  default for a general audience.
- The engine reports model download progress, then a separate removing state.
  Inference has no deterministic percentage. The UI uses an indeterminate bar
  and the words "Removing the Background".
- Cancellation aborts the fetch and stops the worker. A cancelled run leaves
  the file unchanged.
- The model cache key includes the model id and the SHA-256. A new model file
  does not overwrite an old cache entry silently.
- No image byte, Matte, or operation log leaves the device. The model request
  is a plain asset request.
