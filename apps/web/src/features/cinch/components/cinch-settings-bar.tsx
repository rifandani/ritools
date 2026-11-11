"use client";

import { useId } from "react";

import { NumberedGroup as Group } from "@/core/components/numbered-group";
import {
  ChoiceBox,
  ChoiceBoxDescription,
  ChoiceBoxItem,
  ChoiceBoxLabel,
} from "@/core/components/ui/choice-box";
import { Label } from "@/core/components/ui/field";
import { Note } from "@/core/components/ui/note";
import { NumberField, NumberInput } from "@/core/components/ui/number-field";
import { Switch, SwitchField } from "@/core/components/ui/switch";
import {
  BYTES_PER_MB,
  FRAME_RATE_CAPS,
  MAX_RESOLUTIONS,
  OUTPUT_FORMATS,
  settingsIssues,
  SIZE_MODES,
  VIDEO_PRESETS,
} from "@/features/cinch/cinch";
import type {
  CinchSettings,
  FrameRateCap,
  MaxResolution,
  SettingsIssue,
} from "@/features/cinch/cinch";
import type { Writable } from "@/features/cinch/use-cinch";
import { useTranslation } from "@/features/i18n/use-translation";

const OUTPUT_KEY = { mp4: "cinchOutputMp4", webm: "cinchOutputWebm" } as const;
const CODEC_KEY = { mp4: "cinchCodecMp4", webm: "cinchCodecWebm" } as const;
const MODE_KEY = {
  preset: "cinchModePreset",
  target: "cinchModeTarget",
} as const;
const MODE_NOTE = {
  preset: "cinchModeNotePreset",
  target: "cinchModeNoteTarget",
} as const;
const PRESET_KEY = {
  balanced: "cinchPresetBalanced",
  light: "cinchPresetLight",
  strong: "cinchPresetStrong",
} as const;
const PRESET_NOTE = {
  balanced: "cinchPresetBalancedNote",
  light: "cinchPresetLightNote",
  strong: "cinchPresetStrongNote",
} as const;
const RESOLUTION_KEY = {
  "1080": "cinchResolution1080",
  "480": "cinchResolution480",
  "720": "cinchResolution720",
  original: "cinchResolutionOriginal",
} as const satisfies Record<MaxResolution, string>;
const FRAME_RATE_KEY = {
  "24": "cinchFrameRate24",
  "30": "cinchFrameRate30",
  original: "cinchFrameRateOriginal",
} as const satisfies Record<FrameRateCap, string>;

const LABEL_CLASS =
  "text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]";

/** The first key of a single-select ChoiceBox. */
const firstSelected = (keys: "all" | ReadonlySet<string | number>) =>
  keys === "all" ? undefined : [...keys][0];

/** A row of single-select choices with a label above them. */
const Choices = <K extends string>({
  label,
  labelOf,
  onChange,
  options,
  value,
}: {
  readonly label: string;
  readonly labelOf: (option: K) => string;
  readonly onChange: (option: K) => void;
  readonly options: readonly K[];
  readonly value: K;
}) => (
  <ChoiceBox
    aria-label={label}
    className="[--gutter:--spacing(2)]"
    columns={options.length === 3 ? 3 : 2}
    gap={0}
    onSelectionChange={(keys) => {
      const next = firstSelected(keys);
      const option = options.find((entry) => entry === next);
      if (option !== undefined) {
        onChange(option);
      }
    }}
    selectedKeys={[value]}
    selectionMode="single"
  >
    {options.map((option) => (
      <ChoiceBoxItem id={option} key={option} textValue={labelOf(option)}>
        <ChoiceBoxLabel className="text-[0.8125rem]">
          {labelOf(option)}
        </ChoiceBoxLabel>
      </ChoiceBoxItem>
    ))}
  </ChoiceBox>
);

interface ControlProps {
  readonly onChange: (settings: CinchSettings) => void;
  readonly settings: CinchSettings;
}

