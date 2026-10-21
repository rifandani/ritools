# Open Graph cards are drawn on request, from the glyph atlas

The Open Graph card is now an endpoint, `GET /api/og`, not a file the build writes. `apps/web/src/routes/api/og.ts` answers with the card of the site, or of one Tool from the Tool Catalog, and the composer in `apps/web/src/features/og` draws it on request. This supersedes [ADR-0014](./0014-brand-assets-are-generated-from-code.md) for the Open Graph cards only: the wordmark vectors, the glyph atlas, and the icon set stay build-time artifacts with `bun brand:gen`, and the logo is a supplied file ([ADR-0016](./0016-the-logo-is-a-supplied-file.md)).

ADR-0014 rejected on-request rendering because it "puts an SVG rasterizer inside the Nitro runtime on a host that is not fixed". Both halves of that sentence are now decided otherwise. The app is aimed at Cloudflare (`apps/web/README.md`), and the card must run on a Worker as well as on Node, so the renderer is `@resvg/resvg-wasm`, a WebAssembly module fetched from `public/resvg.wasm` once per process — not a native module, and not inlined into the server bundle. The host is fixed enough to accept a Wasm rasterizer, and the card is the only thing that needed one.

The letterforms come from a glyph atlas: `bun brand:gen` measures every character of the print charset in every brand face, in em, and writes `apps/web/src/features/og/glyph-atlas.generated.ts`. The card cannot read a WOFF2 file or hold a font parser, so it scales outlines it already has. The atlas is a committed artifact and a unit test fails when the font files and its recorded digests disagree.

Where the chips of the wordmark sit is **one** implementation, `apps/web/src/core/libs/brand/ransom-layout.ts`, read by both the build script (which bakes the outline into path data with the font reader) and the card (which scales the atlas outline with an SVG transform). The cut itself still comes from `ransom-cut.ts`, which the `Ransom` component renders with, so the card, the navbar, and the wordmark on disk cannot drift apart.

## Considered Options

- Keep the cards as committed files — rejected; a new Tool then needs a build and a commit before its card exists, and every Tool shares the copy of the day the script ran.
- `satori` and a JSX card, the way a Next.js app writes `next/og` — rejected; `satori` has no path drawing, so the ransom wordmark would be rebuilt from divs and would stop matching the navbar. The reference was worth copying for its shape (a params module, one card function per kind, fonts read once), not for its renderer.
- `@resvg/resvg-js` or `sharp` — rejected; both are native modules and do not run on a Worker.
- Inline the Wasm with `?url&inline` — rejected; 2.4 MB of base64 in every server bundle, for a module that is fetched once per process.
- Read the fonts at request time with `fontkit` — rejected; a font parser and a WOFF2 decompressor in the server bundle, and per-cold-start parsing of files the atlas already measured.

## Consequences

A card changes when the catalog or the copy changes, with no build and no commit. The response carries `cache-control` and an `ETag` over the drawing itself, so a feed that holds a current card gets a `304` and the raster is never redrawn. The endpoint answers `500` with `no-store` when it cannot draw, so a broken card is never cached.

The card is a server-only module: the route imports `og.card.server.ts`, not the composer (`og.drawing.ts`), so the glyph atlas (about 290 kB) and the painter stay out of the browser bundle. `bun build:worker` and a CI step keep a Node-only import from landing in this path later.

Two things can now be stale in a way they could not before: the atlas against the font files (guarded by a test), and `public/resvg.wasm` against the installed `@resvg/resvg-wasm` (copied by `scripts/copy-resvg-wasm.ts` before `dev` and before `build`). A card that renders empty letters means the atlas is older than the fonts; a card that fails to load means the copy did not run.
