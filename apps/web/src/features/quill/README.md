# Quill

Quill implements [issue 52](https://github.com/rifandani/ritools/issues/52). It keeps a Markdown Library in this browser profile and site origin. It does not edit the files that a user imports.

## Application interface

`Quill` is the Effect service. `makeQuill` builds the same application with replaceable storage, clock, identity, preferences, and export resources. The page calls its operations through Effect Atoms. No component writes records. The Node tests use this interface. Browser tests use the public page controls.

IndexedDB has separate `entries` and `bodies` stores. The tree reads metadata; opening a document reads its body. A write checks expected revisions and commits metadata and content in one transaction. A save is complete only after `oncomplete`. A conflict keeps the local text and the stored text. Save as another document commits the local text under a new ID.

The service keeps pending text and document-specific undo and redo in memory. Autosave waits 650 ms after an edit. Document switches and route navigation flush pending edits. The page also flushes when hidden and warns before unload while work is uncommitted. A crash before commit can still lose recent edits.

Stored records use versioned Effect Schemas. Invalid records remain in storage; readable records remain available. Raw storage recovery opens the existing IndexedDB version without a migration, including a version that this app cannot open for editing. It does not reset the database.

## Markdown and rendering

The Markdown adapter owns the Tiptap profile and its derived document model. It checks known token kinds and compares values before and after serialization. Opening, reading, and exporting do not serialize the source back into storage. An unchanged Markdown download uses the Import Original bytes. Source edits use UTF-8 and bypass the visual serializer.

The text alignment menu follows Numbered list. It applies left, center, or right alignment to the current source line or selected lines. Right-to-left text toggles direction. The commands use `<div align="left|center|right" dir="rtl">` blocks with either or both attributes. The reader parses their Markdown content and applies only these attributes. Repeated commands update the enclosing block. Formatting remains in the saved source and Markdown download.

Frontmatter, other HTML, comments, MDX, unknown tokens, failed parses, and uncertain round trips remain protected. An explicit conversion places the current source in a Markdown code block. The panel shows the affected content and explains this result. The conversion and a separate recovery copy commit together before visual editing starts. It does not replace the Import Original.

Images are inert references. External links require a click. Relative Markdown links resolve against Library paths; rename and move do not rewrite them. KaTeX disables trust commands. Mermaid syntax renders locally with Pele in a dedicated Worker. Pele supports all Mermaid diagram types; it escapes labels and filters links, images, and styles. The Worker turns off links and images, refuses document configuration, and refuses active SVG output. Rendering has a 30000-character, 200-line, 200-edge work budget and a four-second rendering deadline. The parent terminates a stalled Worker. Failed figures keep their labeled source.

## Exports

Markdown, folder ZIP, and Library ZIP keep source text. A Library Backup also keeps recovery data. Each run freezes its pending text. Library exports read stored bodies in one readonly transaction and check the metadata revisions.

Quill does not export DOCX or PDF. Markdown download remains available after a save failure.

## Library Backup version 1

A Library Backup is a classic ZIP with ordinary current Markdown paths and explicit empty folder entries. Its reserved `.quill/manifest.json` contains:

- `version: 1`;
- `records`, an array with one record per retained Library item;
- each record's versioned `entry`, its `body` for a document or `null` for a folder, and its ordinary ZIP `path` or `null` for Trash;
- each body contains current source, revision, Import Original bytes and text, and retained conversion recovery copies.

Trash and recovery data live in the reserved manifest. This ZIP is distinct from ordinary Markdown ZIP export. Current files can be read without Quill.

Restore validates the central and local ZIP paths before decompression. It refuses traversal, absolute paths, duplicate paths, reserved path collisions, unknown versions, inconsistent records, missing files, and resource failures. It also counts actual decompressed bytes while reading. Safety budgets are 256 MiB for the archive and expanded content and 32 MiB for the manifest. ZIP64 is not accepted. These are restore safety limits, not Library limits.

Restore commits all records into a new folder in one transaction. It assigns new IDs and keeps existing work. A refused restore makes no partial change.

## Offline assets and checks

The editor, reader, diagram Worker, and writers load on demand. The service worker caches same-origin static chunks and font assets after use. A warm capability works offline while retained. A cold failure keeps the source and reports that the capability is unavailable offline.

Run `bun typecheck`, `bun test:unit`, `bun lint`, and `bun web build` from the repo root. Browser checks are in `e2e/quill.spec.ts`. The production service worker checks are in `e2e/quill.offline.spec.ts`; use the existing `PW_OFFLINE` workflow or CI configuration. The tests inspect actual Markdown and ZIP downloads. The representative Library check imports 100 prose documents and records total source bytes, import time, document switch time, and reload time; these measurements are evidence for that device and build, not performance guarantees.

### Local check measurements

On 2026-11-03, a local Chromium development run imported 100 prose documents (411090 Markdown bytes) in 1363 ms. Switching to document 100 took 398 ms; reloading the selected document took 1784 ms. These numbers include Playwright control and assertion time on this Mac. The production output includes a 607.42 kB CodeMirror chunk (207.83 kB gzip) and a 1596.86 kB diagram Worker. They load on demand. They do not establish a device-independent limit or target.
