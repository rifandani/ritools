# Public engine interface, version 1

This is the application-owned contract for the Unmask engine and UI issues.
The types below describe decoded Effect Schema values. Implement the schemas
with Effect v4 `Schema.Struct`, `Schema.TaggedUnion`, constrained branded IDs,
and `Schema.TaggedError`. Decode unknown Worker input with
`Schema.decodeUnknownEffect`. Do not export an ORT tensor, an ORT session, a
model path, a DOM node, a `File` handle, or a vendor codec type.

The UI calls the `UnmaskEngine` service. It does not send Worker messages
directly. The Worker is an implementation detail of the service.

## Ownership and lifetime

| Owner | State |
| --- | --- |
| Engine Worker | Retained source raster, full-resolution Matte, preview Matte, operation log, ORT session, model bytes |
| Main-thread service | Worker lifecycle, request IDs, interruption, model cache, response validation, current image token |
| Application state | Source facts, preview Matte reference, operation summary, settings, progress, result, named error |
| UI component state | Zoom, pan, pointer position, brush size, Wand tolerance, comparison slider, focus |

The Worker holds one open image at a time. The service terminates the Worker
when the route unmounts or the image closes. The full-resolution Matte is 1
byte per source pixel. The preview Matte is at most 2048 px on the long edge.
The operation log is the source of truth for the Matte edits.

A batch keeps one operation log per image and one encoded result per image. It
does not keep one full Matte per image. The batch worker processes one image at
a time and releases the source, the Matte, and the raster after the encode.

No user data goes to Cache Storage, IndexedDB, localStorage, a service worker,
analytics, logs, or the server. The model bytes alone are cached, under a key
that contains the model id and the SHA-256. The cache entry contains no user
data.

## Schema notation

All records are readonly. `Id` means a non-empty branded opaque string, unique
for its kind within an engine lifetime. IDs contain no file text. `Count` and
`ByteCount` are safe non-negative integers. `Index` is zero-based. Arrays are
ordered. Optional fields are marked `?`; other fields are required. User text
is any Unicode string; do not trim it to pass validation. Numeric values are
finite. Byte buffers are `Uint8Array`, transferred once on the wire.

Source pixels are top-left origin, row-major. A coordinate is an integer in the
source image. A size is an integer in source pixels. A Matte alpha value is 0
(removed) to 255 (kept).

```ts
type Id<Kind extends string> = string & { readonly kind: Kind };
type SourceId = Id<'Source'>;
type MatteId = Id<'Matte'>;
type OperationId = Id<'Operation'>;
type RequestId = Id<'Request'>;
type ByteCount = number; // safe integer >= 0
type Count = number; // safe integer >= 0
type Pixel = { readonly x: number; readonly y: number };
```

## Vocabulary

```ts
/** The six input formats. GIF and BMP contribute their first frame. */
type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'bmp';

/** The four output formats. */
type OutputFormat = 'png' | 'webp' | 'avif' | 'jpeg';

/** The fill behind the Subject. */
type Backdrop =
  | { readonly _tag: 'Transparent' }
  | { readonly _tag: 'Solid'; readonly color: RgbaColor }
  | { readonly _tag: 'Blur'; readonly radius: number }; // 0-50 px

type RgbaColor = {
  readonly r: number; // 0-255
  readonly g: number; // 0-255
  readonly b: number; // 0-255
  readonly a: 255;    // opaque
};

/** The per-pixel opacity of the Subject. */
type Matte = {
  readonly matteId: MatteId;
  readonly width: Count;
  readonly height: Count;
  /** One 8-bit sample per pixel, row-major. length === width * height. */
  readonly alpha: Uint8Array;
};

/** A decoded source image at one size. RGBA, straight alpha, sRGB. */
type RasterImage = {
  readonly width: Count;
  readonly height: Count;
  /** Four 8-bit samples per pixel, row-major. length === width * height * 4. */
  readonly rgba: Uint8Array;
};

type SourceFacts = {
  readonly sourceId: SourceId;
  readonly name: string;      // display only; never a path
  readonly format: ImageFormat;
  readonly width: Count;
  readonly height: Count;
  readonly bytes: ByteCount;
  readonly frameCount: Count; // 1 for a still image
  readonly hasAlpha: boolean;
};

type ModelInfo = {
  readonly id: 'isnet-int8';
  readonly name: string;      // "ISNet int8"
  readonly version: string;   // the model revision, not the app version
  readonly licence: string;   // "MIT"
  readonly licenceUrl: string;
  readonly bytes: ByteCount;
  readonly sha256: string;
  readonly backend: 'webgpu' | 'wasm';
};
```

