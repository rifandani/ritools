# Folio compresses JPEG images inside the PDF with PDFium

Folio needed a Compress action with Light, Balanced, and Strong presets, a
Batch of open PDFs, and a before-and-after size. The action had to stay local,
preserve text and vector content, and add no new engine. PDFium was already
loaded by Folio and exposes the image object, its matrix, a rendered bitmap,
and `EPDFImageObj_SetJpeg`, which writes a JPEG stream into an existing image
object without re-encoding. The action renders each JPEG image at the target
size with a temporary matrix, encodes it with `@jsquash/jpeg`, and replaces
the stream only when the new one is smaller. Flow then calls
`FPDFPage_GenerateContent` for every page that changed: without it, PDFium
saves the old image stream and the copy keeps its original size.

## Considered options

- **Ghostscript in WebAssembly.** The best size reduction and the least custom
  code, through `pdfwrite` and its image downsampling. Rejected: AGPL-3.0, a
  16 MB download, and a second PDF engine next to PDFium.
- **qpdf or pdfcpu for structural compression.** Apache-2.0 or MIT, small
  binaries, and no image quality loss. Rejected: the gain is usually small,
  and it does not meet the promise of a visibly smaller scan.
- **Rasterise each page with PDFium and write a new PDF from the images.**
  Large, predictable savings and no new dependency. Rejected: it destroys the
  text layer, links, forms, and vectors.
- **Ghostscript or MuPDF as a commercial-licence dependency.** Rejected for
  this release: it adds a paid obligation and a large binary for one action.

## Consequences

- Only JPEG (`DCTDecode`) images are re-encoded. A PNG or Flate image stays as
  it is, because a JPEG round trip can blur text and can drop an image mask.
- A page with a changed image is rebuilt from PDFium's page objects. The
  rebuild is the fidelity boundary: unsupported page content can be lost, and
  the tags of that page can become stale. Folio states this in the panel and in
  its honesty copy.
- The output JPEG carries no ICC profile. A document that depends on an
  embedded CMYK or ICC profile can shift in print; those color spaces are
  skipped where PDFium reports them. Image-level EXIF and C2PA metadata do not
  survive a re-encode, while document-level metadata stays.
- A shared image can be re-encoded once per page. That keeps each placement at
  its own resolution, at the cost of repeated work on a repeated image.
- There is no Target. The presets set a resolution and a quality, and an image
  that does not become smaller keeps its original stream. A run that writes no
  smaller copy reports Already small.
- Signed, encrypted, and download-restricted PDFs are skipped. A rewrite
  breaks a digital signature and cannot preserve a file that forbids a copy.
- The saved copy is reopened and its page count is checked before it is
  offered. The check does not compare text or pixels. The open file is never
  changed; every result is a new download.
- The action reuses the PDFium WASM that Folio already downloads, so it adds
  no precache entry and no new runtime package.
