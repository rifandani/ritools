/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- The navigation and tab groups handle native drag events from their buttons. */
import { useEffect, useId, useRef, useState } from "react";
import type { DragEvent } from "react";
import { HiDocumentText, HiPlus, HiXMark } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import {
  clearTabDropOnLeave,
  updateTabDrop,
  useTabStripAutoScroll,
  useTabStripWheel,
} from "@/core/components/ui/tab-strip";
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { useTranslation } from "@/features/i18n/use-translation";

import type { ComparisonPosition, Files } from "../cleave.files";

const tabDragType = "application/x-ritools-cleave-tab";
const positionAt = (
  strip: HTMLElement,
  x: number
): ComparisonPosition | null => {
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

export const CleaveTabs = ({
  files,
  disabled,
  onAdd,
  onSelect,
  onClose,
  onReorder,
}: {
  readonly files: Files;
  readonly disabled: boolean;
  readonly onAdd: () => void;
  readonly onSelect: (id: string) => void;
  readonly onClose: (id: string) => void;
  readonly onReorder: (id: string, target: ComparisonPosition) => void;
}) => {
  const { t } = useTranslation();
  const strip = useRef<HTMLElement>(null);
  const reorderHint = useId();
  const [dragged, setDragged] = useState<string | null>(null);
  const [drop, setDrop] = useState<ComparisonPosition | null>(null);
  const dragX = useRef<number | null>(null);
  const dragBlocked = useRef(false);
  const endDrag = () => {
    setDragged(null);
    setDrop(null);
    dragX.current = null;
  };
  const trackDrag = (event: DragEvent<HTMLElement>) => {
    if (
      !dragged ||
      disabled ||
      !event.dataTransfer.types.includes(tabDragType)
    ) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    dragX.current = event.clientX;
    const target = positionAt(event.currentTarget, event.clientX);
    updateTabDrop(setDrop, target);
  };
  useTabStripAutoScroll(
    strip,
    dragX,
    !!dragged && !disabled,
    positionAt,
    setDrop
  );

  useEffect(() => {
    if (!files.selected) {
      return;
    }
    const active = strip.current?.querySelector<HTMLElement>(
      "[aria-current='page']"
    );
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [files.selected]);
  useTabStripWheel(strip);
  return (
    <div className="cleave-tabs-bar">
      <span id={reorderHint} className="sr-only">
        {t("cleaveReorderTabTip")}
      </span>
      <nav
        ref={strip}
        className="cleave-tabs"
        aria-label={t("cleaveOpenFiles")}
        onDragEnter={trackDrag}
        onDragOver={trackDrag}
        onDragLeave={(event) => {
          clearTabDropOnLeave(event, dragX, setDrop);
        }}
        onDrop={(event) => {
          if (
            !dragged ||
            disabled ||
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
        {files.entries.map((file) => {
          const names = [
            ...new Set(
              [file.texts.beforeName, file.texts.afterName].filter(Boolean)
            ),
          ];
          const name = names.length
            ? names.join(" / ")
            : t("cleaveFileNumber", { number: String(file.number) });
          return (
            <fieldset
              className="cleave-tab"
              key={file.id}
              aria-label={name}
              data-active={files.selected === file.id || undefined}
              data-tab-id={file.id}
              data-dragging={dragged === file.id || undefined}
              data-drop-side={
                drop?.id === file.id && dragged !== file.id
                  ? drop.side
                  : undefined
              }
              draggable={!disabled && files.entries.length > 1}
              onPointerDownCapture={(event) => {
                dragBlocked.current =
                  event.target instanceof Element &&
                  !!event.target.closest("[data-tab-close]");
              }}
              onDragStart={(event) => {
                if (disabled || dragBlocked.current) {
                  event.preventDefault();
                  return;
                }
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData(tabDragType, file.id);
                setDragged(file.id);
              }}
              onDragEnd={endDrag}
            >
              <Button
                intent="plain"
                className="cleave-tab-open"
                aria-current={files.selected === file.id ? "page" : undefined}
                aria-describedby={
                  files.entries.length > 1 ? reorderHint : undefined
                }
                onKeyDown={(event) => {
                  if (
                    disabled ||
                    !event.altKey ||
                    !event.shiftKey ||
                    (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                  ) {
                    return;
                  }
                  event.preventDefault();
                  const offset = event.key === "ArrowLeft" ? -1 : 1;
                  const index = files.entries.findIndex(
                    (entry) => entry.id === file.id
                  );
                  const target = files.entries[index + offset];
                  if (target) {
                    onReorder(file.id, {
                      id: target.id,
                      side: offset < 0 ? "before" : "after",
                    });
                    const button = event.currentTarget;
                    requestAnimationFrame(() =>
                      button.scrollIntoView({
                        block: "nearest",
                        inline: "nearest",
                      })
                    );
                  }
                }}
                onPress={() => onSelect(file.id)}
              >
                <HiDocumentText aria-hidden="true" />
                <span title={name}>{name}</span>
              </Button>
              <Tooltip delay={0}>
                <Button
                  intent="plain"
                  size="sq-xs"
                  aria-label={`${t("cleaveCloseFile")}: ${name}`}
                  data-tab-close=""
                  onPress={() => onClose(file.id)}
                >
                  <HiXMark aria-hidden="true" />
                </Button>
                <TooltipContent
                  placement="bottom"
                  className="max-w-[calc(100vw-2rem)]"
                >
                  {t("cleaveCloseFileTip")}
                </TooltipContent>
              </Tooltip>
            </fieldset>
          );
        })}
        <Tooltip delay={0}>
          <Button
            intent="plain"
            className="cleave-tab-add"
            isDisabled={disabled}
            aria-label={t("cleaveAddFile")}
            onPress={onAdd}
          >
            <HiPlus aria-hidden="true" />
          </Button>
          <TooltipContent placement="bottom">
            {t("cleaveAddFile")}
          </TooltipContent>
        </Tooltip>
      </nav>
    </div>
  );
};
