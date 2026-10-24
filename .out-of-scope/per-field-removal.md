# Per-field removal

Expose removes metadata by Metadata Group. It does not remove single Metadata Fields.

## Why this is out of scope

The removal unit in the engine is an ExifTool tag, not a displayed field. One field row can come from several tags in several containers. For example, Device identity shows "Make" from EXIF, XMP, and PNG. A per-field mode would need a curated field-to-tag table for every field, container, and format. That table would be much larger than the current group-to-tag table, and it would go stale as the reader changes.

Some report rows are not single fields at all. The C2PA Manifest row, the Claim generator row, the Thumbnail row, and the Maker Note marker are summaries. A C2PA Manifest is atomic: Expose removes the whole JUMBF store or keeps it. A Maker Note is also kept whole or removed whole, because it repeats camera, time, and settings fields. A per-field selection cannot keep the promise "keep every unselected field" for these rows.

The Verification compares counts per Metadata Group. It has no stable per-field key. The duplicate index in a field ID can move when one of two same-label fields is removed, so a second read could not match the field reliably.

The order panel must work at 390 px. A field checkbox under each of nine groups would make the panel very long. It would also show the raw reader labels, which are not translated. The current report is semantic and the order stays short because of that.

The group model already covers the common need. To keep the capture date and remove the camera serial, select Device identity and leave Time unchecked. Those are separate groups. The finer case, such as keeping the copyright and removing the author, needs a different design with a different unit of removal.

If finer control is needed later, the correct unit is a small curated set of tag groups, not every displayed field. That needs a new design and a new agent brief.

## Prior requests

- #11: "[Feature] Expose: add per-field removal"
