# Squeeze v2 — confirmed brief and state matrix

Status: **confirmed** (2026-10-20). Stage 3a of the Ritools redesign.
Target: `apps/web`, route `src/routes/squeeze.tsx`, feature `src/features/squeeze/`.
Mode: **Operate**. World: **Ransom Calling Card** (seed key `79d27ab4`), unchanged.

Confirmed answers:

1. **Six outputs and GIF/BMP input.** JPEG, WebP, AVIF, PNG, Keep, Multi (JPEG + WebP + AVIF). GIF and BMP are accepted as input, first frame only; Keep writes PNG for them.
2. **Batch total: even split, then one redistribution pass.** Per-image overrides are disabled in Batch total.
3. **No competitor comparison table.** Ritools copy only, with Ritools facts.

---

## 1. Brief

### Job and audience

A person has a Batch of images and a hard size limit: a CMS upload cap, an email or chat limit, a government or university form, a product feed. They are not necessarily technical. They want every image under the limit, or the whole Batch inside one budget, without an account, an upload, or a paid tier. They arrive with the files already on the device, often in a folder.

The author is the first user and the standard: the Tool must be good enough that he stops reaching for the paid equivalent.

### Outcome and proof

Primary task: choose an Output Format, a Size Mode, and the options; add files or folders; press **Compress all**; read each row's outcome; download one file or the ZIP.

Success: every row states its outcome in text and shape; the Batch summary states the totals; a person can finish the whole flow with the keyboard alone; a screen reader hears progress and the final counts; both Locales carry every string.

Proof: the named codecs (MozJPEG, WebP, libavif, oxipng), the bisection over a quality ladder, the local-only path, and the device limit. No testimonials, benchmarks, or competitor claims.

### Selected direction

The established **Ransom Calling Card** world. Palette, type, angles, motion grammar, and tokens are fixed. The one signature move is the ransom assembly of the Tool name and the outcome words. Composition inside that world is the surface concept round below.

### Scope and boundaries

- `/squeeze` and `src/features/squeeze/` only. The shared shell does not change.
- No command palette, no “open on phone” QR. Both belong to the shared shell; record as a later shell decision.
- No application code in this stage. No direction contract until the layout is locked.
- The below-the-Tool section is Ritools copy only. No competitor names, no comparison table.
- Input formats: JPEG, PNG, WebP, AVIF, GIF, BMP. Everything else is Rejected.
- Output formats: JPEG, WebP, AVIF, PNG, Keep, Multi.
- No per-image output format override in v2. One Output Format per Batch.
- No animated output in v2. An animated GIF becomes a still image from its first frame.
- No ICC colour-profile preservation in v2. Only EXIF, and only in JPEG output.

### Interaction and layout, in brief

Numbered setting groups `01` Output format, `02` Size target, `03` Options, `04` Actions, beside a files area with a drop zone, a files ledger, a Batch summary, and one status line. **Compress all** is explicit; nothing starts on a drop or a settings change. **Download all as ZIP** and **Clear all** sit beside it. A per-format notice says each codec loads on first use.

Below the Tool: a short section on why a target beats a quality slider, three real use cases, and an FAQ. Both Locales.

### Constraints

- WCAG 2.2 AA in both colour modes, 390 px to 1600 px.
- Keyboard alone completes the flow. The drop zone is a button, not a drag-only target.
- Every byte size, percentage, budget, and count uses the one numerals face in fixed columns.
- Every state reads by text and shape, never by colour alone.
- Ransom only on “Squeeze” and the outcome words: DONE, ALREADY FITS, MISS, BIGGER, REJECTED. Never on labels, inputs, file names, or numbers.
- Controls are the standard React Aria components in `src/core/components/ui`.
- Copy: “no cap”, never “unlimited”; “the same codecs”, never “the same quality”.
- Product claims are verifiable only. The AVIF encoder is 3.5 MiB (ADR-0011); no other codec size is claimed.
- Device memory and CPU limit the Batch. The UI names that limit.
- The Batch lives in this tab. A reload clears it.

---

## 2. Decisions

### Output Format

Six choices, each with a short codec note:

| Choice | Codec note | What it writes |
| --- | --- | --- |
| JPEG | MozJPEG · opens everywhere | `.jpg`, alpha flattened on white |
| WebP | Native · smaller than JPEG | `.webp`, alpha kept |
| AVIF | WASM · smallest, slowest | `.avif`, alpha kept |
| PNG | Lossless · a Target may reduce colours | `.png`, alpha kept |
| Keep | The input format, unchanged | Each input's format; GIF and BMP become PNG |
| Multi | JPEG + WebP + AVIF · three files | Three files per image; never PNG |

PNG is an explicit output. The codec is already shipped, and without it a user cannot ask for PNG from a JPEG except through Keep, which cannot express a conversion. Multi never includes PNG: it is the web-delivery set, and PNG would inflate the ZIP.

### Input

