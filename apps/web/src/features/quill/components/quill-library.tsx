/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- Context menu and keyboard events bubble from the accessible tree rows. */
/* oxlint-disable eslint/complexity -- The explorer coordinates nested folders, search, Trash, and per-entry actions. */
import { Schema } from "effect";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useDragAndDrop } from "react-aria-components/useDragAndDrop";
import {
  HiArrowDownTray,
  HiArrowUturnLeft,
  HiArchiveBox,
  HiDocumentDuplicate,
  HiDocumentPlus,
  HiDocumentText,
  HiEllipsisHorizontal,
  HiFolder,
  HiFolderPlus,
  HiMagnifyingGlass,
  HiPencilSquare,
  HiTrash,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Menu, MenuContent, MenuItem } from "@/core/components/ui/menu";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/core/components/ui/toggle-group";
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { Tree, TreeContent, TreeItem } from "@/core/components/ui/tree";
import { useTranslation } from "@/features/i18n/use-translation";

import type { Entry } from "../quill";
import { dropParent, orderWith } from "../quill.tree";
import type { TreePlacement } from "../quill.tree";
import { QuillContextMenu } from "./quill-context-menu";
import type { ContextAction, ContextPoint } from "./quill-context-menu";

export type LibraryAction =
  | "document"
  | "folder"
  | "rename"
  | "duplicate"
  | "download"
  | "trash";

export interface LibraryNaming {
  readonly id: string;
  readonly placement?: TreePlacement;
}

const libraryMenuIcon = {
  document: HiDocumentPlus,
  folder: HiFolderPlus,
  rename: HiPencilSquare,
  duplicate: HiDocumentDuplicate,
  download: HiArrowDownTray,
  trash: HiTrash,
} as const satisfies Record<LibraryAction, typeof HiTrash>;

const ORDER_KEY = "quill-library-order-v1";

/** The saved row order. Storage that is missing, private, or not a list of ids reads as no order. */
const readOrder = (): readonly string[] => {
  try {
    const parsed = Schema.decodeUnknownExit(Schema.Array(Schema.String))(
      JSON.parse(localStorage.getItem(ORDER_KEY) ?? "[]")
    );
    return parsed._tag === "Success" ? parsed.value : [];
  } catch {
    return [];
  }
};

const writeOrder = (order: readonly string[]) => {
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    /* Private mode has no storage. The row order lasts for this visit. */
  }
};

/** Opens the folders above a named row. Returns the same set when nothing opens. */
const openAncestors = (
  entries: readonly Entry[],
  id: string,
  current: Set<string | number>
) => {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const parents = new Set<string>();
  let parent = byId.get(id)?.parent;
  while (parent && !parents.has(parent)) {
    parents.add(parent);
    parent = byId.get(parent)?.parent;
  }
  const next = new Set(
    [...current].filter((item) => !parents.has(String(item)))
  );
  return next.size === current.size ? current : next;
};

const NameField = ({
  name,
  onCommit,
  onCancel,
}: {
  readonly name: string;
  readonly onCommit: (name: string) => Promise<boolean>;
  readonly onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(name);
  const field = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  const commit = async () => {
    if (done.current) {
      return;
    }
    done.current = true;
    if (!(await onCommit(draft.trim()))) {
      done.current = false;
    }
  };
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    event.stopPropagation();
    if (event.isComposing) {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      void commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      done.current = true;
      onCancel();
    }
  });
  useEffect(() => {
    const node = field.current;
    if (!node) {
      return;
    }
    // Stop keys before they reach the tree's native keyboard handlers.
    const handleKeyDown = (event: KeyboardEvent) => onKeyDown(event);
    node.addEventListener("keydown", handleKeyDown);
    return () => node.removeEventListener("keydown", handleKeyDown);
  }, []);
  useEffect(() => {
    const node = field.current;
    if (!node) {
      return;
    }
    // The closing menu restores focus first. Then focus the row input.
    const frame = requestAnimationFrame(() => {
      node.focus();
      node.select();
      node.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <input
      ref={field}
      className="quill-name-input"
      aria-label={t("quillNameLabel")}
      value={draft}
      autoComplete="off"
      spellCheck={false}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        void commit();
      }}
    />
  );
};

