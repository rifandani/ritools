"use client";

import { cn } from "cn";
import { Option } from "effect";
import { useId } from "react";

import {
  ChoiceBox,
  ChoiceBoxItem,
  ChoiceBoxLabel,
} from "@/core/components/ui/choice-box";
import { Label } from "@/core/components/ui/field";
import { Note } from "@/core/components/ui/note";
import {
  Slider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "@/core/components/ui/slider";
import { Switch, SwitchField } from "@/core/components/ui/switch";
import { useTranslation } from "@/features/i18n/use-translation";
import type {
  BatchItem,
  OutputFormat,
  SettingsIssue,
  SizeMode,
  SqueezeSettings,
} from "@/features/squeeze/squeeze";
import {
  BYTES_PER_KB,
  batchShare,
  exifAvailable,
  folderStructureAvailable,
  formatBytes,
  isOutputAvailable,
  MAX_MAX_DIMENSION,
  MAX_QUALITY,
  MAX_TARGET_BYTES,
  MIN_MAX_DIMENSION,
  MIN_QUALITY,
  MIN_TARGET_BYTES,
  settingsIssueKey,
} from "@/features/squeeze/squeeze";

const OUTPUTS: readonly OutputFormat[] = [
  "jpeg",
  "webp",
  "avif",
  "png",
  "keep",
  "multi",
];

const MODES: readonly SizeMode[] = [
  "per-image",
  "batch-total",
  "fixed-quality",
];

const OUTPUT_KEY = {
  avif: "squeezeOutputAvif",
  jpeg: "squeezeOutputJpeg",
  keep: "squeezeOutputKeep",
  multi: "squeezeOutputMulti",
  png: "squeezeOutputPng",
  webp: "squeezeOutputWebp",
} as const;

const CODEC_KEY = {
  avif: "squeezeCodecAvif",
  jpeg: "squeezeCodecJpeg",
  keep: "squeezeCodecKeep",
  multi: "squeezeCodecMulti",
  png: "squeezeCodecPng",
  webp: "squeezeCodecWebp",
} as const;

const MODE_KEY = {
  "batch-total": "squeezeModeBatchTotal",
  "fixed-quality": "squeezeModeFixedQuality",
  "per-image": "squeezeModePerImage",
} as const;

const MODE_NOTE = {
  "batch-total": "squeezeModeNoteBatchTotal",
  "fixed-quality": "squeezeModeNoteFixedQuality",
  "per-image": "squeezeModeNotePerImage",
} as const;

const NUMBER_CLASS =
  "num w-full min-w-0 bg-transparent px-2 py-1.5 text-end text-sm outline-hidden";

const UNIT_CLASS =
  "flex items-center border-l-2 border-input px-1.5 text-xs font-bold uppercase tracking-[0.05em] [font-stretch:87.5%]";

/** One numbered group of the ticket. */
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

/** The Target field: a labelled well with its unit inside the rule. */
const Quantity = ({
  id,
  label,
  onChange,
  onCommit,
  unit,
  value,
}: {
  readonly id: string;
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly onCommit: () => void;
  readonly unit: string;
  readonly value: string;
}) => (
  <label className="block" htmlFor={id}>
    <span className="text-muted-fg mb-1 block text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
      {label}
    </span>
    <span className="well bracket flex items-stretch">
      <input
        className={NUMBER_CLASS}
        id={id}
        inputMode="numeric"
        onBlur={onCommit}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        type="number"
        value={value}
      />
      <span aria-hidden="true" className={UNIT_CLASS}>
        {unit}
      </span>
    </span>
  </label>
);

/** The quality control, with the disabled reason PNG carries. */
const Quality = ({
  disabled,
  onChange,
  settings,
}: {
  readonly disabled: boolean;
  readonly onChange: (settings: SqueezeSettings) => void;
  readonly settings: SqueezeSettings;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-y-1">
      <Slider
        isDisabled={disabled}
        maxValue={MAX_QUALITY}
        minValue={MIN_QUALITY}
        onChange={(quality) => {
          onChange({
            ...settings,
            quality: Array.isArray(quality)
              ? (quality[0] ?? settings.quality)
              : quality,
          });
        }}
        step={1}
        value={settings.quality}
      >
        <div className="flex items-baseline justify-between">
          <Label className="text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
            {t("squeezeQuality")}
          </Label>
          <SliderOutput />
        </div>
        <SliderTrack>
          <SliderThumb />
        </SliderTrack>
      </Slider>
      <p className="text-muted-fg text-xs leading-4">
        {disabled ? t("squeezeReasonPngLossless") : t("squeezeQualityHint")}
      </p>
    </div>
  );
};

/** The batch budget, split live into the per-image figure beside the field. */
const BudgetReadout = ({
  count,
  totalBytes,
}: {
  readonly count: number;
  readonly totalBytes: number;
}) => {
  const { t, locale } = useTranslation();
  const share = batchShare(totalBytes, count);
  return (
    <div className="border-rule mt-3 border-t-2 pt-2">
      <div className="flex items-baseline justify-between gap-x-2">
        <span className="text-muted-fg text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
          {t("squeezeBudgetImagesLabel")}
        </span>
        <span className="num text-sm font-bold">{count}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-x-2">
        <span className="text-muted-fg text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
          {t("squeezePerImageBudgetLabel")}
        </span>
        <span className="num text-lg leading-6 font-extrabold">
          {count === 0 ? "—" : formatBytes(share, locale)}
        </span>
      </div>
      <p className="text-muted-fg mt-1 text-xs leading-4">
        {t("squeezeBudgetNote")}
      </p>
    </div>
  );
};

/** The first key of a single-select ChoiceBox, against the allowed values. */
const firstSelected = (keys: "all" | ReadonlySet<string | number>) =>
  keys === "all" ? undefined : [...keys][0];

interface ControlProps {
  readonly onChange: (settings: SqueezeSettings) => void;
  readonly settings: SqueezeSettings;
}

interface ItemControlProps extends ControlProps {
  readonly items: readonly BatchItem[];
}

/** 01 Output format. */
const OutputFormatGroup = ({ onChange, settings }: ControlProps) => {
  const { t } = useTranslation();
  return (
    <Group index="01" title={t("squeezeOutputFormat")}>
      <ChoiceBox
        aria-label={t("squeezeOutputFormat")}
        id="squeeze-output-format"
        className="[--gutter:--spacing(2.5)]"
        columns={1}
        gap={0}
        onSelectionChange={(keys) => {
          const next = firstSelected(keys);
          const output = OUTPUTS.find((format) => format === next);
          if (output) {
            onChange({ ...settings, outputFormat: output });
          }
        }}
        selectedKeys={[settings.outputFormat]}
        selectionMode="single"
      >
        {OUTPUTS.map((format) => (
          <ChoiceBoxItem
            id={format}
            isDisabled={!isOutputAvailable(format, settings.sizeMode)}
            key={format}
            textValue={t(OUTPUT_KEY[format])}
          >
            <span className="flex flex-wrap items-baseline gap-x-2">
              <ChoiceBoxLabel className="text-[0.875rem] font-bold tracking-[0.04em] uppercase [font-stretch:87.5%]">
                {t(OUTPUT_KEY[format])}
              </ChoiceBoxLabel>
              <span className="text-muted-fg text-xs leading-4">
                {t(CODEC_KEY[format])}
              </span>
            </span>
          </ChoiceBoxItem>
        ))}
      </ChoiceBox>

      {settings.sizeMode === "batch-total" ? (
        <p className="text-muted-fg mt-2 text-xs leading-4">
          {t("squeezeReasonMultiBatchTotal")}
        </p>
      ) : null}

      <p className="text-muted-fg border-rule mt-2 border-t-2 pt-2 text-xs leading-4">
        {t("squeezeCodecNotice")}
      </p>
    </Group>
  );
};

/** 02 Size target: per image, one batch budget, or a fixed quality. */
const SizeModeGroup = ({ items, onChange, settings }: ItemControlProps) => {
  const { t } = useTranslation();

  const clampTarget = () => {
    onChange({
      ...settings,
      targetBytes: Math.min(
        MAX_TARGET_BYTES,
        Math.max(MIN_TARGET_BYTES, settings.targetBytes)
      ),
    });
  };

  const everyInputPng = items.every(
    (item) => Option.getOrNull(item.format) === "png"
  );
  const qualityDisabled =
    settings.outputFormat === "png" ||
    (settings.outputFormat === "keep" && everyInputPng);

  return (
    <Group index="02" title={t("squeezeSizeMode")}>
      <ChoiceBox
        aria-label={t("squeezeSizeMode")}
        className="[--gutter:--spacing(2.5)]"
        columns={1}
        gap={0}
        onSelectionChange={(keys) => {
          const next = firstSelected(keys);
          const mode = MODES.find((value) => value === next);
          if (mode) {
            onChange({ ...settings, sizeMode: mode });
          }
        }}
        selectedKeys={[settings.sizeMode]}
        selectionMode="single"
      >
        {MODES.map((mode) => (
          <ChoiceBoxItem
            id={mode}
            isDisabled={
              mode === "batch-total" && settings.outputFormat === "multi"
            }
            key={mode}
            textValue={t(MODE_KEY[mode])}
          >
            <ChoiceBoxLabel>{t(MODE_KEY[mode])}</ChoiceBoxLabel>
          </ChoiceBoxItem>
        ))}
      </ChoiceBox>

      {settings.outputFormat === "multi" ? (
        <p className="text-muted-fg mt-2 text-xs leading-4">
          {t("squeezeReasonMultiBatchTotal")}
        </p>
      ) : null}

      <p className="text-muted-fg mt-2 text-xs leading-4">
        {t(MODE_NOTE[settings.sizeMode])}
      </p>

      <div className="mt-3">
        {settings.sizeMode === "per-image" ? (
          <div className="flex flex-col gap-y-1">
            <Quantity
              id="squeeze-target"
              label={t("squeezeTargetSize")}
              onChange={(value) => {
                const kb = Number(value);
                if (!Number.isFinite(kb) || kb <= 0) {
                  return;
                }
                onChange({
                  ...settings,
                  targetBytes: Math.round(kb * BYTES_PER_KB),
                });
              }}
              onCommit={clampTarget}
              unit="KB"
              value={String(Math.round(settings.targetBytes / BYTES_PER_KB))}
            />
            <p className="text-muted-fg text-xs leading-4">
              {t("squeezeTargetHint")}
            </p>
          </div>
        ) : null}

        {settings.sizeMode === "batch-total" ? (
          <div>
            <Quantity
              id="squeeze-batch-budget"
              label={t("squeezeBatchTotal")}
              onChange={(value) => {
                const kb = Number(value);
                if (!Number.isFinite(kb) || kb <= 0) {
                  return;
                }
                onChange({
                  ...settings,
                  batchTotalBytes: Math.round(kb * BYTES_PER_KB),
                });
              }}
              onCommit={() => {
                // The batch budget commits on each change; blur adds nothing.
              }}
              unit="KB"
              value={String(
                Math.round(settings.batchTotalBytes / BYTES_PER_KB)
              )}
            />
            <BudgetReadout
              count={items.length}
              totalBytes={settings.batchTotalBytes}
            />
          </div>
        ) : null}

        {settings.sizeMode === "fixed-quality" ? (
          <Quality
            disabled={qualityDisabled}
            onChange={onChange}
            settings={settings}
          />
        ) : null}
      </div>
    </Group>
  );
};

/** 03 Options: resize and the two switches, each with its reason. */
const OptionsGroup = ({ items, onChange, settings }: ItemControlProps) => {
  const { t } = useTranslation();
  const exifOn = exifAvailable(settings.outputFormat, items);
  const hasFolders = folderStructureAvailable(items);
  const hasJpeg = items.some(
    (item) => Option.getOrNull(item.format) === "jpeg"
  );

  const clampDimension = (key: "maxHeight" | "maxWidth") => {
    const value = settings[key];
    if (value !== null) {
      onChange({
        ...settings,
        [key]: Math.min(MAX_MAX_DIMENSION, Math.max(MIN_MAX_DIMENSION, value)),
      });
    }
  };

  const exifNote = exifOn
    ? settings.outputFormat === "multi"
      ? t("squeezeExifMultiNote")
      : t("squeezeExifNote")
    : hasJpeg
      ? t("squeezeReasonExifJpegOnly")
      : settings.outputFormat === "keep"
        ? t("squeezeReasonNoJpegInput")
        : t("squeezeReasonNoJpegSource");

  return (
    <Group index="03" title={t("squeezeOptions")}>
      <div className="flex flex-col gap-y-1">
        <span className="text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
          {t("squeezeResize")}
        </span>
        <div className="grid grid-cols-2 gap-2">
          {(["maxWidth", "maxHeight"] as const).map((key) => (
            <label className="block" htmlFor={`squeeze-${key}`} key={key}>
              <span className="text-muted-fg mb-1 block text-xs">
                {t(key === "maxWidth" ? "squeezeMaxWidth" : "squeezeMaxHeight")}
              </span>
              <span className="well bracket flex items-stretch">
                <input
                  className={cn(NUMBER_CLASS, "text-xs")}
                  id={`squeeze-${key}`}
                  inputMode="numeric"
                  max={MAX_MAX_DIMENSION}
                  min={MIN_MAX_DIMENSION}
                  onBlur={() => {
                    clampDimension(key);
                  }}
                  onChange={(event) => {
                    const { value } = event.target;
                    if (value === "") {
                      onChange({ ...settings, [key]: null });
                      return;
                    }
                    const parsed = Number(value);
                    if (!Number.isFinite(parsed) || parsed <= 0) {
                      return;
                    }
                    onChange({ ...settings, [key]: Math.round(parsed) });
                  }}
                  placeholder="—"
                  step={100}
                  type="number"
                  value={settings[key] ?? ""}
                />
                <span aria-hidden="true" className={UNIT_CLASS}>
                  px
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="text-muted-fg text-xs leading-4">
          {t("squeezeResizeHint")}
        </p>
      </div>

      <div className="border-rule mt-3 flex flex-col gap-y-1 border-t-2 pt-3">
        <SwitchField
          isDisabled={!exifOn}
          isSelected={settings.preserveExif}
          onChange={(preserveExif) => {
            onChange({ ...settings, preserveExif });
          }}
        >
          <Switch>{t("squeezePreserveExif")}</Switch>
        </SwitchField>
        <p className="text-muted-fg text-xs leading-4">{exifNote}</p>
      </div>

      <div className="border-rule mt-3 flex flex-col gap-y-1 border-t-2 pt-3">
        <SwitchField
          isDisabled={!hasFolders}
          isSelected={settings.preserveFolders}
          onChange={(preserveFolders) => {
            onChange({ ...settings, preserveFolders });
          }}
        >
          <Switch>{t("squeezePreserveFolders")}</Switch>
        </SwitchField>
        <p className="text-muted-fg text-xs leading-4">
          {hasFolders ? t("squeezeFolderNote") : t("squeezeReasonNoFolders")}
        </p>
      </div>
    </Group>
  );
};

interface TicketProps {
  readonly items: readonly BatchItem[];
  readonly issues: readonly SettingsIssue[];
  readonly onChange: (settings: SqueezeSettings) => void;
  readonly settings: SqueezeSettings;
}

/**
 * 01 Output format, 02 Size target, 03 Options: a paper job ticket pinned to
 * the ink rail. Every control is a printed mark; every disabled reason prints
 * under the choice it belongs to, never in a tooltip alone.
 */
export const SqueezeSettingsBar = ({
  items,
  issues,
  onChange,
  settings,
}: TicketProps) => {
  const { t } = useTranslation();
  const headingId = useId();

  return (
    <aside
      aria-labelledby={headingId}
      className="bg-ink max-w-[30rem] p-0 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:max-w-none lg:px-2 lg:py-3"
    >
      <h2 className="sr-only" id={headingId}>
        {t("squeezeSettingsHeading")}
      </h2>
      <div className="bg-card text-fg border-rule border-2 lg:overflow-x-hidden">
        <header className="border-red flex items-baseline justify-between gap-x-2 border-b-[3px] px-3 py-2.5">
          <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
            {t("squeezeTicketTitle")}
          </span>
          <span className="num text-xs">
            {t("squeezeBatchCount", { count: items.length })}
          </span>
        </header>

        <div className="divide-rule divide-y-2 px-3">
          <OutputFormatGroup onChange={onChange} settings={settings} />
          <SizeModeGroup
            items={items}
            onChange={onChange}
            settings={settings}
          />
          <OptionsGroup items={items} onChange={onChange} settings={settings} />

          {issues.length === 0 ? null : (
            <div className="py-4">
              <Note className="p-2 text-xs leading-4" intent="danger">
                <ul className="flex flex-col gap-y-1">
                  {issues.map((issue) => (
                    <li key={issue.kind}>{t(settingsIssueKey(issue))}</li>
                  ))}
                </ul>
              </Note>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
