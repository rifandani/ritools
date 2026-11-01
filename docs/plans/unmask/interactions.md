# Page structure and interactions

## Route contract

- `/unmask` is server-rendered. The promise, the empty state, the format line,
  and the explainer are in the HTML. Every browser-only call waits behind an
  event or an effect.
- The route head is its own: the title, the meta description, and
  `ogImagePath({ kind: "tool", path: "/unmask" })` with the `unmaskOgAlt` text.
  The Open Graph card is drawn on request by `GET /api/og`.
- The Tool Catalog entry is
  `{ name: "Unmask", path: "/unmask", promiseKey: "unmaskPromise", factKeys: ["unmaskFactFormats", "unmaskFactModel", "unmaskFactLocal"] }`.
- The engine chunk is lazy. The page does not load `onnxruntime-web` or the
  model until the first Cut out. The model is not precached. It is fetched with
  progress and cached at runtime.
- The fixtures in `artifacts/unmask/fixtures/` are test data. The page has no
  Sample Image action in v1. The only entry is the drop zone and the file
  picker.
- The page does not read a user file on the server. The route has no upload
  endpoint.

## Hierarchy

At 1440 the page is one cutting room. At 390 the same DOM stacks into one
column. It is one component tree, not two pages.

```text
1440
┌ navbar ───────────────────────────────────────────────────────────────┐
│ RITOOLS · Tools                                  Theme · Language      │
├────────────────────────────────────────────────────────────────────────┤
│ Unmask [Ransom]   Remove the background. Then fix the Matte.  LOCAL    │
├──────────────────────────────────────────┬─────────────────────────────┤
│ PLATE                                    │ CUTTING DESK                │
│                                          │ Backdrop                    │
│ ┌──────────────────────────────────────┐ │  ○ Transparent              │
│ │ canvas / Cutout / checkerboard        │ │  ○ Solid  [colour]          │
│ │ before/after slider at the top        │ │  ○ Blur   [radius 20]       │
│ └──────────────────────────────────────┘ │                             │
│ 2400 × 1521 · 388 KB · JPEG              │ Feather  [0 px]             │
│                                          │ Format   PNG WebP AVIF JPEG │
│ MAGIC BRUSH                              │ Quality  [85]               │
│ Wand | Brush | Restore | Erase | Ghost   │ [Cut out]                   │
│ Size 40 · Tolerance 20 · 8-connected     │ model line / progress       │
│ Undo 3 | Redo 0                          │ result line / Download      │
├──────────────────────────────────────────┴─────────────────────────────┤
│ BATCH LIST (2+ images)                                                  │
│ thumb · name / folder path · state · action                             │
│ [Cut out N] [Cancel] [Download ZIP]                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ EXPLAINER                                                               │
└─────────────────────────────────────────────────────────────────────────┘

390
navbar
masthead (Ransom Unmask, promise, local note)
PLATE
  canvas
  before/after slider
  facts line
MAGIC BRUSH toolbar (wraps to two rows)
CUTTING DESK
  Backdrop
  Feather
  Format
  Quality
  Cut out
  model / progress
  result / Download
BATCH LIST (2+ images)
EXPLAINER
sticky bar: Cut out · N (only while the editor is open and the mark is above the fold)
```

## Empty state

- A masthead with the Ransom "Unmask", the promise, and the local note.
- One drop zone, which is a button. The whole zone opens the file picker.
- The hint names the six input formats and the one-image rule. The folder hint
  says a folder keeps its path and non-image files are skipped and counted.
- No sample image. The fixtures are for the bake-off and the engine tests.
- The explainer is visible below the drop zone. The honesty note is the first
  explainer block.
- At 390 the drop zone is full width and at least 180 px tall. The text is not
  inside a drag-only target.

## Batch list

The batch list is shown when the session has two or more images. It is the
default view for a folder drop and for a multi-file pick.

- A shared settings bar at the top: Backdrop, Feather, format, and quality.
  These apply to the whole batch. The per-image Matte is edited in the editor.
- One row per image at 1440:
  thumbnail, name, folder path when known, dimensions, state mark, and an
  action. The row is not a button; the Open action is a button.
