import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { inspect, parse } from "./quill.markdown";

describe("aligned Markdown", () => {
  it("parses formatting as an inert block and keeps Markdown children", () => {
    expect(
      parse(
        '<div align="center" dir="rtl">\n\n# Title\n\nA **bold** word\n\n</div>'
      ).content?.[0]
    ).toMatchObject({
      type: "alignedBlock",
      attrs: { align: "center", rtl: true },
      content: [{ type: "heading" }, { type: "paragraph" }],
    });
  });
  it.each([
    '<div align="left">\n\nText\n\n</div>',
    '<div align="center">\n\n    const code = 1;\n\n</div>',
    '<div align="center" dir="rtl">\n\n# Title\n\n1. First\n2. Second\n\n</div>',
    '<div dir="rtl">\n\nمرحبا بالعالم\n\n</div>',
    '<div align="right">\n\n<div dir="rtl">\n\nNested\n\n</div>\n\n</div>',
  ])("round-trips supported formatting: %s", (source) => {
    expect(Effect.runSync(inspect(source)).safe).toBe(true);
  });
  it.each([
    '<div align="center" onclick="alert(1)">\n\nText\n\n</div>',
    '<div style="text-align:center">Text</div>',
    '<div align="center">\n\n<script>alert(1)</script>\n\n</div>',
    '<div align="center">\n\nText',
    "</div>",
  ])("keeps unsupported HTML protected: %s", (source) => {
    expect(Effect.runSync(inspect(source)).safe).toBe(false);
  });
});
