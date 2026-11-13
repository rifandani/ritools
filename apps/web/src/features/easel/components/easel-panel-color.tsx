"use client";

import { cn } from "cn";
import { useEffect, useRef } from "react";

import {
  EaselPanel,
  EaselSlider,
} from "@/features/easel/components/easel-controls";
import type { EaselKey } from "@/features/easel/easel";
import {
  FILTER_NAMES,
  FINETUNE_KEYS,
  finetuneLimitsOf,
  panelIsChanged,
} from "@/features/easel/easel.stack";
import type {
  EditState,
  FilterName,
  FinetuneKey,
} from "@/features/easel/easel.stack";
import type { EaselController } from "@/features/easel/use-easel";
import { useTranslation } from "@/features/i18n/use-translation";

const FINETUNE_LABEL = {
  blur: "easelFinetuneBlur",
  brightness: "easelFinetuneBrightness",
  contrast: "easelFinetuneContrast",
  exposure: "easelFinetuneExposure",
  hue: "easelFinetuneHue",
  saturation: "easelFinetuneSaturation",
  vignette: "easelFinetuneVignette",
  warmth: "easelFinetuneWarmth",
} as const satisfies Record<FinetuneKey, EaselKey>;

const FILTER_LABEL = {
  chrome: "easelFilterChrome",
  cool: "easelFilterCool",
  fade: "easelFilterFade",
  matte: "easelFilterMatte",
  mono: "easelFilterMono",
  noir: "easelFilterNoir",
  sepia: "easelFilterSepia",
  vintage: "easelFilterVintage",
  vivid: "easelFilterVivid",
  warm: "easelFilterWarm",
} as const satisfies Record<FilterName, EaselKey>;

/** The Finetune sliders. Each one is 0 at rest and has its own reset. */
export const EaselPanelFinetune = ({
  controller,
  state,
}: {
  readonly controller: EaselController;
  readonly state: EditState;
}) => {
  const { t } = useTranslation();
  return (
    <EaselPanel
      canReset={panelIsChanged(state, "finetune")}
      id="finetune"
      onReset={() => {
        controller.apply({ _tag: "ResetPanel", panel: "finetune" });
      }}
      title={t("easelPanelFinetune")}
    >
      {FINETUNE_KEYS.map((key) => {
        const limits = finetuneLimitsOf(key);
        return (
          <EaselSlider
            id={key}
            key={key}
            label={t(FINETUNE_LABEL[key])}
            max={limits.max}
            min={limits.min}
            onChange={(value) => {
              controller.apply(
                { _tag: "SetFinetune", key, value },
                `finetune-${key}`
              );
            }}
            onCommit={() => {
              controller.finishGesture();
            }}
            onReset={() => {
              controller.apply({ _tag: "SetFinetune", key, value: 0 });
            }}
            value={state.finetune[key]}
          />
        );
      })}
    </EaselPanel>
  );
};

/** Draws one small picture of the image with a Filter at full strength. */
export type DrawThumbnail = (
  canvas: HTMLCanvasElement,
  filter: FilterName | null
) => void;

const FilterCard = ({
  drawThumbnail,
  filter,
  isSelected,
  label,
  onPress,
  redrawKey,
}: {
  readonly drawThumbnail: DrawThumbnail;
  readonly filter: FilterName | null;
  readonly isSelected: boolean;
  readonly label: string;
  readonly onPress: () => void;
  readonly redrawKey: string;
}) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (element === null) {
      return;
    }
    // The key is on the canvas, so a new key draws the picture again.
    element.dataset.easelThumbnail = redrawKey;
    const frame = requestAnimationFrame(() => {
      drawThumbnail(element, filter);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [drawThumbnail, filter, redrawKey]);
  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "border-rule bg-bg flex flex-col border-2 text-start outline-offset-2",
        "hover:border-fg focus-visible:outline-2",
        isSelected && "border-red"
      )}
      data-easel-filter={filter ?? "none"}
      onClick={onPress}
      type="button"
    >
      <canvas
        aria-hidden="true"
        className="easel-checker block aspect-4/3 w-full object-contain"
        height={72}
        ref={canvas}
        width={96}
      />
      <span
        className={cn(
          "px-1.5 py-1 text-xs font-bold tracking-[0.04em] uppercase [font-stretch:87.5%]",
          isSelected && "bg-red text-white"
        )}
      >
        {label}
      </span>
    </button>
  );
};

/** The named Filters, as cards with live thumbnails, and the strength. */
export const EaselPanelFilter = ({
  controller,
  drawThumbnail,
  state,
}: {
  readonly controller: EaselController;
  readonly drawThumbnail: DrawThumbnail;
  readonly state: EditState;
}) => {
  const { t } = useTranslation();
  // A thumbnail shows every change but the Filter itself.
  const redrawKey = JSON.stringify([
    state.finetune,
    state.crop,
    state.cropPreset,
    state.rotate,
    state.straighten,
    state.keepWhole,
    state.flipH,
    state.flipV,
    state.fills,
  ]);
  return (
    <EaselPanel
      canReset={panelIsChanged(state, "filter")}
      id="filter"
      onReset={() => {
        controller.apply({ _tag: "ResetPanel", panel: "filter" });
      }}
      title={t("easelPanelFilter")}
    >
      <div className="grid grid-cols-3 gap-2">
        <FilterCard
          drawThumbnail={drawThumbnail}
          filter={null}
          isSelected={state.filter === null}
          label={t("easelFilterNone")}
          onPress={() => {
            controller.apply({ _tag: "SetFilter", name: null });
          }}
          redrawKey={redrawKey}
        />
        {FILTER_NAMES.map((name) => (
          <FilterCard
            drawThumbnail={drawThumbnail}
            filter={name}
            isSelected={state.filter === name}
            key={name}
            label={t(FILTER_LABEL[name])}
            onPress={() => {
              controller.apply({ _tag: "SetFilter", name });
            }}
            redrawKey={redrawKey}
          />
        ))}
      </div>
      <EaselSlider
        id="filter-strength"
        isDisabled={state.filter === null}
        label={t("easelFilterStrength")}
        max={100}
        min={0}
        onChange={(value) => {
          controller.apply(
            { _tag: "SetFilterStrength", value },
            "filter-strength"
          );
        }}
        onCommit={() => {
          controller.finishGesture();
        }}
        value={state.filterStrength}
      />
    </EaselPanel>
  );
};
