---
version: 1
slug: "src-routes-index-tsx"
primary_target: "src/routes/index.tsx"
related_targets:
  - "src/features/tools/components/tool-catalog.tsx"
  - "src/features/tools/components/tool-catalog.css"
  - "src/features/tools/components/editor-preview.tsx"
---

# Tool Catalog (/)

## Scope

The home page helps a visitor choose and open a Tool. This change gives all Tool and Editor entries a new shape within the existing Persona 5 visual system.

The later Editor update uses mode **Persuade**. It replaces the three text-only Editor cards with rows that show a document example. The user confirmed the red, black, and paper palette, one small preview per Editor, and all existing names and facts. This is a local extension of the existing visual system.

The hero title remains `Free & Local` / `Gratis & Lokal`. Its subtitles and local-only claims remain byte-for-byte unchanged. The shared FAQ component, shell, SSR, and SEO are unchanged. The head title remains `Tools | Ritools`.

## Audience and job

A visitor must see what each entry does, read its existing facts, and open its route. The home page also explains the shared local-only promise. It adds no usage numbers, benchmarks, or testimonials.

## Content and order

`TOOL_GROUPS` and `TOOLS` in `src/features/tools/tools.ts` supply group order, entry order, names, promise keys, three fact keys per entry, and routes. The home page uses the same source as the shell.

| Group | Count | Entries in order |
| --- | --- | --- |
| Tools | 04 | Squeeze (`/squeeze`), Expose (`/expose`), Qraft (`/qraft`), Unmask (`/unmask`) |
| Editor | 03 | Tabular (`/tabular`), Folio (`/folio`), Quill (`/quill`) |

Each group is a named section with an `h2` and a two-digit count. Each list entry contains its Ransom name as an `h3`, its existing promise, three facts as square bullets, and one `Open {name}` action. The action uses the shared button styles, its real route, and a decorative `LuArrowUpRight` icon. Editor names, promises, and all nine facts remain unchanged.

Each Editor starts with an HTML/CSS example: a table for Tabular, a PDF page for Folio, and Markdown source for Quill. The file bar shows `example.csv`, `example.pdf`, or `example.md`, plus `Example` / `Contoh`. The preview has `aria-hidden="true"` and loads no editor engine. The PDF and Markdown examples reuse the existing home title and local-only claims.

The Easel example is a small print of the editor. Its file bar shows two File Tabs (`skyline.jpg`, active with an unexported-edit mark, and `street.png`) and the plus mark instead of one file name. Under the panel row (Crop selected, then Finetune, Filter, Annotate, Redact, with undo and redo), one inline SVG photo carries four layers of the Edit Stack: a crop box with thirds and corner handles, a Mosaic Redaction over a billboard, an Arrow annotation, and the `ri/tools` Watermark. The photo uses only red, ink, and paper, and the panel labels reuse the Easel message keys.

## Direction contract

The hero and its 3px closing rule lead into two separate groups. Tools have closed 2px frames, card-stock bodies, and black nameplates with a cut lower-right edge. Their Ransom names print on the ink ground. Editors use three rows with shared rules, ink preview fields, transparent copy areas, and paper-ground Ransom names.

The promise, facts, and action stay together in reading order. Each name remains part of the existing Ransom system. This surface adds no shipping raster assets, shadows, rounded corners, or system tokens.

- **THESIS:** Make the document type clear through a table, PDF page, and Markdown source. Replace three text-only cards with rows that share rules.
- **OWN-WORLD:** Keep Ransom names, the paper/carbon page, ink preview fields, a red selected cell and PDF annotation, square rules, shared outline controls, Archivo, and Martian Mono. Do not change global tokens.
- **STORY:** See the document type, read the unchanged promise and three facts, then open Tabular, Folio, or Quill. Label previews `Example` / `Contoh`; hide them from assistive technology; load no editor engine.
- **FIRST VIEWPORT:** Match the Editor heading size and content gap to Tools, retain the `03` count, and leave the heading without a bottom rule. At 42rem content width, place the first preview in the left 40% and the Tabular name, promise, facts, and action in the right 60%. At 64rem, split promise/action and facts into columns. Below 42rem, place each preview above its copy and make the action full width.
- **FORM:** Use three rows led by document examples. This directly shaped local extension needs no concept seed or composition study under `new-work.md` §3. Keep the existing Ransom assembly, printed hover/focus states, and reduced-motion support. Add no effect.
- **FINISH:** Work without review and documentation is unfinished. Complete the finish review, record its verdict, check `DESIGN.md`, and record provenance for every shipping raster. This update uses HTML/CSS previews and adds no shipping raster.

## Layout and type

The shared `Container` keeps the home page within its existing maximum width and gutters. The catalog uses an inline-size container. Its breakpoints depend on available content width, including the space left by the shell rail.

| Container width | Tools | Editors |
| --- | --- | --- |
| Below 42rem | One column | Three stacked rows; preview above copy; full-width action |
| 42rem to below 64rem | Two columns | Three rows; preview and copy in a 2:3 split |
| 64rem and above | Two columns | Same 2:3 split; promise/action and facts in two copy columns |

