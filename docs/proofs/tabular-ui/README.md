# Tabular UI proof

Issue: [20](https://github.com/rifandani/ritools/issues/20). This record covers the
production UI at `/tabular`. It extends the engine and design proof in
[the original record](../tabular/README.md).

## Environment and limits

The runs use Playwright Chromium 153.0.8010.12 on the desktop Mac. The phone-size
runs use the same desktop CPU. Pixel 7 touch and user-agent emulation does not
prove physical-phone speed, touch behavior, or software-keyboard behavior.

Spoken VoiceOver/NVDA navigation, actual IME input, physical-phone keyboard/touch,
and physical-phone performance remain open gates. Automated roles, synthetic
composition events, and emulation do not close these gates. The grid dependency
remains conditional on the manual accessibility gate recorded in issue 18.

The 12-case automated accessibility scan found no WCAG A/AA violations, with
14 incomplete color-contrast checks per case. A complete contrast or WCAG claim
is not supported. See `browser-round-2.json` for the raw results.

## Reproduce

Run the production build from the repository root:

```sh
rtk bun web build
```

Then start Nitro on port 4666 from `apps/web`:

```sh
rtk proxy env PORT=4666 node .output/server/index.mjs
```

From `apps/web`, run the integration tests:

```sh
rtk proxy env PW_PORT=4666 bun run test tabular --reporter=line --workers=1
```

From the repository root, run `browser.mjs`, `runtime.mjs`, `views.mjs`,
`extra.mjs`, `fixes.mjs`, and `build.mjs` with Node. The browser proof uses a temporary axe-core 4.11.0 install
at `/tmp/ritools-tabular-qa/node_modules/axe-core/axe.min.js` for round 2.
`TABULAR_PROOF_ROUND` sets the report suffix. `TABULAR_PROOF_URL` changes the
browser matrix origin. Other probes use port 4666.

The T3 preview snapshot failed twice with
`Preview automation snapshot timed out after 15000ms.` The repository Playwright
workflow supplied the remaining browser checks.

## Records

- `browser-round-1.json` records the first visual inspection, including the
  input-strip overflow. Round 2 confirms its correction at 1440, 1280, and 390px,
  in both modes and both Locales. The original 15 images and six correction
  captures are under
  `apps/web/.impeccable/review/tabular/`.
- `runtime.json` records bounded grid rendering, edit feedback, wide navigation,
  lazy Workers, and cached/uncached offline behavior. The 100,000 × 20 standard
  text fixture mounts 165 grid cells. Commit feedback uses page keydown to the
  changed-cell DOM update and two animation frames. Automation elapsed is stored
  separately; it includes protocol and polling overhead. The latest standard
  fixture commit p95 is 103.4 ms, above the 100 ms desktop target. That target
  remains open. The expanded text fixture measured 91.3 ms; the 390px lab
  fixture measured 73.1 ms on the same desktop CPU.
- `runtime-before.json` is an earlier run. Its automation elapsed values are not
  browser feedback timings and must not be used as an edit-speed comparison.
- `views.json` records search and sort from the UI. The desktop 100,000 × 20
  run measured p95 search at 800 ms and sort at 890 ms. The 390px desktop-CPU
  10,000 × 20 run measured 185 ms and 199 ms. Search includes the 150ms
  debounce. Sort samples include both a two-click ascending/descending action
  and a separate reset action. It waits for the stable active identity at its
  new absolute row index and verifies that it is visible. These are desktop lab
  timings.
- `extra.json` records clipboard bytes, actual clipboard-write denial, Select text
  and TSV recovery, and the network/storage marker check. No file markers were
  found in requests or browser storage. App code, fonts, and assets are cached;
  file data is not stored by the application.
- `build-after.json` records output asset sizes and SSR metadata checks.
  `build-before.json` came from existing output whose exact source was not
  attested. It is context, not a reliable before/after size baseline.
- `browser-round-3.json` records the first reviewer correction captures.
  `browser-round-4.json` records the final Clear search correction.
- `fixes.json` and the `fix-*.png` captures record the multiline draft, retained
  paste failure, zero-match focus, deleted-column focus, search recovery, history
  notice, large-sort visibility, and Export focus checks.
- `detector.json` is the one detector pass, with no findings. It was not rerun.

The integration suite reads real CSV, TSV, TAB, TXT, XLS, and XLSX inputs, checks
all download formats, Current View/Whole Sheet/Whole Workbook scope, hidden-Sheet
history, unresolved-value recovery, JSON header fallback, discard behavior, and
clipboard text fidelity. The review correction tests cover multiline editing,
failed paste recovery, stable selection, sort removal, announcements, and Export
focus.

## Review status

The final independent verdict is **ship for the eight scored fixes**. All 21
required captures are valid. The full verdict is in [review-r4.md](review-r4.md).
The verdict does not approve the full release, accessibility, or performance.

The final correction passes all 26 production browser tests, repository lint,
web type checks, and a production build. The focused Tabular unit suite passes
62 tests. The full unit suite passed 915 tests before the final focus corrections.
The design record check required no system changes. Pre-existing DESIGN.md drift
about the shared Masthead stamp and mobile cuts remains outside this task.

Manual gates and the 103.4 ms desktop commit measurement remain open. Search and
sort meet their desktop lab target. No physical-phone or complete accessibility
pass is claimed. Changes remain local and uncommitted; the GitHub issue is open.