/** 01 Output format, with the reason a format this browser cannot write is off. */
const OutputFormatGroup = ({
  onChange,
  settings,
  writable,
}: ControlProps & { readonly writable: Writable }) => {
  const { t } = useTranslation();
  const blocked = OUTPUT_FORMATS.filter(
    (format) => writable !== null && !writable[format]
  );
  return (
    <Group index="01" title={t("cinchOutputFormat")}>
      <ChoiceBox
        aria-label={t("cinchOutputFormat")}
        className="[--gutter:--spacing(2.5)]"
        columns={1}
        gap={0}
        id="cinch-output-format"
        onSelectionChange={(keys) => {
          const next = firstSelected(keys);
          const format = OUTPUT_FORMATS.find((entry) => entry === next);
          if (format !== undefined) {
            onChange({ ...settings, outputFormat: format });
          }
        }}
        selectedKeys={[settings.outputFormat]}
        selectionMode="single"
      >
        {OUTPUT_FORMATS.map((format) => (
          <ChoiceBoxItem
            id={format}
            isDisabled={blocked.includes(format)}
            key={format}
            textValue={t(OUTPUT_KEY[format])}
          >
            <ChoiceBoxLabel className="text-[0.875rem] font-bold tracking-[0.04em] uppercase [font-stretch:87.5%]">
              {t(OUTPUT_KEY[format])}
            </ChoiceBoxLabel>
            <ChoiceBoxDescription className="text-xs leading-4">
              {t(CODEC_KEY[format])}
            </ChoiceBoxDescription>
          </ChoiceBoxItem>
        ))}
      </ChoiceBox>
      {blocked.map((format) => (
        <p className="text-muted-fg mt-2 text-xs leading-4" key={format}>
          {t("cinchReasonCannotWrite", { format: t(OUTPUT_KEY[format]) })}
        </p>
      ))}
    </Group>
  );
};

/**
 * The Target field in MB, as a number field. Any number works, decimals too.
 * An empty or non-number entry sets a Target that is not finite, so the
 * settings show the range reason and the run stays blocked.
 */
const TargetField = ({ onChange, settings }: ControlProps) => {
  const { t } = useTranslation();
  const outOfRange = settingsIssues(settings).length > 0;
  const errorId = "cinch-target-error";
  return (
    <div className="flex flex-col gap-y-1">
      <NumberField
        className="min-w-0"
        isInvalid={outOfRange}
        onChange={(mb) => {
          onChange({
            ...settings,
            targetBytes: Number.isFinite(mb)
              ? Math.round(mb * BYTES_PER_MB)
              : Number.NaN,
          });
        }}
        value={settings.targetBytes / BYTES_PER_MB}
      >
        <Label>{t("cinchTargetSize")}</Label>
        <div className="mt-1.5 flex items-center gap-x-2">
          <div className="min-w-0 flex-1">
            <NumberInput
              aria-describedby={outOfRange ? errorId : undefined}
              id="cinch-target"
            />
          </div>
          <span className="text-muted-fg text-xs font-bold tracking-[0.05em] uppercase [font-stretch:87.5%]">
            MB
          </span>
        </div>
      </NumberField>
      {outOfRange ? (
        <p
          className="text-danger-subtle-fg mt-1 text-xs leading-4 font-semibold"
          id={errorId}
        >
          {t("cinchReasonTargetRange")}
        </p>
      ) : null}
      <p className="text-muted-fg text-xs leading-4">{t("cinchTargetHint")}</p>
    </div>
  );
};

/** The Video Preset levels, each with its note. */
const PresetField = ({ onChange, settings }: ControlProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-y-2">
      <span className={LABEL_CLASS}>{t("cinchPreset")}</span>
      <Choices
        label={t("cinchPreset")}
        labelOf={(preset) => t(PRESET_KEY[preset])}
        onChange={(preset) => {
          onChange({ ...settings, preset });
        }}
        options={VIDEO_PRESETS}
        value={settings.preset}
      />
      <p className="text-muted-fg text-xs leading-4">
        {t(PRESET_NOTE[settings.preset])}
      </p>
    </div>
  );
};

