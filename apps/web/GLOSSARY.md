# web

React app on TanStack Start. The server renders and streams each page.

## Language

### Tools

**Ritools**: The public site that holds the Tools. It is one app, and each Tool is a path on it. _Avoid_: platform, suite, app collection

**Tool**: A single-purpose page that reads and writes local data only. It has no account, no upload, and no server storage. A Tool has a name, a one-line promise, an input, and an output. _Avoid_: utility, mini-app, widget, feature

**Squeeze**: The first Tool. It compresses images to a target file size on the device. _Avoid_: Squish, Squoosh

**Expose**: The second Tool. It reads file metadata and removes the Metadata Groups the user selects when the format supports cleaning. _Avoid_: Exif tool, EXIF remover, metadata cleaner

**Tabular**: The third Tool. It lets the user view, edit, and convert local table files. _Avoid_: CSV tool, Sheets, spreadsheet app

**Folio**: The fourth Tool. It reads, annotates, redacts, signs, fills supported forms, arranges pages, and rewords existing page text in local PDFs. _Avoid_: PDF tool, Acrobat clone, document suite, PDF editor

**PDF Text Object**: The unit a PDF page draws a string with. A Wording Edit rewrites one whole; a word inside it is not separately addressable. _Avoid_: text run, line, paragraph

**Wording Edit**: A change to the characters of one PDF Text Object, in the object's own font, size, and baseline. It never reflows or wraps. _Avoid_: text edit, content edit, paragraph edit, rewrite

**Wording Snapshot**: The document bytes from before one applied Wording Edit, held per tab so that edit can be undone. The stack keeps up to 64 MB and drops the oldest first. _Avoid_: undo history, version, backup

**Glyph Coverage**: The set of characters the font of a PDF Text Object can draw. A Wording Edit is refused when the new characters are outside it. _Avoid_: font support, encoding, charset

**OCR**: The action that reads text from the pixels of a page and writes it as OCR Text. It does not read the text layer the file already holds. _Avoid_: text extraction, text recognition, scan

**OCR Text**: Machine-made text that the pixels of a page show. It can be wrong, and it is not the text the file shipped with. _Avoid_: extracted text, recognized text, body text

**OCR Page**: A page whose OCR Text is written into the OCR Copy. _Avoid_: scanned page, image page

**OCR Copy**: The new working copy that Folio opens after an OCR Run. It holds the original page content and the OCR Text, and it downloads as `<name>-ocr.pdf`. _Avoid_: output, result, converted file

**OCR Run**: One OCR action over the pages the user selects in one open PDF. It has a language set, a progress state, and a Cancel. _Avoid_: job, batch, scan

**Batch**: The set of files the user gives a Tool in one session. It is the unit of work, and it does not survive a reload. _Avoid_: queue, job, bulk

**Tool Catalog**: The home page. It lists the Tools that exist. _Avoid_: home page, index, tool list

**Tool Entry**: One Tool's place in the Tool Catalog. _Avoid_: card, tile, item

### Brand

**Open Graph Card**: The 1200×630 image that a route offers to a feed. `GET /api/og` draws it on request from the Tool Catalog and the Message Catalog, so it is never a committed file. _Avoid_: poster, og image, preview image

**Glyph Atlas**: The measured letterforms — outline, advance, and ink box, in em — that `bun brand:gen` writes so the Open Graph Card can print without a font file or a font parser. _Avoid_: font cache, subset font, font data

### Image compression

**Output Format**: The file format Squeeze writes: JPEG, WebP, AVIF, PNG, Keep, or Multi. _Avoid_: target format, codec, type

**Keep**: The Output Format that writes each image in its input format. GIF and BMP become PNG. _Avoid_: same, original, passthrough

**Multi**: The Output Format that writes JPEG, WebP, and AVIF for each image. _Avoid_: all formats, trio, bundle

**Size Mode**: How Squeeze chooses output size: Per-image target, Batch total, or Fixed quality. _Avoid_: mode, strategy

**Target**: The file size that one image must reach or stay below. It is set for the Batch and may be overridden per image in Per-image target mode. In Batch total, an image's Target is its Per-image Budget. Fixed quality has no Target. _Avoid_: limit, cap, quota

**Batch Budget**: The total byte ceiling for a Batch in Batch total mode. It is split evenly, then unused bytes are redistributed once to misses. _Avoid_: total target, quota, cap

**Per-image Budget**: An image's share of the Batch Budget. _Avoid_: share, allocation

**Fixed quality**: The Size Mode that encodes at one quality and does not chase a size. _Avoid_: manual, quality mode

**Compressed**: The result for an image whose output is at or under its Target, or smaller than its input in Fixed quality. The row prints DONE. _Avoid_: optimized, success

