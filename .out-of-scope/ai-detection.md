# AI-generated pixel detection

Expose reads metadata. It does not decide whether the pixels are AI-generated, and it does not print a verdict.

## Why this is out of scope

A pixel detector is a classifier, not a reader. Its output is a probability, so a score is not a proof. The product principle "Verifiable claims only" needs a claim the user can check. A user cannot check a score against their own image. The claim would rest on the model's benchmark, which the user cannot see.

A detector would have to name the model, the version, the sample set, and the measured false-positive rate. There is no device-local, offline, openly licensed model with a published rate that Expose can cite. Without that rate, the UI cannot show an honest confidence band.

The harm is not symmetric. A false "AI" label can damage the person who took a real photo. A false "not AI" label can hide a synthetic image. A tool that says nothing avoids both false claims.

The offline budget also rules it out. A model adds megabytes to the PWA. Workbox refuses a precache file above 2 MiB, and runtime caching is reserved for codecs ([ADR-0010](../docs/adr/0010-codec-wasm-is-cached-at-runtime.md)). The viewer is built to stay small and to load no engine until a Clean needs one.

Expose is a metadata tool. Detection is a different Tool with a different promise. ADR-0007 also rules out a hosted detector or a third-party API, even when the file stays in the tab.

The comparison table prints "Groups + GPS + AI Provenance". It does not claim detection. The honesty box and the FAQ state the limit in the same words.

This is not the same request as a Pixel Watermark. A watermark detector looks for a named scheme such as SynthID. This request asks for a general judgement about the pixels. That rejection is in [`pixel-watermark.md`](./pixel-watermark.md).

## What would change the decision

A local detector with a named model and version, an open licence, a published sample set, and a measured false-positive rate. Then a new decision issue. That issue must show the confidence band and the false-positive risk. That is a new design, not a change to this one.

## Prior requests

- #13: "[Decision] Expose: detect AI-generated pixels"
