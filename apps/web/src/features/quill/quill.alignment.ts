import type { SourceEdit } from "./quill.commands";

/** Only these exact HTML wrappers carry formatting; all other HTML stays inert. */
export const alignmentOpening =
  /^<div(?<align> align="(?:left|center|right)")?(?<direction> dir="rtl")?>$/u;
export const alignmentTag = (align: string | null, rtl: boolean) =>
  `<div${align ? ` align="${align}"` : ""}${rtl ? ' dir="rtl"' : ""}>`;

export const alignmentBlocks = (source: string) => {
  const blocks: {
    from: number;
    openingEnd: number;
    contentEnd: number;
    to: number;
    align: string | null;
    rtl: boolean;
  }[] = [];
  const stack: Omit<(typeof blocks)[number], "contentEnd" | "to">[] = [];
  let offset = 0;
  let fence: string | null = null;
  for (const line of source.split("\n")) {
    const text = line.replace(/\r$/u, "");
    const marker = /^\s{0,3}(?<fence>`{3,}|~{3,})/u.exec(text)?.groups?.fence;
    if (
      marker &&
      (!fence || (marker[0] === fence[0] && marker.length >= fence.length))
    ) {
      fence = fence ? null : marker;
    } else if (!fence) {
      const match = alignmentOpening.exec(text)?.groups;
      if (match && (match.align || match.direction)) {
        stack.push({
          from: offset,
          openingEnd: offset + line.length,
          align: match.align?.slice(8, -1) ?? null,
          rtl: !!match.direction,
        });
      } else if (text === "</div>") {
        const opening = stack.pop();
        if (opening) {
          blocks.push({
            ...opening,
            contentEnd: offset,
            to: offset + line.length,
          });
        }
      }
    }
    offset += line.length + 1;
  }
  return blocks;
};

export const alignmentEdit = (
  source: string,
  from: number,
  to: number,
  command: string
): SourceEdit => {
  const enclosing = alignmentBlocks(source).find(
    (block) => from >= block.from && to <= block.to
  );
  const align =
    command === "rtl" ? (enclosing?.align ?? null) : command.slice(6);
  const rtl = command === "rtl" ? !enclosing?.rtl : (enclosing?.rtl ?? false);
  if (enclosing) {
    const insert = alignmentTag(align, rtl);
    // A direction-only block returns to an explicit left alignment when toggled off.
    const opening = insert === "<div>" ? alignmentTag("left", false) : insert;
    const delta = opening.length - (enclosing.openingEnd - enclosing.from);
    return {
      from: enclosing.from,
      to: enclosing.openingEnd,
      insert: opening,
      anchor: Math.max(enclosing.from + opening.length, from + delta),
      head: Math.max(enclosing.from + opening.length, to + delta),
    };
  }
  const start = from === 0 ? 0 : source.lastIndexOf("\n", from - 1) + 1;
  const end = source.indexOf("\n", Math.max(from, to - 1));
  const stop = end === -1 ? source.length : end;
  const prefix = `${alignmentTag(align, rtl)}\n\n`;
  return {
    from: start,
    to: stop,
    insert: `${prefix}${source.slice(start, stop)}\n\n</div>`,
    anchor: from + prefix.length,
    head: to + prefix.length,
  };
};