const QuillTrash = ({
  entries,
  busy,
  onMenu,
}: {
  readonly entries: readonly Entry[];
  readonly busy: boolean;
  readonly onMenu: (entry: Entry, point: ContextPoint) => void;
}) => {
  const { t } = useTranslation();
  const roots = entries.filter((entry) => entry.trash === entry.id);
  return (
    <Tree
      aria-label={t("quillTrash")}
      className="min-h-16"
      selectionMode="none"
      disabledKeys={busy ? roots.map((entry) => entry.id) : []}
    >
      {roots.map((entry) => (
        <TreeItem
          id={entry.id}
          key={entry.id}
          textValue={entry.name}
          data-quill-entry={entry.id}
        >
          <TreeContent className="relative min-h-7 [&>span[aria-hidden]]:hidden">
            {entry.kind === "folder" ? (
              <HiFolder aria-hidden="true" />
            ) : (
              <HiDocumentText aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1 truncate pe-7">{entry.name}</span>
            <Button
              slot={null}
              className="quill-row-menu"
              size="sq-xs"
              intent="plain"
              aria-label={`${t("quillItems")}: ${entry.name}`}
              isDisabled={busy}
              onPress={(event) => {
                const rect = event.target.getBoundingClientRect();
                onMenu(entry, { x: rect.left, y: rect.bottom });
              }}
            >
              <HiEllipsisHorizontal aria-hidden="true" />
            </Button>
          </TreeContent>
        </TreeItem>
      ))}
    </Tree>
  );
};

const useLibraryDrag = (
  entries: readonly Entry[],
  busy: boolean,
  onMove: (id: string, parent: string | null) => void
) => {
  const dragging = useRef<ReadonlySet<string>>(new Set());
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const { dragAndDropHooks } = useDragAndDrop({
    isDisabled: busy,
    getItems: (keys) =>
      [...keys].map((key) => ({
        "text/plain": byId.get(String(key))?.name ?? String(key),
      })),
    onDragStart: (event) => {
      dragging.current = new Set([...event.keys].map(String));
    },
    shouldAcceptItemDrop: (target) =>
      byId.get(String(target.key))?.kind === "folder",
    getDropOperation: (target) =>
      target.type === "item" &&
      dropParent(entries, dragging.current, {
        key: String(target.key),
        position: target.dropPosition,
      }) !== undefined
        ? "move"
        : "cancel",
    onMove: (event) => {
      // The tree uses single selection, so one entry moves at a time.
      const [id] = [...event.keys].map(String);
      const destination =
        id === undefined
          ? undefined
          : dropParent(entries, new Set([id]), {
              key: String(event.target.key),
              position: event.target.dropPosition,
            });
      if (id !== undefined && destination !== undefined) {
        onMove(id, destination);
      }
    },
  });
  return dragAndDropHooks;
};

/** The explorer's heading menu: the Library backup, downloaded or restored. */
const LibraryBackupMenu = ({
  busy,
  onDownloadBackup,
  onRestoreBackup,
}: {
  readonly busy: boolean;
  readonly onDownloadBackup: () => void;
  readonly onRestoreBackup: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <Menu>
      <Tooltip delay={300}>
        <Button
          size="sq-sm"
          intent="plain"
          aria-label={t("quillItems")}
          isDisabled={busy}
        >
          <HiEllipsisHorizontal aria-hidden="true" />
        </Button>
        <TooltipContent>{t("quillItems")}</TooltipContent>
      </Tooltip>
      <MenuContent aria-label={t("quillItems")} placement="bottom end">
        <MenuItem onAction={onDownloadBackup}>
          <HiArrowDownTray aria-hidden="true" />
          {t("quillBackup")}
        </MenuItem>
        <MenuItem onAction={onRestoreBackup}>
          <HiArrowUturnLeft aria-hidden="true" />
          {t("quillRestoreBackup")}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
};

/** The Trash section's menu: restore or remove everything in the Trash. */
const LibraryTrashActions = ({
  busy,
  hasTrash,
  onRestoreAll,
  onRemoveAll,
}: {
  readonly busy: boolean;
  readonly hasTrash: boolean;
  readonly onRestoreAll: () => void;
  readonly onRemoveAll: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <Menu>
      <Tooltip delay={300}>
        <Button
          size="sq-xs"
          intent="plain"
          aria-label={t("quillTrashActions")}
          isDisabled={busy || !hasTrash}
        >
          <HiEllipsisHorizontal aria-hidden="true" />
        </Button>
        <TooltipContent>{t("quillTrashActions")}</TooltipContent>
      </Tooltip>
      <MenuContent aria-label={t("quillTrashActions")} placement="bottom end">
        <MenuItem textValue={t("quillRestoreAll")} onAction={onRestoreAll}>
          <HiArrowUturnLeft aria-hidden="true" />
          {t("quillRestoreAll")}
        </MenuItem>
        <MenuItem
          textValue={t("quillRemoveAll")}
          intent="danger"
          onAction={onRemoveAll}
        >
          <HiTrash aria-hidden="true" />
          {t("quillRemoveAll")}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
};

/** The Workspaces section's menu: export, import a file, or import a folder. */
const LibraryItemActions = ({
  busy,
  onExportLibrary,
  onImport,
  onImportFolder,
}: {
  readonly busy: boolean;
  readonly onExportLibrary: () => void;
  readonly onImport: () => void;
  readonly onImportFolder: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <Menu>
      <Tooltip delay={300}>
        <Button
          id="quill-actions"
          size="sq-xs"
          intent="plain"
          aria-label={t("quillItems")}
          isDisabled={busy}
        >
          <HiEllipsisHorizontal aria-hidden="true" />
        </Button>
        <TooltipContent>{t("quillItems")}</TooltipContent>
      </Tooltip>
      <MenuContent aria-label={t("quillItems")} placement="bottom end">
        <MenuItem onAction={onExportLibrary}>
          <HiArchiveBox aria-hidden="true" />
          {t("quillZip")}
        </MenuItem>
        <MenuItem textValue={t("quillImport")} onAction={onImport}>
          <HiDocumentText aria-hidden="true" />
          {t("quillImport")}
        </MenuItem>
        <MenuItem textValue={t("quillImportFolder")} onAction={onImportFolder}>
          <HiFolder aria-hidden="true" />
          {t("quillImportFolder")}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
};

/** The right-click and row menu. A Trash entry offers restore and remove; any other entry offers the file actions. */
const LibraryContextMenu = ({
  point,
  entry,
  busy,
  onClose,
  onAction,
  onRestore,
  onRemove,
}: {
  readonly point: ContextPoint | null;
  readonly entry: Entry | null;
  readonly busy: boolean;
  readonly onClose: () => void;
  readonly onAction: (action: LibraryAction, entry: Entry | null) => void;
  readonly onRestore: (id: string) => void;
  readonly onRemove: (id: string) => void;
}) => {
  const { t } = useTranslation();
  const trashed = entry?.trash ? entry : null;
  const actions: readonly ContextAction[] = trashed
    ? [
        {
          label: t("quillRestore"),
          icon: <HiArrowUturnLeft aria-hidden="true" />,
          action: () => onRestore(trashed.id),
          disabled: busy,
        },
        {
          label: t("quillRemove"),
          icon: <HiTrash aria-hidden="true" />,
          intent: "danger",
          action: () => onRemove(trashed.id),
          disabled: busy,
        },
      ]
    : [
        {
          label: t("quillNewDocument"),
          icon: <HiDocumentPlus aria-hidden="true" />,
          action: () => onAction("document", entry),
          disabled: busy,
        },
        {
          label: t("quillNewFolder"),
          icon: <HiFolderPlus aria-hidden="true" />,
          action: () => onAction("folder", entry),
          disabled: busy,
        },
        ...(entry
          ? (
              [
                ["rename", "quillRename"],
                ["duplicate", "quillDuplicate"],
                [
                  "download",
                  entry.kind === "folder"
                    ? "quillFolderZip"
                    : "quillDownloadMarkdown",
                ],
                ["trash", "quillDelete"],
              ] as const
            )
              .filter(
                ([action]) =>
                  action !== "duplicate" || entry.kind === "document"
              )
              .map(([action, key]) => {
                const Icon = libraryMenuIcon[action];
                return {
                  label: t(key),
                  icon: <Icon aria-hidden="true" />,
                  intent: action === "trash" ? ("danger" as const) : undefined,
                  action: () => onAction(action, entry),
                  disabled: busy,
                };
              })
          : []),
      ];
  return (
    <QuillContextMenu
      point={point}
      onClose={onClose}
      label={t("quillItems")}
      actions={actions}
    />
  );
};

/** Everything a tree row needs: the grouped entries, the saved order, and the callbacks. */
interface BranchView {
  readonly groups: ReadonlyMap<string | null, readonly Entry[]>;
  readonly rank: ReadonlyMap<string, number>;
  readonly naming: LibraryNaming | null;
  readonly busy: boolean;
  readonly menuLabel: string;
  readonly onMenu: (entry: Entry, point: ContextPoint) => void;
  readonly onName: (id: string, name: string) => Promise<boolean>;
  readonly onNameCancel: () => void;
}

/** The rows under one parent, in saved order. A folder row renders its own rows. */
const renderBranch = (
  view: BranchView,
  parent: string | null
): React.ReactNode => {
  const { onNameCancel } = view;
  return (view.groups.get(parent) ?? [])
    .toSorted(
      (left, right) =>
        (view.rank.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (view.rank.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    )
    .map((entry) => (
      <TreeItem
        id={entry.id}
        key={entry.id}
        textValue={entry.name}
        data-quill-entry={entry.id}
      >
        <TreeContent className="[&>span[aria-hidden]]:hidden">
          {entry.kind === "folder" ? (
            <HiFolder aria-hidden="true" />
          ) : (
            <HiDocumentText aria-hidden="true" />
          )}
          {view.naming?.id === entry.id ? (
            <NameField
              name={entry.name}
              onCommit={(value) => view.onName(entry.id, value)}
              onCancel={onNameCancel}
            />
          ) : (
            <span className="min-w-0 flex-1 truncate pe-7">{entry.name}</span>
          )}
          <Button
            slot={null}
            className="quill-row-menu"
            size="sq-xs"
            intent="plain"
            aria-label={`${view.menuLabel}: ${entry.name}`}
            isDisabled={view.busy}
            onPress={(event) => {
              const rect = event.target.getBoundingClientRect();
              view.onMenu(entry, { x: rect.left, y: rect.bottom });
            }}
          >
            <HiEllipsisHorizontal aria-hidden="true" />
          </Button>
        </TreeContent>
        {entry.kind === "folder" ? renderBranch(view, entry.id) : null}
      </TreeItem>
    ));
};

export const QuillLibrary = ({
  entries,
  selected,
  onSelect,
  onRestore,
  onRemove,
  onRestoreAll,
  onRemoveAll,
  busy,
  onAction,
  onImport,
  onImportFolder,
  onExportLibrary,
  onDownloadBackup,
  onRestoreBackup,
  onMove,
  naming,
  onName,
  onNameCancel,
}: {
  readonly entries: readonly Entry[];
  readonly selected: string | null;
  readonly onSelect: (entry: Entry) => void;
  readonly onRestore: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onRestoreAll: () => void;
  readonly onRemoveAll: () => void;
  readonly busy: boolean;
  readonly onAction: (action: LibraryAction, entry: Entry | null) => void;
  readonly onImport: () => void;
  readonly onImportFolder: () => void;
  readonly onExportLibrary: () => void;
  readonly onDownloadBackup: () => void;
  readonly onRestoreBackup: () => void;
  readonly onMove: (id: string, parent: string | null) => void;
  readonly naming: LibraryNaming | null;
  readonly onName: (id: string, name: string) => Promise<boolean>;
  readonly onNameCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [context, setContext] = useState<{
    point: ContextPoint;
    entry: Entry | null;
  } | null>(null);
  const [trash, setTrash] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string | number>>(new Set());
  const [seenNaming, setSeenNaming] = useState(naming);
  const [savedOrder, setSavedOrder] = useState(readOrder);
  const expanded = new Set(
    entries.flatMap((entry) =>
      entry.kind === "folder" && !collapsed.has(entry.id) ? [entry.id] : []
    )
  );
  const all = entries.filter((entry) => !entry.trash);
  const selectedEntry = all.find((entry) => entry.id === selected) ?? null;
  const matched = new Set(
    all.flatMap((entry) =>
      entry.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
        ? [entry.id]
        : []
    )
  );
  const ancestors = new Set(matched);
  const byId = new Map(all.map((entry) => [entry.id, entry]));
  for (const id of matched) {
    let parent = byId.get(id)?.parent;
    const visited = new Set<string>();
    while (parent && !visited.has(parent)) {
      visited.add(parent);
      ancestors.add(parent);
      parent = byId.get(parent)?.parent;
    }
  }
  const dragAndDropHooks = useLibraryDrag(all, busy, onMove);
  const ids = all.map((entry) => entry.id);
  const idsKey = ids.join("\0");
  const order = ids.length
    ? orderWith(ids, savedOrder, naming?.placement)
    : savedOrder;
  // orderWith returns the same array when nothing moved, so this settles in one pass.
  if (order !== savedOrder) {
    setSavedOrder(order);
  }
  useEffect(() => {
    if (!idsKey) {
      return;
    }
    writeOrder(order);
  }, [idsKey, order]);
  // A newly named row opens the explorer: clear the search and the Trash view, and open its folders.
  if (naming !== seenNaming) {
    setSeenNaming(naming);
    if (naming) {
      setQuery("");
      setTrash(false);
      setCollapsed((current) => openAncestors(entries, naming.id, current));
    }
  }
  const visible = query ? all.filter((entry) => ancestors.has(entry.id)) : all;
  const groups = new Map<string | null, Entry[]>();
  for (const entry of visible) {
    const group = groups.get(entry.parent) ?? [];
    group.push(entry);
    groups.set(entry.parent, group);
  }
  const branchView: BranchView = {
    groups,
    rank: new Map(order.map((id, index) => [id, index])),
    naming,
    busy,
    menuLabel: t("quillItems"),
    onMenu: (entry, point) => setContext({ entry, point }),
    onName,
    onNameCancel,
  };
  return (
    <section
      className="quill-library"
      aria-label={t("quillExplorer")}
      onKeyDownCapture={(event) => {
        if (
          event.target instanceof HTMLInputElement &&
          event.target.classList.contains("quill-name-input") &&
          event.key.startsWith("Arrow")
        ) {
          // Preserve caret movement before the tree cell captures arrow keys.
          event.stopPropagation();
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        const { target } = event;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        const id =
          target.closest<HTMLElement>("[data-quill-entry]")?.dataset.quillEntry;
        if (trash) {
          const entry = entries.find(
            (item) => item.id === id && item.trash === item.id
          );
          if (!entry) {
            return;
          }
          setContext({
            entry,
            point: { x: event.clientX, y: event.clientY },
          });
          return;
        }
        setContext({
          entry: all.find((entry) => entry.id === id) ?? null,
          point: { x: event.clientX, y: event.clientY },
        });
      }}
      onKeyDown={(event) => {
        if (trash) {
          return;
        }
        if (
          event.key === "ContextMenu" ||
          (event.shiftKey && event.key === "F10")
        ) {
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          setContext({
            entry: selectedEntry,
            point: { x: rect.left + 20, y: rect.bottom },
          });
        }
      }}
    >
      <div className="quill-explorer-heading">
        <h2>{t("quillExplorer")}</h2>
        <div className="flex items-center gap-1">
          <LibraryBackupMenu
            busy={busy}
            onDownloadBackup={onDownloadBackup}
            onRestoreBackup={onRestoreBackup}
          />
        </div>
      </div>
      <label className="quill-file-search">
        <HiMagnifyingGlass aria-hidden="true" />
        <input
          aria-label={t("quillSearchFiles")}
          placeholder={t("quillSearchFiles")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          type="search"
        />
      </label>
      <ToggleGroup
        aria-label={t("quillLibraryView")}
        className="quill-library-switch w-full"
        size="xs"
        disallowEmptySelection
        selectedKeys={[trash ? "trash" : "workspaces"]}
        onSelectionChange={(keys) => {
          setContext(null);
          setTrash(keys.has("trash"));
        }}
      >
        <ToggleGroupItem id="workspaces" className="flex-1">
          {t("quillWorkspaces")}
        </ToggleGroupItem>
        <ToggleGroupItem id="trash" className="flex-1">
          {t("quillTrash")}
        </ToggleGroupItem>
      </ToggleGroup>
      <div className="quill-library-section-heading">
        <h3 className="quill-workspaces-label">
          {t(trash ? "quillTrash" : "quillWorkspaces")}
        </h3>
        {trash ? (
          <LibraryTrashActions
            busy={busy}
            hasTrash={entries.some((entry) => entry.trash)}
            onRestoreAll={onRestoreAll}
            onRemoveAll={onRemoveAll}
          />
        ) : (
          <LibraryItemActions
            busy={busy}
            onExportLibrary={onExportLibrary}
            onImport={onImport}
            onImportFolder={onImportFolder}
          />
        )}
      </div>
      {trash ? (
        <QuillTrash
          entries={entries}
          busy={busy}
          onMenu={(entry, point) => setContext({ entry, point })}
        />
      ) : (
        <Tree
          aria-label={t("quillLibrary")}
          className="min-h-16"
          dragAndDropHooks={dragAndDropHooks}
          selectionMode="single"
          selectionBehavior="replace"
          selectedKeys={selected ? [selected] : []}
          expandedKeys={
            query
              ? new Set(
                  visible.flatMap((entry) =>
                    entry.kind === "folder" ? [entry.id] : []
                  )
                )
              : expanded
          }
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
          {renderBranch(branchView, null)}
        </Tree>
      )}
      {!trash && query && !visible.length ? (
        <p className="text-muted-fg p-3 text-sm">{t("quillNoFiles")}</p>
      ) : null}
      <div className="quill-library-count">
        <span className="num">
          {visible.filter((entry) => entry.kind === "document").length}
        </span>{" "}
        {t("quillFiles")}
      </div>
      <LibraryContextMenu
        point={context?.point ?? null}
        entry={context?.entry ?? null}
        busy={busy}
        onClose={() => setContext(null)}
        onAction={onAction}
        onRestore={onRestore}
        onRemove={onRemove}
      />
    </section>
  );
};