| Input | How Squeeze reads it | Keep writes |
| --- | --- | --- |
| JPEG | Browser decode; EXIF available | JPEG |
| PNG | Browser decode; alpha kept | PNG |
| WebP | Browser decode; alpha kept | WebP |
| AVIF | Browser decode; alpha kept | AVIF |
| GIF | First frame only; alpha kept | PNG |
| BMP | Single frame; alpha kept | PNG |

Animated GIF: **first frame only**, stated at input and on the row. Squeeze cannot encode GIF or BMP, so Keep writes PNG for those inputs. Dropping the same file twice is de-duplicated by name, byte size, and last-modified time; the status names how many were already in the Batch.

### Size Mode

| Mode | What it is | Per-image override |
| --- | --- | --- |
| Per-image target | One Target for the Batch, reached by search | Allowed, 10 KB to 10 MB |
| Batch total | One budget split across the Batch, with a live per-image budget readout | Disabled |
| Fixed quality | One quality, 10 to 95; no Target | Disabled |

Target range: 10 KB to 10 MB. The engine counts 1000 bytes per KB.

### Batch total rule

1. `share = floor(total / N)`. If `share` is under 10 KB, the mode is invalid: “Under 10 KB per image. Raise the total or remove files.” **Compress all** is disabled.
2. Every image runs to `share` first. Images already under it are ALREADY FITS; their unused bytes form a pool. Rejected images contribute nothing.
3. One redistribution pass: the pool is shared equally among the misses, each capped at what it needs (its smallest output minus the share). Leftover from a capped miss returns to the remaining misses, repeating within that pass until the pool is under one byte per remaining miss or every need is met.
4. Each miss re-runs only under its raised Target. A row that now fits is DONE with the note “Budget raised to X”. A row that still cannot fit is MISS with “Budget raised to X · still over”.
5. Adding or removing a file re-shares the budget and marks every result stale. The run holds the settings snapshot it started with; a change during a run lands under the old key and is marked stale.
6. If the total is larger than the sum of inputs, every image can fit; the summary says so. The unused budget is not spent for its own sake.
7. Multi is not available with Batch total: one budget would have to describe three files per image. The two choices disable each other with a reason; neither auto-switches.

### Options

| Option | Default | Applies | Disabled when | Reason |
| --- | --- | --- | --- | --- |
| Resize larger images | Off | All outputs; max width and max height, both optional, 16 to 10000 px; fit inside both; never upscale | Never | — |
| Preserve EXIF | Off | JPEG output only: JPEG output, Multi's JPEG file, Keep's JPEG rows | No JPEG output, or no JPEG input in Keep | “EXIF is kept for JPEG output only.” |
| Preserve folder structure | On when a folder is added | The ZIP only; not the encoded bytes | No item has a folder path | “No folders in this Batch.” |

Resize uses two fields, not one longest-edge field. If both are set, the image fits inside both. A resize forces an encode, so it ends ALREADY FITS for that image. The row names the source and output pixel dimensions.

EXIF is copied from the source JPEG. When it is on, pixels are decoded without orientation applied, so the preserved orientation tag is honoured once. When it is off, orientation is applied to the pixels and the output carries no EXIF. An image that is ALREADY FITS keeps its original bytes, including its EXIF, because re-encoding it only to strip metadata would cost quality and bytes. The FAQ says this.

Folder structure affects only the ZIP. Changing it does not stale a compression result. The ZIP mirrors the dropped or watched root: dropping `trip` writes `trip/day1/a.jpg`.

### Flow

1. Set the groups, or add files first. The order is free.
2. Add files with the file picker, add a folder, or watch a folder.
3. Press **Compress all**. While it runs, the same mark reads **Stop**. Stop keeps the results that landed and leaves the rest queued, not stale.
4. Read the rows and the summary. Download one row, one format of a Multi row, or the ZIP.
5. Change a setting: affected results become stale. **Compress all** picks them up.
6. **Clear all** opens a confirm dialog when results exist; with no results it is disabled.

No auto-run on drop, on a settings change, or on a watched file. A watched file joins the Batch and the status says how many are waiting.

---

## 3. Row grammar

At desktop the files area is a ledger. At 390 px the same row stacks; it is one DOM tree, not two.

| Column | Content | Face |
| --- | --- | --- |
| State | Outcome word, plus a square state mark | Ransom, compact; the plain word for assistive technology |
| File | Name, folder path, input format tag | Archivo; the path is muted |
| In | Input bytes | Numerals face, right-aligned, fixed width |
| Out | Output bytes, or “—” | Numerals face, right-aligned, fixed width |
| Δ | Saved or bigger, with sign | Numerals face, right-aligned, fixed width |
| Notes | Resize, colours, flatten, first frame, EXIF, bigger than input, stale | Archivo, muted |
| Actions | Download, Recompress, Remove; secondary actions in a menu | Label voice |

Multi rows:

