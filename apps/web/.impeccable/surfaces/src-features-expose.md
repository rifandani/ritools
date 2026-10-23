---
version: 1
slug: "src-features-expose"
primary_target: "src/features/expose"
related_targets: ["src/routes/expose.tsx"]
---

# Expose (/expose)

## Scope

- Surface: the Tool at `/expose`, feature `src/features/expose`. The engine seam, the Sample Images, the copy contract, and the format support matrix are fixed by the shape issue.
- Mode: Operate. A person opens one image, reads the Metadata Report, chooses a Clean Preset, presses **Clean**, reads the Verification, and downloads the Cleaned File.
- Extension of the established Ransom Calling Card world, not a new world. Palette, type, angles, motion grammar, and tokens stay.
- Brief and state matrix: `docs/plans/expose.md` (confirmed 2026-10-23), including the engine seam and the copy contract.

## Audience and job

A person is about to send, publish, or upload one image and wants to know what is inside it before someone else does: a seller with a photo of an item at home, a journalist checking a source image, a designer checking a client export, or anyone who has heard that a photo can carry a GPS point, a camera serial number, or an AI manifest. They will not install a desktop tool or make an account for one file. They need the hidden facts in plain words, a clean that keeps the image working, and proof of what changed.

## Outcome and proof

Primary task: open one image, read the Metadata Report, choose a Clean Preset or Custom groups, press **Clean**, read the Verification, and download the Cleaned File.

Success: the report is readable without knowing a tag name; the GPS point, the AI Provenance, and the thumbnail are visible before any clean; the order states what will be removed and what will stay; the Verification proves the result with a second read; the whole flow works with the keyboard alone; both Locales carry every string.

Proof: the named engines, the real Sample Images, the container badges, the field counts, the second read, the payload hash, and the local-only path. No testimonials, benchmarks, or competitor claims.

## Constraints

- WCAG 2.2 AA in both modes, 390 px to 1440 px. Keyboard alone completes the flow.
- Every count, byte size, coordinate, and percentage in the one numerals face, in fixed columns. No state by colour alone.
- Ransom only on "Expose". Outcome words use the Poster Title voice; the design rule reserves Ransom for names and the Squeeze outcome words.
- Controls are the standard React Aria components in `src/core/components/ui`.
- Copy uses the glossary terms exactly. Both Locales carry every string. "No upload", never "secure"; "not validated", never "authentic".
- One file per session. Images only. No batch, no per-field removal, no ICC or orientation removal.
- No application code outside the route and the feature. No engine change.

## Direction contract

THESIS: Expose is a redaction desk. The image is the exhibit pinned on white stock, the Metadata Report is the case file ruled into ten groups, and the Clean Preset is a redaction order stamped in red. It refuses the metadata-tool default: a centered upload card over a wall of monospace tags, where the only way to understand the file is to read tag names.

OWN-WORLD: Ransom Calling Card, unchanged. Poster Red, ink, paper, white; zero radius; 2px rules and 3px heavy rules; no shadows, glass, or gradients; 4deg tilt and 16deg slash only; Martian Mono at 75% width for every number; printed marks that outline, fill when pressed, strike when disabled, and bracket on focus. The one ink field is the Offline Locator; the one red action mark is **Clean**.

STORY: The visitor drops one image. The desk fills: the exhibit, the case file, the evidence. They open a group and read the fields, see the GPS point and the C2PA Manifest, and choose a Clean Preset. The redaction order names what will go and what will stay. They press **Clean**; the cleaner downloads once, then reads the result again. The receipt says 0 fields remain in the selected groups, the kept groups still read, Display Metadata stays, and the payload is untouched. They download the Cleaned File; the input never moves.

FIRST VIEWPORT: Red navbar. A paper masthead with the ransom "Expose" at display scale, the promise beside it, and a local-only stamp at right. Below, three zones on paper: the **Exhibit** (4/12) with the image preview in a 2px frame, the facts line, the Offline Locator on ink, the AI evidence, and the thumbnail; the **Case file** (5/12) with the Report and Raw marks and the ten group rows, each with a count in a fixed column; the **Redaction order** (3/12) with the four Clean Preset cards, the remove and keep lines, the Display lock, and the red **Clean** mark. At 390 the masthead, the exhibit, and the start of the case file are in the first viewport; the order follows the case file, and a sticky bottom bar names "Clean · N fields" without starting it.

FORM: The Redaction Desk, code-led. Selected from three structures in the shape plan; no seed roll, because the world and the two verbs constrain the composition. The alternate was a contact sheet with a side panel; it made the report a gallery and the clean a settings form. The second alternate was a dossier column with the report at left and the clean at right; it pushed the exhibit below the fold. The desk keeps all three objects visible at 1440 and reads as one sheet at 390.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster and Sample Image carrying its provenance line.