/** 02 Size: a Target, or a Video Preset. */
const SizeModeGroup = ({ onChange, settings }: ControlProps) => {
  const { t } = useTranslation();
  return (
    <Group index="02" title={t("cinchSizeMode")}>
      <ChoiceBox
        aria-label={t("cinchSizeMode")}
        className="[--gutter:--spacing(2.5)]"
        columns={1}
        gap={0}
        onSelectionChange={(keys) => {
          const next = firstSelected(keys);
          const mode = SIZE_MODES.find((entry) => entry === next);
          if (mode !== undefined) {
            onChange({ ...settings, sizeMode: mode });
          }
        }}
        selectedKeys={[settings.sizeMode]}
        selectionMode="single"
      >
        {SIZE_MODES.map((mode) => (
          <ChoiceBoxItem id={mode} key={mode} textValue={t(MODE_KEY[mode])}>
            <ChoiceBoxLabel>{t(MODE_KEY[mode])}</ChoiceBoxLabel>
          </ChoiceBoxItem>
        ))}
      </ChoiceBox>
      <p className="text-muted-fg mt-2 text-xs leading-4">
        {t(MODE_NOTE[settings.sizeMode])}
      </p>
      <div className="mt-3">
        {settings.sizeMode === "target" ? (
          <TargetField onChange={onChange} settings={settings} />
        ) : (
          <PresetField onChange={onChange} settings={settings} />
        )}
      </div>
    </Group>
  );
};

/** 03 Options: Max Resolution, Remove audio, and the frame rate cap. */
const OptionsGroup = ({ onChange, settings }: ControlProps) => {
  const { t } = useTranslation();
  return (
    <Group index="03" title={t("cinchOptions")}>
      <div className="flex flex-col gap-y-2">
        <span className={LABEL_CLASS}>{t("cinchMaxResolution")}</span>
        <Choices
          label={t("cinchMaxResolution")}
          labelOf={(resolution) => t(RESOLUTION_KEY[resolution])}
          onChange={(maxResolution) => {
            onChange({ ...settings, maxResolution });
          }}
          options={MAX_RESOLUTIONS}
          value={settings.maxResolution}
        />
        <p className="text-muted-fg text-xs leading-4">
          {t("cinchMaxResolutionHint")}
        </p>
      </div>

      <div className="border-rule mt-3 flex flex-col gap-y-2 border-t-2 pt-3">
        <span className={LABEL_CLASS}>{t("cinchFrameRate")}</span>
        <Choices
          label={t("cinchFrameRate")}
          labelOf={(cap) => t(FRAME_RATE_KEY[cap])}
          onChange={(frameRateCap) => {
            onChange({ ...settings, frameRateCap });
          }}
          options={FRAME_RATE_CAPS}
          value={settings.frameRateCap}
        />
        <p className="text-muted-fg text-xs leading-4">
          {t("cinchFrameRateHint")}
        </p>
      </div>

      <div className="border-rule mt-3 flex flex-col gap-y-1 border-t-2 pt-3">
        <SwitchField
          isSelected={settings.removeAudio}
          onChange={(removeAudio) => {
            onChange({ ...settings, removeAudio });
          }}
        >
          <Switch>{t("cinchRemoveAudio")}</Switch>
        </SwitchField>
        <p className="text-muted-fg text-xs leading-4">
          {t("cinchRemoveAudioHint")}
        </p>
      </div>
    </Group>
  );
};

interface TicketProps {
  readonly count: number;
  readonly issues: readonly SettingsIssue[];
  readonly onChange: (settings: CinchSettings) => void;
  readonly settings: CinchSettings;
  readonly writable: Writable;
}

/**
 * 01 Output format, 02 Size, 03 Options: the same job ticket as Squeeze.
 * Every disabled reason prints under the choice it belongs to.
 */
export const CinchSettingsBar = ({
  count,
  issues,
  onChange,
  settings,
  writable,
}: TicketProps) => {
  const { t } = useTranslation();
  const headingId = useId();

  return (
    <aside
      aria-labelledby={headingId}
      className="max-w-[30rem] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:max-w-none"
    >
      <h2 className="sr-only" id={headingId}>
        {t("cinchSettingsHeading")}
      </h2>
      <div className="bg-card text-fg border-rule border-2 lg:overflow-x-hidden">
        <header className="border-red flex items-baseline justify-between gap-x-2 border-b-[3px] px-3 py-2.5">
          <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
            {t("cinchTicketTitle")}
          </span>
          <span className="num text-xs">{t("cinchBatchCount", { count })}</span>
        </header>

        <div className="px-3">
          <OutputFormatGroup
            onChange={onChange}
            settings={settings}
            writable={writable}
          />
          <SizeModeGroup onChange={onChange} settings={settings} />
          <OptionsGroup onChange={onChange} settings={settings} />

          {issues.length === 0 ? null : (
            <div className="py-4">
              <Note
                aria-live="polite"
                className="p-2 text-xs leading-4"
                intent="danger"
              >
                {t("cinchReasonTargetRange")}
              </Note>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
