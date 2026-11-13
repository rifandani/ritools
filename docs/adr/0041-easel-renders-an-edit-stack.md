# Easel renders an Edit Stack

Easel never changes the pixels of an open image. Each File Tab keeps the
original pixels and an Edit Stack. Easel draws the image again from the two in
one fixed order:

1. Geometry: crop, Rotate, Straighten, flip.
2. Finetune, then Filter.
3. Bucket Fills. Easel finds each area on the original pixels and paints it
   after Finetune and Filter, so the fill keeps its exact color.
4. Annotation Layers, in the user's order.
5. Redactions (Cover and Mosaic).
6. The Watermark Layer.
7. Resize, at export.

Three parts do the work. A custom WebGL2 pass draws steps 1–3 on the GPU.
Fabric.js (MIT) holds steps 4–6 as objects with handles, inline text editing,
and z-order. `@jsquash` (WASM) encodes the export. Export bakes every step into
pixels, so a Redaction leaves no hidden pixels in the file.

## Considered options

- **Destructive edits.** Rejected. A crop permanently loses pixels, a second
  rotate makes the image softer, and undo must store full image copies.
- **Fabric.js filters for Finetune and Filter.** Rejected. They apply to one
  object each. Easel must change the photo and not its Annotation Layers, and
  it needs one GPU pipeline for all sliders.
- **Konva.** Rejected. Its filters run on the CPU and are slow on large photos.
  Its text editing needs a separate textarea overlay.
- **A WASM pixel library, such as photon-rs.** Rejected. Each slider move copies
  the full image into WASM and back. GPU shaders do the same work in less than
  one frame. Easel uses WASM only for encoding, which ADR-0010 already caches.
