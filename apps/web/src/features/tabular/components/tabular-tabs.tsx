/* oxlint-disable react-doctor/html-no-nested-interactive -- A tab's close button is part of the tab, as the Folio strip has it; both stay operable. */
"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { HiPlus, HiXMark } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as T from "../tabular";
import type { TabularController } from "../use-tabular";

/**
 * The open Table Files, with an open button beside them. The strip keeps the
 * same actions as Folio: pick a tab, close the active tab, or open more files.
 */
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
  const activeTab = useRef<HTMLDivElement>(null);
  const activeId = c.session?.sessionId ?? null;
  useEffect(() => {
    if (activeId) {
      activeTab.current?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeId]);
  const choose = (event: KeyboardEvent<HTMLDivElement>, id: T.SessionId) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(id);
    }
  };
  return (
    <div className="border-rule bg-secondary flex min-w-0 items-stretch border-b-2">
      <div
        aria-label={t("tabularDocuments")}
        className="flex min-w-0 flex-1 items-stretch overflow-x-auto"
        role="tablist"
      >
        {c.tabs.map((tab) => {
          const active = tab.id === c.session?.sessionId;
          const dirty = c.dirtyTabs.has(tab.id);
          return (
            <div
              aria-label={
                dirty ? t("tabularTabLabelDirty", { name: tab.name }) : tab.name
              }
              aria-selected={active}
              className={`border-rule flex max-w-64 min-w-0 shrink-0 items-center gap-2 border-e-2 px-3 py-2 text-sm ${
                active
                  ? "bg-card font-bold"
                  : "text-muted-fg hover:bg-wash-red cursor-pointer"
              }`}
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              onKeyDown={(event) => choose(event, tab.id)}
              ref={active ? activeTab : undefined}
              role="tab"
              tabIndex={active ? 0 : -1}
              title={tab.name}
            >
              {dirty ? (
                <>
                  <span aria-hidden className="bg-danger size-2 shrink-0" />
                  <span className="sr-only">{t("tabularTabDirty")}</span>
                </>
              ) : null}
              <span className="min-w-0 flex-1 truncate">{tab.name}</span>
              {active ? (
                <button
                  aria-label={t("tabularCloseTab", { name: tab.name })}
                  className="hover:bg-wash-red focus-visible:outline-fg flex size-6 shrink-0 cursor-pointer items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={c.busy}
                  onClick={(event) => {
                    event.stopPropagation();
                    onClose(tab.id);
                  }}
                  type="button"
                >
                  <HiXMark aria-hidden className="size-3.5" />
                </button>
              ) : null}
            </div>
          );
        })}
        <div className="flex shrink-0 items-center p-1">
          <Button
            aria-label={t("tabularNewTab")}
            intent="plain"
            isDisabled={c.busy}
            size="sq-sm"
            onPress={onOpenFile}
          >
            <HiPlus aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
};
