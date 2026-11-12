# Cinch encodes with WebCodecs, not ffmpeg.wasm

Cinch compresses video with Mediabunny's `Conversion` API. Mediabunny reads and writes the container in TypeScript and gives decoding and encoding to the browser's WebCodecs, which can use the device's hardware video encoder. Cinch does not ship ffmpeg.wasm.

## Considered options

- **ffmpeg.wasm.** Rejected. It reads almost every container and codec, but the core is about 31 MB, it encodes on the CPU only, and it is many times slower than a hardware encoder. The multi-thread build needs `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers on the whole app, and these headers block cross-origin resources that other Tools load. WASM memory stops near 2 GB, so large videos fail.
- **Mediabunny first, ffmpeg.wasm as a fallback.** Deferred. It covers more inputs, but it carries both costs. We can add it later without a change to the Cinch model.
- **Mediabunny only.** Chosen. Mediabunny is tree-shakable, it reads the input as a stream, and it adds no codec download.

## Consequences

- Cinch reads MP4, MOV, WebM, and MKV only. AVI, WMV, and FLV are Rejected with a named reason.
- Which codecs Cinch can read and write depends on the browser. Cinch checks each Output Format with `canEncode()` and disables the formats that the browser cannot write. An input that the browser cannot decode, such as HEVC on some browsers, is Rejected with a named reason.
- Cinch has no WASM to cache, so it works offline after the page loads once.
- The Output Formats are MP4 (H.264 and AAC) and WebM (VP9 and Opus). AV1 and HEVC are not offered because hardware encoders for them are not common.
