# Easel saves File Tabs in IndexedDB

A reload used to clear every File Tab in Easel, so the user had to open each image again and lost the edits. Easel now saves each File Tab in the browser (IndexedDB, database `ritools-easel`) and opens them again on load. Nothing leaves the device. Cleave and Quill already work this way; Tabular and Folio do not save anything.

Each File Tab is one small record and some files:

- `tabs`: name, output format and quality, the dirty flag, and the whole Edit Stack with its undo and redo states.
- `files`: the original image as the user gave it, and each picture that an image layer or a Watermark Layer uses. Easel writes a file once, with the first record of its File Tab.
- `session`: the File Tab order and the active File Tab.

Easel writes 400 ms after the last change, so a slider drag is one write, and it writes at once when the page is hidden or unmounts. One write is one transaction, so a File Tab never has a record without its original image. Closing a File Tab deletes its record and files. A decoded image is never saved: Easel decodes the original again on load, as it does on open.

A reload and a tab close ask first only while a write has not finished or has failed. A link inside the app asks only after a failed write. When storage is full or blocked, a Note offers a retry and the File Tab stays open in memory.

Easel checks every stored record with a schema before it opens it. A record from another version, or a damaged one, does not open, and its data stays in storage.

## Considered options

- **Save only the Edit Stack and ask the user for the image again.** Rejected. The user would still lose the open images on each reload.
- **Save the decoded pixels.** Rejected. Pixels are much larger than the original file and cost an encode on each write.
- **Write the original image with each record.** Rejected. A re-write copies megabytes after each slider move. The `files` store separates the files, which do not change, from the record, which does.
- **Keep the before-unload warning.** Rejected. The warning was the only protection, and it still lost the work after the user accepted it.

## Consequences

- Fonts that the user added from a file are not saved. A Text Layer with such a font uses the fallback face after a reload. Bundled fonts load again, and a device font needs no file.
- The last export result and the view (zoom and pan) are not saved.
- Clearing the site data in the browser removes every saved File Tab. The explainer says so.
