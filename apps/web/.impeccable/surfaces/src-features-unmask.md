---
version: 1
slug: "src-features-unmask"
primary_target: "src/features/unmask"
related_targets: ["src/routes/unmask.tsx"]
---

# Unmask (/unmask)

## Scope

- Surface: the Tool at `/unmask`, feature `src/features/unmask`. The engine
  seam, the model, the fixtures, the copy contract, and the format support
  matrix are fixed by the shape issue.
- Mode: Operate. A person drops one image, checks the Cutout, repairs the Matte
  with the Magic Brush, chooses a Backdrop and an output, and downloads the
  Cutout. Two or more images open the batch list.
- Extension of the established Ransom Calling Card world, not a new world.
  Palette, type, angles, motion grammar, and tokens stay.

## Audience and job

A person has one image and needs the Background gone: a seller with a product
photo, a designer with a portrait for a slide, a pet owner with a photo for a
poster, or anyone who needs a clean Cutout without a subscription. They will not
install a desktop editor or make an account for one image. They need a useful
Cutout fast, a way to repair the places the model misses, and a file that keeps
its transparency or takes a clean Backdrop.

## Outcome and proof

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

## Constraints

- WCAG 2.2 AA in both modes, 390 px to 1440 px. Keyboard alone completes the
  flow, including the Wand and the Brush.
- Every count, byte size, dimension, and percentage in the one numerals face,
  in fixed columns. No state by colour alone.
- Ransom only on "Unmask". Outcome words use the Poster Title voice; the design
  rule reserves Ransom for names and the Squeeze outcome words.
- Controls are the standard React Aria components in
  `src/core/components/ui`.
- Copy uses the glossary terms exactly. Both Locales carry every string.
  "Background" is removed; "Backdrop" is the fill. "Cutout" is the result.
- One image opens the editor. Two or more open the batch list. No sample image.
- The model is fetched once with progress, then cached. No third-party model
  CDN. No image bytes leave the device.
- JPEG has no transparency. The format option is disabled with the reason; the
  page never flattens silently.

## Direction contract

THESIS: Unmask is a cutting room. The image is the plate on a light table, the
Matte is the stencil, the Magic Brush is the knife, and the Backdrop is the
paper sweep. It refuses the background-remover default: a centered upload card,
a magic-wand icon, and a purple gradient.

OWN-WORLD: Ransom Calling Card, unchanged. Poster Red, ink, paper, white; zero
radius; 2px rules and 3px heavy rules; no shadows, glass, or gradients; 4deg
tilt and 16deg slash only; Martian Mono at 75% width for every number; printed
marks that outline, fill when pressed, strike when disabled, and bracket on
focus. The one ink field is the canvas; the one red action mark is **Cut out**.

STORY: The visitor drops one image. The plate fills with the original, then the
Cutout appears on a checkerboard. The desk names the model and its licence. The
visitor drags the red comparison rule, sees where the Matte is thin, and picks
up the Magic Brush: a Wand for a colour region, a Brush for a stroke, Restore
to bring pixels back, Erase to take them away. The Ghost shows the original
under the removed area. They choose a Backdrop and Feather, a format and a
quality, and press **Cut out**. The result stamps in with the dimensions, the
size, the format, and the model. They download the Cutout; the input never moves.

FIRST VIEWPORT: Red navbar with the breadcrumb trail ending in the Ransom
"Unmask". Below, the promise line, then two zones on paper: the **Plate** (8/12)
with the canvas in a 2px frame, the before/after rule, the facts line, and the
Magic Brush tray; the **Cutting desk** (3/12) with the Backdrop cards, the
Feather slider, the format line, the quality slider, the red **Cut out** mark,
the model line, and the result. At 390 the plate and the start of the toolbar
are in the first viewport; the desk follows, and a sticky bottom bar names
"Cut out · N" without starting it.

FORM: The Cutting Room, code-led. Selected from three structures in the shape
plan; no seed roll, because the world and the two verbs constrain the
composition. The alternate was a full-bleed **Light Box** with a floating
control panel; it hid the controls and pushed the result below the fold. The
second alternate was a **Contact Sheet** with a batch-first grid and a side
editor; it made one image feel like a queue and repeated Squeeze's batch ledger
without Squeeze's file-size job.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance line.

## Surface matrix

| Viewport | Mode | Structure | What changes |
| --- | --- | --- | --- |
| 1440 | Light | Plate 8/12, desk 3/12, batch list and explainer below. | Paper ground, ink rules, red navbar, white plate frame, paper desk. The checkerboard is paper and warm grey. The red comparison rule is `--primary`. |
| 1440 | Dark | Same two zones. | Carbon ground, paper text, red navbar, carbon-raised plate frame, carbon desk. The checkerboard is carbon and raised carbon. Red words use `--primary-ink-dark`; fills use `--primary`. |
| 390 | Light | One column: plate, toolbar, desk, result, batch list, explainer. | The canvas is full width. The toolbar wraps to two rows. The desk stacks. The sticky bar is paper with a 2px ink top rule. |
| 390 | Dark | Same one column. | Same tokens; the sticky bar is carbon with a 2px paper top rule. No state depends on hue. |

