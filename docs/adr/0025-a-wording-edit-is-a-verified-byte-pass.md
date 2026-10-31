# A wording edit is a verified byte pass

The viewer's engine has no text-edit service: `@embedpdf/engine-core` reads text
through `PageTextService` and nothing else. The wasm exports the primitives, but
they live outside the typed API, and they can produce a valid file that renders
wrong text: a character outside the font's Glyph Coverage comes back as `ÿ` with
no error, and `GenerateContent` rewrites the whole content stream.

A Wording Edit therefore runs in its own Worker over the document's downloaded
bytes: load, find the PDF Text Object, check Glyph Coverage and the free width on
the line, re-encode the string, regenerate the page, save, re-extract the object
and compare it to what the user typed, render the page and diff it outside the
old and new bounds, then reopen the result. Any failed check refuses the edit and
writes nothing. Undo is a memory-capped stack of byte snapshots, not the viewer's
history. The mode is labelled beta, and the comparison table says "basic; same
font, no reflow".

## Considered options

- **Cover and overlay.** Draw a rectangle over the old text and place new text on
  top. Rejected: the old string stays extractable, searchable, and copyable, and
  any non-white background shows the patch.
- **Live editing through the viewer.** Rejected: the engine exposes no service for
  it, so this needs a fork of a preview package.
- **Substitute a bundled font by default.** Rejected: the page changes
  typography without the user asking, and re-embedding a restricted font is a
  licence problem.
- **Reflow and rewrap.** Rejected: it needs a layout engine and font metrics for
  every font in every document.

## Consequences

- A word inside one PDF Text Object is not separately addressable; the whole
  object is rewritten.
- New text never reflows, wraps, or changes baseline, font, or size.
- One Apply is one document state. The viewer's undo does not cover it.
- Tagged pages keep their tags but the structure tree may go stale.
- Owner-restricted files and signed files are refused with the reason shown.
