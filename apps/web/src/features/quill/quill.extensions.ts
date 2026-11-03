import { Node } from "@tiptap/core";
import { Mathematics } from "@tiptap/extension-mathematics";
import { TableKit } from "@tiptap/extension-table";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { StarterKit } from "@tiptap/starter-kit";

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
];