- The headline is the aggregate outcome. The Out column says “3 files”. The Δ compares the sum of the three outputs with the input.
- Three sub-lines follow, one per format, each with a format tag, its own size, its own Δ, and a small stamp: DONE, MISS, or FAILED. The stamps are label voice, not ransom.
- Each sub-line has its own Download action. The row's main Download downloads a small ZIP of the three.
- The headline rule: all three meet the Target → DONE; any misses → MISS with “N of 3 under target”; a codec fails on one or two formats → the worst written outcome plus “N of 3 written”; all three fail → REJECTED.
- In Fixed quality, DONE if the sum of the three outputs is at or under the input; BIGGER if it is over. The sub-lines carry each format's own sign.
- In Batch total, Multi is not offered.

A normal row's note set:

- `Resized 4032×3024 → 1600×1200`
- `Colors reduced` (PNG quantised in a Target mode)
- `Flattened on white` (alpha to JPEG)
- `First frame` (GIF)
- `EXIF kept` (JPEG, option on)
- `Bigger than input +18%` (a DONE row whose output grew)
- `Original used` (ALREADY FITS)
- `Out of date` (stale result)

A stale row keeps its last numbers and outcome, muted, with a `STALE` stamp and the note “Out of date”. The numbers are not struck through: the strike means disabled, not old. **Recompress** is the row action; **Compress all** includes it.

---

## 4. Outcome rules

### Target modes (Per-image, Batch total)

- **ALREADY FITS** only when the output format equals the input format (Keep or an explicit same format), no resize is needed, and the input is at or under its Target. The original bytes are used; nothing is encoded.
- **DONE** when the encoded output is at or under the Target.
- **DONE + “Bigger than input”** when the output is at or under the Target but larger than the input. The Target is the contract; the growth is named.
- **MISS** when the smallest output is still above the Target. The row keeps the smallest output it made, names the smallest quality or colour step, and offers the three ways out: raise the Target, resize, or another output format. If no attempt was smaller than the input, the row keeps the original and says “No smaller file; original kept.”
- **REJECTED** when the input is unsupported or unreadable, the codec fails, the codec is not cached offline, or the image is too large for the device.
- A conversion always encodes, even when the input is already under the Target. If the converted output is larger than the input but under the Target, it is DONE with the growth note. If it is over the Target, it is MISS and the smallest converted file is delivered; the row names both sizes. Same-format work keeps the original when the encoded output is not smaller; a conversion and a resize deliver the encoded file, because the format or the size was the request.
- Multi and Batch total never combine.

### Fixed quality

- **DONE** when the output is at or under the input.
- **ALREADY FITS** when the output format is the same, no resize is needed, and the encode is not smaller. The original is kept.
- **BIGGER** when a conversion, or a resize, produces a file larger than the input. It is delivered: the user chose the format or the size. The row names the growth and offers **Try Keep**.
- No MISS: there is no Target.
- **REJECTED** as above.

### PNG in Fixed quality

PNG has no quality setting. The quality control is disabled with “PNG has no quality setting. It stays lossless.” The mode still runs: PNG is optimised losslessly. If the Batch mixes formats under Keep, the quality control applies to the non-PNG rows and the PNG rows stay lossless; if every input is PNG, the control is disabled.

### Bigger in Target modes

BIGGER is only an outcome in Fixed quality. In a Target mode a bigger output can still be DONE, with the note “Bigger than input +18%”. The summary counts it as DONE, and the total is honest.

---

## 5. State matrix

Notation: **D** DONE · **F** ALREADY FITS · **M** MISS · **B** BIGGER · **R** REJECTED · **D+** DONE with the bigger-than-input note · **—** not available.

The matrix assumes the default options (no resize, EXIF off, folder structure on when relevant). The option section after the tables states what changes.

### 5.1 JPEG output

| Input | Per-image target | Batch total | Fixed quality |
| --- | --- | --- | --- |
| JPEG | F if under Target and no resize; else D / M; D+ if the output grows but fits | F if under the share; else D / M; redistribution can turn M into D; D+ as left | D if smaller; F if not (original kept); EXIF optional |
| PNG | D / M; alpha flattened on white; never F; D+ if converted JPEG grows but fits | D / M with the share; alpha flattened; redistribution can fit; never F | D if smaller; B if larger; alpha flattened; deliver either way |
| WebP | D / M; never F; D+ as above | D / M with the share; never F; redistribution can fit | D if smaller; B if larger; deliver |
| AVIF | D / M; never F; D+ as above; usually smaller | D / M with the share; never F | D if smaller; B if larger; deliver |
| GIF | D / M; first frame; alpha flattened; never F | D / M with the share; first frame; redistribution can fit | D if smaller; B if larger; first frame |
| BMP | D / M; never F | D / M with the share; redistribution can fit | D if smaller; B if larger |

Row notes: `Flattened on white` when alpha was present; `First frame` for GIF; `EXIF kept` only when the option is on and the source is JPEG.

