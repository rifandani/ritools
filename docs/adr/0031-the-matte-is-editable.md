# The Matte is editable

The model output is a starting point, not a final result. Unmask treats the
Matte as an editable domain object. The Magic Brush is part of the product. It
is not a fallback for a failed model. A Cutout that needs a repair must be
fixable in the same tab, without a second model and without a round trip to a
server.

The operation log is the source of truth. The live editor paints on a
downscaled preview Matte with a long edge of at most 2048 px. At export, the
engine replays the same operation log on the full-resolution Matte. The editor
does not send a full-resolution Matte to the Worker on every brush stroke.

## The model

The model runs at 1024x1024. Its output is upsampled to the source size for the
full-resolution Matte and downsampled to the preview size for the editor. The
full-resolution Matte is one 8-bit alpha sample per source pixel. It has the
source width and the source height. It is the only Matte the export reads.

If the input already carries meaningful alpha, Unmask uses that alpha as the
Matte and does not run the model. The input alpha is the user's own Cutout. A
second model pass would remove pixels the user already kept. The result note
says the input alpha was kept. The bake-off still scores the models on the
transparent fixture; the production path does not need the model for it.

## The operations

There are two tools and two modes.

- **Wand.** A click selects a contiguous colour-similar region in the original
  image. The tolerance is 0-100. The connection is 4 or 8. The metric is the
  Euclidean distance in sRGB, scaled so 0 is an exact match and 100 is the
  full RGB diagonal. The seed, tolerance, connection, and mode are in the log.
- **Brush.** A stroke paints a soft-edged disc along a path. The size is
  1-200 source pixels. A click is a one-point stroke. The stamp has a solid
  core and a smooth falloff to the rim. The path, size, and mode are in the
  log.
- **Restore.** The operation sets the Matte toward 1, so the original pixels
  come back.
- **Erase.** The operation sets the Matte toward 0, so the pixels go away.

All coordinates and sizes are in source pixels. The engine scales them to the
Matte it receives. That keeps one log valid for the 2048 preview and the full
resolution. The Wand reads the original image at the same scale as the Matte.
The preview is an approximation; the full-resolution replay is the Cutout.

`refine` is pure and deterministic. The same source, Matte, and operation list
give the same Matte. The engine may cache intermediate states for speed, but a
cached result must equal a full replay. Undo removes the last operation. Redo
puts it back. The UI keeps the log per image, not the pixels per step.

## Considered options

- **A threshold on the model output.** Rejected. A threshold cannot restore a
  strand of hair or remove a glass reflection. It also makes the edge hard and
  the Feather less useful.
- **A second segmentation model for the repair.** Rejected. It adds a second
  model, a second licence, and a second failure mode. It is slower than a
  local brush, and it cannot follow a user's intent.
- **Inpainting or generative fill.** Rejected for v1. It is a different
  product, it needs a model that can invent pixels, and it breaks the promise
  that the Cutout is the original Subject over a Backdrop.
- **Per-pixel manual editing only.** Rejected. A brush alone cannot select a
  large colour-similar region in one action. The Wand is the fast path; the
  Brush is the precise path.
- **A full-resolution Matte in the main thread on every stroke.** Rejected.
  A 26 MP Matte is 26 MB. Sending it to the Worker and back on every pointer
  move is slow and memory-heavy. The operation log is small and deterministic.

## Consequences

- The engine seam has `refine(request)`. It has no ORT type,
  no session, and no model path. The Matte is `{ width, height, alpha }`.
- The UI can undo and redo without storing a Matte per step. It stores the
  operation list and re-runs `refine`.
- The preview Matte is at most 2048 px on the long edge. A brush stroke on the
  preview is cheap. The export replay is one pass at full resolution.
- Feather is a composite step, not a Matte operation. It softens the Matte edge
  at export and in the preview. It is not in the undo history.
- The Ghost is a view of the original pixels under the removed area while
  Restore is active. It is not part of the Matte and never reaches the export.
- A batch keeps one operation log per image. It does not keep one full Matte
  per image. The batch worker processes one image at a time and releases the
  Matte after the encode.
- The model decision (ADR-0030) does not need a perfect model. It needs a model
  that gives a useful starting point on the common cases. The Magic Brush covers
  the rest.
- The copy must not claim a perfect Cutout. It names the limits: hair, fur,
  glass, motion blur, low contrast, and thin straps.
