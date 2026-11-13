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
  { keys: ["Cmd/Ctrl", "Z"], label: "easelUndo", separator: "+" },
  { keys: ["Shift", "Cmd/Ctrl", "Z"], label: "easelRedo", separator: "+" },
  { keys: ["+"], label: "easelZoomIn", separator: "+" },
  { keys: ["-"], label: "easelZoomOut", separator: "+" },
  { keys: ["0"], label: "easelFit", separator: "+" },
  { keys: ["C"], label: "easelKeyCompare", separator: "+" },
  { keys: ["Space"], label: "easelKeyPan", separator: "+" },
  { keys: ["←", "↑", "↓", "→"], label: "easelKeyNudge", separator: "/" },
  { keys: ["Shift", "←"], label: "easelKeyNudgeFar", separator: "+" },
  { keys: ["Shift"], label: "easelKeySquare", separator: "+" },
  { keys: ["Delete"], label: "easelKeyDelete", separator: "+" },
  { keys: ["Escape"], label: "easelKeyDeselect", separator: "+" },
] as const;

/** The keyboard help button and its shortcut list, in the toolbar. */
export const EaselKeys = () => {
  const { t } = useTranslation();
  return (
    <Popover>
      <Button
        aria-label={t("easelKeys")}
        id="easel-keys"
        intent="outline"
        size="sq-sm"
      >
        <HiQuestionMarkCircle aria-hidden="true" />
      </Button>
      <PopoverContent
        className="w-[min(22rem,calc(100vw-2rem))] p-4"
        placement="bottom end"
      >
        <PopoverTitle className="flex items-center gap-2 text-sm font-bold">
          <HiKey aria-hidden="true" />
          {t("easelKeys")}
        </PopoverTitle>
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
          {shortcutRows.map(({ keys, label, separator }) => (
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