### 5.2 WebP output

| Input | Per-image target | Batch total | Fixed quality |
| --- | --- | --- | --- |
| JPEG | D / M; never F; D+ if it grows but fits | D / M with the share; D+; redistribution can fit | D if smaller; B if larger; deliver |
| PNG | D / M; alpha kept; never F | D / M with the share; alpha kept | D if smaller; B if larger; alpha kept |
| WebP | F if under Target and no resize; else D / M; D+ | F if under the share; else D / M; redistribution can fit | D if smaller; F if not (original kept) |
| AVIF | D / M; never F; D+ | D / M with the share | D if smaller; B if larger |
| GIF | D / M; first frame; alpha kept | D / M with the share; first frame | D if smaller; B if larger; first frame |
| BMP | D / M; never F | D / M with the share | D if smaller; B if larger |

### 5.3 AVIF output

| Input | Per-image target | Batch total | Fixed quality |
| --- | --- | --- | --- |
| JPEG | D / M; never F; D+ if it grows but fits; slowest | D / M with the share; D+; redistribution can fit | D if smaller; B if larger; slowest |
| PNG | D / M; alpha kept; never F | D / M with the share; alpha kept | D if smaller; B if larger; alpha kept |
| WebP | D / M; never F; D+ | D / M with the share | D if smaller; B if larger |
| AVIF | F if under Target and no resize; else D / M; D+ | F if under the share; else D / M; redistribution can fit | D if smaller; F if not (original kept) |
| GIF | D / M; first frame; alpha kept | D / M with the share; first frame | D if smaller; B if larger; first frame |
| BMP | D / M; never F | D / M with the share | D if smaller; B if larger |

Row note: `AVIF · slowest` is already in the choice note; do not repeat it on every row.

### 5.4 PNG output

| Input | Per-image target | Batch total | Fixed quality |
| --- | --- | --- | --- |
| JPEG | D / M; lossless first, `Colors reduced` if the Target needs it; never F | D / M with the share; `Colors reduced` as needed | Quality control disabled; lossless PNG; D if smaller, B if larger; deliver |
| PNG | F if under Target and no resize and lossless; else D / M; `Colors reduced` only when quantised | F if under the share; else D / M; `Colors reduced` as needed; redistribution can fit | Quality control disabled; lossless optimise; D if smaller; F if not (original kept) |
| WebP | D / M; alpha kept; `Colors reduced` as needed; never F | D / M with the share; alpha kept | Quality control disabled; lossless PNG; D if smaller, B if larger |
| AVIF | D / M; alpha kept; `Colors reduced` as needed; never F | D / M with the share; alpha kept | Quality control disabled; lossless PNG; D if smaller, B if larger |
| GIF | D / M; first frame; alpha kept; `Colors reduced` as needed; never F | D / M with the share; first frame | Quality control disabled; lossless PNG; D if smaller, B if larger; first frame |
| BMP | D / M; alpha kept; `Colors reduced` as needed; never F | D / M with the share; alpha kept | Quality control disabled; lossless PNG; D if smaller, B if larger |

EXIF is disabled for PNG output: “EXIF is kept for JPEG output only.” A JPEG input's EXIF is dropped.

### 5.5 Keep output

| Input | Per-image target | Batch total | Fixed quality |
| --- | --- | --- | --- |
| JPEG | F if under Target and no resize; else D / M; D+ if it grows but fits; EXIF optional | F if under the share; else D / M; redistribution can fit; EXIF optional | D if smaller; F if not (original kept); EXIF optional |
| PNG | F if under Target and no resize and lossless; else D / M; `Colors reduced` only when quantised | F if under the share; else D / M; `Colors reduced` as needed | Quality control disabled if every input is PNG; lossless optimise; D if smaller; F if not |
| WebP | F if under Target and no resize; else D / M; D+ | F if under the share; else D / M; redistribution can fit | D if smaller; F if not (original kept) |
| AVIF | F if under Target and no resize; else D / M; D+ | F if under the share; else D / M | D if smaller; F if not (original kept) |
| GIF | D / M; Keep writes PNG; first frame; never F | D / M with the share; Keep writes PNG; first frame | Keep writes PNG; lossless; D if smaller; B if larger |
| BMP | D / M; Keep writes PNG; never F | D / M with the share; Keep writes PNG | Keep writes PNG; lossless; D if smaller; B if larger |

EXIF under Keep: enabled when at least one input is JPEG; it applies to the JPEG rows only. If every input is non-JPEG, it is disabled with “No JPEG output in this Batch.”

### 5.6 Multi output

Multi is available in Per-image target and Fixed quality. Batch total is disabled with: “Multi writes three files per image. A Batch total counts one budget, not three files. Use Per-image.”