Tool entry gaps are 20px. Group gaps are 48px. Both headings have a 16px gap before their first entry. Tool entry bodies use 20px padding and 20px content gaps. Frames are 2px. Editor rows have no outer frame or gap; 2px rules close each row. The first preview has no top margin. From 42rem, the first Editor copy has no top padding, so it starts at the preview top. Preview canvases use 24px padding and a 240px minimum height. Open actions have a minimum height of 44px and keep the shared keyboard focus treatment. From 42rem, Editor actions fit their text with a 12rem minimum width.

The type sizes come from the documented ramp: 2rem Tool and Editor headings, `clamp(2rem, 5cqi, 3.25rem)` Tool Ransom names, `clamp(2rem, 4.5cqi, 3.25rem)` Editor Ransom names, 1.125rem promises, 0.9375rem facts, and 0.875rem counts. Promises use weight 700. Counts use the existing `num` face. Facts have a 1.6 line-height. Preview labels and table data use 0.75rem; PDF copy and Markdown source use 0.6875rem. Ransom is limited to entry names.

## Existing system evidence

Compared with `apps/web/DESIGN.md` and `src/core/styles/globals.css`:

- Frames use `--rule`: ink on paper in light mode, paper on carbon in dark mode.
- Tool bodies use `--card`: White Stock (`#FFFFFF`) in light mode and Carbon Raised (`#1F1E1C`) in dark mode. Editor copy shows the page ground through its transparent body. Previews use the existing `.ground-ink` role with paper documents, a red selected table cell, and red PDF marks.
- Facts and counts use `--muted-fg`: `#57534B` in light mode and `#ADA89D` in dark mode.
- Nameplates use the existing `.ground-ink` role. Ransom chips retain the existing faces, colors, cuts, and motion.
- Actions use `buttonStyles({ size: "md" })`. The catalog adds the 44px minimum height and local width rules without changing the shared control.
- The hero rule retains `animate-rule-print`. Existing reduced-motion rules hold the composed state. The catalog adds no animation.

## Review evidence

The earlier home review checked `src/routes/index.tsx`, both catalog component files, `src/features/tools/tools.ts`, the shared Container, and the global color and motion rules. Its desktop capture showed the two Tool columns, the former three Editor columns, preserved hero, and FAQ.

The finish reviewer viewed all six captures and returned **ship**, with no material fixes:

- [Desktop](../review/home-catalog/desktop.png)
- [Mobile](../review/home-catalog/mobile.png)
- [1280px](../review/home-catalog/user-1280.png)
- [1920px](../review/home-catalog/user-1920.png)
- [Desktop dark](../review/home-catalog/desktop-dark.png)
- [Mobile dark](../review/home-catalog/mobile-dark.png)

Implementation verification reported passing typecheck, targeted lint, two home E2E tests, and the production build (`bun web build`, exit 0). Browser checks reported no overflow at 390, 1280, 1440, and 1920px; visible keyboard focus on the 44px actions; working FAQ expansion; and checked `id-id` translations. These results belong to the completed implementation review; this document update did not rerun them.

### Editor update

The document check read the current catalog, preview, route, both locale files, `PRODUCT.md`, `DESIGN.md`, and global styles. It viewed the desktop and mobile Editor section crops. These confirm three document rows, the 2:3 desktop split, stacked mobile copy, shared rules, and existing colors and type.

The finish reviewer viewed all five current captures and returned **ship**, with no material fixes. It confirmed unchanged names, promises, and nine facts; real 44px actions; correct responsive layout; and no need for more motion:

- [Desktop](../review/home-editors/desktop.png)
- [Mobile](../review/home-editors/mobile.png)
- [1280px](../review/home-editors/user-1280.png)
- [Desktop dark](../review/home-editors/desktop-dark.png)
- [Mobile dark](../review/home-editors/mobile-dark.png)

The corresponding `*-section.png` crops show the full Editor section. These are review evidence, not shipping assets. [DOM checks](../review/home-editors/checks.json) record section bounds, three facts per Editor, route targets, 44px action heights, and no overflow for the captures.

Implementation verification reported a passing production build, typecheck, targeted lint, and two home E2E tests. Browser checks reported no overflow at 390, 1280, and 1440px in both themes, plus Indonesian at 390 and 1280px. This document update did not rerun those checks. The existing `DESIGN.md` and sidecar remain unchanged because this update extends one surface and adds no global system rule.

### Heading consistency update

The Editor heading now shares the Tools heading size and 16px content gap. The rule below the Editor heading is removed. Browser measurements confirmed 32px headings, 16px gaps, and no horizontal overflow at 390, 1280, and 1920px. Visual checks covered the stacked mobile layout and the wide Editor rows. Typecheck and CSS formatting checks passed.

## Pre-existing documentation drift

The global `DESIGN.md` Tool Catalog section still describes the former shared proof sheet and closing note band. `.impeccable/design.json` also retains the former stamp motion description. `PRODUCT.md` still lists Quill as planned, while the current catalog source includes it. These files are preserved because this task changes one surface within the existing system. This brief records the current home surface without confirming those older descriptions.