`SourceFacts.format` is the format the engine detected from the bytes. Do not
trust the file extension. `frameCount` is the count of frames in the source
container; the engine reads the first frame only.

## 1. `remove`

```ts
type SourceFile = {
  readonly name: string;
  readonly mime: string;
  readonly bytes: Uint8Array;
};

type RemoveOptions = {
  /** Long edge of the preview Matte. Default 2048, clamped to 512-2048. */
  readonly previewMaxEdge?: number;
  /** Effect interruption is the primary cancel path. This signal is for the
   * worker adapter and for non-Effect callers. */
  readonly signal?: AbortSignal;
  readonly report?: (event: RemoveProgress) => void;
};

type RemoveProgress =
  | { readonly _tag: 'Decode' }
  | { readonly _tag: 'ModelDownload'; readonly loaded: ByteCount;
      readonly total: ByteCount | null }
  | { readonly _tag: 'ModelInit' }
  | { readonly _tag: 'Infer' };

type RemoveNote =
  | { readonly _tag: 'InputAlpha' }
  | { readonly _tag: 'FirstFrame'; readonly format: ImageFormat }
  | { readonly _tag: 'ModelCached' }
  | { readonly _tag: 'ModelDownloaded' }
  | { readonly _tag: 'PreviewDownscaled'; readonly width: Count;
      readonly height: Count }
  | { readonly _tag: 'WebGpuFallback'; readonly reason: string };

type RemoveResult = {
  readonly source: SourceFacts;
  readonly matte: Matte;     // full resolution
  readonly preview: Matte;   // long edge <= previewMaxEdge
  readonly model: ModelInfo | null;
  readonly notes: readonly RemoveNote[];
};

remove: (
  file: SourceFile,
  options?: RemoveOptions
) => Effect.Effect<RemoveResult, UnmaskError>;
```

Rules:

1. The engine decodes the file with the browser image decoder. GIF, animated
   WebP, and AVIF sequences give the first frame. BMP gives its only frame.
2. If the input has meaningful alpha (at least 0.1% of pixels below 255), the
   input alpha becomes the Matte. The engine does not run the model. `model`
   is `null`, and the notes carry `InputAlpha`. This is the user's own Cutout.
3. Otherwise the engine loads the model, runs it at 1024x1024, and upsamples
   the sigmoid output to the source size for `matte`. It downsamples to the
   preview size for `preview`.
4. The preview long edge is `min(2048, max(source.width, source.height))`. It
   is never larger than the source. The note `PreviewDownscaled` carries the
   real size.
5. The model is fetched from the app origin. The fetch reports loaded bytes and
   the total from `Content-Length` when present. A cached model reports
   `ModelCached` and does not fetch.
6. WebGPU is tried first. A missing adapter, a device loss, or a shader limit
   falls back to WASM. The note `WebGpuFallback` carries the reason. The model
   info reports the backend that ran.
7. Effect interruption aborts the fetch and stops the worker. The result is
   `Cancelled`. The file is unchanged.
8. The source bytes are decoded once. The engine does not re-read the input.
9. The source name is display-only. The engine never passes it to a path, a
   URL, a shell, or a model request.
10. If the input alpha is the Matte, `model` is null and the note `InputAlpha`
    says why. This is the only case where the model does not run.

The full-resolution Matte is returned once. The main thread holds it for the
open image. A batch item releases it after `encode`. The preview Matte is the
only Matte the editor sends on a stroke.

## 2. `refine`

```ts
type MatteMode = 'restore' | 'erase';

type WandOperation = {
  readonly _tag: 'Wand';
  readonly operationId: OperationId;
  readonly mode: MatteMode;
  readonly seed: Pixel;
  readonly tolerance: number;   // 0-100
  readonly connectivity: 4 | 8;
};

type BrushOperation = {
  readonly _tag: 'Brush';
  readonly operationId: OperationId;
  readonly mode: MatteMode;
  readonly size: number;        // 1-200 source px
  readonly points: readonly Pixel[]; // at least one point
};

type MatteOperation = WandOperation | BrushOperation;

type RefineRequest = {
  /** The original pixels at the same size as `matte`. */
  readonly source: RasterImage;
  readonly matte: Matte;
  readonly operations: readonly MatteOperation[];
};

refine: (request: RefineRequest) => Matte;
```

Rules:

1. `refine` is pure and deterministic. The same source, Matte, and operation
   list produce the same Matte bytes. There is no hidden state, no clock, and no
   random value.
2. The operation list is replayed from the input Matte. The engine does not
   apply a delta to a cached Matte in the public contract. The Worker may cache
   an intermediate state for speed, but the result must equal a full replay.
