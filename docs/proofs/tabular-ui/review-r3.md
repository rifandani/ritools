## verdict

1. **Resolved** — `fix-multiline.png` shows the exact two-line draft in a textarea. Source and saved assertions support Enter, cancellation, editing, and undo.
2. **Resolved** — `fix-deletion.png` shows Item removed, sort cleared, and B-12 active. The saved Sheet query is updated.
3. **Resolved** — `fix-paste.png` shows the retained draft, dimensions, and error. The dialog closes only after success.
4. **Resolved** — CSV permits comma, semicolon, and pipe. Source dialect cannot introduce tab. The saved TSV-source test checks both controls.
5. **Partial** — Captures show empty-result recovery and the sorted active cell visible at row 200. Clear search still has an incorrect fallback when the previous active row index exceeds zero.
6. **Resolved** — Both export captures show the idle action “Check export” or “Periksa ekspor.” Progress text remains separate.
7. **Resolved** — Export captures show focus on Output format. Source and saved assertions support focus return to Export.
8. **Resolved** — Explicit queries clear old notices. Current-result guards protect publication, and history announcements name direction, operation, and Sheet.

## remaining

Finding 5: Select a row below the first row, search for zero matches, then use Clear search. Clearing creates a target without row or column IDs at [use-tabular.ts:944](/Users/rizeki.rifandani/Desktop/dev/projects/ritools/apps/web/src/features/tabular/use-tabular.ts:944). This bypasses identity lookup, while [the fallback](/Users/rizeki.rifandani/Desktop/dev/projects/ritools/apps/web/src/features/tabular/use-tabular.ts:321) retains the previous row index. Recovery can therefore select a later row instead of the required first matching row. Give Clear search an explicit first-row target, retain the column, and provide evidence for this case.

No additional regressions identified within the fix batch.

This disposition covers only the eight scored fixes. Spoken screen-reader use, actual IME, physical-phone input and speed, and incomplete contrast checks remain open.

disposition: fix
