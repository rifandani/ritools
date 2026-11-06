# Quill Document Links

This design records the choices accepted during the Quill link interview.
The user confirmed the Markdown Library scope and authorized the recommended
answers to the remaining questions. No critical decision remains open.

[ADR-0038](../adr/0038-quill-document-links-use-library-paths.md) records why
Document Links use Library paths. These rules define the implemented behavior.

## Path rules

- A relative path starts at the source Document's Markdown Folder.
- A leading `/` starts at the Library root, including all top-level Folders.
- `.` keeps the current Folder. `..` selects its parent. A path that attempts
  to go above the Library root fails; it is not shortened to a root path.
- Match the complete stored names, including letter case and extension. Do not
  add `.md`, try another extension, or search other Folders for a matching name.
- Resolve against the current Library tree when the link is activated. Import
  paths and export filenames do not replace the stored names.
- Only active Markdown Documents are targets. A Folder, a Document in Trash,
  or a Document inside a Folder in Trash is unavailable.
- Split the path, query, and heading fragment before percent decoding. Ignore
  the query. Decode each path segment and the fragment once. Invalid escapes
  fail. Reject a decoded path separator, backslash, or control character.
- Spaces and Unicode are supported. `%20` means a space, `%23` means a literal
  `#` in a name, and `%25` means a literal `%`. A decoded `%` is not decoded again.
- An empty path refers to the current Document. `#installation` selects a
  heading there; an empty fragment selects the top of the Document.
- `http:`, `https:`, and `mailto:` links retain their existing external behavior.
  Other URI schemes and paths that start with `//` do not become Document Links.
  A failed local link never falls back to a network request or a disk read.

For these examples, the Library has `a.md`, `b.md`, `notes/a.md`, `notes/b.md`,
`notes/deep/a.md`, and `guides/b.md`:

| Source Document | Link destination | Result |
| --- | --- | --- |
| `a.md` | `b.md` | Open root `b.md` |
| `a.md` | `./b.md` | Open root `b.md` |
| `a.md` | `notes/b.md` | Open `notes/b.md` |
| `notes/a.md` | `b.md` | Open `notes/b.md` |
| `notes/a.md` | `../b.md` | Open root `b.md` |
| `notes/deep/a.md` | `../../guides/b.md` | Open `guides/b.md` |
| `notes/deep/a.md` | `/b.md` | Open root `b.md` |
| `notes/a.md` | `../guides/b.md` | Open `guides/b.md` |
| `a.md` | `../b.md` | Report a path above the Library root |
| `a.md` | `B.md` | Report a missing target |
| `a.md` | `b` | Report a missing target |
| `a.md` | `notes` | Report that the target is not a Document |

## Heading fragments

- Support both `#installation` and `b.md#installation` in Read and Split mode.
- Derive a heading ID from its trimmed plain text: use lowercase letters, remove
  punctuation and symbols except `-` and `_`, and replace each sequence of
  whitespace with `-`. Retain Unicode letters, marks, and numbers. Inline
  formatting and link destinations do not become part of the heading text.
  Image alt text and inline math source count as text.
- A heading with no text after this conversion uses `section`. Allocate IDs
  in document order. If an ID is already used, append `-1`, `-2`, and so on,
  until the ID is unused. Check collisions with all earlier heading IDs.
- For example, two `Installation` headings use `installation` and
  `installation-1`. If `installation-1` is already used by an earlier heading,
  the duplicate uses `installation-2`.
- Match the decoded fragment to the heading ID exactly. Use the same rules
  when rendering headings and when following links.
- Scroll only after the target Document's current render is ready. Move focus
  to the heading for keyboard and screen reader users. A stale render cannot
  receive the pending scroll or focus.
- If the Document exists but the heading is missing, open the Document at the
  top and show a heading-not-found message. Do not select a similar heading.

## Navigation and failures

- An ordinary click or keyboard activation selects the target's existing
  Quill tab, or creates and selects a Quill tab. Retain Read or Split mode.
- A same-Document heading link keeps the current tab and scrolls within it.
  Without a fragment, a link opens the target at the top.
- Save pending edits before switching Documents. A save failure or revision
  conflict keeps the current Document and text available for recovery.
- An invalid path, missing target, target in Trash, or target read failure
  leaves the current Document selected. Show a translated message with the
  requested path and the reason. Do not create or restore a Document.
- Local links stay inside Quill. Browser URL history, shareable browser deep
  links, and background-tab controls are outside this change. Modifier and
  middle clicks must not navigate the browser to a Library path.
- Moving or renaming entries does not update Markdown source. Existing
  Import Originals and Library Backups retain their current meaning.

## Implementation checks

The service resolves paths against the current Library tree and returns the
target Document and heading fragment. The reader assigns unique heading IDs
and applies scroll and focus after the matching render is ready. Link failures
include the requested path and a translated reason.

Verify the path examples above with service checks. Include encoded spaces,
Unicode, literal `%` and `#`, malformed escapes, encoded separators, queries,
duplicate names after import, and targets in Trash. Check that renamed or moved
paths are resolved from current metadata and that save failures prevent a switch.

Check heading ID allocation, duplicate collisions, empty headings, missing
fragments, and stale asynchronous renders. Browser checks activate links
in Read and Split mode, verify the selected Document and tab, follow nested
paths, and verify heading scroll and focus. The original example is covered:
root `a.md` contains `[b.md](b.md)`, and activation displays root `b.md`.
