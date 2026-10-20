---
version: 1
slug: "src-master-design"
primary_target: "src/master-design"
related_targets: ["src/core/styles/globals.css","src/routes/__root.tsx"]
---

# Component Catalog (/master-design)

## Scope

- Surface: the Component Catalog at `/master-design`, development only. A production build answers 404.
- Mode: Operate. A developer or designer scans about 90 Component Entries, each with 1 to 10 Variant Showcases, filters with `?q=`, and checks every state in light and dark.
- Stage 1 of the Ritools redesign: tokens, the shell (navbar, toggles, offline and error pages), the Catalog chrome, Button, Link, Container, Menu, Card, Loader, and the Ransom heading primitive. Later batches restyled the Feedback, Data Display, Overlay, Color, and Chart families. The remaining components follow by Category in later stages, then the Tool Catalog and Squeeze.
- Redesign. The IntentUI look (Inter, blue primary, zinc, rounded) is the anti-reference.

## Direction contract

THESIS: The catalog is a ransom note pinned to a print shop wall. Names are assembled from cut-out letters on paper chips; everything else is set in plain print with hard rules. It refuses the docs-site default of a gray sidebar, a blurred top bar, and soft rounded cards.

OWN-WORLD: Red #D7001A, ink #0B0B0B, paper #F6F4EF, white. The navbar is a red field, the Category rail is an ink field, the content is paper. Zero radius. 2px ink rules. Controls are printed marks: outline at rest, solid when pressed, struck through when disabled, a heavy bracket on focus. Diagonals use 4deg (tilt) or 16deg (slash) only. One numerals face in fixed columns for every number. Semantic colors never borrow the brand red.

STORY: The visitor sees which Category and Component Entry they are in, reads each name at once, and compares every Variant Showcase in a strict grid. They trust the system because each state reads by shape, not only by color.

FIRST VIEWPORT: Red navbar strip with the ransom RITOOLS wordmark at left, theme and language toggles at right. Below it, the ink rail at left (280px) with the catalog name, a count, and the Category list, where one red route stroke runs from the active Category to the active Component Entry. The content column holds a sticky paper filter bar (search at left, count at right, 3px ink rule under it), then the first Category heading in ransom chips at poster scale, cropped off the right edge, then the first Component Entry title in ransom chips over its showcase grid. On phones the rail becomes a top menu button in the filter bar.

FORM: Ransom Calling Card, first on the ordered list, kind assigned, code-led, seed key 79d27ab4. Signature interaction: ransom assembly. Letter chips fly in and settle when a heading enters the view; under reduced motion they hold the composed state.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Constraints

- WCAG 2.2 AA in both modes. Small text on red is white. Ransom headings expose the plain name to assistive technology.
- Self-hosted, open-licensed fonts only. No Google Fonts import (offline PWA). Each precache file stays under 2 MiB.
- React Aria behavior, keyboard models, component props and APIs, i18n, routes, and product copy facts stay unchanged.
- Anti-goals: no copy of the game's screens, characters, logos, fonts, or calling-card art; no pause-menu costume; no gradients or glass; red is never the only signal for a state.

## Unresolved

- Stage 3+: restyle the remaining components by Category inside this system.
