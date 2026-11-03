# Quill keeps a local Markdown Library

Quill keeps Markdown Documents and nested Markdown Folders between visits in
IndexedDB. Import copies files into this Markdown Library; export writes new
files. The tree represents the Library, not a folder on disk. Other Tools use
temporary file sessions, but writing notes needs a collection that survives a
reload. This does not change the glossary's temporary Batch definition.

We chose IndexedDB over localStorage for asynchronous document writes and room
for a growing collection. localStorage holds small preferences only. Direct
disk editing and cloud storage are outside this design. All document content,
names, and recovery copies stay on the device, as required by
[ADR-0007](./0007-tools-run-on-local-data-only.md).

An autosave is complete only when its transaction commits. A failed write keeps
the current text available for retry and download. Revision checks prevent a
second browser tab from silently replacing newer content. Schema migrations
must preserve records. Browser storage can be cleared or removed, so a Library
Backup is a separate download, not another name for autosave.
