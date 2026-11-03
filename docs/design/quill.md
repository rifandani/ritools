# Quill

Quill is the seventh Ritools Tool, at `/quill`. Its promise is: write, organize,
and export Markdown on your device. It serves personal notes and technical
documents. The user accepted the recommended defaults and explicitly approved
format normalization with recovery and source-mode protection.

This is the agreed design for implementation. It does not describe a shipped
Tool. Terms are in the [web glossary](../../apps/web/GLOSSARY.md). The storage
boundary is in [ADR-0032](../adr/0032-quill-keeps-a-local-markdown-library.md),
and the preservation rule is in
[ADR-0033](../adr/0033-quill-keeps-markdown-and-protects-unsupported-source.md).

## Library and files

- Keep one Markdown Library per browser profile and site origin. It survives
  route changes and reloads. It has no account or cloud sync.
- Create, rename, move, duplicate, and delete documents and nested folders.
  Support keyboard actions for every operation. Deletion goes to a recoverable
  Trash; permanent removal requires confirmation.
- Use stable IDs for records and parent relationships. Names are display and
  export values, not record identities. Refuse folder cycles. Resolve duplicate
  sibling names with a visible suffix; never overwrite by name.
- Import one or more UTF-8 `.md` or `.markdown` files. A folder import preserves
  accepted files' relative paths. Report unreadable files separately and retain
  successful imports. Import never changes a disk file.
- Decode UTF-8 without silently replacing invalid bytes. Keep the original
  import bytes, including a byte-order mark and original line endings, for
  unchanged downloads and recovery. New and edited source uses UTF-8.
- A Library Backup ZIP includes current `.md` files, empty folders, a versioned
  manifest, and recovery copies in a reserved metadata directory. Restore that
  backup into a new folder with new IDs; never replace the current Library.
  The ordinary file tree remains readable without Quill. General ZIP import is
  outside v1; backup restore accepts only the documented backup format.
- Accept no hard product cap on file count or size. Handle actual device limits
  with a named failure. Load the selected document, rather than every document
  body, into the editor. Measure representative collections before release.

## Editing and preservation

- Default to editing formatted content directly. Provide a slash menu,
  formatting toolbar, keyboard shortcuts, undo/redo, source mode, and a read
  view. On small screens, show one mode at a time.
- The visual profile covers paragraphs, headings, bold, italic, strikethrough,
  links, blockquotes, ordered and unordered lists, task lists, horizontal rules,
  fenced code, simple GFM tables, inline/display math, and Mermaid fences.
  Nested tables, embedded applications, collaboration, and databases are
  outside v1.
- Preserve frontmatter, HTML, comments, MDX, and other syntax outside that
  profile in source mode. Raw HTML and MDX never execute. Opening, viewing, or
  exporting a document does not itself normalize its source.
- Use a conservative compatibility check at import and after source edits.
  Compare parsed content before and after a proposed visual conversion.
  Unknown syntax or a changed semantic value blocks automatic conversion.
  Unchanged bytes alone are not a semantic check, because formatting changes
  are permitted. Show affected content before an explicit conversion and keep
  a recoverable copy of the current source.
- Preserve the selected document and caret when practical. Switching documents
  flushes pending changes. Changing mode is not permission to lose text or
  reset the Import Original. Undo history is per document during the session;
  persistent version history is outside v1.
- Show code language selection, highlighting, and copy. Unknown language labels
  remain in the Markdown and display as plain code.
- Support `$...$` and `$$...$$` math with KaTeX's supported TeX subset. Preserve
  the equation source. Full LaTeX document compilation is outside v1. Math
  errors show the source and a local error without disabling the document.
- Render fenced `mermaid` blocks locally. Keep source editing available and
  show parse errors beside the source. A failed diagram never removes its
  source or prevents editing the rest of the document.
- Preserve image references in Markdown. V1 shows a placeholder for unresolved
  images; it does not fetch remote images or embeds. A local attachment library
  is outside v1. Ordinary external links require a user action. Relative `.md`
  links can open a matching document in the Library; broken links stay visible.
  Rename and move do not silently rewrite link text or destinations.

