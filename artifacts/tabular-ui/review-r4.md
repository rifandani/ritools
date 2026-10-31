## verdict

1. **Resolved** — `fix-multiline.png` shows the exact two-line textarea draft. Source and saved assertions support editing, cancellation, and undo.
2. **Resolved** — `fix-deletion.png` shows the deleted column absent and B-12 active. Source clears the removed sort and saved query.
3. **Resolved** — `fix-paste.png` shows the retained draft, dimensions, and error. The dialog closes only after success.
4. **Resolved** — CSV permits comma, semicolon, and pipe. Source dialect cannot introduce tab. Saved assertions check both controls.
5. **Resolved** — [fix-clear-search.png](/Users/rizeki.rifandani/Desktop/dev/projects/ritools/apps/web/.impeccable/review/tabular/fix-clear-search.png) shows “Paper clips” active at B1. Source explicitly selects row zero and retains the column. The regression assertion starts on Marker at row four and checks first-row focus in the same column. Saved evidence records absolute row 5 → 2, column 3. Existing captures retain empty-result recovery and visible sorted selection.
6. **Resolved** — Both export captures show “Check export” or “Periksa ekspor” while idle. Progress text remains separate.
7. **Resolved** — Export captures show focus on Output format. Source and saved assertions support focus return to Export.
8. **Resolved** — Queries clear old notices. Result guards prevent stale announcements. History messages name direction, operation, and Sheet.

## remaining

Clear for the eight scored findings. No regressions identified from the latest correction. All 21 required captures are valid.

This ship disposition covers only the eight scored fixes. Spoken screen-reader use, actual IME, physical-phone input and speed, and 14 incomplete contrast checks per axe case remain open. Desktop commit p95 remains 103.4 ms against the 100 ms target. Full release, accessibility, and performance approval remain open.

disposition: ship