3. Coordinates and sizes are in source pixels. The engine maps them to the
   Matte by `matte.width / source.width` and `matte.height / source.height`.
   The source and the Matte must have the same aspect ratio; a mismatch is a
   defect, not a named error.
4. A Wand seeds at `seed`. It floods the contiguous region whose sRGB
   Euclidean distance from the seed colour is at most
   `tolerance / 100 * 441.6729559300637`. `tolerance: 0` is an exact match.
   `tolerance: 100` includes every colour. `connectivity: 4` reads the four
   edge neighbours; `8` also reads the four corners.
5. A Wand writes the selected region: `restore` sets alpha to 255, `erase` sets
   alpha to 0. It writes only the selected region. It does not feather the
   region edge; Feather is a composite step.
6. A Brush paints a soft-edged disc at each path point. The radius is
   `size / 2` source pixels. The stamp has a solid core out to 70% of the
   radius and a smooth falloff to the rim. The path is a polyline; the engine
   stamps at each point and interpolates between points at most one source
   pixel apart.
7. A Brush writes `restore` toward 255 and `erase` toward 0. A stamp over an
   existing value moves it toward the target; it does not replace it with a
   hard value. The exact stamp function is fixed by the engine tests.
8. The output has the same `matteId` and size as the input. The operation log
   stays in the UI; the engine does not append to it.
9. `refine` does not change the source, the Backdrop, or the Feather. It does
   not encode.
10. `refine` has no signal and no named error. It is a pure function. The
    Worker may stop a long replay between operations, but the public function
    has no cancellation path and no failure state. A size mismatch is a defect.
11. A seed or point outside the source is clamped to the source rectangle. A
    size outside 1-200 is clamped. These are user-input clamps, not defects.
12. The preview operation uses the preview source and the preview Matte. The
    export operation uses the full source and the full Matte. The log is the
    same. The preview is an approximation; the full replay is the Cutout.
13. The returned `preview` Matte is the same Matte at the preview size. It is
    returned so the UI does not downscale a 26 MP Matte on the main thread.

## 3. `composite`

```ts
type CompositeRequest = {
  /** The original pixels at the same size as `matte`. */
  readonly source: RasterImage;
  readonly matte: Matte;
  readonly backdrop: Backdrop;
  readonly feather: number; // 0-50 px
  readonly signal?: AbortSignal;
};

composite: (
  request: CompositeRequest
) => Effect.Effect<RasterImage, UnmaskError>;
```

Rules:

1. Feather is a blur of the Matte alpha, not of the colour. The kernel is a
   separable Gaussian with `sigma = feather / 2.56`, so the 10-90% transition
   width is about `feather` pixels. `feather: 0` is a hard edge. The edge is
   clamped at the image border.
2. The Subject is the source RGB with the feathered Matte as alpha. The source
   RGB is straight, not premultiplied.
3. `Transparent` writes the Subject over a zero-alpha field. The output alpha is
   the feathered Matte.
4. `Solid` writes the chosen colour behind the Subject. The output alpha is 255.
   The default colour is white. The UI uses the existing `ColorPicker`.
5. `Blur` writes the original image, blurred, behind the Subject. The radius is
   0-50 px, default 20. The blur is a separable Gaussian with
   `sigma = radius / 2`, edge-clamped. The output alpha is 255. An input with
   alpha is composited over white before the blur.
6. The output has the source width and height. There is no crop, scale, or
   transform in v1.
7. A feather or radius outside its range is clamped. A negative value is 0.
8. `composite` does not encode. It does not run the model. It does not change
   the Matte.
9. The output is sRGB, 8-bit, straight alpha. The encoder receives this exact
   buffer.

## 4. `encode`

```ts
type EncodeRequest = {
  readonly image: RasterImage;
  readonly format: OutputFormat;
  readonly quality: number;   // 1-100; ignored for PNG
  readonly nameStem: string;  // display name without extension
  readonly signal?: AbortSignal;
};

type EncodedFile = {
  readonly name: string;      // stem-cutout.ext, sanitized
  readonly mime: string;
  readonly bytes: Uint8Array;
  readonly width: Count;
  readonly height: Count;
  readonly format: OutputFormat;
  readonly quality: number | null;
  readonly hasAlpha: boolean;
  readonly bytesLength: ByteCount;
};

encode: (
  request: EncodeRequest
) => Effect.Effect<EncodedFile, UnmaskError>;
```

Rules:

