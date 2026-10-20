# Documenter report: Squeeze (/squeeze)

Role: Impeccable documenter, extension mode, run as a spawned subagent. `apps/web/DESIGN.md` and `apps/web/.impeccable/design.json` were read and left unmodified. One file written: this report.

Surface: `src/routes/squeeze.tsx` and the nine files in `src/features/squeeze/components/`. Route file has no styling; it sets `ssr: true` and the SEO head only.

## 1. Used from the incumbent system

**Colors and grounds**

- Poster Red through `--red`: the empty-proof slash bar (`squeeze-batch-list.tsx:66`, `bg-red`), the ticket head rule (`squeeze-settings-bar.tsx:570`, `border-red border-b-[3px]`). Used as a fill and a rule, per The Two-Reds Rule (DESIGN.md:280).
- Ink as a field: `squeeze-settings-bar.tsx:564`, `bg-ink`. Paper stock as the plate: `squeeze-settings-bar.tsx:569`, `bg-card text-fg`.
- Ink/paper rules through the `--rule` role: `border-rule` on the ledger frame and rows (`squeeze-batch-list.tsx:80`, `squeeze-item-row.tsx:556`), on the ticket (`squeeze-settings-bar.tsx:569`), on the explainer (`squeeze-explainer.tsx:39`), on the run bar (`squeeze-run-bar.tsx:102`). 2px for frames, 3px for the heavy divisions (DESIGN.md:347, 541).
- Control Edge `--input`: drop zone rule (`squeeze-drop-zone.tsx:182`, `border-input border-2`); every number well (`well` utility, `squeeze-settings-bar.tsx:139,470`, `squeeze-item-row.tsx:181`).
- Muted Ink `--muted-fg`: secondary text and hints throughout (`squeeze-page.tsx:72,75,103`, `squeeze-item-row.tsx:68,161,268`, `squeeze-run-bar.tsx:58`).
- Burnt Vermilion wash ink for problems and the watch refusal (`text-danger-subtle-fg`, `squeeze-item-row.tsx:284,421`, `squeeze-page.tsx:115`); Caution wash through `Note intent="warning"` (`squeeze-page.tsx:153`), danger wash through `Note intent="danger"` (`squeeze-page.tsx:381`, `squeeze-settings-bar.tsx:590`). No brand red carries an error.
- `ground-red` on the run bar (`squeeze-run-bar.tsx:102`): primary becomes white, rules white, the 04 plate takes `bg-primary text-primary-fg` (`squeeze-run-bar.tsx:115`). Ground Rule applied without new props (DESIGN.md:286).

**Type steps**

- Ransom: the name (`squeeze-page.tsx:62-67`, `Ransom as="h1"`), the all-miss word (`squeeze-page.tsx:150-152`, `Ransom as="p"`), the dev sheet title (`squeeze-state-gallery.tsx:334`).
- Poster Title voice, Archivo 900 at 75% width: row state word (`squeeze-item-row.tsx:119-127`), drop title (`squeeze-drop-zone.tsx:201`), empty-proof title (`squeeze-batch-list.tsx:68`), explainer heading (`squeeze-explainer.tsx:40`). See §2.1 for the new step size.
- Group Label voice, 0.75rem / 700 / 87.5% / 0.08em: ledger head (`squeeze-batch-list.tsx:32`), ticket head (`squeeze-settings-bar.tsx:571`), group titles (`squeeze-settings-bar.tsx:111`), tally labels (`squeeze-run-bar.tsx:58,118`), units (`squeeze-settings-bar.tsx:94`), FAQ heading (`squeeze-explainer.tsx:58`).
- Label voice through `Button` for every mark (`squeeze-page.tsx:156-165`, `squeeze-drop-zone.tsx:209-237`, `squeeze-item-row.tsx:331-380`, `squeeze-run-bar.tsx:191-224`).
- Numeral: the `num` utility on every figure (`squeeze-batch-list.tsx:61,72`, `squeeze-item-row.tsx:71`, `squeeze-run-bar.tsx:115,147`, `squeeze-settings-bar.tsx:91,108,219,225,574`). Fixed columns 4.25rem / 4.25rem / 3.5rem in the ledger (`squeeze-item-row.tsx:558`), per The One Numerals Rule (DESIGN.md:313).
- Body and body-lead lengths: tagline 1.125rem/1.75rem/600 (`squeeze-page.tsx:69`), body notes 0.75rem/1rem.