| Input | Per-image target | Fixed quality |
| --- | --- | --- |
| JPEG | Three outputs each searched to the Target/override. All fit → D; any miss → M with “N of 3 under target”; a codec failure → the worst written outcome + “N of 3 written”. EXIF applies to the JPEG file only. | Three outputs at the chosen quality. Sum at or under the input → D; sum over → B. Sub-lines carry each sign. EXIF on the JPEG file only. |
| PNG | As JPEG. JPEG output flattens alpha on white; WebP and AVIF keep it. All fit → D; any miss → M. | As JPEG. Alpha kept in WebP and AVIF; flattened in JPEG. Sum decides D or B. |
| WebP | As JPEG. All fit → D; any miss → M. | As JPEG. Sum decides D or B. |
| AVIF | As JPEG. All fit → D; any miss → M. | As JPEG. Sum decides D or B. |
| GIF | First frame in all three. JPEG flattens; WebP/AVIF keep alpha. All fit → D; any miss → M. | First frame in all three. Sum decides D or B. |
| BMP | As JPEG. All fit → D; any miss → M. | As JPEG. Sum decides D or B. |

A Multi row never says ALREADY FITS: it always writes three new files. A row whose sum grew but every file still meets the Target is D with “Bigger than input”. Per-image overrides in Per-image mode apply the same cap to each of the three files. The ZIP writes one stem with three extensions: `photo.jpg`, `photo.webp`, `photo.avif`.

### 5.7 Options, by output

| Output | Resize | EXIF | Folder structure |
| --- | --- | --- | --- |
| JPEG | Always available; forces an encode; row shows `Resized W×H → W×H` | Enabled when a JPEG input exists; applies to re-encoded JPEGs; ALREADY FITS keeps the original's EXIF | ZIP only; enabled when a folder path exists |
| WebP | As above | Disabled: “EXIF is kept for JPEG output only.” | As above |
| AVIF | As above | Disabled with the same reason | As above |
| PNG | As above | Disabled with the same reason | As above |
| Keep | As above | Enabled if at least one JPEG input; applies to JPEG rows only; non-JPEG rows drop EXIF; disabled if no JPEG input | As above |
| Multi | As above | Enabled if at least one JPEG input; applies to the JPEG file only; note “JPEG file only” | As above; three files share the folder path |

Option edge states:

- Max width or max height under 16, over 10000, or not a number: the field prints an error line, and **Compress all** is disabled until it is valid. Clamping happens on blur, never per keystroke.
- Both fields empty: no resize.
- One field set: that edge is the cap; the other is free.
- EXIF on, then the Output Format changes to a non-JPEG choice: the stored value stays on, the control is disabled with the reason, and the change stales results anyway. Returning to JPEG re-enables it.
- Folder structure on with no folders: disabled, not an error. Adding a folder re-enables it.
- Folder structure off: the ZIP is flat; duplicate names get `-2`, `-3` before the extension.
- EXIF and Multi: only the JPEG file carries it; WebP and AVIF do not. This is a v2 limit, stated in the option description.

### 5.8 Edge states

| Case | Outcome | Row and page display |
| --- | --- | --- |
| Empty Batch | — | Files area: “No images yet. Drop a Batch, or choose a folder.” Summary `0 images · 0 B`. Compress all, Download all, Clear all disabled. The settings stay editable. |
| Batch where every image misses | All MISS | Summary: “0 of N under Target · X over.” Three global actions: Raise the Target (focuses the field), Resize (focuses the max fields), Try AVIF (sets the Output Format if it is not AVIF). Rows keep their smallest output; Download all still works. |
| Mixed Batch | Each row its own outcome | Summary counts DONE, ALREADY FITS, MISS, BIGGER, REJECTED in fixed columns. Download all includes DONE, ALREADY FITS, MISS, and BIGGER; excludes REJECTED and names how many were left out. |
| 100+ image Batch | Allowed; no count cap | 2 to 4 workers at once, bounded by cores. The status line names the device limit. The summary and Compress all stay reachable without scrolling to the top. Rows do not animate on entry. Progress is announced at 25%, 50%, 75%, and completion, not per row. |
| Duplicate file names | Both rows run | The ZIP assigns a unique stem per folder: `photo.jpg`, `photo-2.jpg`. Multi writes one stem with three extensions; `photo.png` and `photo.jpg` both converting to JPEG become `photo.jpg` and `photo-2.jpg`, with matching `.webp` and `.avif`. |
| Unsupported input | REJECTED | “Squeeze does not read this file type.” Not in the ZIP. Remove. The rest of the Batch continues. |
| Unreadable input | REJECTED | “Squeeze cannot read this image.” Not in the ZIP. Remove. |
| Out of memory on one large image | REJECTED `too-large` | “Too large for this device. Try Resize.” Action: Set Resize. The rest of the Batch continues. |
| Codec fails on one image | REJECTED `codec-failed` | “The encoder failed on this image.” Action: Try another Output Format. The rest continues. |
| Codec not cached, offline | REJECTED `codec-offline` | “AVIF is not cached yet. Connect once, then it works offline.” Retry is disabled while offline. If every row needs it, the page says “Connect once to load AVIF.” |
| Settings changed after a run | Results stale | Affected rows keep their numbers, muted, with `STALE` and “Out of date”. Compress all reads “Compress all · N out of date”. Download still returns the old bytes. |
| Compress all during a run | — | The mark reads Stop. Stop keeps landed results; the rest stay queued, not stale. Clear all stops first, then asks to confirm. |
| Watch folder, unsupported browser | — | Watch folder is disabled with “Watch folder works in Chrome and Edge. Drop files instead.” |
| Watch folder, permission denied | — | Status: “Watch folder permission denied. Drop files instead.” The action returns to idle; no repeated prompt. |
| Watch folder, new file during a run | Queued | The new file joins the Batch as queued; it is not in the current run's snapshot. Status: “N new files · Compress all”. In Batch total, the addition re-shares the budget and marks existing results stale. |
| Watch folder, file removed from the folder | Row stays | Watching adds, never removes. The row and its result stay until the user removes them. |
| Folder contains non-images | Skipped | Status: “N images · M files skipped.” Skipped files are not rows. |
| Tab out of memory or reload | Batch lost | The Batch lives in this tab. A reload clears it. The page states this near the files area, once, quietly. |