- The states are `queued`, `running`, `ready`, `edited`, `stale`, `failed`,
  `cancelled`, and `downloaded`. Each has a word and a square mark; no state is
  carried by colour alone.
- The run bar sits under the list: **Cut out N**, **Cancel**, the progress line,
  and **Download ZIP**. The run bar is sticky at the bottom of the list at 1440
  and at the bottom of the viewport at 390 while the list is in view.
- The run processes one image at a time. The model loads once. A queued row
  shows its position. A failed row names the error and offers **Retry**. A
  cancelled row returns to `queued`.
- A folder drop shows "Folder: {path}" above the list and the count of skipped
  non-image files. The ZIP preserves the relative paths. The download name is
  sanitized; `..` and an absolute path are removed.
- One ready image downloads as a single file. Two or more ready images download
  as one ZIP. The ZIP name is `unmask-cutouts.zip`. Each entry is
  `<stem>-cutout.<ext>`; a duplicate name gets `-2`, `-3`, and so on.
- Opening a row shows the editor for that image. The batch list stays below the
  editor. A **Back to the batch** action returns to the list. The shared
  settings stay visible in both views.
- The batch list is a real table at 1440 with `<th scope="col">`. At 390 it is a
  stacked list of cards with the same labels.

## Settings bar

The settings bar is shared by the batch. The same controls are in the editor's
right column at 1440.

- **Backdrop.** A radio group with three cards: Transparent, Solid, Blur. The
  default is Transparent, because a Cutout with alpha is the primary result.
  - Transparent shows a checkerboard in the preview and writes alpha.
  - Solid opens the existing `ColorPicker`. The default is white.
  - Blur shows a radius slider, 0-50 px, default 20. The preview uses the
    original image, blurred.
- **Feather.** A slider from 0 to 50 px, default 0. The note says it softens
  the Matte edge, not the Backdrop.
- **Format.** A radio group: PNG, WebP, AVIF, JPEG. The default is WebP. Each
  has a one-line note. JPEG is disabled with a reason when the Backdrop is
  Transparent.
- **Quality.** A slider from 1 to 100, default 85. It is hidden for PNG, with
  the line "PNG is lossless. Quality does not apply." It is shown for WebP,
  AVIF, and JPEG.
- A settings change marks every ready Cutout in the batch as `stale`. The
  download is disabled until the user cuts out again. The preview may update
  immediately for the open image, but the file on disk is not current until the
  Cutout is written again.

## Run bar

- **Cut out N** starts the batch or re-runs the stale items. It is a red mark:
  red outline at rest, red wash on hover, solid red when pressed, bracket on
  focus.
- **Cancel** stops the current item and clears the queue. The current item
  returns to `queued`; completed items stay ready.
- The progress line is a printed bar. The model download shows a real percent
  from `Content-Length` when present. The inference step is indeterminate and
  says "Removing the Background…".
- A failure is shown in the row where it happened. The batch continues to the
  next image. A failed item does not stop the batch.
- **Download ZIP** is enabled when at least one item is ready. It is a link
  with `download`, not a button that starts a new run.
- The run bar never starts on a drop, a settings change, or an open action.

## The plate (editor canvas)

- A canvas with a white stock frame at 1440 and a full-width frame at 390.
  The canvas shows the original while the comparison slider is at 0%, the
  current Cutout at 100%, and a blend in between.
- A checkerboard sits under a Transparent Backdrop. It is a preview aid, not
  part of the file.
- **Zoom and pan.** Wheel or trackpad pinch zooms; a two-finger drag pans.
  Buttons **Zoom in**, **Zoom out**, **Fit**, and **100%** are always visible.
  Space-drag or middle-drag pans. The default is Fit. The canvas does not
  scroll the page when it has focus.
- **Before/after slider.** A vertical red rule with a diamond handle. It is a
  range input with an accessible value text. The **Original** and **Cutout**
  labels sit at the ends. While the slider is active, painting is disabled and
  the toolbar says "The comparison is active. Close it to paint." The slider is
  keyboard operable with the arrow keys. The comparison compares the original
  with the current Cutout, including the Backdrop and Feather.
- **Facts line.** Dimensions, source bytes, and format. Numbers use the
  numerals face in fixed columns.
