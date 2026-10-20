# Raster provenance

Every raster in this directory was captured from the same build, in one pass,
with the script `apps/web/scripts/shot-entries.ts` (per Component Entry) and
`apps/web/scripts/shot-catalog.ts` (the catalog overview and the two
Category sections).

| Field | Value |
| --- | --- |
| Build | the working tree of `rifandani/ritools` at the end of the Stage 2 Feedback and Data Display pass |
| Base commit | `a23dc33` ("chore: update favicon") plus the uncommitted Stage 2 work in this tree |
| Captured | 2026-10-20 |
| Server | `vite dev` on `http://localhost:4300`, route `/master-design` |
| Viewports | 1440 × 1000 and 390 × 1000 |
| Color modes | `light` and `dark`, driven by the Playwright `colorScheme` context option, so the OS preference selects the mode |
| Reduced motion | `reducedMotion: "reduce"`, so the ransom chips hold their composed note and the loaders hold their composed state |
| Hides | the Sonner toaster and the fixed devtools launcher, neither of which belongs to this batch |
| Font | the self-hosted Archivo, Martian Mono, Anton, Abril Fatface and Alfa Slab One in `apps/web/public/fonts` |
| Horizontal scroll | none: the page measures 1440/1440 at 1440px and 391/390 at 390px, the same one-pixel rounding the catalog showed before this stage |

The files:

- `desktop.png`, `mobile.png` — the catalog overview, light.
- `desktop-dark.png`, `mobile-dark.png` — the catalog overview, dark.
- `s2-data-display-*.png` — the whole Data Display Category, four captures.
- `s2-feedback-*.png` — the whole Feedback Category, four captures.
- `entries/<id>-<viewport>-<mode>.png` — one capture per Component Entry.

No raster in this directory carries art of its own: every mark in them is
drawn by the components from the committed tokens.