**Rules, shapes, utilities**

- Zero radius: no `rounded-*` in any of the nine files.
- No shadow, blur, gradient, or raw hex/rgb/oklch value in any of the nine files.
- Two angles only: a 16deg slash bar at 176px × 12px (`squeeze-batch-list.tsx:66`, `h-3 w-44 -skew-x-[16deg]`), matching DESIGN.md:327; the Ransom tilt/cut variables otherwise.
- `well` (`globals.css:805`) and `bracket` (`globals.css:706-734`, 3px, 10px arms, inset -7px) on every number field.
- Motion: `duration-90 ease-out` on the drop zone matches the recorded mark-state 90ms (`squeeze-drop-zone.tsx:183`).

**Components**

- `Button` (primary, outline, plain; `xs`/`sm`), `Note` (warning, danger), `Ransom`, `Container`.
- React Aria family: `ChoiceBox`/`ChoiceBoxItem`/`ChoiceBoxLabel` (`squeeze-settings-bar.tsx:254-286,324-351`), `Slider` family (`squeeze-settings-bar.tsx:171-195`), `Switch`/`SwitchField` (`squeeze-settings-bar.tsx:510-535`), `Modal` family (`squeeze-run-bar.tsx:215-237`), `Disclosure` family (`squeeze-explainer.tsx:61-70`), `Loader` (`squeeze-item-row.tsx:115`).

**Layout**

- 280px ticket rail: `lg:grid-cols-[17.5rem_minmax(0,1fr)]` (`squeeze-page.tsx:324`) = `spacing.rail-width`.
- Container padding 16px / 24px from 640px; the max width is overridden (§3.3).
- Empty proof: numeral `0`, 16deg red slash, one line of words (`squeeze-batch-list.tsx:60-74`) per The Local Poster Rule (DESIGN.md:502).

## 2. New local patterns

**2.1 Outcome words in Poster Title, not Ransom** (`squeeze-item-row.tsx:119-127`: `font-display text-[0.875rem] leading-4 font-black tracking-[0.04em] uppercase [font-stretch:75%]`). `font-display` resolves to Archivo (`globals.css:186`), so this is the Poster Title voice, not the Ransom chip set. The five outcomes and the pending words `Queued`/`Working` all take it. This is the disclosed, reviewer-accepted deviation: legitimate in the incumbent grammar (Archivo 900 at 75% is a recorded voice), and it contradicts the Ransom Rule for state words (DESIGN.md:311), so it is logged in §3.1. The step itself is new: 0.875rem / 1rem / 0.04em is not the recorded Poster Title step (clamp 2–3.25rem / 1 / 0.01em). The contract's ban on Ransom for queued/working is met.

**2.2 Numbered 01–04 job ticket** (`squeeze-settings-bar.tsx:97-117,253,323,459`; `squeeze-run-bar.tsx:115-120`). A 24px square plate (`size-6`) holding the index in `num` at 800, inverted against its ground: `bg-fg text-bg` on paper, `bg-primary text-primary-fg` on the red bar; the Group Label title follows, over a 2px rule. Every part is a recorded device: the numeral face (DESIGN.md:313), the solid plate (DESIGN.md:488), the Group Label over a rule (DESIGN.md:305, 415). The label names a group of controls and does not act as a headline kicker, so the Group Label clause holds. **Legitimate, not drift.**

