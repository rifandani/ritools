# Drift report — Stage 2, Feedback and Data Display

**Status:** approved by the user on 2026-10-20. A1–A14, the widened round
seal (B1), the carousel card's inside bracket, and the sidecar corrections
(B3, B4) are written into `apps/web/DESIGN.md` and
`apps/web/.impeccable/design.json`. C1–C4 stay uncanonised.

The documenter ran as an extension. It wrote nothing at the time: the user
asked for DESIGN.md to be compared, not rewritten. This file is the drift it
found, so the record carries it.

## A. Rules the build established that the committed `apps/web/DESIGN.md` does not record

Each is a candidate rule. The wording is what would be added if the user
approves it.

**A1 — The square dial** (Shapes). The world has one round shape, the seal, and
a dial is not a seal.
> "A dial is a square frame, not a circle: a 2.5-unit frame in a 24-unit box,
> the run travelling its edge, and the figure set in the middle in the numerals
> face."

**A2 — The round seal, and the square default** (Shapes, Do's and Don'ts). This
one also forces a correction to a committed prohibition, see B1.
> "All corners are square. Every Tailwind radius token resolves to 0px. The one
> round shape is the seal, and it is opt-in: an icon button takes it with
> `isCircle`, a radio indicator is always a seal so a radio never reads as a
> checkbox, a badge takes it with `isCircle`, and an avatar takes it with
> `isSquare={false}`. A badge and an avatar are square by default, and the round
> one holds a single mark, never a word."

**A3 — The inside bracket** (Shapes, named rules). Seven components reuse it.
> "**The Inside Bracket Rule.** A row takes the bracket inside its own edge,
> not 7px outside it: a 3px bracket with 10px arms at each side, drawn on the
> row's own border. An outside bracket would cross the rows above and below."

The build also puts the inside bracket on a card that sits at the edge of a
clip (the carousel slide): an outside bracket would be cut in half there. A
card that takes it clears its own rule on focus, so the bracket stands clear
instead of thickening the edge. This is a third placement and it needs the
user's word before it goes in the file.

**A4 — The wash ink** (Colors, named rules).
> "**The Wash Ink Rule.** A status tone is carried by its wash foreground, never
> by its fill hue. The fill hues are for fields: Caution Yellow never reaches
> 3:1 on paper. A note takes the wash ink for its frame, a meter takes it for
> its fill, a tracker block takes it for its plate."

**A5 — The reach** (Components). It applies to the two ranking bars only.
> "**The Reach Rule.** A bar that ranks values takes the slider's reach: a 2px
> Control Edge rule with a 4px ink stroke over it, so the value reads by weight
> and not by hue. A bar-list row and a leaderboard row use it, and the figure
> stays in a fixed column beside it."

**A6 — The ink measure** (Components).
> "**The Ink Measure Rule.** A measure fills with ink. A status hue arrives
> only when the caller asks for one, and then the caller owns the word that
> names it. The figure beside the measure is in the one numerals face, in a
> fixed 6-character column."

**A7 — The strike on the words** (Components).
> "**The Strike on the Words Rule.** A disabled row is muted and struck
> through, and the strike is drawn on the elements that hold the words. A text
> decoration does not cross a block box, so a strike on the row alone would
> print on the row's own line and nowhere else."

**A8 — The paper side** (Components).
> "**The Paper Side Rule.** A badge on a solid ink bar turns to the paper
> side: the border and the words take the bar's foreground, and the badge's own
> wash clears."

**A9 — The local poster** (Layout or Components).
> "**The Local Poster Rule.** An empty result reuses the poster page at a local
> scale: the numeral `0` in the numeral-display voice, a 16deg red slash bar,
> and one line of words."

**A10 — The ledger** (Components).
> "**The Ledger Rule.** A table draws its rules per cell, with separated
> borders, so a row rule and a column rule never collapse into one another.
> The red foot of a selected row prints on the cell, over its own rule."

**A11 — The catalog cell is a group** (Variant cell).
> "The cell is a group. A mark inside it reads the cell's forced state."

