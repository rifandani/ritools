import { useEffect, useRef } from "react";
import { HiDocumentText, HiPlus, HiXMark } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { useTranslation } from "@/features/i18n/use-translation";

import type { Files } from "../cleave.files";

export const CleaveTabs = ({
  files,
  disabled,
  onAdd,
  onSelect,
  onClose,
}: {
  readonly files: Files;
  readonly disabled: boolean;
  readonly onAdd: () => void;
  readonly onSelect: (id: string) => void;
  readonly onClose: (id: string) => void;
}) => {
  const { t } = useTranslation();
  const strip = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!files.selected) {
      return;
    }
    const active = strip.current?.querySelector<HTMLElement>(
      "[aria-current='page']"
    );
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [files.selected]);
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
  return (
    <div className="cleave-tabs-bar">
      <nav
        ref={strip}
        className="cleave-tabs"
        aria-label={t("cleaveOpenFiles")}
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
            >
              <Button
                intent="plain"
                className="cleave-tab-open"
                aria-current={files.selected === file.id ? "page" : undefined}
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
                  onPress={() => onClose(file.id)}
                >
                  <HiXMark aria-hidden="true" />
                </Button>
                <TooltipContent placement="bottom">
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