---

## 6. Copy and the page section

### Tool copy

- H1: `Squeeze` (Ransom).
- Promise: “Compress images to a target file size, on your device.”
- Intro: “Set the size you need, or one budget for the whole Batch. Squeeze searches the codec's quality ladder for the best result under your limit. No upload, no account, no cap.”
- Drop zone: “Drop images or folders here.” / “JPEG, PNG, WebP, AVIF, GIF, BMP · GIF and BMP use the first frame · folders keep their paths.”
- Empty files area: “No images yet.”
- Codec notice: “Each codec loads on first use, then works offline. AVIF is 3.5 MiB.”
- Device limit: “No cap. Your device sets the limit: 2 to 4 images run at once, and a very large image can run out of memory.”
- Batch-tab note: “The Batch lives in this tab. A reload clears it.”
- Mode notes:
  - Per-image: “One Target for every image. Override one row if it needs a different limit.”
  - Batch total: “One budget for the Batch. Each image gets an even share; unused bytes go to the images that miss.”
  - Fixed quality: “One quality for every image. No Target, no search.”
- EXIF note: “JPEG output only. An image already under target keeps its original file, metadata included.”
- PNG in Fixed quality: “PNG has no quality setting. It stays lossless.”
- Miss note: “The smallest file is still over. Raise the Target, resize, or try another format.”
- Bigger note: “The output is larger than the input. You asked for this format or size.”
- Stale note: “Settings changed. Compress all again.”
- Multi + Batch total: “Multi writes three files per image. A Batch total counts one budget, not three files. Use Per-image.”
- Watch unsupported: “Watch folder works in Chrome and Edge. Drop files instead.”
- Watch denied: “Watch folder permission denied. Drop files instead.”

### Below the Tool

Heading: “Why a target beats a slider” (Poster Title voice, not Ransom).

Lead: “A quality slider guesses. A Target is the limit you already have: the upload cap, the inbox limit, the form's rule. Squeeze searches the quality ladder for the best rung under that limit, for every image in the Batch.”

Three use cases:

1. **A site with an upload cap.** “A CMS or a product feed rejects a file over its cap. Set the cap once; every image lands under it.”
2. **A form with a strict limit.** “A visa, university, or government form sets a size per file. Squeeze fits each photo to that number.”
3. **An inbox and a slide deck.** “Mail and chat clients trim large attachments. A Target keeps the image intact and the message moving.”

FAQ, both Locales:

- **Is Squeeze free?** “Yes. No account, no cap, no paid tier. The only cost is your device's memory and CPU.”
- **Do my images leave the device?** “No. Squeeze reads and writes them in the browser. There is no upload endpoint.”
- **Which formats can I use?** “Input: JPEG, PNG, WebP, AVIF, GIF, BMP. Output: JPEG, WebP, AVIF, PNG, the input format, or Multi (JPEG + WebP + AVIF). GIF and BMP use the first frame.”
- **Why did my PNG lose colours?** “PNG has no quality setting. In a Target mode Squeeze can reduce the colour count to reach the Target; the row says so. In Fixed quality it stays lossless.”
- **What is a Miss?** “The smallest file Squeeze could make is still over the Target. The row keeps that file and shows the three ways out: raise the Target, resize, or try another format.”
- **Does it work offline?** “After the page and a codec have loaded once, yes. Each codec loads on first use.”
- **Why is AVIF slow?** “AVIF compresses harder and takes longer to encode. It is the smallest of the three web formats.”
- **How many images can I add?** “No cap. Your device sets the limit: 2 to 4 images run at once, and a very large image can run out of memory.”
- **Is EXIF kept?** “Only in JPEG output, when you turn it on. An image already under target keeps its original file, metadata included.”
- **What happens to an animated GIF?** “Squeeze reads the first frame. The output is a still image; the animation is not kept.”
- **Does a reload keep my Batch?** “No. The Batch lives in the tab. A reload clears it.”