- **Keyboard path.** The canvas is focusable. Arrow keys move a visible cursor
  by 1 source pixel; Shift moves by 10. Enter applies the Wand, or adds a Brush
  point. Escape ends the Brush stroke. The builder maps the tool and mode keys
  and shows them in a help popover; the required actions are Wand, Brush,
  Restore, Erase, size, undo, and redo. No action needs a pointer.
- **Touch.** One-finger drag paints when the Brush is active. Two fingers pan
  and pinch. The slider handle is draggable. At 390 the toolbar sits above the
  canvas, not over it.
- The canvas never receives a click action that is not also available as a
  button or a keyboard action.

## Magic Brush toolbar

- Two tools: **Wand** and **Brush**. One is active.
- Two modes: **Restore** and **Erase**. One is active. The default is
  **Restore**, so the Ghost is visible on the first visit.
- **Ghost** is a switch. It is enabled only in Restore mode and on by default.
  It shows the original pixels at low opacity under the removed area. It is not
  part of the export.
- **Wand** options: Tolerance 0-100, default 20; Edges 4-connected or
  8-connected, default 8. A click applies the region. The cursor is a
  crosshair.
- **Brush** options: Size 1-200 px, default 40. The brush has a soft edge. A
  circular cursor ring shows the size at the current zoom. A drag paints a
  path; a click paints one dot.
- **Undo** and **Redo** are buttons with a count. The keyboard shortcuts are
  Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z. The operation log is per image.
- The toolbar has a one-line hint that changes with the tool and mode:
  "Click a colour-similar region", "Drag to paint", "The Ghost shows the
  original pixels", "Removed pixels become transparent".
- The toolbar is disabled while the comparison slider is active and while a
  Cutout is running. It is not hidden; the reason is visible.
- The toolbar is one row at 1440 and two rows at 390. It does not cover the
  canvas.

## The editor

- The editor opens for one image. The batch list stays below at 1440; at 390 it
  follows the result.
- The right column at 1440 holds the settings, the Cut out mark, the model line,
  and the result. At 390 the settings follow the canvas and toolbar.
- The model line says "The first Cutout downloads the model, about 44 MB. It
  works offline after that." After a cache hit it says "The model is cached."
  It never claims a transfer size that was not measured.
- The result line says **Cutout ready**, **Matte edited**, or **Settings
  changed. Cut out again to download.** It carries dimensions, size, format,
  and the model name with the MIT licence.
- The Download mark is a link with `download`. It is disabled while the result
  is stale, running, or failed.
- The input file is never changed. The download is a new file.

## Result and download

- The result block sits under the settings at 1440 and under the canvas at 390.
- It shows:
  - the state word;
  - the dimensions, bytes, and format;
  - the model name and licence;
  - the download name;
  - the line "The input file is not changed."
- For a batch, the result block is the run bar and the ZIP action. Each row
  carries its own state and download.
- **Downloaded** is a receipt state. It says "Downloaded {name}" and keeps the
  download available. It is not a toast and it does not disable a second
  download.
- A failed encode keeps the Matte. The result block offers **Try again** and a
  format change. It never discards the Matte.

## Explainer

Below the Tool, five short blocks in a two-column rule at 1440 and one column at
390:

1. **A Cutout is the Subject over a Backdrop.**
2. **The Matte is the opacity map.**
3. **The model has limits.**
4. **The Backdrop is not the Background.**
5. **The file stays here.**

The honesty note is the first block and repeated beside the result. The copy is
in `copy.md`. No competitor names, no comparison table, no statistics.

## State matrix

Every state in the issue is covered here. A failure is shown in the region
where the action happened, not as a toast. A toast is reserved for a copy
action.

