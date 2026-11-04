import { Node } from "@tiptap/core";
import { Mathematics } from "@tiptap/extension-mathematics";
import { TableKit } from "@tiptap/extension-table";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { StarterKit } from "@tiptap/starter-kit";

import { alignmentBlocks, alignmentTag } from "./quill.alignment";

const AlignedBlock = Node.create({
  name: "alignedBlock",
  group: "block",
  content: "block+",
  addAttributes: () => ({ align: { default: null }, rtl: { default: false } }),
  markdownTokenName: "alignedBlock",
  markdownTokenizer: {
    name: "alignedBlock",
    level: "block",
    start: "<div",
    tokenize: (source, _tokens, lexer) => {
      const block = alignmentBlocks(source).find((item) => item.from === 0);
      if (!block) {
        return;
      }
      return {
        type: "alignedBlock",
        raw: source.slice(0, block.to),
        align: block.align,
        rtl: block.rtl,
        tokens: lexer.blockTokens(
          source
            .slice(block.openingEnd + 1, block.contentEnd)
            .replaceAll(/^(?:[ \t]*\r?\n)+|(?:\r?\n[ \t]*)+$/gu, "")
        ),
      };
    },
  },
  parseMarkdown: (token, helpers) => ({
    type: "alignedBlock",
    attrs: { align: token.align, rtl: token.rtl },
    content: helpers.parseChildren(token.tokens ?? []),
  }),
  renderMarkdown: (node, helpers) =>
    `${alignmentTag(node.attrs?.align ?? null, !!node.attrs?.rtl)}\n\n${helpers.renderChildren(node.content ?? [], "\n\n")}\n\n</div>`,
  renderHTML: ({ node }) => [
    "div",
    { align: node.attrs.align, dir: node.attrs.rtl ? "rtl" : undefined },
    0,
  ],
});

// Images remain references. This node never creates an img element or a request.
const ImageReference = Node.create({
  name: "image",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({
    src: { default: "" },
    alt: { default: "" },
    title: { default: null },
  }),
  parseMarkdown: (token) => ({
    type: "image",
    attrs: {
      src: token.href,
      alt: token.text ?? "",
      title: token.title ?? null,
    },
  }),
  renderMarkdown: (node) =>
    `![${node.attrs?.alt ?? ""}](${node.attrs?.src ?? ""}${node.attrs?.title ? ` "${node.attrs.title}"` : ""})`,
  renderHTML: ({ node }) => [
    "span",
    { "data-image-reference": "", contenteditable: "false" },
    `![${node.attrs.alt}](${node.attrs.src})`,
  ],
  markdownTokenName: "image",
});
export const extensions = () => [
  StarterKit.configure({
    undoRedo: false,
    link: { openOnClick: false, autolink: false },
  }),
  TableKit.configure({ table: { resizable: false } }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Mathematics.configure({
    katexOptions: {
      trust: false,
      strict: "error",
      throwOnError: false,
      maxExpand: 1000,
    },
  }),
  ImageReference,
  AlignedBlock,
];