## Surface matrix

| Viewport | Mode | Structure | What changes |
| --- | --- | --- | --- |
| 1440 | Light | Three zones; masthead above; receipt and explainer below. | Paper ground, ink rules, red navbar, white exhibit frame, ink locator plate. The order is sticky below the navbar. |
| 1440 | Dark | Same three zones. | Carbon ground, paper text, red navbar, carbon-raised exhibit frame, ink locator plate with paper rules. Red words use `--primary-ink-dark`; fills use `--primary`. |
| 390 | Light | One column: masthead, exhibit, case file, order, receipt, explainer. | The image preview is full width; the group rows stack; the Raw table becomes a definition list; the sticky bottom bar is paper with a 2px ink top rule. |
| 390 | Dark | Same one column. | Same tokens; the sticky bar is carbon with a 2px paper top rule. No state depends on hue. |

Both modes must meet AA for body text, labels, counts, disabled reasons, and the locator's pin against its plate. The two reds rule holds: `--primary` fills and rules, `--primary-ink` writes. Danger is burnt vermilion, never Poster Red.

## States

The plan's state matrix is the source. The brief covers these states at both widths and both modes:

- **Empty:** masthead, drop zone, two Sample Image actions. The drop zone is a button.
- **Sample:** the full desk with a Sample Image badge and the provenance disclosure for the camera or the AI sample.
- **Reading:** the exhibit and case file reserve their space; a square loader and the reading line; no layout shift.
- **Read error:** a note with the reason and "Choose another file".
- **Unsupported format:** the named format list.
- **No metadata:** ten groups at 0; the clean order is disabled with the reason; Download the original.
- **Large-file warning:** a confirm dialog above 200 MB; "Read it anyway" and "Choose another file".
- **Clean not supported:** JPEG XL + AI Provenance, or a preset that needs a format-limited group. The preset or group is disabled with the reason; Custom without the group still works.
- **Engine loading:** a printed progress bar in the order; Cancel available; the first clean names the download.
- **Engine offline:** the cleaner is not cached; retry is disabled while offline; Download the original.
- **Engine failed:** the cleaner failed to load; retry and Download the original.
- **Cancelled:** the order returns, the report is unchanged; Clean again.
- **Clean error:** a danger note, the file is unchanged; retry or Download the original.
- **Success:** the Verification receipt replaces the order; Download the Cleaned File; clean again or clean another.

A failure is shown where the action happened, not as a toast. A toast is reserved for a copy action.

## Interaction

1. Drop or choose one image, or open a Sample Image. The drop zone and the sample buttons are the only entry points.
2. The report opens with the exhibit, the case file, and the order. Focus moves to the report heading. The Report view is the default; Raw is one tab away.
3. Open a group to read its fields. The count stays fixed. The Display row is locked and explains why.
4. Choose a Clean Preset. The order states the remove and keep counts, and the Display lock. Custom reveals the group checkboxes.
5. Press **Clean**. The mark becomes **Cancel**; the progress line names the engine load, the clean, and the Verification. The first clean shows the download; later cleans work offline.
6. The receipt replaces the order. Focus moves to the Verification heading. The download is enabled only when the selected groups read 0 and the payload is unchanged.
7. **Clean this image again** returns to the order with the same file and selection. **Clean another image** clears the desk.

Cancellation is a state, not a silent reset. A format limit is a named state, not a disabled mark without a reason. The Clean mark never starts on a drop, a preset change, or a group change.

## Boundaries

- Images only: JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, GIF.
- One file per session. No batch, queue, folder, or watch folder.
- Removal is by Metadata Group. No per-field removal.
- Display Metadata is always kept. No ICC or orientation removal.
- GIF reads image details and AI Provenance only. JPEG XL keeps its C2PA Manifest (ADR-0018).
- The Offline Locator loads no tiles, does no reverse geocoding, and offers no external link. The world outline is Natural Earth 1:110m land, public domain, shipped with the app.
- Expose removes metadata only. It does not remove Pixel Watermarks, detect AI-generated images, or validate C2PA signatures.
- The input is never overwritten. The download is a new file, `stem-clean.ext`.

## Unresolved

- Whether the order stays sticky at 1440 or scrolls with the case file. The sticky column must not clip the last group at a 768 px viewport height; the builder measures and keeps the Clean mark reachable.
- Whether the Raw view at 390 is a definition list or a table in a labelled scroll region. Either way, no horizontal page scroll.
- The measured install cost of precaching the two Sample Images (2,577,122 bytes together). Each is under the 2 MiB ceiling; if the install budget objects, move them to the runtime cache and say "works offline after the first view".
