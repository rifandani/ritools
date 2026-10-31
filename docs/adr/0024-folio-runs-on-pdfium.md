# Folio runs on PDFium through EmbedPDF v3

Issue #26 approved PDF.js 5.4.624 and pdf-lib 1.17.1 as Folio's engine, and
forbade an "EmbedPDF v3 preview". The working tree migrated before this ADR was
written: `@embedpdf/viewer-react`, `@embedpdf/engine-runtime`, and
`@embedpdf/engine-runtime-wasm32` replace both libraries. The migration stands.
Neither approved library can do what Folio now claims. pdf-lib appends objects
but cannot rewrite existing content text; PDF.js has no write path at all.
PDFium exposes page-object editing (`FPDFText_SetText`,
`FPDFPage_GenerateContent`, `FPDFText_LoadFont`), redaction, encryption, and
incremental save, and it is the engine behind the viewer's annotations, forms,
signatures, measure, and print.

## Considered options

- **Revert to PDF.js and pdf-lib.** Rejected: it deletes redaction, security,
  forms, signatures, and measurement, and it blocks Wording Edits until someone
  writes a content-stream parser.
- **MuPDF wasm.** It models structured text better and redacts by area. Rejected:
  AGPL or a commercial licence, a larger binary, and a third engine migration in
  the same release.
- **Hand-written content-stream editing on pdf-lib.** Rejected: font encoding,
  subset glyphs, CTM, and string operators are a parser project of their own.

## Consequences

- PDFium is the fidelity boundary. What it cannot parse, Folio cannot preserve.
- The TypeScript engine API is incomplete on purpose: where it has no service,
  Folio calls the wasm exports directly in a dedicated Worker. The protect
  Worker already does this.
- The engine is a `3.0.0-next.18` preview. Pin it, and treat an upgrade as a
  fidelity change that needs the full e2e suite.
- Every rewrite invalidates existing digital signatures, so signed files stay
  read only.
- The engine is 7.7 MB of wasm and is never precached.
