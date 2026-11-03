/* oxlint-disable anti-slop/no-runtime-typeof -- Tiptap attributes are SDK values, narrowed before the control displays them. */
import "katex/dist/katex.min.css";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/core/components/ui/button";
import { Menu, MenuContent, MenuItem } from "@/core/components/ui/menu";
import { Toolbar } from "@/core/components/ui/toolbar";
import { useTranslation } from "@/features/i18n/use-translation";

import { extensions } from "../quill.extensions";
import { parse, serialize } from "../quill.markdown";

export default function QuillVisual({
  toolbarActions,
  source,
  onChange,
  onHistory,
}: {
  readonly toolbarActions: ReactNode;
  readonly source: string;
  readonly onChange: (source: string) => void;
  readonly onHistory: (direction: "undo" | "redo") => void;
}) {
  const { t } = useTranslation();
  const [slash, setSlash] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [language, setLanguage] = useState("");
  const latest = useRef(source);
  const changed = useRef(onChange);
  const history = useRef(onHistory);
  useEffect(() => {
    changed.current = onChange;
    history.current = onHistory;
  }, [onChange, onHistory]);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: extensions(),
    content: parse(source),
    editorProps: {
      attributes: {
        "aria-label": t("quillEditor"),
        role: "textbox",
        "aria-multiline": "true",
        class: "quill-prose quill-visual",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "/" && !event.ctrlKey && !event.metaKey) {
          setSlash(true);
          return true;
        }
        if (
          (event.metaKey || event.ctrlKey) &&
          ["z", "y"].includes(event.key.toLowerCase())
        ) {
          history.current(
            event.shiftKey || event.key.toLowerCase() === "y" ? "redo" : "undo"
          );
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: current }) => {
      latest.current = serialize(current.getJSON());
      changed.current(latest.current);
    },
    onSelectionUpdate: ({ editor: current }) => {
      const value = current.getAttributes("codeBlock").language;
      setLanguage(typeof value === "string" ? value : "");
    },
  });
  useEffect(() => {
    if (editor && latest.current !== source) {
      latest.current = source;
      const position = editor.state.selection.from;
      editor.commands.setContent(parse(source), { emitUpdate: false });
      editor.commands.setTextSelection(
        Math.min(position, editor.state.doc.content.size)
      );
    }
  }, [editor, source]);
  const inserts = [
    ["quillParagraph", () => editor?.chain().focus().setParagraph().run()],
    [
      "quillHeading",
      () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    ],
    ["quillQuote", () => editor?.chain().focus().toggleBlockquote().run()],
    ["quillBullet", () => editor?.chain().focus().toggleBulletList().run()],
    ["quillOrdered", () => editor?.chain().focus().toggleOrderedList().run()],
    ["quillTasks", () => editor?.chain().focus().toggleTaskList().run()],
    ["quillRule", () => editor?.chain().focus().setHorizontalRule().run()],
    [
      "quillTable",
      () =>
        editor
          ?.chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    ],
    ["quillCode", () => editor?.chain().focus().toggleCodeBlock().run()],
    [
      "quillMath",
      () => editor?.chain().focus().insertBlockMath({ latex: "x^2" }).run(),
    ],
    [
      "quillDiagram",
      () =>
        editor
          ?.chain()
          .focus()
          .insertContent({
            type: "codeBlock",
            attrs: { language: "mermaid" },
            content: [{ type: "text", text: "graph TD\n  A --> B" }],
          })
          .run(),
    ],
  ] as const;
  return (
    <>
      <Toolbar aria-label={t("quillFormat")} className="quill-source-toolbar">
        <Button
          aria-pressed={editor?.isActive("bold")}
          intent="outline"
          size="sm"
          onPress={() => editor?.chain().focus().toggleBold().run()}
        >
          {t("quillBold")}
        </Button>
        <Button
          aria-pressed={editor?.isActive("italic")}
          intent="outline"
          size="sm"
          onPress={() => editor?.chain().focus().toggleItalic().run()}
        >
          {t("quillItalic")}
        </Button>
        <Button
          aria-pressed={editor?.isActive("strike")}
          intent="outline"
          size="sm"
          onPress={() => editor?.chain().focus().toggleStrike().run()}
        >
          {t("quillStrike")}
        </Button>
        <Button intent="outline" size="sm" onPress={() => setLink("")}>
          {t("quillLink")}
        </Button>
        <Menu isOpen={slash} onOpenChange={setSlash}>
          <Button intent="outline" size="sm">
            / {t("quillInsert")}
          </Button>
          <MenuContent aria-label={t("quillInsert")}>
            {inserts.map(([key, insert]) => (
              <MenuItem
                key={key}
                onAction={() => {
                  insert();
                  setSlash(false);
                }}
              >
                {t(key)}
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
        {editor?.isActive("table") ? (
          <Menu>
            <Button intent="outline" size="sm">
              {t("quillTable")}
            </Button>
            <MenuContent aria-label={t("quillTable")}>
              <MenuItem
                onAction={() => editor.chain().focus().addRowAfter().run()}
              >
                {t("quillAddRow")}
              </MenuItem>
              <MenuItem
                onAction={() => editor.chain().focus().addColumnAfter().run()}
              >
                {t("quillAddColumn")}
              </MenuItem>
              <MenuItem
                onAction={() => editor.chain().focus().deleteRow().run()}
              >
                {t("quillDeleteRow")}
              </MenuItem>
              <MenuItem
                onAction={() => editor.chain().focus().deleteColumn().run()}
              >
                {t("quillDeleteColumn")}
              </MenuItem>
            </MenuContent>
          </Menu>
        ) : null}
        {editor?.isActive("codeBlock") ? (
          <label className="flex items-center gap-2 text-sm">
            {t("quillLanguage")}
            <input
              aria-label={t("quillLanguage")}
              className="quill-field w-32"
              value={language}
              onChange={(event) => {
                setLanguage(event.target.value);
                editor
                  .chain()
                  .focus()
                  .updateAttributes("codeBlock", {
                    language: event.target.value,
                  })
                  .run();
              }}
            />
          </label>
        ) : null}
        {toolbarActions}
      </Toolbar>
      {link === null ? null : (
        <form
          className="border-rule flex flex-wrap gap-2 border-b-2 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (/^(?:https?:|mailto:|[^:]+$)/iu.test(link)) {
              editor?.chain().focus().setLink({ href: link }).run();
            }
            setLink(null);
          }}
        >
          <label className="flex flex-1 items-center gap-2 text-sm">
            {t("quillDestination")}
            <input
              autoFocus
              className="quill-field min-w-0 flex-1"
              value={link}
              onChange={(event) => setLink(event.target.value)}
            />
          </label>
          <Button type="submit" size="sm">
            {t("quillApply")}
          </Button>
          <Button size="sm" intent="outline" onPress={() => setLink(null)}>
            {t("quillCancel")}
          </Button>
        </form>
      )}
      <EditorContent editor={editor} />
    </>
  );
}