No competitor names. No comparison table.

---

## 7. Accessibility, performance, and world rules

- **Outcome words** use the Ransom component with the plain word exposed to assistive technology. In the ledger they are compact; in the empty and all-miss states they can be poster scale.
- **State marks** are shapes, not colour: a square plate with a glyph for DONE, a hollow plate for ALREADY FITS, a crossed plate for MISS, an outward mark for BIGGER, a stop mark for REJECTED. The text always carries the state too.
- **One live region** for progress and completion. Announce 25%, 50%, 75%, completion, and the final counts. Do not announce every row of a 100+ Batch. The row's own text is in the DOM.
- **Keyboard:** every action is a button; the drop zone is a button; the target override is a labelled number field; the choice boxes are React Aria; focus stays on the pressed mark; after Remove, focus moves to the next row's Remove, else the drop zone.
- **Numbers:** the one numerals face, tabular and slashed zero, in fixed columns. The budget, sizes, percentages, and counts do not shift.
- **Colour modes:** both, AA. Red is never the only signal. Danger uses Burnt Vermilion, not Poster Red.
- **Motion:** chips assemble on entry; reduced motion holds the composed state. No row entrance animation in a 100+ Batch.
- **Performance:** 2 to 4 workers; one image per worker in memory; the codec WASM loads on first use and is cached at runtime (ADR-0011); the list does not virtualise below 100 rows unless the builder measures a need.
- **World:** zero radius; 2px and 3px rules; 4deg tilt and 16deg slash only; no shadows, glass, or gradients; the settings ground and the sticky summary are composition choices for the concept round, not new primitives.

---

## 8. Product truth (written 2026-10-20)

Approved and written: `PRODUCT.md`, ADR-0012, ADR-0013, and `apps/web/CONTEXT.md`. The text below is the record of what was written.

### 8.1 PRODUCT.md — Capabilities

Replace the Squeeze bullet with:

> - Squeeze is the first Tool, at `/squeeze`. It accepts a Batch of JPEG, PNG, WebP, AVIF, GIF, and BMP images. GIF and BMP contribute their first frame. Squeeze writes JPEG, WebP, AVIF, or PNG, keeps the input format, or writes JPEG, WebP, and AVIF together (Multi). It reaches a per-image Target, a Batch total, or a fixed quality. An image whose smallest output is still above its Target is a Miss.

Add to Constraints:

> - GIF and BMP are input only. Squeeze cannot write them: Keep writes PNG for those inputs. Multi writes JPEG, WebP, and AVIF, never PNG.
> - A Batch total is one budget split evenly across the Batch, with one redistribution pass over unused bytes. Per-image overrides apply only in Per-image target mode.
> - EXIF metadata is kept only in JPEG output.
> - An animated GIF becomes a still image: Squeeze reads the first frame.

### 8.2 ADR-0012 — Output format is a setting, and Multi writes three files

> # Output format is a setting, and Multi writes three files
>
> Squeeze no longer keeps each input format by definition. Output Format is a setting: JPEG, WebP, AVIF, PNG, Keep, or Multi. Keep writes the input format; GIF and BMP become PNG because Squeeze has no encoder for either. Multi writes JPEG, WebP, and AVIF for every image and never PNG.
>
> The old rule made the format a property of the input, not a choice. A person with a PNG that a form will not accept had no way to ask for JPEG. The four encoders are already shipped, so the choice costs no new codec. PNG is explicit because the codec exists and because Keep cannot express a conversion to PNG.
>
> Multi is the web-delivery set: the three formats a site can serve. PNG would inflate the ZIP and is not a delivery format for photographs. A Multi row writes one stem with three extensions, and one budget cannot describe three files, so Multi and Batch total are mutually exclusive; each is disabled with a reason, never auto-switched.
>
> ## Consequences
>
> A conversion is always delivered, even when it is larger than the input: the format was the request. A same-format encode still keeps the original when the output is not smaller. A Multi row can be larger in total than its input and still be DONE, because every file met its Target; the row says so. EXIF travels only with the JPEG file. The ZIP grows by three files per image, and the row grows three sub-lines and a per-format download.

### 8.3 ADR-0013 — A Batch total is one budget split across the Batch

