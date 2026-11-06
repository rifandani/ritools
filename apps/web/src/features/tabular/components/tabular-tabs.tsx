/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- The tab strip handles native drag events from its file groups. */
"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import { HiDocumentText, HiPlus, HiXMark } from "react-icons/hi2";

import { Button, buttonStyles } from "@/core/components/ui/button";
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as T from "../tabular";
import type { TabPosition } from "../tabular.tabs";
import type { TabularController } from "../use-tabular";

import "./tabular-tabs.css";

const tabDragType = "application/x-ritools-tabular-tab";
const positionAt = (
  strip: HTMLElement,
  x: number,
  entries: TabularController["tabs"]
): TabPosition | null => {
  const tabs = [...strip.querySelectorAll<HTMLElement>("[data-tab-id]")];
  const tab =
    tabs.find((item) => x < item.getBoundingClientRect().right) ?? tabs.at(-1);
  const id = entries.find((entry) => entry.id === tab?.dataset.tabId)?.id;
  if (!tab || !id) {
    return null;
  }
  const rect = tab.getBoundingClientRect();
  return { id, side: x < rect.left + rect.width / 2 ? "before" : "after" };
};

/** File tabs share Cleave's printed marks and Quill's drag insertion behavior. */
export const TabularTabs = ({
  controller: c,
  onOpenFile,
  onSelect,
  onClose,
}: {
  readonly controller: TabularController;
  readonly onOpenFile: () => void;
  readonly onSelect: (id: T.SessionId) => void;
  readonly onClose: (id: T.SessionId) => void;
}) => {
  const { t } = useTranslation();
  const reorderHint = useId();
  const strip = useRef<HTMLDivElement>(null);
  const [dragged, setDragged] = useState<T.SessionId | null>(null);
  const [drop, setDrop] = useState<TabPosition | null>(null);
  const dragX = useRef<number | null>(null);
  const dragBlocked = useRef(false);
  const activeId = c.session?.sessionId ?? null;
  const endDrag = () => {
    setDragged(null);
    setDrop(null);
    dragX.current = null;
  };
  const trackDrag = (event: DragEvent<HTMLDivElement>) => {
    if (!dragged || c.busy || !event.dataTransfer.types.includes(tabDragType)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    dragX.current = event.clientX;
    const target = positionAt(event.currentTarget, event.clientX, c.tabs);
    setDrop((previous) =>
      previous?.id === target?.id && previous?.side === target?.side
        ? previous
        : target
    );
  };
  useEffect(() => {
    if (!activeId || !c.tabs.some((tab) => tab.id === activeId)) {
      return;
    }
    strip.current
      ?.querySelector<HTMLElement>("[data-active]")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId, c.tabs]);
  useEffect(() => {
    const element = strip.current;
    if (!element) {
      return;
    }
    const wheel = (event: WheelEvent) => {
      if (
        Math.abs(event.deltaY) > Math.abs(event.deltaX) &&
        element.scrollWidth > element.clientWidth
      ) {
        event.preventDefault();
        element.scrollLeft += event.deltaY;
      }
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);
  useEffect(() => {
    if (!dragged || c.busy) {
      return;
    }
    let frame = 0;
    const scroll = () => {
      const element = strip.current;
      const x = dragX.current;
      if (element && x !== null) {
        const rect = element.getBoundingClientRect();
        const previousScroll = element.scrollLeft;
        if (x < rect.left + 40) {
          element.scrollLeft -= 8;
        } else if (x > rect.right - 40) {
          element.scrollLeft += 8;
        }
        if (element.scrollLeft !== previousScroll) {
          const target = positionAt(element, x, c.tabs);
          setDrop((previous) =>
            previous?.id === target?.id && previous?.side === target?.side
              ? previous
              : target
          );
        }
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [dragged, c.busy, c.tabs]);
  const choose = (event: KeyboardEvent<HTMLButtonElement>, id: T.SessionId) => {
    if (c.busy) {
      return;
    }
    const index = c.tabs.findIndex((tab) => tab.id === id);
    const offset =
      event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (event.altKey && event.shiftKey && offset) {
      event.preventDefault();
      const target = c.tabs[index + offset];
      if (target) {
        c.reorderFiles(id, {
          id: target.id,
          side: offset < 0 ? "before" : "after",
        });
        const element = event.currentTarget;
        requestAnimationFrame(() =>
          element.scrollIntoView({
            block: "nearest",
            inline: "nearest",
          })
        );
      }
      return;
    }
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? c.tabs.length - 1
          : offset
            ? (index + offset + c.tabs.length) % c.tabs.length
            : -1;
    const next = c.tabs[nextIndex];
    if (next && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const buttons =
        strip.current?.querySelectorAll<HTMLButtonElement>("[role='tab']");
      buttons?.[nextIndex]?.focus();
      onSelect(next.id);
    }
  };
  return (
    <div className="tabular-tabs-bar">
      <span id={reorderHint} className="sr-only">
        {t("tabularReorderTabTip")}
      </span>
      <div
        ref={strip}
        aria-label={t("tabularDocuments")}
        className="tabular-tabs"
        role="tablist"
        tabIndex={-1}
        onDragEnter={trackDrag}
        onDragOver={trackDrag}
        onDragLeave={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            dragX.current = null;
            setDrop(null);
          }
        }}
        onDrop={(event) => {
          if (!dragged || event.dataTransfer.getData(tabDragType) !== dragged) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          const target = positionAt(event.currentTarget, event.clientX, c.tabs);
          if (target && !c.busy) {
            c.reorderFiles(dragged, target);
          }
          endDrag();
        }}
      >
        {c.tabs.map((tab) => {
          const active = tab.id === activeId;
          const dirty = c.dirtyTabs.has(tab.id);
          return (
            <fieldset
              className="tabular-tab"
              role="presentation"
              data-active={active || undefined}
              data-tab-id={tab.id}
              data-dragging={dragged === tab.id || undefined}
              data-drop-side={
                drop?.id === tab.id && dragged !== tab.id
                  ? drop.side
                  : undefined
              }
              draggable={!c.busy && c.tabs.length > 1}
              key={tab.id}
              onPointerDownCapture={(event) => {
                dragBlocked.current =
                  event.target instanceof Element &&
                  !!event.target.closest("[data-tab-close]");
              }}
              onDragStart={(event) => {
                if (c.busy || dragBlocked.current) {
                  event.preventDefault();
                  return;
                }
                event.stopPropagation();
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData(tabDragType, tab.id);
                setDragged(tab.id);
              }}
              onDragEnd={endDrag}
            >
              <button
                type="button"
                role="tab"
                aria-label={
                  dirty
                    ? t("tabularTabLabelDirty", { name: tab.name })
                    : tab.name
                }
                aria-selected={active}
                aria-disabled={c.busy}
                data-disabled={c.busy || undefined}
                aria-describedby={c.tabs.length > 1 ? reorderHint : undefined}
                className={`${buttonStyles({ intent: "plain" })} bracket tabular-tab-open`}
                tabIndex={active ? 0 : -1}
                onKeyDown={(event) => choose(event, tab.id)}
                onClick={() => {
                  if (!c.busy) {
                    onSelect(tab.id);
                  }
                }}
              >
                <HiDocumentText aria-hidden="true" />
                {dirty ? (
                  <span aria-hidden="true" className="tabular-tab-dirty" />
                ) : null}
                <span title={tab.name}>{tab.name}</span>
              </button>
              <Tooltip delay={0}>
                <Button
                  aria-label={t("tabularCloseTab", { name: tab.name })}
                  data-tab-close=""
                  intent="plain"
                  isDisabled={c.busy}
                  size="sq-xs"
                  onPress={() => onClose(tab.id)}
                >
                  <HiXMark aria-hidden="true" />
                </Button>
                <TooltipContent placement="bottom">
                  {t("tabularCloseTab", { name: tab.name })}
                </TooltipContent>
              </Tooltip>
            </fieldset>
          );
        })}
        <Tooltip delay={0}>
          <Button
            aria-label={t("tabularNewTab")}
            className="tabular-tab-add"
            intent="plain"
            isDisabled={c.busy}
            onPress={onOpenFile}
          >
            <HiPlus aria-hidden="true" />
          </Button>
          <TooltipContent placement="bottom">
            {t("tabularNewTab")}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