| State | Trigger | Region | Copy | Actions | Announced |
| --- | --- | --- | --- | --- | --- |
| **Empty** | No file. | Masthead, drop zone, explainer. The editor is not rendered. | `unmaskEmptyTitle`, `unmaskEmptyBody`, `unmaskDrop`, `unmaskChoose`, `unmaskDropHint`, `unmaskFolderHint` | Choose files, drop images. | The drop zone is a labelled button; the hint is described by it. |
| **Reading** | A file or folder is selected. | The batch row or the editor reserves its space; a square loader and the reading line. | `unmaskReading`, `unmaskReadingHint` | Replace the file; no cancel for a read. | Polite: "Reading the image." |
| **Model loading** | The first Cut out starts and the model is not cached. | The run bar and the result block; a printed progress bar. | `unmaskModelLoadingTitle`, `unmaskModelLoadingBody`, `unmaskModelLoadingPercent` | Cancel. | Polite progress at 25, 50, 75, and completion. |
| **Removing** | The model is running. | The run bar; an indeterminate printed bar. | `unmaskRemoving`, `unmaskRemovingHint` | Cancel. | Polite: "Removing the Background." |
| **Ready** | `remove` and `composite` and `encode` return. | The result block and the row. | `unmaskResultReady`, `unmaskResultLine`, `unmaskResultModel` | Download, edit the Matte, change a setting, open another image. | Polite summary; focus moves to the result heading after a Cutout. |
| **Edited** | A Magic Brush operation is applied. | The canvas and the result block. | `unmaskResultEdited`, `unmaskOperationCount` | Undo, redo, adjust, download, cut out again. | Polite: "Matte edited." The operation count is in the DOM. |
| **Stale** | A shared setting changes after a Cutout. | The result block and every ready row. | `unmaskResultStale`, `unmaskBatchStale` | Cut out again, revert the setting. | Polite; the Download is described by the reason. |
| **Queued** | An image waits for the model or the worker. | The batch row and the run bar. | `unmaskBatchQueued`, `unmaskBatchSummary` | Cancel the batch. | The row position is text. |
| **Cancelled** | The user presses Cancel, or Effect interrupts. | The row returns to `queued`; the result block returns to the settings. | `unmaskCancelledTitle`, `unmaskCancelledBody` | Cut out again, choose another image. | Polite. |
| **Unsupported format** | `unsupported-format`. | The batch row or the editor error note. | `unmaskUnsupportedTitle`, `unmaskUnsupportedBody` | Choose another file. | Assertive. |
| **Unreadable file** | `unreadable-file`. | The batch row or the editor error note. | `unmaskUnreadableTitle`, `unmaskUnreadableBody` | Choose another file. | Assertive. |
| **Too large** | `too-large`, preflight or allocation. | The batch row or the editor error note. | `unmaskTooLargeTitle`, `unmaskTooLargeBody` | Choose a smaller image. | Assertive. |
| **Model unavailable** | `model-unavailable`: offline with no cache, a failed fetch, or an init failure. | The run bar and the result block. | `unmaskModelOfflineTitle` and `unmaskModelOfflineBody` for offline; `unmaskModelUnavailableTitle` and `unmaskModelUnavailableBody` for fetch or init. | Retry when online; the rest of the page works. | Assertive. |
| **Model failed** | `model-failed`: inference, memory, or a lost device after the WASM fallback. | The run bar and the result block. | `unmaskModelFailedTitle`, `unmaskModelFailedBody` | Try again, choose another image. | Assertive. |
| **Encode failed** | `encode-failed`: codec, memory, or JPEG + Transparent. | The result block; the Matte is kept. | `unmaskEncodeFailedTitle`, `unmaskEncodeFailedBody` | Try another format, lower the quality, retry. | Assertive. |
| **Downloaded** | A single download or a ZIP download completes. | The result block and the rows. | `unmaskResultDownloaded`, `unmaskBatchDownloaded` | Download again, cut out another image, back to the batch. | Polite. |

## First viewport and responsive rules

- **1440.** The masthead, the plate, the cutting desk, the Cut out mark, and
  the result line are in the first viewport for a 3:2 image. The canvas is
  capped at 640 px tall. The batch list and the explainer are below the fold.
- **390.** The masthead, the canvas, the before/after slider, and the start of
  the Magic Brush toolbar are in the first viewport. The settings follow. A
  sticky bottom bar says "Cut out · N" while the Cut out mark is above the
  fold; pressing it scrolls to the mark, it does not start a Cutout. The bar
  reserves its height and never covers the last row.
- No horizontal scroll at either width. The batch table stacks. The facts line
  wraps at the separators. The settings cards stack.
- The canvas uses `object-fit: contain`; it never crops the Subject to fill the
  frame. The zoom and pan are user actions, not a default crop.