## Saving and recovery

- Store documents, folders, Import Originals, Trash, and revisions in IndexedDB.
  Use localStorage for small view preferences only. Validate stored records and
  version the storage schema.
- Debounce autosave, and show Saving, Saved on this device, or Save failed.
  Saved means the transaction committed. Keep dirty text in memory after a
  failure, with Retry and Download actions. Flush on document switch and when
  the page becomes hidden. Warn before leaving if a write remains uncommitted;
  a browser crash before commit can still lose the latest keystrokes.
- Commit body and revision together. Compare the expected revision in the same
  write transaction. On a conflicting edit from another tab, keep both texts
  and offer to save the local text as a separate document. Notifications alone
  do not provide the conflict check.
- Request persistent browser storage when available. A denial does not block
  writing. State plainly that browser storage is not a disk backup and provide
  Library Backup and Restore actions.
- On a failed migration or unreadable record, do not reset the Library. Keep
  readable records available and offer recovery of the affected stored data.

## Export

- Export the current document as `.md`, `.docx`, or a directly downloaded `.pdf`.
  Export a folder or the entire Library as Markdown in a ZIP. Preserve paths
  and empty folders. Library Backup adds the recovery data described above.
- Use the current in-memory text, including pending edits. Freeze one export
  snapshot so later typing does not change a running export.
- DOCX keeps ordinary text, headings, lists, links, tables, and code editable.
  Math and Mermaid appear as rendered images with descriptions. Native Word
  equations and editable diagram objects are outside v1.
- PDF has selectable ordinary text, page breaks, margins, page numbers, and A4
  or Letter paper. Default to A4 portrait. Render math and diagrams as bounded
  figures. Do not export one tall screenshot or present browser printing as a
  direct PDF download.
- DOCX and PDF use the supported document profile. Before exporting a source-only
  document, identify content the writer cannot represent and block an export
  that would silently omit it. Markdown and ZIP always retain the current source.
- Preserve an invalid equation or diagram as a labeled source block in a
  document export and report it before download. Keep code legible and include
  the language label. Visual appearance can differ between Word and PDF.
- Check font coverage before writing PDF. Never silently replace characters
  with `?`. A missing glyph must produce a clear refusal or a complete local
  font fallback. Keep the Markdown download available.
- Sanitize ZIP paths with the existing file helpers. Use collision-safe names
  and reject unsafe backup paths. A failed export leaves the Library unchanged
  and reports its reason. Legacy `.doc` is outside v1.

## Library recommendations

Use free, browser-capable packages and lazy-load heavy code per capability.
Pin versions during implementation after checking the installed APIs. These
choices are recommendations, not measured performance claims.

