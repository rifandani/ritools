# Folio writes an invisible OCR layer with pdf-lib

OCR needs two things: pixels and a writer. The viewer renders each page through
PDFium, so the pixels already exist. The writer does not: the installed
`@embedpdf/engine-runtime` exports 38 functions, and none of them creates a page
object or a text object. ADR-0024 also rules out reaching for the raw PDFium text
exports, because `FPDFText_SetText` rewrites a whole object and regenerates the
page content (ADR-0025). An OCR layer is an addition, not an edit, so it does not
need that machinery.

`pdf-lib@1.17.1` appends operators to an existing page without touching its
original content stream. `TextRenderingMode.Invisible` (PDF operator `3 Tr`)
draws the text with no paint, while PDFium still reads it for search, selection,
and copy. The font is the Archivo face that already ships for the Tabular PDF
Report, embedded as a subset with `@pdf-lib/fontkit`.

## Considered options

- **Rebuild the PDF from page images.** jsPDF can wrap each raster in a fresh
  page and add invisible text, but every page becomes an image: vectors, text,
  links, annotations, and form fields are gone, and the file grows by an order of
  magnitude. Rejected.
- **Wait for an OCR plugin from EmbedPDF.** No such package exists for
  `3.0.0-next.18`, and the preview line has no text-writing service. Rejected for
  this release.
- **A server OCR service.** It breaks ADR-0007. Rejected.
- **A second PDFium build with the text exports.** A second 7 MB engine, its
  own worker, and the unsafe rewrite path from ADR-0025 for an operation that
  only appends. Rejected.

## Consequences

- OCR runs in its own Worker over the document's downloaded bytes. The bytes are
  parsed by pdf-lib, which refuses an encrypted file; a file with a signature
  field is refused before a page is rendered. Both rules follow ADR-0024.
- The invisible text uses a Latin font only. A word outside the font's Glyph
  Coverage is skipped and counted, never replaced with a wrong glyph. pdf-lib
  registers the font under a generated resource key, so each page that gets text
  must use that key in `Tf`. Using `font.name` instead leaves the page without a
  font entry, and a viewer then copies the raw glyph codes.
- The copy carries `/FolioOCR` in its Info dictionary and `Folio OCR` in its
  Producer. The tab shows an OCR mark, and the download name ends in `-ocr.pdf`.
- The copy replaces the open document, so the viewer's history starts again.
  The original file on disk does not change.
- The page count is checked after the copy opens. A mismatch closes it and keeps
  the original open.
- The render is 300 DPI, capped at 40 megapixels per page, one page at a time.
  A cancel offers the finished pages or a discard.
- The engine is `tesseract.js@7.0.0` with `eng` and `ind` traineddata, served
  from the app's own origin and cached at runtime. A new language is a new
  traineddata file, not a new engine.
