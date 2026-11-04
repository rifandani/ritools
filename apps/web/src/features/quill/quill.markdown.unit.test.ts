import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { inspect, parse, preview } from "./quill.markdown";

describe("Markdown preview", () => {
  it("keeps frontmatter separate from rendered Markdown and reference links", () => {
    const model = preview(
      "\uFEFF---\r\ntitle: Notes\r\n---\r\n# Notes\r\n\r\nA [reference][guide].\r\n\r\n[guide]: https://example.org/guide\r\n"
    );
    expect(model.content?.[0]).toMatchObject({
      type: "codeBlock",
      attrs: { language: "yaml" },
      content: [{ text: "---\r\ntitle: Notes\r\n---\r\n" }],
    });
    expect(model.content?.[1]?.type).toBe("heading");
    expect(JSON.stringify(model)).toContain("https://example.org/guide");
  });
  it("keeps block and nested inline HTML inert while formatting nearby Markdown", () => {
    const model = preview(
      '# Notes\n\n<script>alert("run")</script>\n\nA **bold** word with <img src="https://example.org/private.png">.\n\n> A <em>literal</em> tag\n\n| Tag | Value |\n| --- | --- |\n| <iframe src="https://example.org"> | **bold** |'
    );
    expect(model.content?.[0]?.type).toBe("heading");
    expect(model.content?.[1]).toMatchObject({
      type: "codeBlock",
      content: [{ text: '<script>alert("run")</script>' }],
    });
    const serialized = JSON.stringify(model);
    expect(serialized).toContain('"type":"bold"');
    expect(serialized).toContain("<img src=");
    expect(serialized).toContain("<iframe src=");
    expect(serialized).toContain("<em>");
    expect(serialized).not.toContain('"type":"image"');
    expect(serialized).not.toContain('"type":"italic"');
  });
  it("keeps an explicit Markdown fence as code", () => {
    expect(
      preview("```markdown\n# Code, not a heading\n```\n").content?.[0]
    ).toMatchObject({
      type: "codeBlock",
      attrs: { language: "markdown" },
      content: [{ text: "# Code, not a heading" }],
    });
  });
  it("renders plain angle brackets as text when they do not start an HTML tag", () => {
    const model = preview("2 < 3 and 4 > 1");
    expect(JSON.stringify(model)).toContain("2 < 3 and 4 > 1");
    expect(JSON.stringify(model)).not.toContain('"type":"image"');
  });
  it("keeps frontmatter visible when the document has no Markdown body", () => {
    expect(preview("---\ntitle: Notes\n---\n").content).toEqual([
      expect.objectContaining({
        type: "codeBlock",
        attrs: { language: "yaml" },
        content: [{ type: "text", text: "---\ntitle: Notes\n---\n" }],
      }),
    ]);
  });
});

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
  it("inspects tables, inline marks, and unordered lists", () => {
    for (const source of [
      "| A | B |\n| --- | --- |\n| x | y |\n",
      "A **bold** [link](https://example.org).\n",
      "- First\n- Second\n",
    ]) {
      expect(Effect.runSync(inspect(source)).safe).toBe(true);
    }
  });
});
