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
});
