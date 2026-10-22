# The logo is a supplied file, and the icon set is cut from it

`apps/web/public/logo.png` is the Ritools logo: a red disc with a crossed wrench and screwdriver in paper. It is a supplied raster, not something the build draws. `bun brand:gen` reads it and cuts the icon set from it (`favicon.ico`, `pwa-*.png`, `maskable-icon-*.png`, `apple-touch-icon-180x180.png`), and it never writes the logo, the favicon, or a vector of the mark.

This narrows [ADR-0013](./0013-brand-assets-are-generated-from-code.md) further. The wordmark, the glyph atlas, and the icon set are still generated from code; the logo is the one brand asset that is not.

Before this, the script had a `buildMark()` that drew a compact mark — a red chip with an Anton R knocked out of it — and wrote it to `public/brand/mark.svg`, then rasterised it to `logo.png` and `favicon.svg`. `HEAD` was already inconsistent: the committed `logo.png` was the supplied disc, with no provenance chunk, while the script would have replaced it with the chip on the next run. The chip is not the logo the product wants, so the generator loses that job instead of the asset losing its history.

## Considered Options

- Keep drawing the compact mark and use it as the logo — rejected; the product wants the disc, and a generated mark cannot be the supplied logo at the same time.
- Leave the script as it was and rely on nobody running `brand:gen` — rejected; a silent overwrite on the next run is not a decision anyone can see.
- Redraw the disc as vector in the script — rejected; the logo is supplied art, and tracing it would change it.

## Consequences

`brand:gen` fails early with a clear message when `public/logo.png` is missing, because the icon set has no other source. The compact mark and its vector are gone: `public/brand/mark.svg` is deleted, `buildMark()` is removed, and the favicon is the supplied SVG that embeds the logo. `PRODUCT.md` says the logo is supplied, so a later reader does not go looking for the generator.

The icon set is still regenerated: run `brand:gen` after the logo changes, and commit the new icons. The card is unaffected — `GET /api/og` never reads the logo (ADR-0013).