**A12 — A data-display block** (Components, a new subsection). It records the
family devices once instead of eighteen paragraphs.
> "### Data display
>
> - **The row:** A table row, a grid-list row, a tree row, a list-box item, a
>   bar-list row and a leaderboard row print on the paper ground. Hover and
>   press put a solid ink bar behind the row with paper words. Selected keeps
>   the bar and takes the red foot. Focus takes the inside bracket. Disabled
>   mutes the words and strikes them.
> - **The ledger:** A table is a 2px ink rule frame with separated borders, a
>   Group Label head over a rule, and a 2px rule under every cell.
> - **The stamp:** A badge is a square 2px frame in the label voice, one word
>   tall. On a solid ink bar it turns to the paper side. The round seal is
>   opt-in.
> - **The measure:** A progress bar and a meter are a 2px rule frame with a
>   solid fill inside, and the figure beside them in the one numerals face, in
>   a fixed column. A bar-list row and a leaderboard row are a 2px Control Edge
>   rule with a 4px ink reach over it.
> - **The note:** A square 2px frame, a wash of the status hue, and a square
>   indicator plate holding the glyph that names the state. The frame takes the
>   wash foreground, not the fill hue.
> - **The dial:** A square frame with a run travelling its edge and the figure
>   set in the middle in the numerals face.
> - **The blank:** A loading skeleton is a muted plate that blinks in hard
>   steps and holds the full plate under reduced motion."

**A13 — Two Do lines** (Do's and Don'ts).
> "- **Do** draw the focus bracket inside a row, on the row's own border, so it
> never crosses the rows above and below.
> - **Do** carry a status tone in its wash foreground, never in its fill hue."

**A14 — Sidecar additions, if the sidecar is regenerated.**
`extensions.shadows` gains the red foot (`inset 0 -4px 0 var(--primary)`).
`extensions.motion` gains `skeleton-blink` (1.2s steps(1) infinite, opacity 1 to
0.45) and `progress-slide` (2000ms steps(8,end) infinite, the indeterminate
run). `extensions.focus` records the two bracket placements, `inset -7px` on a
mark and `inset 0` on a row. `extensions.markStates` gains the row states.

## B. Where the committed DESIGN.md and the build disagree

**B1 — The round-corner prohibition now bans a device the world itself uses.**
Committed: "Don't round a corner, except the round seal on an icon button or a
radio indicator". Build: `badge.tsx` prints `size-7 rounded-full` for
`isCircle`, `avatar.tsx` prints `rounded-full` for `isSquare={false}`. The
build is right; the prohibition has to widen, as in A2.

**B2 — The measure vocabulary.** The committed world states the Control Edge
rule with the 4px reach for the slider only. The build extends it to the two
ranking bars only. `progress-bar.tsx` and `meter.tsx` use a 2px rule frame
with a solid fill inside, which is a different family on purpose. A5 and A6
are worded to match.

**B3 — The sidecar is narrower than DESIGN.md.** The sidecar says "Don't round
a corner, except the round seal on an icon button" and drops the radio
indicator and the red foot from the printed-mark state list. DESIGN.md is
right; the sidecar is stale.

**B4 — The sidecar's knownGaps are stale.** "PopoverContent with arrow=true
draws a 45deg chevron arrow" is no longer true; the popover draws a 12px
square tab. "About 85 other components still carry IntentUI structure"
predates this pass. The colour family and the chart family still carry
non-world radii and soft rings.

**B5 — The bracket placement is unrecorded, not contradicted.** "A 3px bracket
7px outside the mark" remains true for marks. The build adds a second
placement for rows. A3 fills the gap.

**B6 — The Variant cell is now a group.** The committed description of the
cell does not say so, and it is how a badge learns the cell's forced state.
A11 adds the clause.

**B7 — "Not yet restyled" is ambiguous.** It sits under Inputs/Fields but reads
as the input wells, which Stage 1 already restyled. The evidence says it means
the colour-picker family, which still carries `rounded-lg` and
`ring-3 ring-ring/20`. Not repaired here.

**B8 — The empty state is new, not a contradiction.** The table's default
empty state prints a `0` with a 16deg red slash bar, the poster idiom at a
local scale. A9 records it.

## C. Defects the build carries that must NOT be canonized

**C1 — Two measure vocabularies.** The framed fill and the reach. A5 and A6
describe what each family does; unifying them is a build decision, not a
documentation one.

**C2 — The dial's frame weight is not a world weight.** The world's rules are
2px and 3px. The dial's frame is 2.5 units in a 24-unit box, so it scales
with the icon. It is an SVG icon, like the ring loader, and A1 states the
frame in units rather than promoting 2.5 to a rule weight.

**C3 — The rows do not share one focus vocabulary.** A list-box item prints
the solid ink bar and a paper bracket on keyboard focus, because its item
styles come from the shared menu styles; the other rows print the bracket
alone. A12 records only what all seven share.

**C4 — The progress bar fills with Poster Red.** Red is a brand fill, so the
Two-Reds Rule permits it, and the figure beside it carries the number. It is
still the one measure that reads by hue, against C1. An observation, not a
rule.
