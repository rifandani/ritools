/* oxlint-disable react-doctor/prefer-dynamic-import -- This complete editor component is loaded with React.lazy. */
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useEffectEvent, useRef } from "react";

import { useTranslation } from "@/features/i18n/use-translation";

export default function QuillSource({
  source,
  onChange,
  onHistory,
}: {
  readonly source: string;
  readonly onChange: (source: string) => void;
  readonly onHistory: (direction: "undo" | "redo") => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const initial = useRef(source);
  const syncing = useRef(false);
  const { t } = useTranslation();
  const label = t("quillSourceEditor");
  const change = useEffectEvent(onChange);
  const history = useEffectEvent(onHistory);
  useEffect(() => {
    if (!host.current) {
      return;
    }
    const view = new EditorView({
      parent: host.current,
      doc: initial.current,
      extensions: [
        basicSetup,
        markdown(),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          "aria-label": label,
          spellcheck: "false",
        }),
        EditorView.domEventHandlers({
          keydown: (event) => {
            if (
              (event.metaKey || event.ctrlKey) &&
              ["z", "y"].includes(event.key.toLowerCase())
            ) {
              event.preventDefault();
              history(
                event.shiftKey || event.key.toLowerCase() === "y"
                  ? "redo"
                  : "undo"
              );
              return true;
            }
            return false;
          },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !syncing.current) {
            change(update.state.doc.toString());
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
  return <div className="quill-source" ref={host} />;
}
