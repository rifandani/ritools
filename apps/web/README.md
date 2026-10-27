# @workspace/web

## Maintenance

- /improve-codebase-architecture
- /improve-codebase-architecture to use /effect ecosystem in both FE and BE
- refactor whole codebase (except master-design) to follow best practices for react and composition patterns from /vercel-composition-patterns and /vercel-react-best-practices
- remove oxlint-disable, fallow-disable across codebase and actually fix it

## Todo

### Core

- /grill-with-docs work on new tool called "XXX" (recommend me better name, similar to what we already have). Split it into 3 Stage pattern: shape, engine, then UI. Orchestrate it with gh issues.
- /grill-with-docs Optimize performance, make sure all libraries that's used is lazy loaded, if there's any error when loading the library, make sure we display toast error like "X library failed to load — check network or ad-blocker"

you are a orchestrator of subagents implement issue A, B, C parallel with subagents (use deepseek v4.1 flash MAX only) coordinate it so that theres no conflicts

Answers all ur questions automatically with ur best recommendations, except critical questions. Optimize your work to be faster, maybe use subagents or dynamic workflows or parallelize tasks.

actually remove our prd/roadmap/docs that says about it (we mark it as completed by removing it)

### PDF

Explore https://tools.napdesigns.com/pdf/ for full feature compatible that i want.

Then add extra features:

Flatten: Make a PDF safer and easier to open by flattening forms and removing links, JavaScript, attachments, multimedia, and other interactive features. The default mode keeps searchable text and vector content.

Lock: Encrypt your PDF with AES-256 and a password, entirely on your device. Your file and passwords stay in this browser. Your original PDF remains unchanged. Already password-protected? We will ask for its current password if needed, then replace the encryption. Changing PDF encryption invalidates existing digital signatures.

Unlock: Remove a PDF password locally. Try blank and common default passwords, or enter the document password. Check a fixed list of 54 accidental/default values: empty passwords, spaces and whitespace, literal null/undefined values, and common basic passwords. There is no universal default PDF password or exhaustive list. PDFs with permissions-only restrictions often open without a password. If these attempts fail, we ask you for the password; there is no extended password search. An unlocked copy retains the document contents. To add a new password, open it in Lock PDF.

Repair: Fix a corrupted or damaged PDF and recover as much readable content as possible. The repair runs in your browser using PDF.js recovery, byte cleanup, xref rebuilds, pdf-lib rewrites, optional QPDF WASM, text extraction, and rasterized PDF export.

Extract: Extract images, hyperlinks, URL text, fonts, text, page previews, embedded object streams, and other assets from PDF files in your browser. PDF.js handles page and text recovery while a direct stream scanner finds assets that PDF.js does not expose. The page extracts PDF.js full-document text, hyperlinks, URL-formatted page text, page previews, and indirect PDF streams for image XObjects, font files, ICC profiles, XML/text streams, Illustrator private roundtrip data, and unknown binary payloads. Link results can be copied or exported to CSV with link, page, and cleaned one-line link text. JPEG, JPEG 2000, JBIG2, PNG, TIFF, TrueType, OpenType, CFF/CIDFontType0C, ZIP, Zstandard, XML, text, and many raw streams are identified from magic bytes and PDF dictionary hints.

Editor: A PDF viewer and editor directly in browser.

I'm thinking about using some of this popular libraries, recommend me which should we install to support all features above (you can recommend me other libs if u think its better, performant, faster, smaller, etc especially WASM libraries):

- https://github.com/embedpdf/embed-pdf-viewer (viewer and editor)
- https://github.com/parallax/jsPDF
- https://github.com/libpdf-js/core
- https://github.com/unjs/unpdf
- https://github.com/bpampuch/pdfmake
- https://github.com/Hopding/pdf-lib
- https://github.com/stanislavfeldman/pdf.js

When designing the UI/UX, remember to follow current patterns like in existing squeeze and expose page

#### Resources

- https://www.embedpdf.com/
- https://exif.tools/flatten-pdf

### CSV/XLSX/TSV/TAB Viewer and Editor

- CSV Merger → Append files vertically, align columns, and choose the file order.
- CSV Filter → Choose a column and condition, then export matching rows only.
- CSV Diff → Match records by a stable key to find added, removed, and changed rows.
- CSV Dedupe → Remove duplicate rows or repeated column values after reviewing counts.

#### Resources

- https://csvtosheets.com/tools/csv-viewer
- https://csvvieweronline.com/
- https://csv-viewer.online/

### QR code generator

Explore https://tools.napdesigns.com/qr for full feature compatible that i want.

Then add extra features:

Styled QR

I'm thinking about using some of this popular libraries, recommend me which should we install to support all features above (you can recommend me other libs if u think its better, performant, faster, smaller, etc especially WASM libraries):

- https://github.com/productdevbook/etiket

### Remove BG

Explore https://tools.napdesigns.com/qr for full feature compatible that i want.

Then add extra features:

Styled QR

I'm thinking about using some of this popular libraries, recommend me which should we install to support all features above (you can recommend me other libs if u think its better, performant, faster, smaller, etc especially WASM libraries):

-

#### Resources

- https://exif.tools/remove-bg

### Infra

- add alchemy + cloudflare binding
