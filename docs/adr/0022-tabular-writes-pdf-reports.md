# Tabular writes PDF reports on the device

Tabular's export list ends at CSV, TSV, TAB, XLS, XLSX, JSON, and Clipboard. A
user who needs to print a Sheet, or send it to a person without a spreadsheet
app, has no output. A PDF is the common answer, but it is a report, not a data
format: it has pages, a title, a repeated header, and page numbers. It cannot
keep every value exactly when the font lacks a glyph.

The app writes the PDF in an isolated format job Worker with jsPDF 4.2.1 and
jspdf-autotable 5.0.9. The PDF supports Current View, Whole Sheet, and Whole
Workbook. It uses two static Archivo TTFs, generated from the existing OFL
variable font: 400 for the body and 900 at 125% width for the title. The page is
A4 or Letter, portrait or landscape. The first page of each Sheet section has a
title block; the table header repeats; the footer shows the source name and
`X / Y`. The plan warns above 500 pages and never caps the export. A character
outside the font becomes `?`, and the plan counts it. The PDF is untagged, and
the dialog names CSV and XLSX as the accessible exact alternatives. The output
check covers the PDF envelope, the page count, and the layout model. Exact text
verification is manual until a renderer is added.

## Considered options

- **Browser print dialog.** Rejected: it gives no fixed file name or MIME type,
  no byte check, and no one-click download. The browser controls the margins and
  headers, and a large Sheet must exist in the page.
- **Server generation.** Rejected: it violates the local-data-only rule.
- **pdfmake.** It has the best document model. Rejected: 313 KB for the same
  table versus 139 KB, 390 ms versus 318 ms, 303 KB gzipped versus 258 KB, and a
  larger pdfkit dependency tree. Its WOFF2 path also rendered blank; TTF is
  required.
- **pdf-lib with fontkit.** Rejected: no table engine, 554 KB gzipped, and
  428 ms for raw drawing before layout.
- **LibPDF.** It has the most features, but each `drawText` creates a content
  stream. A 1,000 x 10 table made 10,029 streams and a 1.69 MB file. It is a
  parser and signer first.
- **A tagged PDF in this release.** Deferred: jsPDF has no structure-tree
  support. It needs a custom writer and a PDF/UA check.
- **Column splitting across pages.** Deferred: AutoTable can do it, but one
  report with a readable column order is the v1 shape.

## Consequences

- Two runtime packages join the web app: jsPDF and jspdf-autotable, both MIT.
  The PDF code is a lazy 258 KB gzipped chunk in the format job Worker.
- Two static Archivo TTFs join `public/fonts/pdf`. They come from the existing
  OFL variable font with the documented fonttools recipe. WOFF2 is not usable.
- CSV, XLSX, and JSON remain the exact and accessible formats. The PDF is a
  report.
- The export schemas gain `pdf` in `OutputFormat`, PDF page options,
  `estimatedPages`, `unsupportedCharacters`, and `writtenPages`.
- The PDF cannot be re-read without a parser. The plan's text re-read gate is
  manual for PDF until a renderer is added. This is recorded as an open gate,
  not a pass.
- No request carries file content, names, or values. The font and Worker assets
  are static same-origin files.
