# Expose accepts a Batch

The confirmed shape said "One file per session. No batch. Squeeze owns batch work." A user with a folder of photos must then repeat the read, choose, clean, verify, and download flow for each image. That is the largest workflow gap in the comparison table: ExifTool processes folders, Metadata2Go accepts 5 files per job free, and Image Scrubber accepts one file. Batch work is an input shape, not a Squeeze-only capability; Squeeze owns batch compression, and Expose owns batch cleaning.

Expose therefore accepts a **Batch**: the set of images the user gives Expose in one session. One file keeps the Redaction Desk. Two or more files use a batch list, and a row opens the desk for that file. One Clean Preset applies to the whole Batch. Every file gets its own Cleaned File and Verification. The user downloads one file, or all files as one ZIP. There is no file-count cap: Expose warns once when the total input is above 1 GB, cleans one file at a time, and marks a file that runs out of memory as Too large without stopping the Batch. A Batch does not survive a reload.

## Considered options

- **Keep one file per session.** Rejected: the gap is real, and the comparison table names it.
- **Read-only batch.** Rejected: it shows the problem but still makes the user clean one file at a time.
- **Per-file Clean Presets.** Rejected: it doubles the state and turns the batch list into a settings matrix. To exclude a file, the user removes it; to use a different preset, the user opens that file alone.
- **Squeeze cleans metadata.** Rejected: a Tool has one verb. Squeeze compresses, Expose cleans.
- **A hard file-count cap.** Rejected: the device sets the true Batch size. An arbitrary count is less honest than the 1 GB warning and per-file failure isolation.

## Consequences

- The plan, `PRODUCT.md`, the comparison table, and the copy change. "One file per session" is superseded.
- The batch list is a new surface. The Redaction Desk stays the single-file surface.
- One engine Worker runs per clean run, not per file, so the 26.6 MB ExifTool wasm loads once. Reads stay per-request.
- The shared file identity, ZIP naming, and download code moves to `core/libs/files`, so Squeeze and Expose use one path rule.
- A Batch does not survive a reload or a route change. The copy says so. There is no `beforeunload` guard in the first release.
- Adding files during a run is allowed. The new rows wait for the next run.