> # A Batch total is one budget split across the Batch
>
> In Batch total mode, one byte budget covers the whole Batch. The budget is split evenly first: `share = floor(total / N)`, with a 10 KB floor per image. Unused bytes from images that fit under their share form a pool. One redistribution pass shares that pool equally among the misses, capped at what each one needs, and returns leftover from a capped miss to the rest until the pool is smaller than one byte per remaining miss or every need is met. A miss that now fits re-runs under its raised Target.
>
> An even split alone is predictable but wastes the budget: one 40 KB image can leave 160 KB unused while another image misses by 10 KB. Sequential remaining-budget allocation uses the bytes but punishes the images that arrive first. The even split plus one redistribution pass is deterministic, order-independent for the split, and uses the unused bytes where they can still change an outcome.
>
> Per-image overrides are disabled in this mode: the mode's point is one budget, and an override has no meaning against a share. Multi is disabled because one budget cannot describe three files per image.
>
> ## Consequences
>
> A Batch total is a budget, not a promise: if the pool cannot cover every need, some rows stay Miss and the summary says how far over the total the Batch lands. Adding or removing a file changes the share and marks every result stale; the run holds the settings snapshot it started with. The per-image budget is shown live in the settings group. The redistribution is deterministic for a given set of images and results.

### 8.4 apps/web/CONTEXT.md — Compression terms

Add or change:

> **Output Format**: The file format Squeeze writes: JPEG, WebP, AVIF, PNG, Keep, or Multi. _Avoid_: target format, codec, type
>
> **Keep**: The Output Format that writes each image in its input format. GIF and BMP become PNG. _Avoid_: same, original, passthrough
>
> **Multi**: The Output Format that writes JPEG, WebP, and AVIF for each image. _Avoid_: all formats, trio, bundle
>
> **Size Mode**: How Squeeze chooses output size: Per-image target, Batch total, or Fixed quality. _Avoid_: mode, strategy
>
> **Batch Budget**: The total byte ceiling for a Batch in Batch total mode. It is split evenly, then unused bytes are redistributed once to misses. _Avoid_: total target, quota, cap
>
> **Per-image Budget**: An image's share of the Batch Budget. _Avoid_: share, allocation
>
> **Fixed quality**: The Size Mode that encodes at one quality and does not chase a size. _Avoid_: manual, quality mode
>
> **Target**: The file size that one image must reach or stay below. It is set for the Batch and may be overridden per image in Per-image target mode. In Batch total, an image's Target is its Per-image Budget. Fixed quality has no Target. _Avoid_: limit, budget, cap, quota
>
> **Compressed**: The result for an image whose output is at or under its Target, or smaller than its input in Fixed quality. The row prints DONE. _Avoid_: optimized, success
>
> **Already fits**: The result for an image that is used unchanged because its input already meets its Target, or because no smaller output was possible in Fixed quality. _Avoid_: skipped, no-op
>
> **Miss**: The result for an image whose smallest useful output is still larger than its Target. _Avoid_: failure, error
>
> **Bigger**: The result for a converted or resized image whose output is larger than its input in Fixed quality. In a Target mode, a bigger output can still be Compressed; the row adds “Bigger than input”. _Avoid_: larger, inflated
>
> **Stale**: A result made under settings that have since changed. The row keeps its last outcome, muted, and Compress all picks it up. _Avoid_: outdated, dirty
>
> **Watch Folder**: A folder the browser watches for new images in Chrome and Edge. It adds files; it never removes them or starts a run. _Avoid_: sync, monitor
>
> **Folder Path**: The path of a file inside a dropped or watched folder, preserved in the ZIP when the option is on. _Avoid_: directory, relative path

---

## 9. Later shell decision

- The command palette and the “open on phone” QR belong to the shared shell (PRODUCT.md principle 5). They are not part of Squeeze v2.
- A competitor comparison table is not shipped. Revisit only with a source for every claim and a review before it lands.
- ICC colour-profile preservation and animated output are out of v2. They are not promised anywhere.

---

## 10. Surface concept round

Seed key: `3ccb6de0`, scope `surface`, mode `operate`. The roll dealt indices 3, 2, and 4 of the seven grounded structures. No image generation is available in this session, so the cards carry wireframes and the build path is code-led. The decision page is open for the lock. The direction contract is written only after that lock, in the surface brief, not here.

| Position | Structure | Thesis | Honest risk |
| --- | --- | --- | --- |
| **Locked** | **The Two-Rail Proof** | A paper settings job ticket on a 280 px ink rail, the Batch as a paper proof ledger, and one red run bar under it. | The ink rail can read as the Component Catalog's rail; the numbered groups and the run bar must carry the difference. |
| Alternate | **The Press Console Band** | The four numbered groups become one horizontal band; the fourth cell is a red action cell; the Batch runs as a full-width ledger below. | At 1280 the cells are tight; at 390 they stack and push the files down. The band must not become a form wall. |
| Alternate | **The Bench with Dock** | The files are the bench: drop zone and ledger at left, sticky settings at right, a red run dock under the work. | Settings sit second in the eye; a first-time visitor may drop files before setting a Target and wonder why nothing ran. |

Locked on 2026-10-20: **The Two-Rail Proof**, with the code build path. The full ranked list stays internal. The direction contract is not written in this stage; it belongs to the surface brief after the lock.
