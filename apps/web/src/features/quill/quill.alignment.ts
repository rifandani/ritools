import type { SourceEdit } from "./quill.commands";

/** Only these exact HTML wrappers carry formatting; all other HTML stays inert. */
export const alignmentOpening =
  /^<div(?<align> align="(?:left|center|right)")?(?<direction> dir="rtl")?>$/u;
export const alignmentTag = (align: string | null, rtl: boolean) =>
  `<div${align ? ` align="${align}"` : ""}${rtl ? ' dir="rtl"' : ""}>`;

interface AlignmentBlock {
  from: number;
  openingEnd: number;
  contentEnd: number;
  to: number;
  align: string | null;
  rtl: boolean;
}
type OpenAlignmentBlock = Omit<AlignmentBlock, "contentEnd" | "to">;

const fenceMarker = (line: string) =>
  /^\s{0,3}(?<fence>`{3,}|~{3,})/u.exec(line)?.groups?.fence;

const updateAlignmentBlocks = (
  text: string,
  line: string,
  offset: number,
  blocks: AlignmentBlock[],
  stack: OpenAlignmentBlock[]
) => {
  const match = alignmentOpening.exec(text)?.groups;
  if (match && (match.align || match.direction)) {
    stack.push({
      from: offset,
      openingEnd: offset + line.length,
      align: match.align?.slice(8, -1) ?? null,
      rtl: !!match.direction,
    });
    return;
  }
  if (text !== "</div>") {
    return;
  }
  const opening = stack.pop();
  if (!opening) {
    return;
  }
  blocks.push({
    ...opening,
    contentEnd: offset,
    to: offset + line.length,
  });
};

export const alignmentBlocks = (source: string) => {
  const blocks: AlignmentBlock[] = [];
  const stack: OpenAlignmentBlock[] = [];
  let offset = 0;
  let fence: string | null = null;
  for (const line of source.split("\n")) {
    const text = line.replace(/\r$/u, "");
    const marker = fenceMarker(text);
    if (
      marker &&
      (!fence || (marker[0] === fence[0] && marker.length >= fence.length))
    ) {
      fence = fence ? null : marker;
    } else if (!fence) {
      updateAlignmentBlocks(text, line, offset, blocks, stack);
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