**2.3 The ledger grid** (`squeeze-batch-list.tsx:32,80-101`; `squeeze-item-row.tsx:554-559`). Closed 2px frame, Group Label head over a rule, 2px rule per row, last row rule dropped (`last:border-b-0`), one DOM tree that re-flows at `md` (8rem / 1fr / 10rem) and `xl` (9rem / 1.5fr / 4.25rem / 4.25rem / 3.5rem / 1fr / 12rem). Below `xl` each figure prints its own label inline and the head labels go `sr-only` (`squeeze-item-row.tsx:67-72`). The track list and the two re-flows are new. **Legitimate as a ledger; two recorded details differ** — rules print per row, not per cell (DESIGN.md:487, 504), and the row carries no hover/press ink bar (DESIGN.md:486). Both are in §3.4 and §3.5.

**2.4 State marks** (`squeeze-state-mark.tsx:24-57`; used at `squeeze-item-row.tsx:110-118`). A 20-unit SVG box with a 16-unit plate at (2,2), 2-unit stroke, square caps and mitre joins, `currentColor`, drawn at 16px. Six kinds: check (Done), hollow plate (Already Fits), cross (Miss), outward arrow (Bigger), stop bar (Rejected), queue rule (Queued). This instantiates the recorded plate that holds the glyph naming a state (DESIGN.md:490) and keeps the unit-frame convention of the dial and loaders, stated in units and never promoted to a rule weight (DESIGN.md:353). State reads by plate and glyph, not by hue; the stale row mutes the mark and adds a 2px `border-current` "Stale" stamp (`squeeze-item-row.tsx:128-132`). **Legitimate, not drift.**

**2.5 The red run bar** (`squeeze-run-bar.tsx:100-110`). `ground-red` with a 3px `border-rule` top edge, `sticky bottom-0 z-20`, no shadow. Holds the 04 plate, the under-target sentence, In/Out/Δ, five tallies, and three marks. The progress device is a 4px `bg-primary` run along the top edge, width driven by settled rows, over 500ms `ease-out`; on the red ground `--primary` is white, so the run prints white and merges with the 3px rule. New: the red field sits in content rather than on the navbar, and it sticks. **Legitimate ground reuse** — the ground class is unmodified — but the placement contradicts two descriptive lines (§3.2), and the measure is frameless and prints no figure (§3.6).

**2.6 Smaller local values**

- The ink field is `bg-ink`, not `ground-ink` (`squeeze-settings-bar.tsx:564`). No stock control sits on the ink, so the Ground Rule is not invoked; the ticket's `border-rule` stays at page ink and merges with the ink margin in light mode, and prints paper in dark mode. Legitimate as a field, but the frame colour changes between modes.
- Tracking 0.04em and 0.06em are new half-steps between the recorded 0.02 / 0.05 / 0.08em: 0.04em only here (`squeeze-item-row.tsx:122-123`; `squeeze-settings-bar.tsx:277`), 0.06em only here (`squeeze-page.tsx:75`; `squeeze-settings-bar.tsx:136,187,216,222,461`). Legitimate, not recorded.
- The phone Ransom sets `--angle-tilt:0deg` and `--slash-run:0` (`squeeze-page.tsx:64`), removing chip tilt and scissor cuts below 640px. 0deg is one of the three recorded poses (DESIGN.md:469); no cut is drawn. Legitimate, not recorded.
- The drop zone is a bare 2px Control Edge frame with `bracket` rather than the `well` class (`squeeze-drop-zone.tsx:182`), and the drag state fills it solid ink with a local `[--muted-fg:var(--bg)]` override (`:184`). The pressed print matches DESIGN.md:451; the local muted-token override is the only new mechanism.

## 3. Build and DESIGN.md disagree

Each item names the only line(s) that would have to change if the user approved a system change. No change is written.

