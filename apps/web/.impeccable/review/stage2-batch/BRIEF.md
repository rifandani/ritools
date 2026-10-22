# Finish review packet — Stage 2, Feedback and Data Display

## The request

Stage 2 of the Ritools design system redesign: restyle one batch of core
components to the established "Ransom Calling Card" world.

- Target: `apps/web`. Mode: Operate. Stage 1 is done and committed.
- `DESIGN.md` and `.impeccable/design.json` are the visual authority. The
  Component Catalog surface brief (`apps/web/.impeccable/surfaces/src-master-design.md`)
  holds the direction contract.
- This is an EXTENSION inside an established world. No concept seed, no
  direction round, no concept round. The palette, the type, the motion
  grammar, and the tokens are unchanged.
- Batch: Feedback (note, progress-bar, progress-circle, meter, skeleton) and
  Data Display (table, badge, avatar, description-list, list-box, grid-list,
  tree, leaderboard, bar-list, tracker, carousel, snippet, keyboard).
- Per component: restyle `src/core/components/ui/<id>.tsx` with the existing
  tokens and tailwind-variants; keep React Aria behaviour, keyboard models,
  props, exports, and APIs unchanged; do not rename or remove any variant,
  size, or intent prop. Update `src/master-design/showcases/<id>.tsx` so
  every variant and every state shows: rest, hover, pressed, focus-visible,
  disabled, invalid (if it applies), selected (if it applies), loading or
  empty (if it applies), with realistic Ritools content (Squeeze, Batch,
  Target, file names, byte sizes).
- World rules that matter: zero radius; only the two fixed angles; states
  are printed marks (outline at rest, solid when pressed, struck through when
  disabled, a heavy bracket on focus); every number in the tabular numerals
  face in fixed columns; red is never the only signal for a state; small text
  on red is white; ransom lettering only on titles and headings.
- WCAG 2.2 AA in light and dark mode. Every component works at 390px width
  without horizontal scroll. No new font or CDN import.

## The artifact

- Changed components: `apps/web/src/core/components/ui/`
  `avatar.tsx`, `badge.tsx`, `bar-list.tsx`, `carousel.tsx`,
  `description-list.tsx`, `grid-list.tsx`, `keyboard.tsx`, `leaderboard.tsx`,
  `list-box.tsx`, `meter.tsx`, `note.tsx`, `progress-bar.tsx`,
  `progress-circle.tsx`, `skeleton.tsx`, `snippet.tsx`, `table.tsx`,
  `tracker.tsx`, `tree.tsx`.
- Changed showcases: the same ids in `apps/web/src/master-design/showcases/`.
- Changed catalog infrastructure: `apps/web/src/master-design/variant.tsx`
  (the Variant cell gained the `group` class so a component can read the
  forced state on the cell).
- New tooling: `apps/web/scripts/shot-catalog.ts`,
  `apps/web/scripts/shot-entries.ts` (the capture scripts that made these
  screenshots).

Uncommitted work from an earlier stage is also in the tree (overlays, forms,
tabs, dropdown, globals.css). It is not part of this batch.

## The captures (this directory)

- `desktop.png` — the Component Catalog at 1440px, light.
- `mobile.png` — the Component Catalog at 390px, light.
- `desktop-dark.png` — 1440px, dark.
- `mobile-dark.png` — 390px, dark.
- `s2-data-display-1440-light.png`, `s2-data-display-1440-dark.png`,
  `s2-data-display-390-light.png`, `s2-data-display-390-dark.png` — the whole
  Data Display category.
- `s2-feedback-1440-light.png`, `s2-feedback-1440-dark.png`,
  `s2-feedback-390-light.png`, `s2-feedback-390-dark.png` — the whole Feedback
  category.
- `entries/<id>-1440-light.png`, `entries/<id>-1440-dark.png`,
  `entries/<id>-390-light.png`, `entries/<id>-390-dark.png` — one capture per
  Component Entry, the readable unit of this round.

The captures are taken with `prefers-reduced-motion: reduce`, so the ransom
chips hold their composed note and the loaders hold their composed state.

## The direction contract

From `apps/web/.impeccable/surfaces/src-master-design.md`:

THESIS: The catalog is a ransom note pinned to a print shop wall. Names are
assembled from cut-out letters on paper chips; everything else is set in plain
print with hard rules. It refuses the docs-site default of a gray sidebar, a
blurred top bar, and soft rounded cards.

OWN-WORLD: Red #D7001A, ink #0B0B0B, paper #F6F4EF, white. The navbar is a
red field, the Category rail is an ink field, the content is paper. Zero
radius. 2px ink rules. Controls are printed marks: outline at rest, solid when
pressed, struck through when disabled, a heavy bracket on focus. Diagonals use
4deg (tilt) or 16deg (slash) only. One numerals face in fixed columns for
every number. Semantic colors never borrow the brand red.

STORY: The visitor sees which Category and Component Entry they are in, reads
each name at once, and compares every Variant Showcase in a strict grid. They
trust the system because each state reads by shape, not only by color.

FIRST VIEWPORT: Red navbar strip with the ransom RITOOLS wordmark at left,
theme and language toggles at right. Below it, the ink rail at left (280px)
with the catalog name, a count, and the Category list, where one red route
stroke runs from the active Category to the active Component Entry. The
content column holds a sticky paper filter bar (search at left, count at
right, 3px ink rule under it), then the first Category heading in ransom chips
at poster scale, cropped off the right edge, then the first Component Entry
title in ransom chips over its showcase grid. On phones the rail becomes a top
menu button in the filter bar.

FORM: Ransom Calling Card, first on the ordered list, kind assigned, code-led,
seed key 79d27ab4. Signature interaction: ransom assembly. Letter chips fly in
and settle when a heading enters the view; under reduced motion they hold the
composed state.

## Other inputs

- `PRODUCT.md` (repo root).
- The world: `apps/web/DESIGN.md`.
- The sidecar: `apps/web/.impeccable/design.json`.
- The craft floor: `.agents/skills/impeccable/reference/craft-floor.md`.
- Detector findings: `impeccable detect apps/web/src/core/components/ui/
  apps/web/src/master-design/` reports **0 anti-patterns**. The 8 advisory
  notes are literal font sizes in `button.tsx`, `navbar.tsx`, `sidebar.tsx`,
  `text.tsx`, and `toggle.tsx` — all outside this batch and left for later
  stages.
