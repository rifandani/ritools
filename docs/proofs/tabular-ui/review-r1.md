disposition: fix

Scope limit: DESIGN.md and engine-interface.md were sampled; test source was not reviewed.

## persistence

Pass. PRODUCT.md, the surface brief, and the decision contract exist. This constrained extension uses the approved world and composition; no new comp, quality card, or concept seed is required.

All 15 required images exist and show valid content. The export images show an idle action with a misleading progress label. The focused skip link is not a material defect.

External evidence remains pending: spoken screen-reader navigation, actual IME input, physical phone keyboard/touch behavior, and phone performance. The 14 incomplete contrast checks per case prevent a complete accessibility claim. Desktop and emulation timings do not close the phone gate.

## fidelity

- **TYPE — match:** Ransom title, Archivo controls, and Martian Mono counters follow the incumbent system.
- **MATERIAL — match:** flat fields, square controls, and printed rules follow the approved world.
- **GROUND — match:** Paper and Carbon grounds follow DESIGN.md across both Locales.
- **THESIS — contradicted:** multiline editing can remove source line breaks.
- **OWN-WORLD — match:** no new visual identity or unrelated shell.
- **STORY — contradicted:** export action text implies work has started before the user starts it.
- **FIRST VIEWPORT — match:** purpose, local processing, session lifetime, and file input remain clear.
- **FORM — adaptation:** wrapped mobile controls and internal grid scrolling follow the surface brief; focus and recovery behavior need correction.

## ceiling

The visual finish reaches the constrained extension’s bar. More ornament, depth, or motion is not required. Interaction defects prevent release.

## material_fixes

1. Preserve multiline values during inline edits. The single-line input supplies its sanitized value to `setDraft`; the first text change can remove existing line breaks. Open existing multiline values in the textarea. Evidence: [tabular-grid.tsx](/Users/rizeki.rifandani/Desktop/dev/projects/ritools/apps/web/src/features/tabular/components/tabular-grid.tsx:61).
2. Clear sort when its column is deleted. `applyChange` retains that column’s sort ID, then the engine rejects the next View with `MissingIdentity`, leaving the editor without a View. Evidence: [use-tabular.ts](/Users/rizeki.rifandani/Desktop/dev/projects/ritools/apps/web/src/features/tabular/use-tabular.ts:404) and [tabular.model.ts](/Users/rizeki.rifandani/Desktop/dev/projects/ritools/apps/web/src/features/tabular/tabular.model.ts:445).
3. Keep the paste dialog and draft after failure. `run` catches errors and resolves without a result, but the paste handler closes the dialog on every resolution. Show the failure beside the retained text and permit correction. Evidence: [tabular-dialogs.tsx](/Users/rizeki.rifandani/Desktop/dev/projects/ritools/apps/web/src/features/tabular/components/tabular-dialogs.tsx:102).
4. Prevent tab-delimited CSV output. Both the CSV delimiter selector and Use source dialect permit tab while retaining `.csv`; the format contract requires an explicit TSV/TAB choice. Evidence: [tabular-export.tsx](/Users/rizeki.rifandani/Desktop/dev/projects/ritools/apps/web/src/features/tabular/components/tabular-export.tsx:165).
5. Apply the specified View focus rules. Explicit search/sort resets selection to the origin without resolving the active identity; a filtered-out edited row also falls back to the origin. With zero matches, focus goes to Add row instead of Clear search. Evidence: [use-tabular.ts](/Users/rizeki.rifandani/Desktop/dev/projects/ritools/apps/web/src/features/tabular/use-tabular.ts:301) and [tabular-grid.tsx](/Users/rizeki.rifandani/Desktop/dev/projects/ritools/apps/web/src/features/tabular/components/tabular-grid.tsx:354).
6. Use an action label such as “Check export” while idle. “Checking export scope and values…” looks like progress and can cause the user to wait. Both export images show this defect. Evidence: [tabular-export.tsx](/Users/rizeki.rifandani/Desktop/dev/projects/ritools/apps/web/src/features/tabular/components/tabular-export.tsx:382).
7. Move focus into export controls when Export opens, then restore it when Back closes the panel. `openExport` only scrolls; closing removes the focused Back button without an explicit return target. Evidence: [tabular-page.tsx](/Users/rizeki.rifandani/Desktop/dev/projects/ritools/apps/web/src/features/tabular/components/tabular-page.tsx:142).
8. Restore result and history announcements. After an Edit, `notice` remains “Cell updated,” so later search counts cannot reach the live output. Undo/redo also use that generic message instead of naming the operation and Sheet. Evidence: [tabular-page.tsx](/Users/rizeki.rifandani/Desktop/dev/projects/ritools/apps/web/src/features/tabular/components/tabular-page.tsx:169) and [use-tabular.ts](/Users/rizeki.rifandani/Desktop/dev/projects/ritools/apps/web/src/features/tabular/use-tabular.ts:425).

## keep

Keep the approved visual system, full-width ledger, local-data boundary, explicit export scopes, values-only warnings, and mobile grid containment.
