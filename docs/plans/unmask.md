# Unmask — confirmed brief and shape

Status: **confirmed** (2026-11-01). Stage 3 of the Ritools redesign.
Target: `apps/web`, route `src/routes/unmask.tsx`, feature
`src/features/unmask/`.
Mode: **Operate**. World: **Ransom Calling Card**, unchanged.

This issue fixes the surface, the engine seam, the model bake-off, the
fixtures, the copy, the format support matrix, and the page structure. It writes
no production code. It unblocks the engine issue and the UI issue.

The parts are separate files:

- [Engine interface](./unmask/engine-interface.md)
- [Model bake-off](./unmask/bake-off.md)
- [Fixtures](./unmask/fixtures.md)
- [Copy contract](./unmask/copy.md)
- [Format support matrix](./unmask/formats.md)
- [Page structure and interactions](./unmask/interactions.md)
- [Surface brief](../../apps/web/.impeccable/surfaces/src-features-unmask.md)
- [ADR-0029](../../docs/adr/0029-unmask-runs-on-onnxruntime-web.md)
- [ADR-0030](../../docs/adr/0030-unmask-ships-isnet-int8.md)
- [ADR-0031](../../docs/adr/0031-the-matte-is-editable.md)

## Settled decisions

1. **Name and route.** Unmask, at `/unmask`. The result noun is **Cutout**. The
   page title and the meta description carry "background remover" for search.
   The Tool name stays Unmask.
2. **Scope.** General-purpose images: people, products, animals, food, and
   graphics. One model in v1. No model picker.
3. **Runtime.** `onnxruntime-web` (MIT), WebGPU when available, WASM otherwise.
   No `@imgly/background-removal` (AGPL-3.0). No `@huggingface/transformers` in
   v1. No RMBG-1.4 or RMBG-2.0 (non-commercial). See ADR-0029.
4. **Model.** ISNet int8 (44,229,662 bytes, MIT) is the default and the only
   model. The bake-off passed the gate. See ADR-0030.
5. **Model hosting.** Self-hosted. No third-party model CDN at runtime. The
   model is not precached. It is fetched with progress on the first run and
   cached at runtime, like the codec WASM (ADR-0010) and the metadata engine
   (ADR-0020).