Both modes must meet AA for body text, labels, counts, the facts line, the
disabled reason, and the checkerboard edge. The two reds rule holds:
`--primary` fills and rules, `--primary-ink` writes. Danger is burnt vermilion,
never Poster Red.

## States

The plan's state matrix is the source. The brief covers these states at both
widths and both modes:

- **Empty:** a blank plate outline, the drop zone, the file picker, the folder
  hint. The drop zone is a button. No sample action.
- **Reading:** the plate and facts reserve their space; a square loader and the
  reading line; no layout shift.
- **Model loading:** a printed progress bar in the desk with the real percent;
  the model line says it downloads once. Cancel is available.
- **Removing:** an indeterminate printed bar and "Removing the Background…".
  The plate shows the last preview or a blank stencil.
- **Ready:** the Cutout on the plate, the result stamp, Download enabled.
- **Edited:** a red "Edited" stamp and the operation count; Undo and Redo are
  live; Download is enabled.
- **Stale:** a diagonal "Stale" strip across the Download, not a toast; "Settings
  changed. Cut out again to download."
- **Queued:** a "Queued" stamp on the batch row and the row position.
- **Cancelled:** the row returns to "Queued"; a polite note says the image is
  unchanged.
- **Unsupported format:** a format plate with the six accepted formats; the
  row is not removed.
- **Unreadable file:** a torn-plate mark and "Choose another file".
- **Too large:** a weight plate with the device line; no allocation.
- **Model unavailable:** an offline stamp; Retry is disabled while offline; the
  rest of the page works.
- **Model failed:** a broken-stamp mark; Try again.
- **Encode failed:** a codec stamp; the Matte is kept; choose another format.
- **Downloaded:** a "Downloaded" stamp; the Download stays available.

A failure is shown where the action happened, not as a toast. A toast is
reserved for a copy action.

## Interaction

1. Drop or choose one image, or drop a folder. One image opens the cutting room;
   two or more open the batch list.
2. The plate shows the original, then the Cutout. Focus moves to the plate
   heading. The model line names ISNet int8 and MIT.
3. Drag the red comparison rule to compare the original with the Cutout. The
   slider disables painting while it is active; the toolbar says why.
4. Pick **Wand** or **Brush**. Pick **Restore** or **Erase**. Restore shows the
   Ghost; Erase removes pixels.
5. Wand: set Tolerance and Edges, then click a colour-similar region. Brush: set
   Size, then drag. Every operation is undoable.
6. Choose a Backdrop: Transparent, Solid, or Blur. Solid opens the ColorPicker;
   Blur sets a radius. Set Feather. Choose a format and a quality. JPEG is
   disabled with the reason when the Backdrop is Transparent.
7. Press **Cut out**. The mark becomes **Cancel** while the model loads and the
   Matte runs. The result stamps in; focus moves to the result heading.
8. Download the Cutout. The input file stays untouched. For a batch, press
   **Download ZIP**; the list marks every entry as downloaded.

Cancellation is a state, not a silent reset. A format limit is a named state,
not a disabled mark without a reason. The Cut out mark never starts on a drop,
a settings change, or an open action.

## Boundaries

- Input: JPEG, PNG, WebP, AVIF, GIF, BMP. GIF and BMP contribute the first
  frame. HEIC, TIFF, and RAW are not read.
- Output: PNG, WebP, AVIF, JPEG. One Cutout per image. No Multi, no GIF/BMP
  output, no animation.
- One model, self-hosted, no picker. The model is fetched once and cached.
- The Matte is editable. The operation log is the source of truth. The full
  Matte is replayed at export, not sent on every stroke.
- Backdrops: Transparent, Solid, Blur. No custom image, shadow, reflection,
  gradient, or AI-generated fill.
- Batch: shared Backdrop, format, Feather, and quality. Per-image Matte. One
  ZIP.
- The input is never overwritten. The download is a new file.
- No image byte, Matte, or operation log leaves the device.

## Unresolved

- Whether the cutting desk stays sticky at 1440 or scrolls with the plate. The
  sticky column must not clip the result at a 768 px viewport height; the
  builder measures and keeps the Cut out mark reachable.
- The canvas key map for the Wand, Brush, Restore, Erase, size, undo, and redo.
  The builder picks the keys and shows them in a help popover. No action may
  need a pointer.
- Whether the batch list at 390 is a list of cards or a table in a labelled
  scroll region. Either way, no horizontal page scroll.
- The measured AVIF encode time at 26 MP. If it is too slow, the UI says
  "smallest, slower" and keeps it; it does not hide the format.
- The model path and cache key. The engine owns them; the UI sees only the
  model name and licence.
