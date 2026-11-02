"use client";

import { useId, useState } from "react";

import {
  ChoiceBox,
  ChoiceBoxDescription,
  ChoiceBoxItem,
  ChoiceBoxLabel,
} from "@/core/components/ui/choice-box";
import { ColorWell } from "@/core/components/ui/color-well";
import { Label } from "@/core/components/ui/field";
import {
  Slider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "@/core/components/ui/slider";
import { useTranslation } from "@/features/i18n/use-translation";
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
import type { UnmaskSettings } from "@/features/unmask/unmask";
import type { RgbaColor } from "@/features/unmask/unmask.engine";

const BACKDROPS = ["transparent", "solid", "blur"] as const;
type BackdropChoice = (typeof BACKDROPS)[number];

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

const CHOICE_OF_BACKDROP = {
  Blur: "blur",
  Solid: "solid",
  Transparent: "transparent",
} as const;

const numberFrom = (value: number | number[]): number =>
  Array.isArray(value) ? (value[0] ?? 0) : value;

const hexOf = (color: RgbaColor): string =>
  `#${[color.r, color.g, color.b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;

const HEX_PATTERN = /^#?(?:[\da-f]{3}|[\da-f]{6})$/iu;

/** The Solid colour a typed or picked hex names. Null while the text is not a hex. */
const colorOfHex = (text: string): RgbaColor | null => {
  const value = text.trim();
  if (!HEX_PATTERN.test(value)) {
    return null;
  }
  const digits = value.replace("#", "");
  const full =
    digits.length === 3
      ? [...digits].map((digit) => digit + digit).join("")
      : digits;
  return {
    a: 255,
    b: Number.parseInt(full.slice(4, 6), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    r: Number.parseInt(full.slice(0, 2), 16),
  };
};

const Group = ({
  children,
  index,
  title,
}: {
  readonly children: React.ReactNode;
  readonly index: string;
  readonly title: string;
}) => (
  <section className="py-4">
    <h3 className="border-rule flex items-center gap-x-2 border-b-2 pb-1.5">
      <span className="num bg-fg text-bg grid size-6 shrink-0 place-content-center text-xs font-extrabold">
        {index}
      </span>
      <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
        {title}
      </span>
    </h3>
    <div className="pt-3">{children}</div>
  </section>
);

const SolidColor = ({
  color,
  onChange,
}: {
  readonly color: RgbaColor;
  readonly onChange: (color: RgbaColor) => void;
}) => {
  const { t } = useTranslation();
  // The text the field shows. It can hold a hex that is still being typed, so
  // it stays apart from the Solid colour until it names a valid colour.
  const [draft, setDraft] = useState(() => hexOf(color));
  return (
    <ColorWell
      hueLabel={t("unmaskColorHue")}
      label={t("unmaskColor")}
      onBlur={() => {
        setDraft(hexOf(color));
      }}
      onChange={(next) => {
        setDraft(next);
        const committed = colorOfHex(next);
        if (committed !== null) {
          onChange(committed);
        }
      }}
      pickerLabel={t("unmaskColor")}
      value={draft}
    />
  );
};

const BackdropChoice = ({
  onChange,
  settings,
}: {
  readonly onChange: (settings: UnmaskSettings) => void;
  readonly settings: UnmaskSettings;
}) => {
  const { t } = useTranslation();
  const selected: BackdropChoice = CHOICE_OF_BACKDROP[settings.backdrop._tag];
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
        selectedKeys={[selected]}
        selectionMode="single"
      >
        {BACKDROPS.map((choice) => (
          <ChoiceBoxItem
            id={choice}
            key={choice}
            textValue={t(BACKDROP_KEY[choice])}
          >
            <ChoiceBoxLabel className="text-[0.875rem] font-bold tracking-[0.04em] uppercase [font-stretch:87.5%]">
              {t(BACKDROP_KEY[choice])}
            </ChoiceBoxLabel>
            <ChoiceBoxDescription className="text-xs leading-4">
              {t(BACKDROP_NOTE[choice])}
            </ChoiceBoxDescription>
          </ChoiceBoxItem>
        ))}
      </ChoiceBox>

      {settings.backdrop._tag === "Solid" ? (
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

const FeatherControl = ({
  onChange,
  settings,
}: {
  readonly onChange: (settings: UnmaskSettings) => void;
  readonly settings: UnmaskSettings;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-y-3">
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
  onChange,
  settings,
  summary,
}: {
  readonly className?: string;
  readonly heading?: string;
  readonly summary?: string;
  readonly onChange: (settings: UnmaskSettings) => void;
  readonly settings: UnmaskSettings;
}) => {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <aside aria-labelledby={headingId} className={className}>
      <h2 className="sr-only" id={headingId} tabIndex={-1}>
        {heading ?? t("unmaskBatchSettingsHeading")}
      </h2>
      <div className="bg-card text-fg border-rule border-2">
        <header className="border-red flex items-baseline justify-between gap-x-2 border-b-[3px] px-3 py-2.5">
          <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
            {heading ?? t("unmaskBatchShared")}
          </span>
          {summary === undefined ? null : (
            <span className="num shrink-0 text-xs">{summary}</span>
          )}
        </header>
        <div className="px-3">
          <Group index="01" title={t("unmaskBackdrop")}>
            <BackdropChoice onChange={onChange} settings={settings} />
          </Group>
          <Group index="02" title={t("unmaskFeather")}>
            <FeatherControl onChange={onChange} settings={settings} />
          </Group>
          <Group index="03" title={t("unmaskFormat")}>
            <FormatControl onChange={onChange} settings={settings} />
          </Group>
          <Group index="04" title={t("unmaskQuality")}>
            <QualityControl onChange={onChange} settings={settings} />
          </Group>
        </div>
      </div>
    </aside>
  );
};
