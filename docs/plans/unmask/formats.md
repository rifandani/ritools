# Format support matrix

Unmask reads six image formats and writes four. The input format is detected
from the bytes, not from the extension. The output format is a setting. One
Cutout is written per image. There is no Multi output.

## Input

| Format | Read | Frames | Alpha | Read state | Notes |
| --- | --- | --- | --- | --- | --- |
| JPEG | Yes | 1 | No | `read` | The common photo input. Progressive and baseline JPEG both read. |
| PNG | Yes | 1 | Yes | `read` | The alpha channel is kept. An input with meaningful alpha becomes the Matte. |
| WebP | Yes | First frame if animated | Yes | `read` | A still WebP reads normally. An animated WebP gives its first frame. The UI does not promise animation. |
| AVIF | Yes, when the browser decodes it | First frame if a sequence | Yes | `read` or `unreadable-file` | The browser decoder is the gate. A browser without AVIF gives the named unreadable state, not a silent failure. |
| GIF | Yes | First frame | 1-bit transparency | `read` | The first frame is the Subject. Later frames are ignored. A transparent GIF colour becomes alpha. |
| BMP | Yes | 1 | Usually none | `read` | The first and only frame is the Subject. A 32-bit BMP may carry alpha; the decoder result decides. |

The named first-frame cases are GIF and BMP. An animated WebP or an AVIF
sequence is not a promised input. If the browser decoder returns the first
frame, the engine uses it. That is decoder behavior, not a promise. The copy
names GIF and BMP only. The UI does not offer an animation control, a frame
picker, or an animated output.

### Rejected input

| Format | State | Copy |
| --- | --- | --- |
| HEIC/HEIF | `unsupported-format` | "Unmask reads JPEG, PNG, WebP, AVIF, GIF, and BMP images." |
| TIFF | `unsupported-format` | Same. |
| RAW (CR2, CR3, NEF, ARW, DNG, ORF, RW2, RAF, and others) | `unsupported-format` | Same. |
| SVG | `unsupported-format` | Same. |
| PDF | `unsupported-format` | Same. |
| Video (MP4, MOV, WebM, MKV, AVI) | `unsupported-format` | Same. |
| Audio (MP3, WAV, FLAC, OGG, Opus) | `unsupported-format` | Same. |
| Office (DOCX, XLSX, PPTX) | `unsupported-format` | Same. |
| Anything that is not an image | `unsupported-format` | Same. |

A supported format that the browser cannot decode, or a damaged file, is
`unreadable-file`, not `unsupported-format`. The UI says the file may be
damaged, or the browser may not decode this format. The two states are
different because the action is different: choose another format, or choose
another file.

### Input alpha

An input with meaningful alpha (at least 0.1% of pixels below 255) already has
a Cutout. Unmask uses the input alpha as the Matte and does not run the model.
The result note says the input alpha was kept. The Magic Brush still works on
the Matte. A PNG with a single transparent pixel is not "meaningful"; the
threshold prevents a stray alpha value from skipping the model.

### Input size

- Preflight: reject above 64,000,000 pixels, or an estimated working set above
  1 GiB. The 26.1 MP fixture passes.
- A source that passes preflight but fails to allocate is `too-large`. The file
  is unchanged.
- The copy says the device sets the limit. It never says "unlimited".
- The large fixture is 6000 × 4344 = 26.1 MP. The full Matte is 26.1 MB. The
  source RGBA is 104.3 MB.

## Output

| Format | Alpha | Quality | Default | Notes |
| --- | --- | --- | --- | --- |
| PNG | Yes | No | — | Lossless. The largest file. The quality slider is hidden. |
| WebP | Yes | 1-100 | 85 | The default. A good size with alpha. |
| AVIF | Yes | 1-100 | 85 | The smallest file. The slowest encode. A browser that cannot encode AVIF shows `encode-failed`. |
| JPEG | No | 1-100 | 85 | Flattens. Unavailable with a Transparent Backdrop. |

Rules:

1. One Cutout per image. No Multi. No GIF or BMP output. No animated output.
2. The output name is `<stem>-cutout.<ext>`. The engine owns the extension.
   The stem is sanitized.
3. A Transparent Backdrop with PNG, WebP, or AVIF writes an alpha file. The
   preview shows a checkerboard; the file has real alpha.
4. A Solid or Blur Backdrop writes an opaque file in every format, including
   PNG, WebP, and AVIF. The output alpha is 255.
5. Quality applies to WebP, AVIF, and JPEG. PNG ignores it. The default is 85.
6. A quality of 1 is the smallest, roughest file. A quality of 100 is the
   largest. The UI shows the value as a number.
7. The input file is never overwritten. The download is a new file.
8. A batch writes one file per image. Two or more files become one ZIP. One
   file downloads as a single file.

### JPEG with a Transparent Backdrop

This is a named disabled state, not a silent flatten.

- When the Backdrop is Transparent, the JPEG format option is disabled. Its
  reason is shown beside it: "JPEG has no transparency. Choose a Solid or Blur
  Backdrop, or PNG, WebP, or AVIF."
- If JPEG is the current format and the user selects Transparent, the Cut out
  mark is disabled with the short reason `unmaskCutOutDisabledTransparentJpeg`.
  The format does not change silently. The Backdrop does not change silently.
- The engine also refuses the pair with `EncodeFailed` reason
  `jpeg-transparent`. A UI bug cannot produce a flattened JPEG that pretends
  to be transparent.
- The batch list marks an item with this pair as `failed` with the same reason.
  It does not write a JPEG.

### Transparency preview

| Backdrop | Preview | File |
| --- | --- | --- |
| Transparent | Checkerboard behind the Subject. | Alpha channel. |
| Solid | The chosen colour behind the Subject. | Opaque. |
| Blur | The blurred original behind the Subject. | Opaque. |

The checkerboard is a preview aid. It is never written into a file.

## Named format states

| State | Trigger | Region | Action |
| --- | --- | --- | --- |
| `unsupported-format` | HEIC, TIFF, RAW, SVG, PDF, video, audio, Office, or a non-image. | The batch row or the editor error note. | Choose another file. |
| `unreadable-file` | A supported format that the browser cannot decode, or a damaged or empty file. | The batch row or the editor error note. | Choose another file. |
| `too-large` | Preflight above 64 MP or 1 GiB, or an allocation failure. | The batch row or the editor error note. | Choose a smaller image. |
| `jpeg-transparent` | JPEG + Transparent. | The format option and the Cut out mark. | Choose Solid or Blur, or PNG/WebP/AVIF. |
| `encode-failed` | A codec failure, an AVIF encoder that the browser does not have, or an allocation failure at encode. | The result block. | Choose another format, or retry. |
| `stale` | A setting changed after a Cutout. | The result block and the batch row. | Cut out again. |

## Format facts for the copy

- Inputs: JPEG, PNG, WebP, AVIF, GIF, BMP.
- Outputs: PNG, WebP, AVIF, JPEG.
- Default Backdrop: Transparent.
- Default output: WebP.
- Default quality: 85.
- GIF and BMP give the first frame.
- JPEG cannot hold transparency.
- HEIC, TIFF, and RAW are not read.
- One Cutout per image. No Multi.
- The input is never changed.
- The model is fetched once, then works offline while the cache remains.