- **Tiptap OSS** for the headless visual editor. Its custom UI can use Ritools
  components. Its Markdown extension is beta, so adapters, compatibility checks,
  and recovery are required. Persist Markdown, with editor JSON derived from it.
  [Editor source](https://github.com/ueberdosis/tiptap),
  [Markdown docs](https://tiptap.dev/docs/editor/markdown).
- **CodeMirror 6** for source mode. It owns source editing and its syntax colors;
  read-view highlighting is a separate concern.
  [CodeMirror](https://codemirror.net/).
- **TanStack Highlight** for rendered code blocks, with selected language
  imports. It does not replace editor parsing or Mermaid rendering.
  [Overview](https://tanstack.com/highlight/latest/docs/overview).
- **KaTeX** for math and **Mermaid** for diagrams. Self-host their scripts,
  styles, and fonts. Disable trust-dependent math commands and Mermaid HTML
  labels, links, external resources, and document-supplied configuration that
  could relax those settings. Give diagram rendering a recoverable timeout.
  [KaTeX](https://katex.org/docs/browser),
  [Mermaid](https://mermaid.js.org/config/usage.html).
- **docx** for browser DOCX creation, independent of paid Tiptap conversion.
  [Project](https://github.com/dolanmiu/docx).
- **pdfmake** for local paginated document layout. Its paragraph/list/table
  model fits prose. Evaluate the lazy chunk and rendering cost in Quill; the
  Tabular benchmark in ADR-0022 is specific to tables and does not establish
  this Tool's result. Use self-hosted fonts and local figure data only.
  [Browser documentation](https://pdfmake.github.io/docs/0.3/getting-started/client-side/).
- **fflate** and existing download/path helpers for ZIP, which the app already
  uses. Apply decompression limits before backup restore, based on available
  resources, and refuse suspicious entries without changing the Library.
- **TanStack Markdown** remains an alternative parser/renderer, not an editor.
  Do not add a second authoritative Markdown parser just to include it. Its
  documented syntax profile and the required math support must match before
  adoption. [Syntax profile](https://tanstack.com/markdown/latest/docs/core-concepts/syntax-profile).
- **Shiki** is an alternative if code-language accuracy requires it. Its
  JavaScript engine is recommended for browsers by its docs. Choose WASM only
  after a relevant measurement; the deployment format is not a speed guarantee.
  [Engine guide](https://shiki.style/guide/regex-engines).

## Existing patterns and implementation boundaries

- Reuse `AppShell`, the Tool Catalog, shared toolbar and menu components, the
  React Aria Tree, inline export panels, status announcements, and focus recovery.
  `tabular-page.tsx` and the Tree showcase are the main page references.
- Keep the Persona 5 visual language, typography, colors, spacing, and both
  themes. Match existing pages; Notion describes the editing interaction.
- Put the route at `apps/web/src/routes/quill.tsx` and Tool code under
  `apps/web/src/features/quill/`. Add Tool Catalog, SEO, Open Graph, and both
  `en-us` and `id-id` messages. Do not add a separate app or duplicate the shell.
- Follow Effect v4, Effect Atoms, and Schema for application logic, shared
  state, persistence, and validation. Keep IndexedDB and format writers behind
  services. Give the editor one adapter for its Markdown profile and one shared
  document model for export writers.
- Server-render the public introduction and empty state. Open browser storage
  only after hydration. Treat document names and Markdown as untrusted. Use
  `Map` or `Object.fromEntries` for keyed input data.
- Keep names and content out of network calls, server rendering, analytics, and
  error logs. Fetch only same-origin app assets. Cache editor, renderer, font,
  and export assets on first use; later use works offline while retained.
- A cold offline capability reports Unavailable offline without changing saved
  content. Load failure, parse failure, save failure, conversion refusal, and
  export failure are distinct recoverable states.
- The requested `docs/standards/` directory is absent in this checkout. Use
  `PRODUCT.md`, the existing ADRs, and `apps/web/docs/` for current rules.

## Release evidence

Verify the behavior with meaningful unit and browser checks during implementation.

- Create nested folders and several documents; reload and recover their content,
  selection, and paths. Check rename, move, duplicate, Trash, and restore.
- Import supported Markdown and verify its semantic round trip. Test HTML,
  frontmatter, comments, unknown extensions, malformed math, and invalid Mermaid.
  Confirm source-mode protection, explicit conversion, and recovery copies.
- Prove unchanged import downloads keep the original bytes and source-mode edits
  do not pass through the visual serializer.
- Force a quota/write failure and a two-tab revision conflict. Neither may
  replace a newer stored document or report an uncommitted write as Saved.
- Export and reopen Markdown, ZIP, and DOCX; inspect DOCX and PDF pages for long
  code, tables, equations, diagrams, links, Unicode, and page boundaries. Verify
  PDF text can be selected. Restore a backup without overwriting current files.
- Check keyboard-only use, focus order, announcements, a narrow viewport, both
  themes, and both Locales against the existing page patterns.
- Test warm offline editing and every cached export. A network check must show
  no request containing document content or names, including remote images and
  diagram configuration. Record actual size and responsiveness measurements;
  do not invent a performance threshold or claim.