**Already fits**: The result for an image that is used unchanged because its input already meets its Target, or because no smaller output was possible in Fixed quality. _Avoid_: skipped, no-op

**Miss**: The result for an image whose smallest useful output is still larger than its Target. _Avoid_: failure, error

**Bigger**: The result for a converted or resized image whose output is larger than its input in Fixed quality. In a Target mode, a bigger output can still be Compressed; the row adds "Bigger than input". _Avoid_: larger, inflated

**Stale**: A result made under settings that have since changed. The row keeps its last outcome, muted, and the Tool's run action picks it up. _Avoid_: outdated, dirty

**Rejected**: The result for an input that a Tool cannot read or does not accept. _Avoid_: invalid, failed

### PDF compression

**Compress**: The Folio action that rewrites the JPEG images inside each PDF in the Batch at a Compression Preset and writes a Compressed Copy. _Avoid_: optimize, shrink, squash

**Compression Preset**: One named level of image resolution and quality: Light, Balanced, or Strong. _Avoid_: level, mode, profile

**Compressed Copy**: The new PDF that Compress writes for one input. The open file is never changed. _Avoid_: output, result, compressed file

**Compressed**: The result for a PDF whose Compressed Copy is smaller than its input. _Avoid_: done, success

**Already small**: The result for a PDF whose Compressed Copy is not smaller than its input, so Folio keeps the input. _Avoid_: skipped, no change

**Skipped**: The result for a PDF that Compress refuses to rewrite: a signed file, an encrypted file, or a file that forbids a download copy. _Avoid_: failed, rejected

### PDF flattening

**Flattened Copy**: The new PDF that Folio writes from the pages in scope of the open file. Form values and annotation appearances become page content, and form fields, annotations, links, page actions, scripts, attachments, media, outlines, and tags are removed. It keeps only the title metadata. The open file, its history, and its unsaved state do not change. _Avoid_: flattened file, export, print to PDF

**Flatten Refusal**: The named reason Folio makes no Flattened Copy: a signed, encrypted, or download-restricted file, or pages that use layers. _Avoid_: error, skipped

### PDF extraction

**Extract**: The Folio action that takes text, links, page images, or attachments out of a PDF as new files. It does not change the document or its history. _Avoid_: export, save as

**Extract Scope**: The pages an Extract reads: every page or the pages the user selects in the Extract panel. _Avoid_: page range, selection

**Page Image**: A rendered preview of a page at a chosen width, not the original embedded image. _Avoid_: thumbnail, snapshot

**Attachment**: A file in the document-level `/EmbeddedFiles` tree. A file attached to a page annotation is not an Attachment here. _Avoid_: embedded file, file attachment, enclosure

**Extract Receipt**: The result of one Extract run: the files it produced, their paths, and their sizes. _Avoid_: result, report

### Metadata

**File Family**: One group of file formats with the same type of content: Image, RAW, Document, Video, Audio, or Office. _Avoid_: file category, kind

**Content Check**: The comparison of a file's content before and after a Clean. It excludes the selected metadata containers. _Avoid_: whole-file hash, payload verification

**Metadata**: Information about a file, separate from its image, document, or media content. _Avoid_: EXIF data, tags, hidden data

**EXIF**: The metadata standard that stores camera, time, and GPS fields in an image. It is one container, not all metadata. _Avoid_: metadata, exif data

**Metadata Field**: One named value in a file, such as a camera model, a date, or a GPS coordinate. _Avoid_: tag, property, attribute

**Metadata Group**: A semantic set of Metadata Fields that the user can remove together: AI Provenance, Location, Time, Device identity, Camera settings, Authorship, Software and edit history, Thumbnails and previews, Other text, or Display. _Avoid_: category, section, container

**Metadata Report**: The grouped view of every Metadata Field in one file. _Avoid_: results, details, metadata list

**Display Metadata**: The Metadata Fields that describe how content appears or plays: image color and dimensions, media duration and sample facts, document page facts, and Office format and part count. Expose keeps them in every clean. _Avoid_: technical metadata, essential metadata

**AI Provenance**: Metadata that records how an AI system made or changed a file: a C2PA Manifest, generation parameters, or an AI-tool signature. _Avoid_: AI metadata, AI watermark, AI detection

**C2PA Manifest**: The signed record of a file's origin and edits that the C2PA standard stores in the file. Content Credentials is its public name. _Avoid_: content credential, credentials, certificate

**JUMBF**: The container that holds a C2PA Manifest. _Avoid_: JUMBF block, JUMBF data

**Maker Note**: A camera maker's private metadata block. It can repeat camera, time, and settings fields. _Avoid_: maker notes, proprietary EXIF

**Clean**: The action that writes a Cleaned File with the selected Metadata Groups removed. _Avoid_: strip, scrub, sanitize

