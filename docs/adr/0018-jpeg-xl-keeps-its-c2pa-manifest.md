# JPEG XL keeps its C2PA Manifest in Expose

ExifTool can write EXIF and XMP in a JPEG XL file, but it does not support C2PA in that format: the ExifTool format table marks C2PA as not readable and not writable for JXL, so `-JUMBF:all=` has nothing to remove. Expose therefore reads the C2PA Manifest in a JPEG XL file and cannot delete it. The AI only preset and the Everything preset are not available for JPEG XL; Custom works for the other eight removable Metadata Groups. The format support matrix names the state, and a clean that asks for AI Provenance returns the named `clean-not-supported` error instead of a silent partial clean.

## Considered options

- **Hand-written JXL box surgery.** The C2PA Manifest sits in an ISO BMFF `jumb` box, so a byte-level removal is possible in principle. It is a second writer for one rare format, it has to repair box sizes and offsets, and it would not be covered by the engine's tests for every JXL layout. Rejected for the first release.
- **Re-encode the JPEG XL file without the manifest.** Re-encoding changes the image payload, so Verification could no longer claim the payload is unchanged, and the quality would drop. Rejected.
- **Mark JPEG XL read-only.** ExifTool does write EXIF and XMP in JXL, so this would refuse cleans that are safe and verifiable. Rejected.

## Consequences

- A JPEG XL file can still lose Location, Time, Device identity, Camera settings, Authorship, Software and edit history, Thumbnails and previews, and Other text. It keeps its AI Provenance until another writer supports it.
- The AI only preset and Everything are disabled for JPEG XL with the reason, not silently switched to a smaller selection.
- The C2PA evidence still appears in the read report, so the user sees what stays and why.
- The engine returns `clean-not-supported` with the format and the group. The UI names both in the error note.
- Revisit when ExifTool adds C2PA deletion for JXL, or when a tested JXL writer ships.
