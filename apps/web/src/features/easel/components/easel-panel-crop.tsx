"use client";

import {
  HiArrowUturnLeft,
  HiArrowUturnRight,
  HiArrowsRightLeft,
  HiArrowsUpDown,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Toggle } from "@/core/components/ui/toggle";
import {
  EaselHint,
  EaselPanel,
  EaselSlider,
  EaselSwitch,
  LABEL_CLASS,
} from "@/features/easel/components/easel-controls";
import type { EaselKey } from "@/features/easel/easel";
import {
  MAX_STRAIGHTEN,
  MIN_STRAIGHTEN,
} from "@/features/easel/easel.geometry";
import { CROP_PRESETS } from "@/features/easel/easel.presets";
import type { CropPresetId } from "@/features/easel/easel.presets";
import { panelIsChanged } from "@/features/easel/easel.stack";
import type { EditState } from "@/features/easel/easel.stack";
import type { EaselController, EaselTab } from "@/features/easel/use-easel";
import { useTranslation } from "@/features/i18n/use-translation";

const PRESET_LABEL = {
  cinema: "easelPresetCinema",
  classic: "easelPresetClassic",
  custom: "easelPresetCustom",
  ellipse: "easelPresetEllipse",
  "facebook-cover": "easelPresetFacebookCover",
  "facebook-post": "easelPresetFacebookPost",
  "instagram-portrait": "easelPresetInstagramPortrait",
  "instagram-square": "easelPresetInstagramSquare",
  "instagram-story": "easelPresetInstagramStory",
  landscape: "easelPresetLandscape",
  "linkedin-banner": "easelPresetLinkedinBanner",
  "linkedin-post": "easelPresetLinkedinPost",
  portrait: "easelPresetPortrait",
  "x-header": "easelPresetXHeader",
  "x-post": "easelPresetXPost",
} as const satisfies Record<CropPresetId, EaselKey>;

const presetsOf = (group: "basic" | "social") =>
  CROP_PRESETS.filter((preset) => preset.group === group);

const GROUPS = [
  { group: "basic", presets: presetsOf("basic"), title: "easelCropForms" },
  { group: "social", presets: presetsOf("social"), title: "easelCropSocial" },
] as const;

/** Crop, Rotate, Straighten, and flip: the geometry of the image. */
export const EaselPanelCrop = ({
  controller,
  state,
  tab,
}: {
  readonly controller: EaselController;
  readonly state: EditState;
  readonly tab: EaselTab;
}) => {
  const { t } = useTranslation();
  return (
    <EaselPanel
      canReset={panelIsChanged(state, "crop")}
      id="crop"
      onReset={() => {
        controller.apply({ _tag: "ResetPanel", panel: "crop" });
      }}
      title={t("easelPanelCrop")}
    >
      {GROUPS.map(({ group, presets, title }) => (
        <fieldset className="m-0 border-0 p-0" key={group}>
          <legend className={`${LABEL_CLASS} mb-2`}>{t(title)}</legend>
          <div className="flex flex-wrap">
            {presets.map((preset) => (
              <Toggle
                data-easel-preset={preset.id}
                isSelected={state.cropPreset === preset.id}
                key={preset.id}
                onPress={() => {
                  controller.apply({
                    _tag: "SetCropPreset",
                    preset: preset.id,
                    source: tab.source,
                  });
                }}
                size="sm"
              >
                {t(PRESET_LABEL[preset.id])}
              </Toggle>
            ))}
          </div>
        </fieldset>
      ))}
      <EaselHint>{t("easelCropHint")}</EaselHint>

      <div className="flex flex-wrap gap-2">
        <Button
          data-easel-action="rotate-left"
          intent="outline"
          onPress={() => {
            controller.apply({ _tag: "Rotate", direction: "left" });
          }}
          size="sm"
        >
          <HiArrowUturnLeft aria-hidden="true" />
          {t("easelRotateLeft")}
        </Button>
        <Button
          data-easel-action="rotate-right"
          intent="outline"
          onPress={() => {
            controller.apply({ _tag: "Rotate", direction: "right" });
          }}
          size="sm"
        >
          <HiArrowUturnRight aria-hidden="true" />
          {t("easelRotateRight")}
        </Button>
        <Button
          data-easel-action="flip-horizontal"
          intent="outline"
          onPress={() => {
            controller.apply({ _tag: "Flip", axis: "horizontal" });
          }}
          size="sm"
        >
          <HiArrowsRightLeft aria-hidden="true" />
          {t("easelFlipHorizontal")}
        </Button>
        <Button
          data-easel-action="flip-vertical"
          intent="outline"
          onPress={() => {
            controller.apply({ _tag: "Flip", axis: "vertical" });
          }}
          size="sm"
        >
          <HiArrowsUpDown aria-hidden="true" />
          {t("easelFlipVertical")}
        </Button>
      </div>

      <EaselSlider
        id="straighten"
        label={t("easelStraighten")}
        max={MAX_STRAIGHTEN}
        min={MIN_STRAIGHTEN}
        onChange={(angle) => {
          controller.apply({ _tag: "SetStraighten", angle }, "straighten");
        }}
        onCommit={() => {
          controller.finishGesture();
        }}
        onReset={() => {
          controller.apply({ _tag: "SetStraighten", angle: 0 });
        }}
        step={0.1}
        value={state.straighten}
      />
      <EaselSwitch
        id="keep-whole"
        isSelected={state.keepWhole}
        label={t("easelKeepWhole")}
        onChange={(value) => {
          controller.apply({ _tag: "SetKeepWhole", value });
        }}
      />
      <EaselHint>{t("easelKeepWholeHint")}</EaselHint>
    </EaselPanel>
  );
};
