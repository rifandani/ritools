# Redline resolves a Text Diff without conflict markers

Redline renders with `@pierre/diffs` (Apache-2.0). A Conflict from a Text Diff stays on the diff data: the page calls `diffAcceptRejectHunk` for each Change and reads the Resolved Text from that data. Redline does not write conflict markers into user text. This keeps the Resolved Text exact, and it keeps Split and Stacked available during Resolve.

Only a Marked Text uses `UnresolvedFile`, because those markers are already the user's input. That view is beta and has one Stacked layout, so we pin the exact package version.

## Considered Options

- **Generate conflict markers and render every Conflict with `UnresolvedFile`.** Rejected. We tested version 1.6.4. A line that starts with `<<<<<<<` made the parser throw. A line of `=======` inside a Change gave wrong text with no error. Markdown headings and text files can hold such lines, and a wrong Resolved Text is worse than a visible failure.
- **Escape the marker lines.** Rejected. The user would see altered text, and the view would need a reverse step.
- **Support only Marked Text.** Rejected. Two plain texts have no markers, so most users could not Resolve.

## Consequences

Redline has two views for Resolve. Each Conflict row uses Ritools buttons, because the library labels are fixed English and Ritools ships `en-us` and `id-id`.

The docs for 1.6.4 describe `resolveMergeConflict`, but the package does not export it. Use the `UnresolvedFile` class and its `onMergeConflictResolve` option. `parseMergeConflictDiffFromFile` is also outside the package `exports`, so Redline detects markers with its own check.

When the user keeps both sides of a last line with no final newline, `diffAcceptRejectHunk` joins the two lines. Redline must add the newline.