6. **Magic Brush.** A **Wand** (click, contiguous colour-similar region,
   tolerance 0-100, 4- or 8-connected) and a **Brush** (paint, size 1-200 px,
   soft edge). One **Restore**/**Erase** toggle. The **Ghost** shows the
   original pixels at low opacity in the removed area while Restore is active.
   An input with meaningful alpha keeps that alpha as the Matte; the model does
   not run, and the result says the input alpha was kept. See ADR-0031.
7. **Batch.** Shared Backdrop, output format, Feather, and quality. Per-image
   Matte edits. One image opens the editor; two or more show the batch list.
   Folder drops keep the Folder Path and count skipped non-images. One ZIP
   download.
8. **Backdrops.** Transparent (checkerboard in the preview, alpha in the file),
   Solid (existing `ColorPicker`, default white), Blur (the original image,
   radius 0-50 px, default 20 px). **Feather** 0-50 px, default 0, applied to
   the Matte, not the colour. The default Backdrop is Transparent.
9. **Output formats.** PNG, WebP, AVIF, JPEG. Default WebP. Quality 1-100,
   default 85, for the lossy formats. JPEG is unavailable when the Backdrop is
   Transparent. No Multi. One Cutout per image.
10. **Input formats.** JPEG, PNG, WebP, AVIF, GIF, and BMP. GIF and BMP
    contribute the first frame.
11. **Editor.** Zoom and pan on a canvas. A before/after slider compares the
    original with the current Cutout. The slider disables painting while it is
    active. Undo and redo cover Matte edits.
12. **Privacy.** No account, no upload, no server storage. The model download
    carries no user data.
13. **Non-goals for v1.** Custom image Backdrop, shadow, reflection, gradient,
    AI-generated Backdrop, video, animated output, HEIC/TIFF/RAW input,
    per-image presets, model picker, watch folder, cloud processing.

## 1. Brief

### Job and audience

A person has one image and needs the Background gone: a seller with a product
photo, a designer with a portrait for a slide, a pet owner with a photo for a
poster, or anyone who needs a clean Cutout without a subscription. They will not
install a desktop editor or make an account for one image. The author is the
first user and the standard: Unmask must be good enough that he stops reaching
for a paid background remover for a normal image.

### Outcome and proof

Primary task: drop one image, check the Cutout, repair the Matte with the Magic
Brush, choose the Backdrop, Feather, format, and quality, and download the
Cutout.

Success: the model gives a useful starting Matte; the Magic Brush repairs the
places it misses; the before/after slider shows the result honestly; the
Backdrop and Feather are visible before the download; the whole flow works with
the keyboard alone; both Locales carry every string.

Proof: the named model and licence, the measured bake-off, the real fixtures,
the per-pixel Matte, the operation log, the before/after comparison, and the
local-only path. No testimonials, no usage numbers, no "perfect cutout" claim.

### Selected direction

The established **Ransom Calling Card** world. Palette, type, angles, motion
grammar, and tokens are fixed. The signature composition is **The Cutting
Room**:

- the image is the **plate** on a light table;
- the Matte is the **stencil**;
- the Magic Brush is the **knife**;
- the Backdrop is the **paper sweep**.

The cutting room replaces the background-remover default: a centered upload
card, a magic-wand icon, and a gradient. It keeps the plate and the controls
visible at the same time at 1440, and stacks them in a reading order at 390.
The surface brief carries the direction contract and the 390/1440 matrix.

### Scope and boundaries

- `/unmask` and `src/features/unmask/` only. The shared shell does not change.
- Six input formats: JPEG, PNG, WebP, AVIF, GIF, BMP.
- Four output formats: PNG, WebP, AVIF, JPEG. One Cutout per image.
- One model, self-hosted, no picker.
- One image opens the editor; two or more open the batch list.
- No custom image Backdrop, shadow, reflection, gradient, or AI-generated fill.
- No video, animated output, HEIC, TIFF, or RAW.
- No per-image presets, no watch folder, no cloud processing.
- No production code in this stage.

### Interaction and layout, in brief

The empty page is a masthead, a drop zone, and the explainer. One image opens
the cutting room: the plate at left, the cutting desk at right. The plate has
the before/after slider, the Magic Brush toolbar, and the facts line. The desk
has the Backdrop, Feather, format, quality, the red **Cut out** mark, the model
line, and the result. The batch list sits below with the shared settings and the
run bar. The download is a single file for one image and one ZIP for two or
more.

### Constraints

- WCAG 2.2 AA in both colour modes, 390 px to 1440 px.
- Keyboard alone completes the flow, including the Wand and the Brush.
- Every count, byte size, dimension, and percentage uses the numerals face in
  fixed columns.
- Every state reads by text and shape, never by colour alone.
- Ransom only on "Unmask". The outcome words use the Poster Title voice.
- Controls are the standard React Aria components in
  `src/core/components/ui`.
- Copy uses the glossary terms exactly. Both Locales carry every string.
- The model is 44,229,662 bytes. The copy says "about 44 MB" and does not
  promise a transfer size.
- The input is never overwritten. The download is a new file.
- No image bytes leave the device.

## 2. Engine seam

The seam has five parts: `remove`, `refine`, `composite`, `encode`, and the
named errors. The supporting types are part of those five, not a sixth surface.

Rules:

1. **No ORT type crosses the seam.** No tensor, session, provider, model path,
   codec type, or Worker message.
2. **The Matte is a domain type.** Width, height, and one 8-bit alpha sample per
   pixel. The full-resolution Matte has the source size.
3. **The operation log is the source of truth.** The editor paints on a preview
   Matte at most 2048 px on the long edge. At export, the engine replays the
   log on the full-resolution Matte. The full Matte is not sent on every
   stroke.
4. **`refine` is pure and deterministic.** The same source, Matte, and
   operations give the same bytes.
5. **`composite` owns the Backdrop and Feather.** Feather blurs the Matte, not
   the colour. Solid and Blur write opaque output.
6. **`encode` owns the file name and the format.** JPEG with a Transparent
   Backdrop is a named refusal, not a silent flatten.
7. **Named errors carry facts, not prose.** The UI selects the copy.
8. **Cancellation is a named state.** Effect interruption aborts the fetch and
   stops the Worker.
9. **The service is the only import.** The UI does not import
   `onnxruntime-web`, a Worker module, a codec module, or a model URL.

The full types, defaults, algorithms, Worker boundary, test obligations, and
performance targets are in [engine-interface.md](./unmask/engine-interface.md).

## 3. Model bake-off

The bake-off ran the three candidates on the eight fixtures on 2026-11-01. The
full data is in [bake-off.md](./unmask/bake-off.md) and
`artifacts/unmask/bake-off/`.

| Model | Bytes | WebGPU warm | WASM warm | Blind score |
| --- | ---: | ---: | ---: | ---: |
| ISNet int8 | 44,229,662 | 0.498 s | 7.678 s | 33 / 40 |
| BiRefNet lite fp16 | 114,538,221 | failed | failed | 31 / 40 |
| MODNet int8 | 6,632,188 | 4.251 s | 3.856 s | 9 / 40 |

ISNet is not worse than BiRefNet on any of the eight fixtures and better on
one. It runs on WASM in 7.68 s warm at 1024x1024, inside the named 10 s budget.
BiRefNet fails on WebGPU (`Too many storage buffers in shader: 11 > 10`) and on
WASM (`std::bad_alloc`) at 1024. MODNet is portrait-only. It returns an empty
matte on the plain product and the low-contrast image, and only a fragment on
the busy product.

Decision: **ISNet int8 is the default and the only model in v1.** ADR-0030
records the measurements, the blind scores, the failure modes, and the gate.

## 4. Copy contract

The copy contract is in [copy.md](./unmask/copy.md). It covers:

- the promise, the deck, the drop hint, and the batch labels;
- the Magic Brush, Wand, Brush, Restore, Erase, and Ghost labels;
- the Backdrop, Feather, quality, format, and JPEG-disabled labels;
- the result lines, the model line, the download lines, and the ZIP line;
- the honesty note and the explainer;
- the named error states;
- both `en-US` and `id-ID`.

The copy names the six limits: hair, fur, glass, motion blur, low contrast, and
thin straps. It never claims a perfect Cutout.

## 5. Format support matrix

The matrix is in [formats.md](./unmask/formats.md). The short version:

- Input: JPEG, PNG, WebP, AVIF, GIF, BMP. GIF and BMP give the first frame.
- Output: PNG, WebP, AVIF, JPEG. Default WebP. Quality 1-100, default 85.
- PNG, WebP, and AVIF keep alpha. JPEG does not.
- JPEG + Transparent is a named disabled state. The format option and the Cut
  out mark are disabled with the reason. The engine also refuses it.
- HEIC, TIFF, RAW, SVG, PDF, video, audio, and Office are `unsupported-format`.
- A supported format that the browser cannot decode is `unreadable-file`.
- One Cutout per image. No Multi, no GIF/BMP output, no animation.
- Input above 64 MP or a 1 GiB working set is `too-large` before allocation.
  The 26.1 MP fixture passes.

## 6. Page structure

The page structure is in [interactions.md](./unmask/interactions.md). It covers
the empty state, the batch list, the settings bar, the run bar, the editor, the
Magic Brush toolbar, the Backdrop panel, the result and download, and the
explainer. It covers every state in the issue:

Empty, reading, model loading, removing, ready, edited, stale, queued,
cancelled, unsupported format, unreadable file, too large, model unavailable,
model failed, encode failed, and downloaded.

The shape follows the Squeeze and Expose patterns: a drop zone, one batch list,
one open editor, and one ZIP download.

## 7. Product truth

### 7.1 `PRODUCT.md`

Add under Capabilities:

> Unmask is the sixth Tool, at `/unmask`. It removes the Background from JPEG,
> PNG, WebP, AVIF, GIF, and BMP images on the device and writes a Cutout: the
> Subject over a Transparent, Solid, or Blur Backdrop. The Magic Brush repairs
> the Matte. It writes PNG, WebP, AVIF, or JPEG. A Batch shares the Backdrop,
> the output format, the Feather, and the quality, and downloads one ZIP. The
> model is fetched once and cached at runtime.

Add to the technical constraints:

> - Unmask runs on ONNX Runtime Web with a self-hosted ISNet int8 model
>   (ADR-0029, ADR-0030). The model is fetched once with progress and cached at
>   runtime. No image bytes leave the device.
> - The Matte is editable. The operation log is the source of truth; the live
>   editor works on a preview Matte at most 2048 px, and the export replays the
>   log at full resolution (ADR-0031).
> - JPEG output requires a Solid or Blur Backdrop. A Transparent Backdrop with
>   JPEG is a named refusal, not a silent flatten.
> - GIF and BMP are input only and contribute the first frame. HEIC, TIFF, and
>   RAW are not read.

Change "Any Tool after Tabular" to "Any Tool after Unmask."

### 7.2 ADRs

- ADR-0029: ONNX Runtime Web and the licence decision.
- ADR-0030: ISNet int8 from the bake-off.
- ADR-0031: the editable Matte and the Magic Brush.

### 7.3 Glossary check

The copy uses the terms already in `apps/web/GLOSSARY.md` under **Background
removal**: Unmask, Cutout, Subject, Background, Backdrop, Matte, Magic Brush,
Restore, Erase, Ghost, Feather. No new term is introduced. "Plate", "stencil",
"knife", "sweep", and "cutting room" are surface metaphors; they never replace
a domain term in the UI labels.

### 7.4 Fixtures and notice

`artifacts/unmask/fixtures/` holds the eight fixtures and the BMP. `NOTICE.txt`
records the source, author, licence, change, bytes, and SHA-256. `manifest.json`
is the machine record. The fixtures are test data; the page has no Sample Image
action in v1.

## 8. Surface concept round

No seed roll. The world is fixed, and the two verbs — cut, then repair —
constrain the composition. Three structures were drawn inside the Ransom
Calling Card; one was selected on 2026-11-01. The direction contract is in the
surface brief.

| Position | Structure | Thesis | Honest risk |
| --- | --- | --- | --- |
| **Selected** | **The Cutting Room** | The image is the plate, the Matte is the stencil, the Magic Brush is the knife, the Backdrop is the paper sweep. | Two columns at 1440 can read as a viewer and a settings form; the shared plate frame, the one ink canvas, and the one red Cut out mark must hold them together. |
| Alternate | **The Light Box** | A full-bleed canvas with a floating control panel. | It hides the controls, makes the batch list an overlay, and pushes the result below the fold. |
| Alternate | **The Contact Sheet** | A batch-first grid of thumbnails with a side editor. | It makes one image feel like a queue and repeats Squeeze's batch ledger without Squeeze's file-size job. |

The Cutting Room was selected because it keeps the plate and the controls
visible at once at 1440, and because the same objects stack into a readable
order at 390 without a second page.

## 9. Out of scope

- Production code, the engine implementation, and the page components.
- Custom image Backdrop, shadow, reflection, gradient, and AI-generated fill.
- Video and animated output.
- HEIC, TIFF, and RAW input.
- Per-image presets, a watch folder, cloud processing, and accounts.
- A model picker.
- Pixel Watermark removal.
- A Sample Image in the app.
- A comparison table or competitor names.
- A server-side fallback.

## 10. Open decisions for the engine and UI issues

These do not block the shape. The builder decides them with a measurement or a
review.

1. **Sticky desk at 1440.** The cutting desk is sticky below the navbar. If the
   sticky column clips the result at a 768 px viewport height, let the desk
   scroll with the plate and keep only the Cut out mark sticky.
2. **Canvas key map.** The required actions are Wand, Brush, Restore, Erase,
   size, undo, and redo. The builder picks the keys and shows them in a help
   popover. No action may need a pointer.
3. **Batch list at 390.** The table becomes cards. If the builder keeps a
   table, it must not introduce horizontal page scroll; a labelled scroll
   region is the fallback.
4. **ZIP library.** `client-zip` and `fflate` are both in the app. The builder
   picks one and measures a 50-image ZIP. The entry names must be sanitized and
   de-duplicated.
5. **AVIF encoder.** `@jsquash/avif` is in the app. If the browser cannot encode
   AVIF, the UI shows `encode-failed` and offers another format. The builder
   measures the AVIF time at 26 MP.
6. **Model path and cache key.** The engine owns the URL and the cache key. The
   key includes the model id and the SHA-256. The builder picks the public path
   and the cache name.
7. **Preflight value.** The shape names 64 MP and 1 GiB. The builder measures
   the real allocation on a phone and tightens the value if needed. It must not
   reject the 26.1 MP fixture.
8. **Stale preview.** A settings change may update the open preview before the
   user cuts out again. The download stays disabled until the Cutout is written.
   The builder decides whether the preview updates live or on the next Cut out.
9. **Batch order.** The list keeps the input order, then the folder traversal
   order. The builder confirms the order with a folder drop.

## 11. Acceptance criteria

- [x] The surface brief is approved and covers 390 px and 1440 px, in both
  colour modes: `apps/web/.impeccable/surfaces/src-features-unmask.md`.
- [x] The engine seam is fixed. The UI can be built against it without knowing
  ONNX Runtime or the model: `docs/plans/unmask/engine-interface.md`.
- [x] The model bake-off is complete, with the measurements and the blind
  scores in ADR-0030. The chosen model has a recorded licence and provenance:
  `artifacts/unmask/bake-off/model-provenance.json`.
- [x] The fixtures are licensed for redistribution and their provenance is
  recorded: `artifacts/unmask/fixtures/NOTICE.txt` and `manifest.json`.
- [x] The `en-US` and `id-ID` copy is complete and aligned:
  `docs/plans/unmask/copy.md`.
- [x] The format matrix names every input and output state, including JPEG with
  a Transparent Backdrop: `docs/plans/unmask/formats.md`.
- [x] The page structure covers every state above:
  `docs/plans/unmask/interactions.md`.
- [x] The honesty note states what Unmask cannot do:
  `unmaskHonestyBody` in `copy.md` and the explainer block.
- [x] A reviewer can read the brief and see the surface before code exists:
  this plan, the surface brief, and the artifacts.
