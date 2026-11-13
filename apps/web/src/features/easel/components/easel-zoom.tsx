"use client";

import { useState } from "react";
import { Button as ButtonPrimitive } from "react-aria-components/Button";
import { MenuTrigger } from "react-aria-components/Menu";
import { HiChevronDown, HiMinusSmall, HiPlusSmall } from "react-icons/hi2";

import {
  MenuContent,
  MenuHeader,
  MenuItem,
  MenuSection,
} from "@/core/components/ui/menu";
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { useTranslation } from "@/features/i18n/use-translation";

/** The levels the menu offers, as percent of Fit. */
const PRESETS = [50, 100, 150, 200, 400] as const;

/**
 * The zoom well: the current level as a field, a menu of set levels and Fit,
 * and a pair of steppers, drawn as one instrument. It has the same shape as
 * the Folio zoom well, so both editors read the same.
 */
export const EaselZoom = ({
  onFit,
  onZoomIn,
  onZoomOut,
  onZoomTo,
  percent,
}: {
  readonly onFit: () => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onZoomTo: (percent: number) => void;
  readonly percent: number;
}) => {
  const { t } = useTranslation();
  /* The typed value while the field has focus; `null` follows the live level. */
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) {
      return;
    }
    const level = Number(draft);
    setDraft(null);
    // Focus alone, or a typed value that is the same, must not move the view.
    if (draft !== String(percent) && Number.isFinite(level) && level > 0) {
      onZoomTo(level);
    }
  };

  const value = draft ?? String(percent);

  return (
    <div className="easel-zoom">
      <div className="easel-zoom-field">
        <input
          aria-label={t("easelZoomLevel")}
          autoComplete="off"
          className="easel-zoom-value num"
          inputMode="numeric"
          onBlur={commit}
          onChange={(event) => {
            setDraft(event.target.value.replaceAll(/[^0-9]/gu, ""));
          }}
          onFocus={(event) => {
            setDraft(String(percent));
            event.currentTarget.select();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setDraft(null);
            }
          }}
          pattern="\d*"
          spellCheck={false}
          type="text"
          value={value}
        />
        <span aria-hidden="true" className="easel-zoom-unit">
          %
        </span>
      </div>
      <MenuTrigger>
        <ButtonPrimitive
          aria-label={t("easelZoomPresets")}
          className="easel-zoom-mark"
        >
          <HiChevronDown aria-hidden="true" className="size-4" />
        </ButtonPrimitive>
        <MenuContent
          aria-label={t("easelZoomPresets")}
          className="min-w-44"
          placement="bottom start"
        >
          <MenuSection>
            <MenuHeader separator>{t("easelZoomLevel")}</MenuHeader>
            {PRESETS.map((preset) => (
              <MenuItem
                key={preset}
                onAction={() => {
                  onZoomTo(preset);
                }}
                textValue={`${preset}%`}
              >
                <span className="num">{preset}%</span>
              </MenuItem>
            ))}
          </MenuSection>
          <MenuSection>
            <MenuItem onAction={onFit}>{t("easelFit")}</MenuItem>
          </MenuSection>
        </MenuContent>
      </MenuTrigger>
      <Tooltip delay={300}>
        <ButtonPrimitive
          aria-label={t("easelZoomOut")}
          className="easel-zoom-mark"
          id="easel-zoom-out"
          onPress={onZoomOut}
        >
          <HiMinusSmall aria-hidden="true" className="size-4.5" />
        </ButtonPrimitive>
        <TooltipContent placement="bottom">{t("easelZoomOut")}</TooltipContent>
      </Tooltip>
      <Tooltip delay={300}>
        <ButtonPrimitive
          aria-label={t("easelZoomIn")}
          className="easel-zoom-mark"
          id="easel-zoom-in"
          onPress={onZoomIn}
        >
          <HiPlusSmall aria-hidden="true" className="size-4.5" />
        </ButtonPrimitive>
        <TooltipContent placement="bottom">{t("easelZoomIn")}</TooltipContent>
      </Tooltip>
    </div>
  );
};
