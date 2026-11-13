"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { HiPhoto, HiPlus, HiXMark } from "react-icons/hi2";

import { Button, buttonStyles } from "@/core/components/ui/button";
import { useTabStripWheel } from "@/core/components/ui/tab-strip";
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { isDirty } from "@/features/easel/use-easel";
import type { EaselTab } from "@/features/easel/use-easel";
import { useTranslation } from "@/features/i18n/use-translation";

/** The File Tab strip: one tab for each open image, and a plus mark. */
export const EaselTabs = ({
  activeId,
  onAdd,
  onClose,
  onSelect,
  tabs,
}: {
  readonly activeId: string | null;
  readonly onAdd: () => void;
  readonly onClose: (id: string) => void;
  readonly onSelect: (id: string) => void;
  readonly tabs: readonly EaselTab[];
}) => {
  const { t } = useTranslation();
  const strip = useRef<HTMLDivElement>(null);
  useTabStripWheel(strip);
  useEffect(() => {
    if (activeId === null || tabs.length === 0) {
      return;
    }
    strip.current
      ?.querySelector<HTMLElement>("[data-active]")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeId, tabs.length]);

  const choose = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const index = tabs.findIndex((tab) => tab.id === id);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : event.key === "ArrowLeft"
            ? (index - 1 + tabs.length) % tabs.length
            : event.key === "ArrowRight"
              ? (index + 1) % tabs.length
              : -1;
    const next = tabs[nextIndex];
    if (next === undefined || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const buttons =
      strip.current?.querySelectorAll<HTMLButtonElement>("[role='tab']");
    buttons?.[nextIndex]?.focus();
    onSelect(next.id);
  };

  return (
    <div className="easel-tabs-bar">
      <div
        aria-label={t("easelTabs")}
        className="easel-tabs"
        ref={strip}
        role="tablist"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          const dirty = isDirty(tab);
          return (
            <div
              className="easel-tab"
              data-active={active || undefined}
              data-dirty={dirty || undefined}
              data-tab-id={tab.id}
              key={tab.id}
              role="presentation"
            >
              <button
                aria-label={
                  dirty ? t("easelTabDirty", { name: tab.name }) : tab.name
                }
                aria-selected={active}
                className={`${buttonStyles({ intent: "plain" })} bracket easel-tab-open`}
                onClick={() => {
                  onSelect(tab.id);
                }}
                onKeyDown={(event) => {
                  choose(event, tab.id);
                }}
                role="tab"
                tabIndex={active ? 0 : -1}
                type="button"
              >
                <HiPhoto aria-hidden="true" />
                {dirty ? (
                  <span aria-hidden="true" className="easel-tab-dirty" />
                ) : null}
                <span title={tab.name}>{tab.name}</span>
              </button>
              <Tooltip delay={0}>
                <Button
                  aria-label={t("easelTabClose", { name: tab.name })}
                  data-tab-close=""
                  intent="plain"
                  onPress={() => {
                    onClose(tab.id);
                  }}
                  size="sq-xs"
                >
                  <HiXMark aria-hidden="true" />
                </Button>
                <TooltipContent placement="bottom">
                  {t("easelTabClose", { name: tab.name })}
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}
      </div>
      <Tooltip delay={0}>
        <Button
          aria-label={t("easelTabAdd")}
          className="min-w-12 shrink-0 self-stretch"
          id="easel-tab-add"
          intent="plain"
          onPress={onAdd}
        >
          <HiPlus aria-hidden="true" />
        </Button>
        <TooltipContent placement="bottom">{t("easelTabAdd")}</TooltipContent>
      </Tooltip>
    </div>
  );
};
