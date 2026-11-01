"use client";

import { useId } from "react";
import { HiSwatch } from "react-icons/hi2";
import { parseColor } from "react-stately";

import { Button } from "@/core/components/ui/button";
import {
  ChoiceBox,
  ChoiceBoxDescription,
  ChoiceBoxItem,
  ChoiceBoxLabel,
} from "@/core/components/ui/choice-box";
import { ColorArea } from "@/core/components/ui/color-area";
import { ColorPicker } from "@/core/components/ui/color-picker";
import {
  ColorSlider,
  ColorSliderTrack,
} from "@/core/components/ui/color-slider";
import { ColorSwatch } from "@/core/components/ui/color-swatch";
import { ColorThumb } from "@/core/components/ui/color-thumb";
import { Dialog } from "@/core/components/ui/dialog";
import { Label } from "@/core/components/ui/field";
import { Popover, PopoverContent } from "@/core/components/ui/popover";
import {
  Slider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "@/core/components/ui/slider";
import { useTranslation } from "@/features/i18n/use-translation";
import type { UnmaskSettings } from "@/features/unmask/unmask";
import {
  clampBlurRadius,
  clampFeather,
  clampQuality,
  DEFAULT_BLUR_RADIUS,
  MAX_BLUR_RADIUS,
  MAX_FEATHER,
  MAX_QUALITY,
  MIN_BLUR_RADIUS,
  MIN_FEATHER,
  MIN_QUALITY,
  OUTPUT_FORMATS,
  outputLabelKey,
  outputNoteKey,
  SOLID_WHITE,
  withBackdrop,
} from "@/features/unmask/unmask";
import type { RgbaColor } from "@/features/unmask/unmask.engine";

const BACKDROPS = ["transparent", "solid", "blur"] as const;
type BackdropChoice = (typeof BACKDROPS)[number];

const SELECTED_BACKDROP = {
  Blur: "blur",
  Solid: "solid",
  Transparent: "transparent",
} as const satisfies Record<"Blur" | "Solid" | "Transparent", BackdropChoice>;

const BACKDROP_KEY = {
  blur: "unmaskBackdropBlur",
  solid: "unmaskBackdropSolid",
  transparent: "unmaskBackdropTransparent",
} as const;

const BACKDROP_NOTE = {
  blur: "unmaskBackdropBlurNote",
  solid: "unmaskBackdropSolidNote",
  transparent: "unmaskBackdropTransparentNote",
} as const;

const firstSelected = (keys: "all" | ReadonlySet<string | number>) =>
  keys === "all" ? undefined : [...keys][0];

const numberFrom = (value: number | readonly number[]): number =>
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- React Aria passes a number or a one-item array; this adapter narrows it at the control boundary.
  typeof value === "number" ? value : (value[0] ?? 0);

const hexOf = (color: RgbaColor): string =>
  `#${[color.r, color.g, color.b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;

const rgbaOf = (hex: string): RgbaColor => ({
  a: 255,
  b: Number.parseInt(hex.slice(5, 7), 16),
  g: Number.parseInt(hex.slice(3, 5), 16),
  r: Number.parseInt(hex.slice(1, 3), 16),
});

const Group = ({
  bar,
  children,
  index,
  title,
}: {
  readonly bar: boolean;
  readonly children: React.ReactNode;
  readonly index: string;
  readonly title: string;
}) => (
  <section
    className={
      bar
        ? "border-rule border-b-2 py-3 last:border-b-0 lg:border-r-2 lg:border-b-0 lg:px-3 lg:last:border-r-0"
        : "border-rule border-b-2 py-4 last:border-b-0"
    }
  >
    <h3 className="flex items-center gap-x-2 pb-2">
      <span className="num bg-fg text-bg grid size-6 shrink-0 place-content-center text-xs font-extrabold">
        {index}
      </span>
      <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
        {title}
      </span>
    </h3>
    {children}
  </section>
);

const BackdropChoice = ({
  onChange,
  settings,
}: {
  readonly onChange: (settings: UnmaskSettings) => void;
  readonly settings: UnmaskSettings;
}) => {
  const { t } = useTranslation();
  const backdropChoice = SELECTED_BACKDROP[settings.backdrop._tag];
  return (
    <div className="flex flex-col gap-y-3">
      <ChoiceBox
        aria-label={t("unmaskBackdrop")}
        columns={1}
        gap={0}
        onSelectionChange={(keys) => {
          const next = firstSelected(keys);
          if (next === "transparent") {
            onChange(withBackdrop(settings, { _tag: "Transparent" }));
          } else if (next === "solid") {
            onChange(
              withBackdrop(settings, {
                _tag: "Solid",
                color:
                  settings.backdrop._tag === "Solid"
                    ? settings.backdrop.color
                    : SOLID_WHITE,
              })
            );
          } else if (next === "blur") {
            onChange(
              withBackdrop(settings, {
                _tag: "Blur",
                radius:
                  settings.backdrop._tag === "Blur"
                    ? settings.backdrop.radius
                    : DEFAULT_BLUR_RADIUS,
              })
            );
          }
        }}
        selectedKeys={[backdropChoice]}
        selectionMode="single"
      >
        {BACKDROPS.map((key) => (
          <ChoiceBoxItem id={key} key={key} textValue={t(BACKDROP_KEY[key])}>
            <ChoiceBoxLabel className="text-[0.875rem] font-bold tracking-[0.04em] uppercase [font-stretch:87.5%]">
              {t(BACKDROP_KEY[key])}
            </ChoiceBoxLabel>
            <ChoiceBoxDescription className="text-xs leading-4">
              {t(BACKDROP_NOTE[key])}
            </ChoiceBoxDescription>
          </ChoiceBoxItem>
        ))}
      </ChoiceBox>

      {settings.backdrop._tag === "Solid" ? (
        // oxlint-disable-next-line no-use-before-define -- The colour control is a small child of this choice.
        <SolidColor
          color={settings.backdrop.color}
          onChange={(color) => {
            onChange(withBackdrop(settings, { _tag: "Solid", color }));
          }}
        />
      ) : null}

      {settings.backdrop._tag === "Blur" ? (
        <Slider
          maxValue={MAX_BLUR_RADIUS}
          minValue={MIN_BLUR_RADIUS}
          onChange={(value) => {
            onChange(
              withBackdrop(settings, {
                _tag: "Blur",
                radius: clampBlurRadius(numberFrom(value)),
              })
            );
          }}
          step={1}
          value={settings.backdrop.radius}
        >
          <div className="flex items-baseline justify-between">
            <Label className="text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
              {t("unmaskBlurRadius")}
            </Label>
            <SliderOutput />
          </div>
          <SliderTrack>
            <SliderThumb />
          </SliderTrack>
        </Slider>
      ) : null}
    </div>
  );
};

const SolidColor = ({
  color,
  onChange,
}: {
  readonly color: RgbaColor;
  readonly onChange: (color: RgbaColor) => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <Button
          aria-label={t("unmaskColor")}
          className="*:data-[slot=color-swatch]:[--size:--spacing(10)]"
          intent="plain"
          size="sq-sm"
        >
          <ColorSwatch aria-hidden="true" color={hexOf(color)} />
        </Button>
        <PopoverContent className="w-72 p-3" placement="bottom start">
          <Dialog aria-label={t("unmaskColor")}>
            <ColorPicker
              className="flex w-full flex-col gap-3"
              value={parseColor(hexOf(color))}
              onChange={(next) => {
                onChange(rgbaOf(next.toString("hex")));
              }}
            >
              <ColorArea
                aria-label={t("unmaskColor")}
                className="max-w-none"
                colorSpace="hsb"
                xChannel="saturation"
                yChannel="brightness"
              />
              <ColorSlider
                aria-label={t("unmaskColor")}
                channel="hue"
                className="w-full"
              >
                <ColorSliderTrack>
                  <ColorThumb />
                </ColorSliderTrack>
              </ColorSlider>
            </ColorPicker>
          </Dialog>
        </PopoverContent>
      </Popover>
      <span className="text-muted-fg flex items-center gap-1.5 text-xs">
        <HiSwatch aria-hidden="true" />
        {hexOf(color).toUpperCase()}
      </span>
    </div>
  );
};

const FeatherControl = ({
  onChange,
  settings,
}: {
  readonly onChange: (settings: UnmaskSettings) => void;
  readonly settings: UnmaskSettings;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-y-1">
      <Slider
        maxValue={MAX_FEATHER}
        minValue={MIN_FEATHER}
        onChange={(value) => {
          onChange({ ...settings, feather: clampFeather(numberFrom(value)) });
        }}
        step={1}
        value={settings.feather}
      >
        <div className="flex items-baseline justify-between">
          <Label className="text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
            {t("unmaskFeather")}
          </Label>
          <SliderOutput />
        </div>
        <SliderTrack>
          <SliderThumb />
        </SliderTrack>
      </Slider>
      <p className="text-muted-fg text-xs leading-4">
        {t("unmaskFeatherNote")}
      </p>
    </div>
  );
};

const FormatControl = ({
  onChange,
  settings,
}: {
  readonly onChange: (settings: UnmaskSettings) => void;
  readonly settings: UnmaskSettings;
}) => {
  const { t } = useTranslation();
  const jpegDisabled = settings.backdrop._tag === "Transparent";
  return (
    <div className="flex flex-col gap-y-2">
      <ChoiceBox
        aria-label={t("unmaskFormat")}
        columns={2}
        gap={0}
        onSelectionChange={(keys) => {
          const next = firstSelected(keys);
          const format = OUTPUT_FORMATS.find((value) => value === next);
          if (format !== undefined) {
            onChange({ ...settings, format });
          }
        }}
        selectedKeys={[settings.format]}
        selectionMode="single"
      >
        {OUTPUT_FORMATS.map((format) => (
          <ChoiceBoxItem
            id={format}
            isDisabled={format === "jpeg" && jpegDisabled}
            key={format}
            textValue={t(outputLabelKey(format))}
          >
            <ChoiceBoxLabel className="text-[0.875rem] font-bold tracking-[0.04em] uppercase [font-stretch:87.5%]">
              {t(outputLabelKey(format))}
            </ChoiceBoxLabel>
            <ChoiceBoxDescription className="text-xs leading-4">
              {t(outputNoteKey(format))}
            </ChoiceBoxDescription>
          </ChoiceBoxItem>
        ))}
      </ChoiceBox>
      {jpegDisabled ? (
        <p className="text-muted-fg text-xs leading-4">
          {t("unmaskFormatJpegBlocked")}
        </p>
      ) : null}
    </div>
  );
};

const QualityControl = ({
  onChange,
  settings,
}: {
  readonly onChange: (settings: UnmaskSettings) => void;
  readonly settings: UnmaskSettings;
}) => {
  const { t } = useTranslation();
  const disabled = settings.format === "png";
  return (
    <div className="flex flex-col gap-y-1">
      <Slider
        isDisabled={disabled}
        maxValue={MAX_QUALITY}
        minValue={MIN_QUALITY}
        onChange={(value) => {
          onChange({ ...settings, quality: clampQuality(numberFrom(value)) });
        }}
        step={1}
        value={settings.quality}
      >
        <div className="flex items-baseline justify-between">
          <Label className="text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
            {t("unmaskQuality")}
          </Label>
          <SliderOutput />
        </div>
        <SliderTrack>
          <SliderThumb />
        </SliderTrack>
      </Slider>
      <p className="text-muted-fg text-xs leading-4">
        {disabled ? t("unmaskQualityPng") : t("unmaskQualityNote")}
      </p>
    </div>
  );
};

/** The shared settings of the Batch, and the same controls in the desk. */
export const UnmaskSettingsBar = ({
  className,
  heading,
  layout = "desk",
  onChange,
  settings,
}: {
  readonly className?: string;
  readonly heading?: string;
  readonly layout?: "bar" | "desk";
  readonly onChange: (settings: UnmaskSettings) => void;
  readonly settings: UnmaskSettings;
}) => {
  const { t } = useTranslation();
  const headingId = useId();
  const bar = layout === "bar";
  return (
    <aside aria-labelledby={headingId} className={className}>
      <h2 className="sr-only" id={headingId} tabIndex={-1}>
        {heading ?? t("unmaskBatchSettingsHeading")}
      </h2>
      <div className="bg-card text-fg border-rule border-2">
        <header className="border-red flex items-baseline justify-between gap-x-2 border-b-[3px] px-3 py-2.5">
          <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
            {t("unmaskBatchShared")}
          </span>
          <span className="text-muted-fg text-xs">
            {t("unmaskBatchPerImage")}
          </span>
        </header>
        <div className={bar ? "grid grid-cols-1 px-3 lg:grid-cols-4" : "px-3"}>
          <Group bar={bar} index="01" title={t("unmaskBackdrop")}>
            <BackdropChoice onChange={onChange} settings={settings} />
          </Group>
          <Group bar={bar} index="02" title={t("unmaskFeather")}>
            <FeatherControl onChange={onChange} settings={settings} />
          </Group>
          <Group bar={bar} index="03" title={t("unmaskFormat")}>
            <FormatControl onChange={onChange} settings={settings} />
          </Group>
          <Group bar={bar} index="04" title={t("unmaskQuality")}>
            <QualityControl onChange={onChange} settings={settings} />
          </Group>
        </div>
      </div>
    </aside>
  );
};