**Clean Preset**: A named selection of Metadata Groups to remove: AI only, Personal, Everything, or Custom. _Avoid_: mode, profile, filter

**Cleaned File**: The new file that Expose writes after a clean. The input file is never changed. _Avoid_: output, result, stripped file

**Verification**: The second read of a Cleaned File that reports which Metadata Fields remain. _Avoid_: check, validation, scan

**Cleaned**: The result for a file whose Cleaned File is written and whose Verification finds no remaining fields from the selected Metadata Groups. _Avoid_: done, success, stripped

**Incomplete**: The result for a file whose Cleaned File is written but whose Verification still finds fields from the selected Metadata Groups. _Avoid_: partial, failed

**Not supported**: The result for a file that Expose can read but cannot clean with the selected Clean Preset. _Avoid_: skipped, unavailable

**Too large**: The result for a file that the device cannot hold in memory. _Avoid_: oversized, OOM

**Failed**: The result for a file whose Clean stopped because the engine was unavailable or failed. _Avoid_: error, broken

**Pixel Watermark**: A mark in the image pixels that survives metadata removal, such as SynthID. Expose cannot remove it. _Avoid_: watermark, AI watermark

**Sample Image**: An image that ships with Expose and shows the Metadata Report and the Clean Preset flow without a user file. _Avoid_: demo image, example, test image

**Offline Locator**: The map on Expose. It shows a GPS point without a network request. _Avoid_: map, GPS map, mini-map

### Table editing

**Table File**: A local file that Tabular opens as one or more Sheets. _Avoid_: dataset, document, upload

**Sheet**: One named table of cells in a Table File. A delimited Table File has one Sheet. _Avoid_: tab, worksheet, table

**Active Sheet**: The Sheet the user currently views and edits. _Avoid_: selected table, current tab

**Current View**: The rows of the Active Sheet that match the search, in the selected sort order. It includes every column. _Avoid_: visible rows, viewport, filtered data

**Cell Selection**: One rectangular group of cells in the Active Sheet. It does not change the data or enter Edit History. _Avoid_: block, highlight, marquee

**Sheet Editor**: The surface that shows the Active Sheet and accepts Edits. It shows the grid or a Chart View. _Avoid_: editor mode, table view

**Edit**: One change to cell values, headers, rows, or columns. A range paste is one Edit. _Avoid_: mutation, transaction, action

**Edit History**: The ordered record of Edits that Tabular can undo and redo during the open session. _Avoid_: stack, log, versions

**Export Scope**: The data included in a download: Current View, Whole Sheet, or Whole Workbook. _Avoid_: selection, range, download mode

**Whole Sheet**: Every row and column of the Active Sheet in its underlying order. _Avoid_: all visible rows, original file

**Whole Workbook**: Every Sheet in the open Table File, including edits, in its underlying order. _Avoid_: all tabs, all files

**Split**: The action that writes the Active Sheet as CSV Parts with the header repeated. It reads the Whole Sheet, not the Current View. It is not an Export Format and not batch work on several Table Files. _Avoid_: batch, chunking, sharding

**Part**: One CSV file in a Split. It holds the repeated header and the number of data rows set for the Split. _Avoid_: batch, chunk, shard, slice

**Rows per Part**: The data rows in each Part except the last Part, which holds the remainder. _Avoid_: chunk size, page size

**Merge**: The action that appends the rows of its Merge Sources into one CSV. It matches columns by header text, keeps the Merge Order, and restores the rows and values when it merges the Parts of a Split. _Avoid_: append, combine, concatenate, join

**Merge Source**: One Table File that a Merge reads. Its position in the Merge Order sets where its rows appear. _Avoid_: input file, part, segment

**Merge Order**: The user-chosen order of the Merge Sources in a Merge. It sets the row order in the Merged CSV. _Avoid_: sequence, file order, sort order

**Merged CSV**: The CSV file that a Merge writes. It holds the header row once and the rows of every Merge Source in Merge Order. _Avoid_: result, output, merged file

**Dedupe**: The action that removes rows whose values repeat an earlier row. It reads the Whole Sheet, keeps the first row of each repeat, and is one Edit. _Avoid_: deduplication, remove duplicates, unique, distinct

**Dedupe Key**: The displayed text of the columns a Dedupe compares. All columns make a whole-row key. _Avoid_: key columns, criteria, fields

**Duplicate Row**: A row whose Dedupe Key matches an earlier row. _Avoid_: repeated row, dupe, copy

**Diff**: The read-only action that compares two tables by a Diff Key and reports Added Rows, Removed Rows, and Changed Rows. It never changes the Table File, the Edit History, or the dirty state. _Avoid_: compare, CSV compare, delta, diff tool

