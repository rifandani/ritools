# @workspace/web

## Scripts

- `bun brand:gen` writes the icon set and `src/features/og/glyph-atlas.generated.ts` — the letterforms the Open Graph card prints from. It cuts the icons from `public/logo.png` and never overwrites that logo.
- `bun brand:shots` captures the manifest screenshots from the running app, with a real Batch in it.

## Maintenance

- /improve-codebase-architecture
- /improve-codebase-architecture to use /effect ecosystem in both FE and BE
- refactor whole codebase (except master-design) to follow best practices for react and composition patterns from /vercel-composition-patterns and /vercel-react-best-practices

## Todo

### Core

- /grill-with-docs work on new tool called "XXX". Split it the Stage 3 pattern: shape and engine, then UI. Each of it is a separate gh issues.

### Exif (Exchangeable Image File Format)

EXIF metadata viewer and remover, reads hidden metadata embedded inside image, video, and document files.

Features:

- View using sample image
- View full metadata info like Camera info, Image properties, Copyright info, Date time, Thumbnails, GPS data, etc. If there's any gps data show it as a map
- Removes AI-provenance metadata (the C2PA / Content Credentials manifest, JUMBF blocks, generation parameters and AI-tool signatures) while preserving your camera EXIF, GPS, copyright, and other important metadata (if any)
- Selectively remove metadatas including EXIF, GPS, timestamps, camera settings, and copyright information. Results in a completely clean file.
- Use https://github.com/mattiasw/ExifReader as library, and every file types that library supports we support it also

#### Resources

- https://tools.napdesigns.com/exif/
- https://exif.tools/
- https://exif.tools/strip
- https://www.exifreader.com/ai-metadata-remover/
- https://jimpl.com/miami.html
- https://onlineexifviewer.com/
- https://anyexif.com/

#### Libraries

- https://www.npmjs.com/package/exifreader
- https://www.npmjs.com/package/exifr

### AI Image Detector

TODO

### Infra

- add alchemy + cloudflare binding

Answers all ur questions automatically with ur best recommendations, except critical questions.
