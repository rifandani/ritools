---
version: 1
slug: "src-features-squeeze"
primary_target: "src/features/squeeze"
related_targets: ["src/routes/squeeze.tsx"]
---

# Squeeze (/squeeze)

## Scope

- Surface: the Tool at `/squeeze`, feature `src/features/squeeze`. The engine, the worker, and the settings model are done (session 3a-2) and do not change.
- Mode: Operate. A person with files and a hard size limit sets a limit, adds a Batch, presses **Compress all** once, reads each row, and downloads one file or the ZIP.
- Extension of the established Ransom Calling Card world, not a new world. Palette, type, angles, motion grammar, and tokens stay.

## Audience and job

A non-technical person with a folder of images and a cap they cannot change: a CMS upload, a form, an inbox. They need every image under the limit, or the whole Batch inside one budget. The proof is the named codecs, the local-only path, the device limit, and the numbers on each row — no testimonials, benchmarks, or competitor claims.

## Constraints

- WCAG 2.2 AA in both modes, 390 px to 1440 px. Keyboard alone completes the flow.
- Every byte size, percentage, budget, and count in the one numerals face, in fixed columns. No state by colour alone.
- Ransom only on "Squeeze" and the five outcome words (DONE, ALREADY FITS, MISS, BIGGER, REJECTED). Never on labels, inputs, file names, numbers, or the queued/working state.
- Controls are the standard React Aria components in `src/core/components/ui`.
- Copy: "no cap", never "unlimited"; "the same codecs", never "the same quality". Both Locales carry every string.
- No application code outside the route and the feature. No engine change.

## Direction contract

THESIS: Squeeze is a print-shop job ticket. The settings are a numbered ticket pinned to an ink rail, the Batch is a proof ledger ruled into In, Out and Δ columns, and one red run bar lands the work. It refuses the compressor default: a centered upload card over a settings accordion, with a quality slider as the only decision.

OWN-WORLD: Ransom Calling Card, unchanged. Poster Red, ink, paper, white; zero radius; 2px rules and 3px heavy rules; no shadows, glass, or gradients; 4deg tilt and 16deg slash only; Martian Mono at 75% width for every number; printed marks that outline, fill when pressed, strike when disabled, and bracket on focus.

STORY: The visitor sets the limit, drops the Batch, and presses one mark. They read each outcome as a word and a shape, trust the totals because the columns hold still, and believe the run was local because nothing ever asks them to upload.

FIRST VIEWPORT: Red navbar with the breadcrumb trail ending in the Ransom "Squeeze". Below, the promise line, then a 280px ink rail carrying a paper ticket: 01 Output format, 02 Size target, 03 Options. At right, the files ground: a ruled drop zone, the ledger head, the empty proof in numeral-display "0". Under the ledger, the red run bar — 04 Actions — pinned to the bottom edge with the counts and **Compress all**. At 390 the ticket folds under the drop zone and the run bar spans the width.

FORM: The Two-Rail Proof, locked 2026-10-20 from the surface round, seed key 3ccb6de0, code-led.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Command palette and "open on phone" QR are rejected in the Stage 4d shell decision. The palette repeats the wordmark and both toggles behind a shortcut the general public does not know. The QR moves a URL, not data, so it would promise a handoff that the local-only Tool cannot make.
- ICC profiles and animated output are out of v2.
