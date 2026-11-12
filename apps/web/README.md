# @workspace/web

## Maintenance

- /improve-codebase-architecture
- /improve-codebase-architecture to use /effect ecosystem in both FE and BE

## Todo

### Core

- /grill-with-docs work on new tool called "XXX" (recommend me better name, similar to what we already have).
- /grill-with-docs Optimize performance, make sure all libraries that's used is lazy loaded, if there's any error when loading the library, make sure we display toast error like "X library failed to load — check network or ad-blocker"

Answers all ur questions automatically with ur best recommendations, except critical questions.

/implement X (use deepseek v4.1 flash MAX only)

### Image Editor

I want a local image editor

Features:

- focused on single image edit (no batch, but still can open multiple image files using tab, the same pattern as in other editors)
- Crop: custom, landscape (16:9), portrait (9:16), ellipse, classic tv (4:3), cinemascope (21:9), social networks (linkedin, X, instagram, facebook formats)
- rotate: with adjustable angle
- flip X and Y
- finetune: brightness, contrast, hsv, blur, warmth, vignette, saturation
- filters: like fade, mono, noir, etc
- annotate: add text with custiomizable font, text size, bold, italic, underline, strikethrough, add watermark, layer ordering, add shapes like rectangle, square, etc
- resize the resolution
- import and local sample image
- zoom, reset, undo, redo
- mask and mosaic: redact sensitive regions with overlays and baked pixelation
- fill with color

When building UI, make sure to follow existing patterns in other pages, unmask is the most similar one

Libraries (you can recommend me better libraries that's more modern, smaller, faster, performant, etc, especially if it's WASM which i'm not familiar with):

Resources:

- https://konvajs.org/docs/sandbox.html
- https://pqina.nl/pintura/
- https://viliusle.github.io/miniPaint/
- https://pixlr.com/express/
