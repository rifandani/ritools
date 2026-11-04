import { describe, expect, it } from "vitest";

import { sourceEdit } from "./quill.commands";

const apply = (
  source: string,
  from: number,
  to: number,
  command: Parameters<typeof sourceEdit>[3]
) => {
  const edit = sourceEdit(source, from, to, command);
  return {
    text: source.slice(0, edit.from) + edit.insert + source.slice(edit.to),
    selected: edit.insert.slice(edit.anchor - edit.from, edit.head - edit.from),
  };
};
describe("source commands", () => {
  it("wraps selected text without changing the rest of the document", () => {
    expect(apply("Before word after", 7, 11, "bold")).toEqual({
      text: "Before **word** after",
      selected: "word",
    });
  });
  it("inserts and selects a placeholder at an empty caret", () => {
    expect(apply("", 0, 0, "italic")).toEqual({
      text: "*text*",
      selected: "text",
    });
  });
  it("numbers every selected line and preserves neighboring lines", () => {
    expect(apply("Title\n- First\n- Second\nEnd", 6, 22, "ordered").text).toBe(
      "Title\n1. First\n2. Second\nEnd"
    );
  });
  it("changes a heading without stacking Markdown prefixes", () => {
    expect(apply("## Heading\nText", 4, 4, "h1").text).toBe("# Heading\nText");
  });
  it("removes a block prefix when converting to a paragraph", () => {
    expect(apply("- [x] Finished", 10, 10, "paragraph").text).toBe("Finished");
  });
  it("separates a fenced block from surrounding inline content", () => {
    expect(apply("beforeafter", 6, 6, "code").text).toBe(
      "before\n\n```\n\n```\n\nafter"
    );
  });
  it("inserts at the first empty line without changing the next line", () => {
    expect(apply("\nKeep", 0, 0, "h2").text).toBe("## \nKeep");
  });
  it.each([
    ["strike", "~~word~~", "word"],
    ["inline-code", "`word`", "word"],
    ["link", "[word](https://)", "word"],
    ["image", "![word](image.png)", "word"],
  ] as const)("wraps a selection with %s", (command, text, selected) => {
    expect(apply("word", 0, 4, command)).toEqual({ text, selected });
  });
  it("selects the image description placeholder at an empty caret", () => {
    expect(apply("", 0, 0, "image")).toEqual({
      text: "![description](image.png)",
      selected: "description",
    });
  });
  it("adds no blank lines when a block insert is already on its own line", () => {
    const edit = sourceEdit("a\n\nb", 2, 2, "rule");
    expect(edit).toEqual({
      from: 2,
      to: 2,
      insert: "---\n",
      anchor: 6,
      head: 6,
    });
  });
  it("keeps the selection unchanged for an unknown command", () => {
    // SAFETY: deliberately not a SourceCommand, to reach the fallback for
    // commands that no wrap or block handles.
    expect(
      sourceEdit("abc", 1, 2, "unknown" as Parameters<typeof sourceEdit>[3])
    ).toEqual({ from: 1, to: 2, insert: "b", anchor: 1, head: 2 });
  });
});

describe("alignment commands", () => {
  it.each(["left", "center", "right"] as const)(
    "aligns the current line %s and preserves neighboring lines",
    (align) => {
      const edit = sourceEdit(
        "Before\nA **bold** line\nAfter",
        10,
        10,
        `align-${align}`
      );
      expect(
        apply("Before\nA **bold** line\nAfter", 10, 10, `align-${align}`).text
      ).toBe(
        `Before\n<div align="${align}">\n\nA **bold** line\n\n</div>\nAfter`
      );
      expect(edit.anchor).toBe(10 + `<div align="${align}">\n\n`.length);
      expect(edit.head).toBe(edit.anchor);
    }
  );
  it("wraps selected lines without including the line after the selection", () => {
    expect(apply("First\nSecond\nKeep", 0, 13, "align-center").text).toBe(
      '<div align="center">\n\nFirst\nSecond\n\n</div>\nKeep'
    );
  });
  it("changes an existing alignment and toggles direction without nesting wrappers", () => {
    const source = '<div align="center">\n\nText\n\n</div>';
    const rtl = apply(source, 23, 23, "rtl").text;
    expect(rtl).toBe('<div align="center" dir="rtl">\n\nText\n\n</div>');
    const right = apply(rtl, 32, 32, "align-right").text;
    expect(right).toBe('<div align="right" dir="rtl">\n\nText\n\n</div>');
    expect(apply(right, 31, 31, "rtl").text).toBe(
      '<div align="right">\n\nText\n\n</div>'
    );
  });
  it("inserts an empty block and keeps the caret inside", () => {
    const edit = sourceEdit("", 0, 0, "rtl");
    expect(edit.insert).toBe('<div dir="rtl">\n\n\n\n</div>');
    expect(edit.anchor).toBe('<div dir="rtl">\n\n'.length);
  });
  it("does not treat wrapper examples in fenced code as enclosing formatting", () => {
    const source =
      '```html\n<div align="center">\nExample\n</div>\n```\n\nText';
    expect(
      apply(source, source.length, source.length, "align-right").text
    ).toBe(`${source.slice(0, -4)}<div align="right">\n\nText\n\n</div>`);
  });
});
