# Redline

Redline compares two UTF-8 texts and resolves their Changes on the device. It also resolves git conflict markers in one Marked Text. It uses `@pierre/diffs` 1.6.4, pinned because the Marked Text API is beta.

`redline.session.ts` owns a Text Diff and stable Conflict IDs. Choices find the current hunk and Change indexes each time. Resolution uses `diffAcceptRejectHunk`, with a newline correction for Accept both at EOF. The Resolved Text comes from the final `additionLines`. The Session preserves CRLF when both inputs use only CRLF.

`redline.marked.ts` owns Marked Text progress. Its browser adapter connects it to the native renderer. The browser adapter uses the vanilla `UnresolvedFile` class and reads each file from `onMergeConflictResolve`. Custom action rows use the shared button styles and translated labels. No code creates conflict markers in user text. See [ADR-0037](../../../../../docs/adr/0037-redline-resolves-a-text-diff-without-conflict-markers.md).

`redline.ts` checks markers, imports strict UTF-8, selects a language from the file name, and names downloads. `redline.controls.ts` validates preferences and maps controls to renderer options. The browser preference adapter reads and writes localStorage through a writable atom. Text and Resolve progress stay in memory.

The dedicated compare Worker loads on first use. Cancel terminates it. The Effect loader also starts the renderer and its JavaScript highlighter on first use. A failed load retries through a separate module graph; the build plugin keeps React shared between the two graphs. Grammars come from the app bundle; a failed grammar falls back to plain text. The service worker caches code after use. An unused grammar needs a network connection on its first use.

Tests use the two boundaries in issue #57: the Session in Vitest, and the page in Playwright. Page tests cover the real renderer, translated actions, file input, exact download bytes, and offline use.