1. PNG is lossless. Quality is ignored; `quality` is `null` in the result.
2. WebP, AVIF, and JPEG are lossy at the chosen quality. The default is 85.
   The mapping from 1-100 to the codec setting is internal and fixed by the
   codec tests.
3. WebP and AVIF keep the alpha channel when the image has one.
4. JPEG has no alpha. `encode` refuses an image with any alpha below 255 and
   returns `EncodeFailed` with reason `jpeg-transparent`. It never flattens
   silently.
5. The output name is `<stem>-cutout.<ext>`. The engine sanitizes the stem:
   remove path separators, control characters, and a leading dot; collapse
   whitespace; limit to 120 characters; fall back to `image`. The engine owns
   the extension. The UI does not build the name.
6. The engine does not write the input file. It returns bytes only.
7. A codec failure, an allocation failure, or a zero-length result is
   `EncodeFailed` with reason `codec` or `memory`.
8. The result `hasAlpha` is true only for a format that keeps alpha and an image
   with alpha.

## 5. Named errors

```ts
type UnmaskError =
  | { readonly _tag: 'UnsupportedFormat'; readonly format: string }
  | { readonly _tag: 'UnreadableFile';
      readonly reason: 'decode' | 'damaged' | 'empty' }
  | { readonly _tag: 'TooLarge'; readonly width: Count;
      readonly height: Count; readonly pixels: Count;
      readonly neededBytes: ByteCount }
  | { readonly _tag: 'ModelUnavailable';
      readonly reason: 'offline' | 'fetch' | 'init' }
  | { readonly _tag: 'ModelFailed';
      readonly reason: 'inference' | 'memory' | 'device-lost' }
  | { readonly _tag: 'Cancelled' }
  | { readonly _tag: 'EncodeFailed';
      readonly reason: 'jpeg-transparent' | 'codec' | 'memory' };
```

| Method | Errors it can return |
| --- | --- |
| `remove` | `UnsupportedFormat`, `UnreadableFile`, `TooLarge`, `ModelUnavailable`, `ModelFailed`, `Cancelled` |
| `refine` | None; a size mismatch is a defect |
| `composite` | `TooLarge`, `Cancelled` |
| `encode` | `EncodeFailed`, `TooLarge`, `Cancelled` |

Rules:

1. The error carries a code and the facts the UI needs. It carries no localized
   prose. The UI selects the copy from the Message Catalog.
2. `UnsupportedFormat` is for a format outside the six input formats: HEIC,
   TIFF, RAW, SVG, PDF, video, audio, and anything that is not an image. The
   engine detects it from the bytes, not the extension.
3. `UnreadableFile` is for a supported format that the browser cannot decode:
   a damaged file, a truncated file, an empty file, or a browser without the
   AVIF or WebP decoder.
4. `TooLarge` is a preflight or an allocation failure. The preflight rejects a
   source above 64,000,000 pixels or an estimated working set above 1 GiB. The
   26.1 MP fixture passes. The device memory is the real limit.
5. `ModelUnavailable` is a model that cannot be fetched or initialized: offline
   with no cache, a 404, a CORS failure, a cache read failure, or an ORT init
   failure. The file is unchanged.
6. `ModelFailed` is a model that loaded but did not finish: an inference error,
   an out-of-memory error, or a lost WebGPU device after the WASM fallback also
   fails. The file is unchanged.
7. `Cancelled` is Effect interruption or the AbortSignal. The Worker is stopped
   and the next request starts from a clean state.
8. `EncodeFailed` is a codec failure or the JPEG + Transparent refusal. The
   Matte is kept, so the user can choose another format.

## Service shape

```ts
export interface UnmaskEngineShape {
  readonly remove: (
    file: SourceFile,
    options?: RemoveOptions
  ) => Effect.Effect<RemoveResult, UnmaskError>;
  readonly refine: (request: RefineRequest) => Matte;
  readonly composite: (
    request: CompositeRequest
  ) => Effect.Effect<RasterImage, UnmaskError>;
  readonly encode: (
    request: EncodeRequest
  ) => Effect.Effect<EncodedFile, UnmaskError>;
}

export class UnmaskEngine extends Context.Service<
  UnmaskEngine,
  UnmaskEngineShape
>()("@ritools/web/UnmaskEngine") {}
```

The service is the only import the UI needs. The UI does not import
`onnxruntime-web`, a Worker module, a codec module, or a model URL.

## Worker boundary

- One Worker per Tool session. It serves the open image or the batch queue. The
  service creates it on the first `remove` and terminates it on close or
  unmount.
- The Worker receives typed messages: `Remove`, `Refine`, `Composite`, `Encode`,
  `Cancel`, `Close`. Every message has a `requestId` and an `imageToken`.
