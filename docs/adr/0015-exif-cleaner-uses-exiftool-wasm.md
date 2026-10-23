# The cleaner uses ExifTool in WebAssembly

ExifReader reads metadata but cannot write it, so Expose needs a second engine for removal. Hand-written byte surgery would cover JPEG, PNG, WebP, and GIF in the first release and leave HEIC/HEIF, AVIF, TIFF, and JPEG XL read-only, while ExifTool covers every image format ExifReader reads and can remove C2PA/JUMBF, tag groups, and generation parameters. Expose therefore keeps ExifReader as the viewer and runs ExifTool in WebAssembly behind a lazy-loaded engine for cleaning.

The engine uses `@colorhythm/exiftool-wasm`, a fork of `@uswriting/exiftool`. The fork bundles one ~26.6 MB artifact and adds Worker-scope support and binary extraction. The canonical package depends on `@6over3/zeroperl-ts` (~51.3 MB unpacked) and does not document Worker-scope or binary support. The canonical package, from the `6over3/exiftool` repository, stays the upstream reference and the fallback if the spike finds a blocker. These are unpacked sizes; the engine spike measures the real browser transfer and load time.

## Considered options

- **piexif-ts.** JPEG only, EXIF only. It cannot remove XMP, IPTC, ICC, C2PA/JUMBF, or AI generation parameters, and it drops EXIF tags outside its dictionary. Rejected.
- **Hand-written byte surgery.** Covers JPEG, PNG, WebP, and GIF, but leaves HEIC/HEIF, AVIF, TIFF, and JPEG XL read-only. Rejected for the first release.
- **ExifTool as the single engine.** It can read and clean, but the viewer would wait for the engine on the first file open, and each read would run through Perl. Rejected; the viewer stays on ExifReader.

## Consequences

- The first clean downloads the engine and shows progress. Later cleans work offline.
- ExifTool and the WebAssembly wrapper need their licence notices in the app.
- Verification reads the Cleaned File with ExifReader, so the viewer remains the judge of the result.
- If a format cannot be cleaned without changing image data, the engine returns the named "clean not supported" error. It does not re-encode.
