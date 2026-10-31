"use client";

import { usePDFViewer } from "@embedpdf/viewer-react";
import { useEffect, useState } from "react";
import { Button as ButtonPrimitive } from "react-aria-components/Button";
import { MenuTrigger } from "react-aria-components/Menu";
import { HiChevronDown, HiMinusSmall, HiPlusSmall } from "react-icons/hi2";

import {
  MenuContent,
  MenuHeader,
  MenuItem,
  MenuSection,
} from "@/core/components/ui/menu";
import { useTranslation } from "@/features/i18n/use-translation";

import { FolioTip } from "./folio-tip";

/** The levels the menu offers, as percent. */
const PRESETS = [50, 100, 150, 200, 400] as const;

/**
 * The zoom well: the current level, a menu of set levels and fit modes, and a
 * pair of steppers, drawn as one instrument. The viewer's own control is four
 * separately framed marks on a tinted group; this takes the printed well model
 * instead, with one 2px Control Edge frame and rule dividers inside it.
 */
export const FolioZoom = () => {
  const viewer = usePDFViewer();
  const { t } = useTranslation();
  const [percent, setPercent] = useState(() =>
    Math.round((viewer.tryGet("stage")?.getZoomLevel() ?? 1) * 100)
  );
  /* The typed value while the field has focus; `null` follows the live level. */
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    const stop = viewer.watch(
      () => {
        const stage = viewer.tryGet("stage");
        return stage ? Math.round(stage.getZoomLevel() * 100) : null;
      },
      (next) => {
        if (next !== null) {
          setPercent(next);
        }
      }
    );
    return () => {
      stop();
    };
  }, [viewer]);

  const stage = () => viewer.tryGet("stage");

  const zoomTo = (level: number) => {
    if (Number.isFinite(level) && level > 0) {
      stage()?.zoomTo({ level: level / 100 });
    }
  };

  const commit = () => {
    if (draft === null) {
      return;
    }
    const level = Number(draft);
    setDraft(null);
    zoomTo(level);
  };

  const value = draft ?? String(percent);

  return (
    <div className="folio-zoom">
      <div className="folio-zoom-field">
        <input
          aria-label={t("folioZoomLevel")}
          autoComplete="off"
          className="folio-zoom-value num"
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
        <span aria-hidden="true" className="folio-zoom-unit">
          %
        </span>
      </div>
      <MenuTrigger>
        <ButtonPrimitive
          aria-label={t("folioZoomPresets")}
          className="folio-zoom-mark"
        >
          <HiChevronDown aria-hidden="true" className="size-4" />
        </ButtonPrimitive>
        <MenuContent
          aria-label={t("folioZoomPresets")}
          className="min-w-44"
          placement="bottom start"
        >
          <MenuSection>
            <MenuHeader separator>{t("folioZoomLevel")}</MenuHeader>
            {PRESETS.map((preset) => (
              <MenuItem
                key={preset}
                onAction={() => zoomTo(preset)}
                textValue={`${preset}%`}
              >
                <span className="num">{preset}%</span>
              </MenuItem>
            ))}
          </MenuSection>
          <MenuSection>
            <MenuItem onAction={() => stage()?.fitPage()}>
              {t("folioZoomFitPage")}
            </MenuItem>
            <MenuItem onAction={() => stage()?.fitWidth()}>
              {t("folioZoomFitWidth")}
            </MenuItem>
            <MenuItem onAction={() => stage()?.fitAutomatic()}>
              {t("folioZoomAutomatic")}
            </MenuItem>
          </MenuSection>
        </MenuContent>
      </MenuTrigger>
      <FolioTip label={t("folioZoomOut")}>
        <button
          aria-label={t("folioZoomOut")}
          className="folio-zoom-mark"
          onClick={() => stage()?.zoomOut()}
          type="button"
        >
          <HiMinusSmall aria-hidden="true" className="size-4.5" />
        </button>
      </FolioTip>
      <FolioTip label={t("folioZoomIn")}>
        <button
          aria-label={t("folioZoomIn")}
          className="folio-zoom-mark"
          onClick={() => stage()?.zoomIn()}
          type="button"
        >
          <HiPlusSmall aria-hidden="true" className="size-4.5" />
        </button>
      </FolioTip>
    </div>
  );
};