**3.1 State words in Poster Title.** Build: the five outcomes print in Archivo 900 at 75%, not Ransom (`squeeze-item-row.tsx:119-127`); Ransom is kept for "Squeeze" (`squeeze-page.tsx:62`) and the all-miss "Miss" (`:150`). DESIGN.md:311 would change: "**The Ransom Rule.** Ransom is only for names: Component Entry titles, Category headings, the Ritools wordmark, Tool names, and Squeeze state words (for example "Done", "Miss"). Never use it for labels, inputs, numbers, or body text. Assistive technology reads the plain name, never the chips." DESIGN.md:301 would also gain the row use: "- **Poster Title** (Archivo 900, 75% width, clamp(2rem, 6vw, 3.25rem), line-height 1, uppercase, 0.01em): The words under a numeral display, and the offline page title."

**3.2 Red field location.** Build: a red ground inside the content column (`squeeze-run-bar.tsx:102`). DESIGN.md:230 would change: "…Three color fields set the structure: a red field for the navbar, an ink field for the side rail, and paper for the content." DESIGN.md:239 would also change: "- Three grounds: red (navbar), ink (rail), paper (content). A ground redefines the role tokens for what sits on it."

**3.3 Container width.** Build: `[--container-breakpoint:90rem]` (`squeeze-page.tsx:321`) = 1440px. DESIGN.md:323 would change: "…The general `Container` is at most 1280px wide with 16px padding (24px from 640px)."

**3.4 Ledger rules per row, not per cell.** Build: one 2px rule under each row, last row dropped, no column rules (`squeeze-item-row.tsx:556`). DESIGN.md:487 would change: "- **The ledger:** A table is a 2px ink rule frame with separated borders, a Group Label head over a rule, and a 2px rule under every cell." DESIGN.md:504 would change: "**The Ledger Rule.** A table draws its rules per cell, with separated borders, so a row rule and a column rule never collapse into one another. The red foot of a selected row prints on the cell, over its own rule."

**3.5 Ledger row states.** Build: static paper rows; the row is not selectable and has no hover/press ink bar, red foot, or inside bracket (`squeeze-item-row.tsx:554-559`). Only its buttons and fields carry marks. DESIGN.md:486 would change: "- **The row:** A table row, a grid-list row, a tree row, a list-box item, a bar-list row and a leaderboard row print on the paper ground. Hover and press put a solid ink bar behind the row with paper words. Selected, where the row can be selected, keeps the bar and takes the red foot. Focus takes the inside bracket. Disabled mutes the words and strikes them."

**3.6 Measure shape.** Build: a 4px run along the bar's top rule, no frame, no printed percentage (`squeeze-run-bar.tsx:104-110`). DESIGN.md:489 would change: "- **The measure:** A progress bar and a meter are a 2px rule frame with a solid fill inside, and the figure beside them in the one numerals face, in a fixed column. A bar-list row and a leaderboard row are a 2px Control Edge rule with a 4px ink reach over it." DESIGN.md:496 would change: "**The Ink Measure Rule.** A measure fills with ink. A status hue arrives only when the caller asks for one, and then the caller owns the word that names it. The progress bar is the one brand measure and fills with Poster Red. The figure beside a measure is in the one numerals face, in a fixed 6-character column."

**3.7 Stamp frame weight.** Build: input-format and part-format badges take a 1px frame, `border border-current` (`squeeze-item-row.tsx:166,414`). The stale stamp takes 2px (`:129`). DESIGN.md:488 would change: "- **The stamp:** A badge is a square 2px frame in the label voice, one word tall. On a solid ink bar it turns to the paper side. The round seal is opt-in."

## 4. Pre-existing drift outside this surface

- Sonner toast: `backdrop-blur-3xl` in `src/features/toast/toast.ts:42`, which breaks DESIGN.md:555 "**Don't** add shadows, blur, glass, or gradients for depth." DESIGN.md:561 records the toast as pending but names only rounded corners and a soft shadow, not blur.
- Shared `Note` indicator: `src/core/components/ui/note.tsx:1-9,29-50` loads Heroicons from `react-icons/hi2` into the square plate, while this surface draws its own plate marks (`squeeze-state-mark.tsx`). DESIGN.md:490 records "a square indicator plate holding the glyph" without naming a glyph vocabulary, so two glyph languages sit in the same surface.
- `--info-subtle` / `--info-subtle-fg` exist (`src/core/styles/globals.css:323-324,397-398`) and are used by `Note` and the toast, but no info role appears in DESIGN.md's Colors or in `design.json` `colorMeta`. Under-recorded, not a build defect.

