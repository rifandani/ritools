import { alignmentEdit } from "./quill.alignment";

/** Source commands preserve all text outside the selected range or lines. */
export const blockCommands = [
  { id: "paragraph", label: "quillParagraph", prefix: "" },
  { id: "h1", label: "quillHeading1", prefix: "# " },
  { id: "h2", label: "quillHeading2", prefix: "## " },
  { id: "h3", label: "quillHeading3", prefix: "### " },
  { id: "h4", label: "quillHeading4", prefix: "#### " },
  { id: "h5", label: "quillHeading5", prefix: "##### " },
  { id: "h6", label: "quillHeading6", prefix: "###### " },
  { id: "bullet", label: "quillBullet", prefix: "- " },
  { id: "ordered", label: "quillOrdered", prefix: "1. " },
  { id: "tasks", label: "quillTasks", prefix: "- [ ] " },
  { id: "quote", label: "quillQuote", prefix: "> " },
  { id: "code", label: "quillCode", insert: "```\n\n```", cursor: 4 },
  {
    id: "table",
    label: "quillTable",
    insert: "| Column | Column |\n| --- | --- |\n|  |  |",
    cursor: 2,
  },
  { id: "rule", label: "quillRule", insert: "---\n", cursor: 4 },
  { id: "math", label: "quillMath", insert: "$$\nx^2\n$$", cursor: 3 },
  {
    id: "diagram",
    label: "quillDiagram",
    insert: "```mermaid\ngraph TD\n  A --> B\n```",
    cursor: 10,
  },
] as const;
export type SourceCommand =
  | (typeof blockCommands)[number]["id"]
  | "bold"
  | "italic"
  | "strike"
  | "inline-code"
  | "link"
  | "image"
  | "align-left"
  | "align-center"
  | "align-right"
  | "rtl";
export interface SourceEdit {
  readonly from: number;
  readonly to: number;
  readonly insert: string;
  readonly anchor: number;
  readonly head: number;
}
export const sourceEdit = (
  source: string,
  from: number,
  to: number,
  command: SourceCommand
): SourceEdit => {
  const text = source.slice(from, to);
  if (command.startsWith("align-") || command === "rtl") {
    return alignmentEdit(source, from, to, command);
  }
  const wrap = (
    before: string,
    after = before,
    placeholder = "text"
  ): SourceEdit => ({
    from,
    to,
    insert: before + (text || placeholder) + after,
    anchor: from + before.length,
    head: from + before.length + (text || placeholder).length,
  });
  switch (command) {
    case "bold": {
      return wrap("**");
    }
    case "italic": {
      return wrap("*");
    }
    case "strike": {
      return wrap("~~");
    }
    case "inline-code": {
      return wrap("`");
    }
    case "link": {
      return wrap("[", "](https://)");
    }
    case "image": {
      return wrap("![", "](image.png)", "description");
    }
    default: {
      break;
    }
  }
  const block = blockCommands.find((item) => item.id === command);
  if (!block) {
    return { from, to, insert: text, anchor: from, head: to };
  }
  if ("insert" in block) {
    const prefix = from > 0 && source[from - 1] !== "\n" ? "\n\n" : "";
    const suffix = to < source.length && source[to] !== "\n" ? "\n\n" : "";
    const anchor = from + prefix.length + block.cursor;
    return {
      from,
      to,
      insert: prefix + block.insert + suffix,
      anchor,
      head: anchor,
    };
  }
  const start = from === 0 ? 0 : source.lastIndexOf("\n", from - 1) + 1;
  const end = source.indexOf("\n", Math.max(from, to - 1));
  const stop = end === -1 ? source.length : end;
  const insert = source
    .slice(start, stop)
    .split("\n")
    .map(
      (line, index) =>
        (command === "ordered" ? `${index + 1}. ` : block.prefix) +
        line.replace(
          /^\s*(?:#{1,6}\s|>\s|[-*+]\s(?:\[[ xX]\]\s)?|\d+\.\s)/u,
          ""
        )
    )
    .join("\n");
  return {
    from: start,
    to: stop,
    insert,
    anchor: start + insert.length,
    head: start + insert.length,
  };
};
