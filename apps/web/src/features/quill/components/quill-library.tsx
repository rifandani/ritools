import { useState } from "react";
import { HiDocumentText, HiFolder } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Tree, TreeContent, TreeItem } from "@/core/components/ui/tree";
import { useTranslation } from "@/features/i18n/use-translation";

import type { Entry } from "../quill";

export const QuillLibrary = ({
  entries,
  selected,
  onSelect,
  onRestore,
  onRemove,
  busy,
}: {
  readonly entries: readonly Entry[];
  readonly selected: string | null;
  readonly onSelect: (entry: Entry) => void;
  readonly onRestore: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly busy: boolean;
}) => {
  const { t } = useTranslation();
  const [trash, setTrash] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string | number>>(new Set());
  const expanded = new Set(
    entries.flatMap((entry) =>
      entry.kind === "folder" && !collapsed.has(entry.id) ? [entry.id] : []
    )
  );
  const visible = entries.filter((entry) => !entry.trash);
  const groups = new Map<string | null, Entry[]>();
  for (const entry of visible) {
    const group = groups.get(entry.parent) ?? [];
    group.push(entry);
    groups.set(entry.parent, group);
  }
  const branch = (parent: string | null): React.ReactNode =>
    (groups.get(parent) ?? []).map((entry) => (
      <TreeItem id={entry.id} key={entry.id} textValue={entry.name}>
        <TreeContent>
          {entry.kind === "folder" ? (
            <HiFolder aria-hidden="true" />
          ) : (
            <HiDocumentText aria-hidden="true" />
          )}
          <span className="truncate">{entry.name}</span>
        </TreeContent>
        {entry.kind === "folder" ? branch(entry.id) : null}
      </TreeItem>
    ));
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          intent={trash ? "outline" : "secondary"}
          aria-pressed={!trash}
          onPress={() => setTrash(false)}
        >
          {t("quillLibrary")}
        </Button>
        <Button
          size="sm"
          intent={trash ? "secondary" : "outline"}
          aria-pressed={trash}
          onPress={() => setTrash(true)}
        >
          {t("quillTrash")}
        </Button>
      </div>
      {trash ? (
        <ul className="flex flex-col gap-3" aria-label={t("quillTrash")}>
          {entries.flatMap((entry) =>
            entry.trash === entry.id
              ? [
                  <li className="border-rule border-2 p-3" key={entry.id}>
                    <p className="mb-3 font-bold break-words">{entry.name}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="xs"
                        intent="outline"
                        isDisabled={busy}
                        onPress={() => onRestore(entry.id)}
                      >
                        {t("quillRestore")}
                      </Button>
                      <Button
                        size="xs"
                        intent="danger"
                        isDisabled={busy}
                        onPress={() => onRemove(entry.id)}
                      >
                        {t("quillRemove")}
                      </Button>
                    </div>
                  </li>,
                ]
              : []
          )}
        </ul>
      ) : (
        <Tree
          aria-label={t("quillLibrary")}
          className="min-h-16"
          selectionMode="single"
          selectionBehavior="replace"
          selectedKeys={selected ? [selected] : []}
          expandedKeys={expanded}
          onExpandedChange={(keys) =>
            setCollapsed(
              new Set(
                entries.flatMap((entry) =>
                  entry.kind === "folder" && !keys.has(entry.id)
                    ? [entry.id]
                    : []
                )
              )
            )
          }
          onSelectionChange={(keys) => {
            if (keys !== "all") {
              const [id] = keys;
              const entry = visible.find((item) => item.id === id);
              if (entry) {
                onSelect(entry);
              }
            }
          }}
          disabledKeys={busy ? visible.map((entry) => entry.id) : []}
        >
          {branch(null)}
        </Tree>
      )}
    </div>
  );
};