- The checkered plate is a CSS pattern, not a raster. It does not shift on
  theme change.

## Colour modes

| Viewport | Mode | What changes |
| --- | --- | --- |
| 1440 | Light | Paper ground, ink rules, red navbar, white plate frame, paper cutting desk. |
| 1440 | Dark | Carbon ground, paper text, red navbar, carbon-raised plate frame, carbon cutting desk. Red words use `--primary-ink-dark`; fills use `--primary`. |
| 390 | Light | Same tokens, one column; the sticky bar is paper with a 2px ink top rule. |
| 390 | Dark | Same tokens, one column; the sticky bar is carbon with a 2px paper top rule. |

The two reds rule holds: `--primary` for fills and rules, `--primary-ink` for
red words. Danger is burnt vermilion, never Poster Red. Every state mark has
text; no state is carried by colour alone. Both modes meet AA for body text,
labels, counts, the facts line, and the disabled reason. The checkerboard must
stay visible in both modes; it uses the paper and carbon tokens, not pure white
and black.

## Accessibility

- **Landmarks:** banner, main, the plate, the cutting desk, the batch list, and
  the explainer as sections with headings. The skip link comes first.
- **Keyboard:** the drop zone is a `<button>`; the file picker is a labelled
  input; the batch rows use buttons for Open and Retry; the settings are radio
  groups and sliders; the canvas is focusable and has the keyboard path above;
  the comparison slider is a range input; the Download is a link with
  `download`.
- **Focus:** after an open, the canvas heading; after a Cutout, the result
  heading; after Cancel, the Cut out mark; after an error, the error heading;
  after a download, the Download stays focused. The sticky bar's action moves
  focus to the Cut out mark, not to the top of the page.
- **Live regions:** one polite region for read, model progress, and result; one
  assertive region for errors. Progress is announced at 25, 50, 75, and
  completion, never per byte. The operation count is in the DOM, not announced
  on every pointer move.
- **Canvas:** the canvas has an accessible name and a text summary. The
  before/after slider is the text alternative for the visual comparison. A
  screen reader can read the facts line, the result, and the operation count.
  Painting has the keyboard path; no action requires a pointer.
- **Tables:** the batch list is a real table at 1440 with `<th scope="col">`;
  at 390 it is a list of cards with the same labels. The state is a word, not a
  colour.
- **Images:** the thumbnail has an alt that names the file and its state. The
  canvas is not an `<img>` with a missing alt.
- **Motion:** the chips assemble, the result slams in, the progress bar prints.
  Reduced motion holds the composed state and removes the stagger. No animation
  carries state.
- **Zoom:** 200% at 390 reflows without horizontal scrolling. The canvas
  shrinks; the settings stack.
- **Language:** both Locales are complete; the `lang` attribute follows the
  Locale; dimensions, sizes, and percentages use the Latin digits in both
  Locales.

## Performance and security

- **Lazy engine:** the route does not import `onnxruntime-web` or the model
  until the first Cut out. The engine chunk is separate.
- **Worker:** decode, inference, refine, composite, and encode run in a Worker.
  The main thread paints the progress and the canvas.
- **Cache:** the model is fetched once with progress and stored in the runtime
  cache under a key with the model id and SHA-256. The fixtures and the model
  are not precached. A cache miss while offline is `model-unavailable`.
- **Memory:** one open image at a time. A batch processes one image at a time
  and releases the source, the Matte, and the raster after the encode. The
  preview Matte is at most 2048 px. A 64 MP preflight and a 1 GiB working-set
  estimate guard the device. The copy names the device limit.
- **No network:** no upload, no analytics on file content, no external model
  CDN, no font fetch on the Tool. The model request is same-origin and carries
  no user data.
- **Text only:** every file name, folder path, error fact, and model string is
  rendered as text. No `innerHTML`, no `dangerouslySetInnerHTML`. The download
  name is sanitized by the engine. The ZIP entry names are sanitized and
  de-duplicated; `..` and an absolute path are removed.
- **No file names as keys:** the Worker uses opaque IDs and content hashes, not
  a file name. The file name is display text and a sanitized download name.
- **Cancellation:** the service aborts the fetch and terminates the Worker. A
  cancelled batch item returns to `queued`; the next item starts from a clean
  state.
