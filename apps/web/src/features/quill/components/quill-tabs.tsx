/* oxlint-disable jsx-a11y/no-noninteractive-element-interactions -- The tab group handles context menu events from its open and close buttons. */
import { useEffect, useRef, useState } from "react";
import {
  HiChevronLeft,
  HiChevronRight,
  HiDocumentText,
  HiXMark,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { useTranslation } from "@/features/i18n/use-translation";

import type { Entry } from "../quill";
import { QuillContextMenu } from "./quill-context-menu";
import type { ContextPoint } from "./quill-context-menu";

export const QuillTabs = ({
  entries,
  selected,
  busy,
  showLibrary,
  onToggleLibrary,
  onOpen,
  onClose,
}: {
  readonly entries: readonly Entry[];
  readonly selected: string | null;
  readonly busy: boolean;
  readonly showLibrary: boolean;
  readonly onToggleLibrary: () => void;
  readonly onOpen: (id: string) => void;
  readonly onClose: (ids: readonly string[]) => void;
}) => {
  const { t } = useTranslation();
  const [context, setContext] = useState<{
    id: string;
    point: ContextPoint;
  } | null>(null);
  const strip = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = strip.current;
    if (!element) {
      return;
    }
    // A mouse wheel moves only on the vertical axis. Send that motion along the tab strip.
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
      <nav ref={strip} className="quill-tabs" aria-label={t("quillOpenFiles")}>
        {entries.map((entry) => (
          <fieldset
            aria-label={entry.name}
            className="quill-tab"
            data-active={selected === entry.id || undefined}
            key={entry.id}
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