**Diff Key**: One or more columns whose values identify one record in both tables of a Diff. Every key value must be non-blank, and the key must be unique in both tables. _Avoid_: match key, primary key, ID columns

**Before**: The table a Diff reads as the earlier state. The open Active Sheet is Before in the default direction; Swap makes the Compared File Before. _Avoid_: source, left side, old file

**After**: The table a Diff reads as the later state. A chosen Table File is After in the default direction; Swap makes the open Active Sheet After. _Avoid_: target, right side, new file

**Compared File**: The one Table File a Diff adds to compare with the open Active Sheet. _Avoid_: after file, second file, input

**Added Row**: A row whose Diff Key is present in After and absent from Before. _Avoid_: new row, insert

**Removed Row**: A row whose Diff Key is present in Before and absent from After. _Avoid_: deleted row, missing row

**Changed Row**: A row whose Diff Key is present in both tables and whose values differ in at least one Compared Column. _Avoid_: modified row, updated row, edit

**Unchanged Row**: A row whose Diff Key is present in both tables and whose Compared Columns all match. A Diff counts it and does not list it. _Avoid_: same row, matched row

**Compared Column**: A column whose header matches in both tables and that is not a Diff Key column. Its values decide whether a matched row is Changed. _Avoid_: diff column, data column

**One-sided Column**: A column whose header is present in only one table of a Diff. The Diff shows it as a warning and does not compare it. _Avoid_: missing column, extra column

**Diff Report**: The CSV file a Diff writes. It has one row for each Added, Removed, and Changed Row, with the Diff Key and the compared values from Before and After. _Avoid_: diff export, delta file, change log

**PDF Report**: The paginated PDF that Tabular writes from the rows and columns in the Export Scope. It is a document for a person to read or print, not a data interchange format. _Avoid_: printout, PDF dump, export PDF

**Page Estimate**: The approximate number of pages in a PDF Report. The export plan shows it before the user creates the file. _Avoid_: page count, pages

**Unsupported Character**: A character that the PDF Report font cannot draw. The report replaces it with `?`, and the export plan counts it. _Avoid_: missing glyph, bad character

### Charts

**Chart View**: The read-only chart that Tabular builds from a Chart Scope. It is not an Export Format and it does not change the Table File. _Avoid_: chart export, workbook chart

**Chart Scope**: The data a Chart View reads: a Cell Selection of more than one cell, or the Current View. _Avoid_: chart filter, chart range

**Chart Type**: One of Line, Bar, Area, Donut, or Scatter. The user chooses it; Tabular does not infer it. _Avoid_: graph type, chart kind

**Chart Series**: One named group of plotted values in a Chart View. In Line, Bar, and Area it is a numeric column. In Scatter it is a group of points. A Donut has one numeric series split into slices. _Avoid_: data series, line

**Charted Rows**: The rows a Chart View plots after its display cap or sample. They are not the same as the Chart Scope. _Avoid_: visible rows, filtered data

### Input

**Watch Folder**: A folder the browser watches for new files in Chrome and Edge. It adds files; it never removes them or starts a run. _Avoid_: sync, monitor

**Folder Path**: The path of a file inside a dropped or watched folder, preserved in the ZIP when the option is on. _Avoid_: directory, relative path

### Internationalization

**Locale**: A lowercase BCP-47 language tag that selects which Message Catalog to use (`en-us`, `id-id`). The server picks it for each request: the `app-locale` cookie, then `Accept-Language`. _Avoid_: language, languageCode, lng, resolvedLanguage

**Message Catalog**: The set of Translation Keys and strings for one Locale, owned in `apps/web/src/core/libs/i18n`. _Avoid_: resources, locale JSON, dictionary, i18n file

**Translation Key**: A flat identifier into a Message Catalog (e.g. `welcome`, `title`). _Avoid_: nested namespaces, i18next paths

**Translation Provider**: React glue that reads the current Locale and exposes `t` / `setLocale`. _Avoid_: I18nextProvider, react-i18next

### Errors

**Error Envelope**: The `{ message }` body the API returns on a failed request. Present on most failures, absent on some — a caller may never assume it parsed. _Avoid_: error response, error body, error payload

### Component Catalog

**Component Catalog**: The single page at `/master-design` that displays every core UI component for visual inspection by developers and designers. It is available in development. A production build answers 404. _Avoid_: master design, styleguide, storybook, docs site

**Component Entry**: One component's place in the Component Catalog — its Category membership, its nav item, and its section of the page. _Avoid_: item, doc, page

**Variant Showcase**: One rendered example within a Component Entry, demonstrating a single combination of a component's props. _Avoid_: demo, example, story

**Category**: A named grouping of Component Entries (Buttons, Overlays, Charts, …) that determines both nav grouping and page order. _Avoid_: group, section, tag
