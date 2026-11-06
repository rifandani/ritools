---
status: accepted
---

# Quill Document Links use Library paths

Quill Document Links address Markdown Documents by their paths in the Markdown
Library. Relative paths start at the source Document's Markdown Folder. A leading
`/` starts at the Library root. This extends the local Library defined in
[ADR-0032](./0032-quill-keeps-a-local-markdown-library.md); the WORKSPACES label
does not give Quill access to files on disk.

We chose Markdown paths over Quill record IDs so that links remain readable and
can work in exported files. Paths match full stored names, including extensions
and letter case. Quill does not search other Folders or guess missing extensions.
Parent segments can leave a nested Folder, but cannot go above the Library root.

Read and Split mode follow Document Links through Quill's document navigation.
The target uses its existing Quill tab, or a new Quill tab. Heading fragments
address headings in either the current Document or the target Document. A failed
save stops navigation and retains the current text, as required by ADR-0032.

## Consequences

Moving or renaming a Document or an ancestor Folder can break Document Links.
This change does not rewrite Markdown source in other Documents. Automatic link
updates require a separate decision because they can change many Documents.

The Library root is shared by all top-level Folders. A link such as
`../other/b.md` can cross between those Folders when its source is one level
below the root. A root-relative link can lose its meaning when only part of the
Library is exported. Relative links are the preferred form for portable content.

The [Document Link design](../design/quill-document-links.md) defines path,
heading, navigation, and failure rules, with examples for verification.
