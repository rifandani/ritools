/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- The tab group handles context menu events from its open and close buttons. */
import { useId, useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  HiChevronLeft,
  HiChevronRight,
  HiDocumentText,
  HiXMark,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import {
  clearTabDropOnLeave,
  updateTabDrop,
  useTabStripAutoScroll,
  useTabStripWheel,
} from "@/core/components/ui/tab-strip";
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { useTranslation } from "@/features/i18n/use-translation";

import type { Entry } from "../quill";
import type { TabPosition } from "../quill.tabs";
import { QuillContextMenu } from "./quill-context-menu";
import type { ContextPoint } from "./quill-context-menu";

const tabDragType = "application/x-ritools-quill-tab";
const positionAt = (strip: HTMLElement, x: number): TabPosition | null => {
  const tabs = [...strip.querySelectorAll<HTMLElement>("[data-tab-id]")];
  const tab =
    tabs.find((item) => x < item.getBoundingClientRect().right) ?? tabs.at(-1);
  const id = tab?.dataset.tabId;
  if (!tab || !id) {
    return null;
  }
  const rect = tab.getBoundingClientRect();
  return { id, side: x < rect.left + rect.width / 2 ? "before" : "after" };
};

export const QuillTabs = ({
  entries,
  selected,
  busy,
  showLibrary,
  onToggleLibrary,
  onOpen,
  onClose,
  onReorder,
}: {
  readonly entries: readonly Entry[];
  readonly selected: string | null;
  readonly busy: boolean;
  readonly showLibrary: boolean;
  readonly onToggleLibrary: () => void;
  readonly onOpen: (id: string) => void;
  readonly onClose: (ids: readonly string[]) => void;
  readonly onReorder: (id: string, target: TabPosition) => void;
}) => {
  const { t } = useTranslation();
  const reorderHint = useId();
  const [dragged, setDragged] = useState<string | null>(null);
  const [drop, setDrop] = useState<TabPosition | null>(null);
  const dragX = useRef<number | null>(null);
  const dragBlocked = useRef(false);
  const [context, setContext] = useState<{
    id: string;
    point: ContextPoint;
  } | null>(null);
  const strip = useRef<HTMLElement>(null);
  const endDrag = () => {
    setDragged(null);
    setDrop(null);
    dragX.current = null;
  };
  const contextIndex = entries.findIndex((entry) => entry.id === context?.id);
  const trackDrag = (event: DragEvent<HTMLElement>) => {
    if (!dragged || busy || !event.dataTransfer.types.includes(tabDragType)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    dragX.current = event.clientX;
    const target = positionAt(event.currentTarget, event.clientX);
    updateTabDrop(setDrop, target);
  };
  const moveContextTab = (offset: -1 | 1) => {
    const target = entries[contextIndex + offset];
    if (!context || !target || busy) {
      return;
    }
    onReorder(context.id, {
      id: target.id,
      side: offset < 0 ? "before" : "after",
    });
    requestAnimationFrame(() => {
      const tab = [
        ...(strip.current?.querySelectorAll<HTMLElement>("[data-tab-id]") ??
          []),
      ].find((element) => element.dataset.tabId === context.id);
      tab?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  };
  useTabStripAutoScroll(strip, dragX, !!dragged && !busy, positionAt, setDrop);
  useTabStripWheel(strip);
  return (
    <div className="quill-tabs-bar">
      <Tooltip delay={0}>
        <Button
          className="quill-explorer-toggle"
          size="sq-sm"
          intent="plain"
          aria-label={t(
            showLibrary ? "quillCollapseExplorer" : "quillExpandExplorer"
          )}
          aria-controls="quill-explorer"
          aria-expanded={showLibrary}
          onPress={onToggleLibrary}
        >
          {showLibrary ? (
            <HiChevronLeft aria-hidden="true" />
          ) : (
            <HiChevronRight aria-hidden="true" />
          )}
        </Button>
        <TooltipContent placement="bottom">
          {t(showLibrary ? "quillCollapseExplorer" : "quillExpandExplorer")}
        </TooltipContent>
      </Tooltip>
      <span id={reorderHint} className="sr-only">
        {t("quillReorderTabTip")}
      </span>
      <nav
        ref={strip}
        className="quill-tabs"
        aria-label={t("quillOpenFiles")}
        onDragEnter={trackDrag}
        onDragOver={trackDrag}
        onDragLeave={(event) => {
          clearTabDropOnLeave(event, dragX, setDrop);
        }}
        onDrop={(event) => {
          if (
            !dragged ||
            busy ||
            event.dataTransfer.getData(tabDragType) !== dragged
          ) {
            return;
          }
          event.preventDefault();
          const target = positionAt(event.currentTarget, event.clientX);
          if (target) {
            onReorder(dragged, target);
          }
          endDrag();
        }}
      >
        {entries.map((entry) => (
          <fieldset
            aria-label={entry.name}
            className="quill-tab"
            data-active={selected === entry.id || undefined}
            data-tab-id={entry.id}
            data-dragging={dragged === entry.id || undefined}
            data-drop-side={
              drop?.id === entry.id && dragged !== entry.id
                ? drop.side
                : undefined
            }
            draggable={!busy && entries.length > 1}
            key={entry.id}
            onPointerDownCapture={(event) => {
              dragBlocked.current =
                event.target instanceof Element &&
                !!event.target.closest("[data-tab-close]");
            }}
            onDragStart={(event) => {
              if (busy || dragBlocked.current) {
                event.preventDefault();
                return;
              }
              setContext(null);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData(tabDragType, entry.id);
              setDragged(entry.id);
            }}
            onDragEnd={endDrag}
            onContextMenu={(event) => {
              event.preventDefault();
              setContext({
                id: entry.id,
                point: { x: event.clientX, y: event.clientY },
              });
            }}
            onKeyDown={(event) => {
              if (
                event.key === "ContextMenu" ||
                (event.shiftKey && event.key === "F10")
              ) {
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                setContext({
                  id: entry.id,
                  point: { x: rect.left, y: rect.bottom },
                });
              }
            }}
          >
            <Button
              intent="plain"
              isDisabled={busy}
              aria-current={selected === entry.id ? "page" : undefined}
              aria-describedby={entries.length > 1 ? reorderHint : undefined}
              className="quill-tab-open"
              onPress={() => onOpen(entry.id)}
            >
              <HiDocumentText aria-hidden="true" />
              <span>{entry.name}</span>
            </Button>
            <Tooltip delay={0}>
              <Button
                intent="plain"
                size="sq-xs"
                isDisabled={busy}
                aria-label={`${t("quillCloseTab")}: ${entry.name}`}
                data-tab-close=""
                onPress={() => onClose([entry.id])}
              >
                <HiXMark aria-hidden="true" />
              </Button>
              <TooltipContent placement="bottom">
                <span className="block">{t("quillCloseTabTip")}</span>
                <span className="block">{t("quillCloseTabKeepsFileTip")}</span>
              </TooltipContent>
            </Tooltip>
          </fieldset>
        ))}
      </nav>
      <QuillContextMenu
        label={t("quillOpenFiles")}
        point={context?.point ?? null}
        onClose={() => setContext(null)}
        actions={[
          {
            label: t("quillMoveTabLeft"),
            action: () => moveContextTab(-1),
            disabled: busy || contextIndex <= 0,
          },
          {
            label: t("quillMoveTabRight"),
            action: () => moveContextTab(1),
            disabled:
              busy || contextIndex === -1 || contextIndex >= entries.length - 1,
          },
          {
            label: t("quillCloseTab"),
            action: () => onClose(context ? [context.id] : []),
            disabled: busy,
          },
          {
            label: t("quillCloseOthers"),
            action: () =>
              onClose(
                entries.flatMap((entry) =>
                  entry.id === context?.id ? [] : [entry.id]
                )
              ),
            disabled: busy,
          },
          {
            label: t("quillCloseAll"),
            action: () => onClose(entries.map((entry) => entry.id)),
            disabled: busy,
          },
        ]}
      />
    </div>
  );
};