Not canonized: none of the above is written into DESIGN.md or design.json in this pass.

## 5. Evidence checked

**Files read**

- `src/routes/squeeze.tsx` (18 lines).
- Nine surface files, in full: `squeeze-page.tsx` (434), `squeeze-settings-bar.tsx` (603), `squeeze-drop-zone.tsx` (272), `squeeze-batch-list.tsx` (128), `squeeze-item-row.tsx` (625), `squeeze-run-bar.tsx` (247), `squeeze-state-mark.tsx` (58), `squeeze-explainer.tsx` (73), `squeeze-state-gallery.tsx` (434).
- `apps/web/DESIGN.md` (561 lines), `apps/web/.impeccable/design.json` (1137 lines), `.impeccable/surfaces/src-features-squeeze.md`, `PRODUCT.md`.
- `src/core/libs/i18n/locales/en-US.ts` (296 lines; squeeze block and key grep), `id-ID.ts` (key grep).
- Supporting reads: `src/core/styles/globals.css` (theme block, `.ground-red` 443, `.ground-ink` 463, `@utility num` 498, `.bracket::after` 706, `.well` 805), `src/core/components/ui/container.tsx`, `note.tsx`, `modal.tsx` (class grep), `src/features/toast/toast.ts`.
- Screenshots `apps/web/.impeccable/review/desktop.png` and `mobile.png` (1440 and 390 layouts).

**Commands**

- `rg -n "rounded|shadow|gradient|blur|backdrop|#[0-9A-Fa-f]{3,8}|rgb\(|oklch\(" src/features/squeeze/components/*.tsx` — no matches.
- `rg -n "deg|rotate|skew" …` — two matches: `-skew-x-[16deg]` and the Ransom variables.
- `rg -o '^  squeeze[A-Za-z0-9]+'` on both catalogs, `sort`, `diff` — 171 keys each, empty diff.
- `rg -c "tracking-\[0\.06em\]"` — 6, all in this feature; `tracking-\[0\.04em\]` — 3, all in this feature.
- `rg -n "@utility num" -A 30`, `rg -n "\.bracket" -A 40`, `sed -n` on the ground and theme blocks.
- `wc -l` on DESIGN.md, design.json, both catalogs, and all nine surface files.

**Measurements**

- Ticket rail 17.5rem = 280px; container max 90rem = 1440px; Content padding 16px / 24px.
- Rules 2px (`border-2`, `border-b-2`) and 3px (`border-b-[3px]`, `border-t-[3px]`).
- Slash bar 176 × 12px at 16deg; index plate 24px; progress run 4px; state mark 20-unit box / 16-unit plate / 2-unit stroke at 16px.
- Ledger tracks: `md` 8rem / 1fr / 10rem; `xl` 9rem / 1.5fr / 4.25rem / 4.25rem / 3.5rem / 1fr / 12rem.
- Locale parity: 171 squeeze keys per catalog, no diff.

## Addendum after approval

The user approved a narrow system change after this report. `apps/web/DESIGN.md` now records it, and nothing else was written:

- **3.1** — The Ransom Rule now scopes Ransom to outcome words at poster scale and records the ledger's exception: the five outcomes take the Poster Title voice at 0.875rem in the ledger, with the state mark.
- **3.2–3.6** — One new "Squeeze surface" subsection under Layout records the second red field (the sticky Actions bar with its top-edge measure), the wider 1440px Container, the ledger's per-row rules, and that ledger rows are read rather than selected.
- **3.7** — Closed by the build instead of the document: the input-format and part-format stamps now take the recorded 2px frame.

`design.json` is unchanged; no token was added or redefined.
