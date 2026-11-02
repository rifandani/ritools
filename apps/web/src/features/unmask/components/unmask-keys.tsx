"use client";

import { Fragment } from "react";
import { HiKey, HiQuestionMarkCircle } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Keyboard } from "@/core/components/ui/keyboard";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
} from "@/core/components/ui/popover";
import { useTranslation } from "@/features/i18n/use-translation";

const shortcutRows = [
  { keys: ["W"], label: "unmaskWand", separator: "+" },
  { keys: ["B"], label: "unmaskBrush", separator: "+" },
  { keys: ["R"], label: "unmaskRestore", separator: "+" },
  { keys: ["E"], label: "unmaskErase", separator: "+" },
  { keys: ["[", "]"], label: "unmaskBrushSize", separator: "or" },
  { keys: ["Cmd/Ctrl", "Z"], label: "unmaskUndo", separator: "+" },
  { keys: ["Shift", "Cmd/Ctrl", "Z"], label: "unmaskRedo", separator: "+" },
  { keys: ["+"], label: "unmaskZoomIn", separator: "+" },
  { keys: ["-"], label: "unmaskZoomOut", separator: "+" },
  { keys: ["0"], label: "unmaskZoomFit", separator: "+" },
  { keys: ["←", "↑", "↓", "→"], label: "unmaskMoveBrush", separator: "/" },
  { keys: ["Enter"], label: "unmaskApplyStroke", separator: "+" },
  { keys: ["Escape"], label: "unmaskEndStroke", separator: "+" },
] as const;

/**
 * The keyboard help button and its shortcut list. It sits at the right of the
 * source facts line under the plate.
 */
export const UnmaskKeys = () => {
  const { t } = useTranslation();
  return (
    <Popover>
      <Button aria-label={t("unmaskKeys")} intent="plain" size="sq-sm">
        <HiQuestionMarkCircle aria-hidden="true" />
      </Button>
      <PopoverContent
        className="w-[min(22rem,calc(100vw-2rem))] p-4"
        placement="top start"
      >
        <PopoverTitle className="flex items-center gap-2 text-sm font-bold">
          <HiKey aria-hidden="true" />
          {t("unmaskKeys")}
        </PopoverTitle>
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
          {shortcutRows.map(({ keys, label, separator = "+" }) => (
            <Fragment key={label}>
              <dt className="flex items-center gap-1">
                {keys.map((key, index) => (
                  <Fragment key={key}>
                    {index > 0 ? (
                      <span
                        aria-hidden="true"
                        className="text-muted-fg text-xs"
                      >
                        {separator}
                      </span>
                    ) : null}
                    <Keyboard className="inline-flex whitespace-nowrap">
                      {key}
                    </Keyboard>
                  </Fragment>
                ))}
              </dt>
              <dd className="text-sm/5">{t(label)}</dd>
            </Fragment>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
};
