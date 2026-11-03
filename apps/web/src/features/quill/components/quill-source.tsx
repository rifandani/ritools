/* oxlint-disable react-doctor/prefer-dynamic-import -- The source editor is loaded with React.lazy. */
import { markdown } from "@codemirror/lang-markdown";
import { EditorView, ViewPlugin } from "@codemirror/view";
import type { ViewUpdate } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useTranslation } from "@/features/i18n/use-translation";

import { blockCommands, sourceEdit } from "../quill.commands";
import type { SourceCommand } from "../quill.commands";
import { QuillSlashMenu, QuillSourceToolbar } from "./quill-source-controls";

interface Slash {
  readonly from: number;
  readonly to: number;
  readonly query: string;
  readonly left: number;
  readonly top: number;
}
const centerOpenFold = (view: EditorView) => {
  for (const node of view.dom.querySelectorAll(".cm-foldGutter span")) {
    if (node instanceof HTMLElement) {
      node.classList.toggle("quill-fold-open", node.textContent === "⌄");
    }
  }
};
// One key per plugin, so a pending measure for the fold marks is replaced, not stacked.
const foldPlacementKey = {};
const scheduleFoldPlacement = (view: EditorView) => {
  view.requestMeasure({
    key: foldPlacementKey,
    read: () => null,
    write: (_measure, measured) => centerOpenFold(measured),
  });
};
const openFoldPlacement = ViewPlugin.define((view) => {
  scheduleFoldPlacement(view);
  return {
    update(update: ViewUpdate) {
      scheduleFoldPlacement(update.view);
    },
  };
});
const slashRange = (view: EditorView) => {
  const selection = view.state.selection.main;
  const line = view.state.doc.lineAt(selection.head);
  const match = /^\s*\/(?<query>[\p{L}\d -]*)$/u.exec(
    line.text.slice(0, selection.head - line.from)
  );
  return selection.empty && match
    ? {
        from: line.from + line.text.indexOf("/"),
        to: selection.head,
        query: match.groups?.query ?? "",
      }
    : null;
};
export default function QuillSource({
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
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const initial = useRef(source);
  const syncing = useRef(false);
  const dismissed = useRef<number | null>(null);
  const [slash, setSlash] = useState<Slash | null>(null);
  const [active, setActive] = useState(0);
  const { t } = useTranslation();
  const label = t("quillSourceEditor");
  const change = useEffectEvent(onChange);
  const history = useEffectEvent(onHistory);
  const matches = blockCommands.filter((item) =>
    `${t(item.label)} ${item.id}`
      .toLocaleLowerCase()
      .includes(slash?.query.toLocaleLowerCase() ?? "")
  );
  const closeSlash = () => {
    dismissed.current = slash?.from ?? null;
    setSlash(null);
  };
  const insert = (id: SourceCommand, replaceSlash = false) => {
    const view = editor.current;
    if (!view) {
      return;
    }
    const { from, to } = view.state.selection.main;
    let text = view.state.doc.toString();
    let start = from;
    let end = to;
    const trigger = replaceSlash ? slashRange(view) : null;
    if (trigger) {
      text = text.slice(0, trigger.from) + text.slice(trigger.to);
      start = trigger.from;
      end = start;
    }
    const edit = sourceEdit(text, start, end, id);
    view.dispatch({
      changes: {
        from: edit.from,
        to: edit.to + (trigger ? trigger.to - trigger.from : 0),
        insert: edit.insert,
      },
      selection: { anchor: edit.anchor, head: edit.head },
      scrollIntoView: true,
    });
    closeSlash();
    view.focus();
  };
  const keydown = useEffectEvent((event: KeyboardEvent) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      ["z", "y"].includes(event.key.toLowerCase())
    ) {
      event.preventDefault();
      history(
        event.shiftKey || event.key.toLowerCase() === "y" ? "redo" : "undo"
      );
      return true;
    }
    if (
      (event.metaKey || event.ctrlKey) &&
      ["b", "i"].includes(event.key.toLowerCase())
    ) {
      event.preventDefault();
      insert(event.key.toLowerCase() === "b" ? "bold" : "italic");
      return true;
    }
    if (!slash) {
      return false;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeSlash();
      return true;
    }
    const trigger = editor.current ? slashRange(editor.current) : null;
    const currentMatches = trigger
      ? blockCommands.filter((item) =>
          `${t(item.label)} ${item.id}`
            .toLocaleLowerCase()
            .includes(trigger.query.toLocaleLowerCase())
        )
      : [];
    if (
      currentMatches.length &&
      ["ArrowDown", "ArrowUp", "Enter", "Tab"].includes(event.key)
    ) {
      event.preventDefault();
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        setActive(
          (index) =>
            (index +
              (event.key === "ArrowDown" ? 1 : -1) +
              currentMatches.length) %
            currentMatches.length
        );
      } else {
        const item =
          currentMatches[Math.min(active, currentMatches.length - 1)];
        if (item) {
          insert(item.id, true);
        }
      }
      return true;
    }
    return false;
  });
  const updateSlash = useEffectEvent((view: EditorView) => {
    const trigger = slashRange(view);
    if (!trigger || !view.hasFocus) {
      setSlash(null);
      dismissed.current = null;
      return;
    }
    const { from, to, query } = trigger;
    if (dismissed.current === from) {
      return;
    }
    const rect = view.coordsAtPos(from);
    if (!rect) {
      return;
    }
    setSlash({
      from,
      to,
      query,
      left: Math.max(8, Math.min(rect.left, innerWidth - 280)),
      top: rect.bottom + 6,
    });
    setActive(0);
  });
  useEffect(() => {
    if (!host.current) {
      return;
    }
    const view = new EditorView({
      parent: host.current,
      doc: initial.current,
      extensions: [
        EditorView.domEventHandlers({
          keydown: (event) => keydown(event),
          blur: () => {
            setSlash(null);
            return false;
          },
        }),
        basicSetup,
        openFoldPlacement,
        markdown(),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          "aria-label": label,
          spellcheck: "false",
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !syncing.current) {
            change(update.state.doc.toString());
          }
          if (
            update.docChanged ||
            update.selectionSet ||
            update.geometryChanged ||
            update.viewportChanged ||
            update.focusChanged
          ) {
            update.view.requestMeasure({
              read: () => updateSlash(update.view),
            });
          }
        }),
      ],
    });
    editor.current = view;
    return () => {
      editor.current = null;
      view.destroy();
    };
  }, [label]);
  useEffect(() => {
    const view = editor.current;
    if (view && view.state.doc.toString() !== source) {
      syncing.current = true;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: source },
        selection: {
          anchor: Math.min(view.state.selection.main.anchor, source.length),
        },
      });
      syncing.current = false;
    }
  }, [source]);
  useEffect(() => {
    const content = editor.current?.contentDOM;
    if (!content) {
      return;
    }
    content.setAttribute("aria-autocomplete", "list");
    if (slash) {
      content.setAttribute("aria-controls", "quill-slash-commands");
      content.setAttribute(
        "aria-activedescendant",
        `quill-command-${matches[active]?.id ?? "none"}`
      );
    } else {
      content.removeAttribute("aria-controls");
      content.removeAttribute("aria-activedescendant");
    }
    document
      .querySelector(`#quill-command-${matches[active]?.id}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [slash, matches, active]);
  return (
    <div className="quill-source-pane">
      <QuillSourceToolbar onCommand={insert} actions={toolbarActions} />
      <div className="quill-source" ref={host} />
      <QuillSlashMenu
        slash={slash}
        matches={matches}
        active={active}
        onCommand={(id) => insert(id, true)}
      />
    </div>
  );
}