- The Worker validates each message with its Effect Schema. An unknown tag, a
  missing field, or a mismatched token is a defect. It never evaluates a
  message as code.
- The model session is created once per Worker and reused. A new image does not
  reload the model.
- The source raster, the full Matte, and the preview Matte live in the Worker.
  The service receives copies or transferables. The UI receives only the values
  the seam declares.
- A `refine` call sends the operation list, the preview Matte, and the preview
  source on the first stroke. The Worker caches them by `imageToken` and by a
  content hash; later strokes send only the operations. The Worker returns the
  new preview Matte. It never sends the full-resolution Matte on a stroke.
- The full-resolution replay at export sends the full Matte and the full source
  once. The Worker returns the composited raster and the encoded bytes.
- A batch uses one Worker and a queue. The model loads once. The Worker runs one
  image at a time. A cancel clears the queue and stops the current job.
- The Worker has no network access except the model fetch and no storage except
  the model cache. The service never sends file names to the Worker as paths.

## Test obligations

The engine issue inherits these tests. They are pure module tests where the
code allows, and Worker integration tests where it does not.

1. `Matte` and `RasterImage` length invariants; a mismatch is rejected.
2. `remove` decodes all six formats. GIF and BMP give the first frame; an
   animated GIF's second frame never appears.
3. `remove` uses the input alpha for the transparent PNG and does not run the
   model.
4. `remove` returns a full Matte at the source size and a preview at most 2048
   on the long edge.
5. `refine` is deterministic: the same request gives the same bytes twice.
6. Wand tolerance 0 and 100, 4- and 8-connectivity, a seed on the Subject, a
   seed on the Background, and a seed on the image border.
7. Brush size 1 and 200, a single point, a multi-point path, and a soft edge
   that is not a hard circle.
8. Restore and Erase move the Matte in the correct direction.
9. A full replay of 100 operations equals the result of applying them one at a
   time.
10. Undo removes the last operation and redo restores it; the result equals a
    replay of the shorter log.
11. Feather 0 is a hard edge; Feather 50 has a transition of about 50 px.
12. Composite Transparent gives alpha; Solid gives alpha 255; Blur radius 0 is
    the original and radius 50 is soft.
13. A Blur Backdrop on an alpha input composites over white first.
14. PNG keeps alpha; WebP and AVIF keep alpha; JPEG with alpha returns
    `EncodeFailed` with `jpeg-transparent`.
15. Quality 1 and 100 produce different sizes for WebP, AVIF, and JPEG. PNG
    ignores quality.
16. Every named error has a fixture or a stub that produces it.
17. The model cache is hit on the second run; an offline cache miss is
    `ModelUnavailable`; a corrupt cache entry is refetched or fails cleanly.
18. Cancellation stops the fetch and the Worker; the next request succeeds.
19. No ORT type, ORT session, model path, or codec type appears in the public
    type surface. A type test enforces this.
20. A 26.1 MP fixture completes the full path inside the named memory budget,
    and a source above the preflight is `TooLarge` without an allocation.
21. A browser backend Matte matches the CPU reference Matte within one alpha
    level on a fixed fixture. This is a backend parity test, not a second
    quality gate.

## Performance targets

These are targets for the engine issue. They are not measured in this shape
issue.

| Step | Target on the reference device |
| --- | --- |
| Model load, warm | < 300 ms WebGPU, < 200 ms WASM |
| Inference at 1024 | < 1 s WebGPU, < 10 s WASM |
| Brush stamp on 2048 preview | < 16 ms |
| Full replay of 100 ops on 2048 preview | < 250 ms |
| Composite + encode at 26 MP | < 5 s |
| Full batch item, model warm, WebGPU | < 8 s |

The WASM model inference is the dominant cost. The UI shows the model download
progress, then an indeterminate removing state, then the result. It never
freezes the page.

## Security rules

- The source name is display text. The engine sanitizes it for the download
  name and never uses it as a path, a URL, or a Worker key.
- The model URL is a constant in the engine. The UI cannot set it.
- The Worker validates every message with a schema and rejects unknown fields.
- The engine never logs a pixel, a file name, an operation log, or a model
  tensor.
- The model fetch carries no cookie, no user identifier, and no file data.
- The Cache API stores model bytes only. It never stores a source, a Matte, a
  Cutout, or an operation log.
- The UI renders every file name and error fact as text. No `innerHTML`, no
  `dangerouslySetInnerHTML`.
- The engine refuses a source above the preflight instead of trying to allocate
  it. An allocation failure is caught and mapped to `TooLarge`.
