"use client";

import { HiTrash } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Toggle } from "@/core/components/ui/toggle";
import {
  EaselColor,
  EaselHint,
  EaselPanel,
  EaselSlider,
  LABEL_CLASS,
} from "@/features/easel/components/easel-controls";
import { cssOf, hexOf } from "@/features/easel/easel.color";
import { panelIsChanged, WHITE } from "@/features/easel/easel.stack";
import type { EditState, RgbaColor } from "@/features/easel/easel.stack";
import type { EaselController } from "@/features/easel/use-easel";
import { useTranslation } from "@/features/i18n/use-translation";

/** The Backdrop and the Bucket Fills. A click on the image adds a fill. */
export const EaselPanelFill = ({
  color,
  controller,
  onColor,
  onSelect,
  onTolerance,
  selectedId,
  state,
  tolerance,
}: {
  readonly color: RgbaColor;
  readonly controller: EaselController;
  readonly onColor: (color: RgbaColor) => void;
  readonly onSelect: (id: string | null) => void;
  readonly onTolerance: (value: number) => void;
  readonly selectedId: string | null;
  readonly state: EditState;
  readonly tolerance: number;
}) => {
  const { t } = useTranslation();
  const selected = state.fills.find((fill) => fill.id === selectedId) ?? null;
  return (
    <EaselPanel
      canReset={panelIsChanged(state, "fill")}
      id="fill"
      onReset={() => {
        onSelect(null);
        controller.apply({ _tag: "ResetPanel", panel: "fill" });
      }}
      title={t("easelPanelFill")}
    >
      <fieldset className="m-0 border-0 p-0">
        <legend className={`${LABEL_CLASS} mb-2`}>{t("easelBackdrop")}</legend>
        <div className="flex">
          <Toggle
            data-easel-backdrop="transparent"
            isSelected={state.backdrop._tag === "Transparent"}
            onPress={() => {
              controller.apply({
                _tag: "SetBackdrop",
                backdrop: { _tag: "Transparent" },
              });
            }}
            size="sm"
          >
            {t("easelBackdropTransparent")}
          </Toggle>
          <Toggle
            data-easel-backdrop="solid"
            isSelected={state.backdrop._tag === "Solid"}
            onPress={() => {
              controller.apply({
                _tag: "SetBackdrop",
                backdrop: { _tag: "Solid", color: WHITE },
              });
            }}
            size="sm"
          >
            {t("easelBackdropSolid")}
          </Toggle>
        </div>
      </fieldset>
      {state.backdrop._tag === "Solid" ? (
        <EaselColor
          color={state.backdrop.color}
          label={t("easelBackdropColor")}
          onChange={(next) => {
            controller.apply(
              { _tag: "SetBackdrop", backdrop: { _tag: "Solid", color: next } },
              "backdrop-color"
            );
          }}
        />
      ) : null}
      <EaselHint>{t("easelBackdropHint")}</EaselHint>

      <div className="border-rule border-t-2 pt-3">
        <p className={`${LABEL_CLASS} mb-2`}>{t("easelBucketFill")}</p>
        <div className="flex flex-col gap-y-3">
          <EaselColor
            color={selected?.color ?? color}
            label={t("easelBucketColor")}
            onChange={(next) => {
              onColor(next);
              if (selected !== null) {
                controller.apply(
                  {
                    _tag: "UpdateFill",
                    id: selected.id,
                    patch: { color: next },
                  },
                  `fill-color-${selected.id}`
                );
              }
            }}
          />
          <EaselSlider
            id="tolerance"
            label={t("easelBucketTolerance")}
            max={100}
            min={0}
            onChange={(value) => {
              onTolerance(value);
              if (selected !== null) {
                controller.apply(
                  {
                    _tag: "UpdateFill",
                    id: selected.id,
                    patch: { tolerance: value },
                  },
                  `fill-tolerance-${selected.id}`
                );
              }
            }}
            onCommit={() => {
              controller.finishGesture();
            }}
            value={selected?.tolerance ?? tolerance}
          />
          <EaselHint>{t("easelBucketHint")}</EaselHint>
        </div>
      </div>

      {state.fills.length === 0 ? null : (
        <ul
          aria-label={t("easelBucketList")}
          className="border-rule m-0 flex list-none flex-col border-2 p-0"
        >
          {state.fills.map((fill, index) => (
            <li
              className="border-rule flex items-center gap-x-2 border-b-2 px-2 py-1 last:border-b-0"
              data-easel-fill={fill.id}
              key={fill.id}
            >
              <Toggle
                className="min-w-0 flex-1 justify-start"
                isSelected={fill.id === selectedId}
                onPress={() => {
                  onSelect(fill.id === selectedId ? null : fill.id);
                }}
                size="sm"
              >
                <span
                  aria-hidden="true"
                  className="border-fg size-4 shrink-0 border-2"
                  style={{ background: cssOf(fill.color) }}
                />
                <span className="num truncate">
                  {t("easelBucketItem", {
                    color: hexOf(fill.color),
                    number: String(index + 1),
                  })}
                </span>
              </Toggle>
              <Button
                aria-label={t("easelBucketRemove", {
                  number: String(index + 1),
                })}
                intent="plain"
                onPress={() => {
                  if (fill.id === selectedId) {
                    onSelect(null);
                  }
                  controller.apply({ _tag: "RemoveFill", id: fill.id });
                }}
                size="sq-sm"
              >
                <HiTrash aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </EaselPanel>
  );
};
