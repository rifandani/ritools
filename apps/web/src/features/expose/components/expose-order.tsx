"use client";

import { useEffect, useRef } from "react";
import type { Selection } from "react-aria-components";
import {
  HiArrowDownTray,
  HiArrowPath,
  HiLockClosed,
  HiSparkles,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import {
  Checkbox,
  CheckboxField,
  CheckboxGroup,
} from "@/core/components/ui/checkbox";
import {
  ChoiceBox,
  ChoiceBoxDescription,
  ChoiceBoxItem,
  ChoiceBoxLabel,
} from "@/core/components/ui/choice-box";
import { Note } from "@/core/components/ui/note";
import {
  ProgressBar,
  ProgressBarTrack,
} from "@/core/components/ui/progress-bar";
import type {
  CleanPreset,
  CleanProgress,
  MetadataGroup,
  ReadReport,
} from "@/features/expose/expose";
import { isReadOnly, groupsForPreset } from "@/features/expose/expose";
import {
  GROUP_KEY,
  PRESET_KEY,
  PRESET_NOTE_KEY,
  PRESET_ORDER,
} from "@/features/expose/expose.view";
import type {
  PresetReason,
  SelectionSummary,
} from "@/features/expose/expose.view";
import type { ExposeFailure } from "@/features/expose/use-expose";
import { useTranslation } from "@/features/i18n/use-translation";

type Translate = ReturnType<typeof useTranslation>["t"];

/** The presets a report cannot use, and the words that say why. */
const presetReasonLine = (
  reason: PresetReason,
  preset: CleanPreset,
  t: Translate
): string | null => {
  if (reason !== "format-limit") {
    return null;
  }
  if (preset === "ai-only") {
    return t("exposePresetAiUnavailable");
  }
  if (preset === "everything") {
    return t("exposePresetEverythingUnavailable");
  }
  return t("exposeCleanNotSupportedTitle");
};

/** Why the Clean mark cannot start, or null when it can. */
const cleanReasonLine = (
  summary: SelectionSummary,
  t: Translate
): string | null => {
  if (summary.fields > 0) {
    return null;
  }
  return t("exposeCleanNoFields");
};

const phaseLabelOf = (progress: CleanProgress | null, t: Translate): string => {
  if (progress === null || progress.phase === "loading-engine") {
    return t("exposeEngineLoadingTitle");
  }
  return progress.phase === "cleaning"
    ? t("exposePhaseCleaning")
    : t("exposePhaseVerifying");
};

interface ExposeOrderProps {
  readonly canStart: boolean;
  readonly cancelled: boolean;
  readonly cleanError: ExposeFailure | null;
  readonly cleanProgress: CleanProgress | null;
  readonly cleaning: boolean;
  readonly custom: readonly MetadataGroup[];
  readonly onCancelClean: () => void;
  readonly onChooseAnother: () => void;
  readonly onClean: () => void;
  readonly onDownloadOriginal: () => void;
  readonly onSetCustom: (groups: readonly MetadataGroup[]) => void;
  readonly onSetPreset: (preset: CleanPreset) => void;
  readonly online: boolean;
  readonly preset: CleanPreset;
  readonly presetReasons: Readonly<Record<CleanPreset, PresetReason>>;
  readonly report: ReadReport;
  readonly summary: SelectionSummary;
}

/** The progress line while the cleaner loads, cleans, or verifies. */
const CleanRun = ({
  onCancel,
  progress,
}: {
  readonly onCancel: () => void;
  readonly progress: CleanProgress | null;
}) => {
  const { t } = useTranslation();
  const label = phaseLabelOf(progress, t);
  const percent = progress?.percent ?? null;
  return (
    <div className="flex flex-col gap-3">
      <ProgressBar
        aria-label={label}
        isIndeterminate={percent === null}
        value={percent ?? undefined}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
            {label}
          </span>
          <span className="num text-xs">
            {percent === null ? "" : `${percent}%`}
          </span>
        </div>
        <ProgressBarTrack />
      </ProgressBar>
      {progress === null || progress.phase !== "loading-engine" ? null : (
        <p className="text-muted-fg text-xs/5">
          {t("exposeEngineLoadingBody")}
        </p>
      )}
      <Button intent="outline" onPress={onCancel} size="md">
        {t("exposeCancel")}
      </Button>
      {/* Progress is announced at each quarter, never on every byte. */}
      <output aria-live="polite" className="sr-only">
        {percent === null
          ? label
          : `${label} ${String(Math.floor(percent / 25) * 25)}%`}
      </output>
    </div>
  );
};

/** A failure, printed in the order where the action happened. */
const CleanFailure = ({
  error,
  onDownloadOriginal,
  onRetry,
  online,
}: {
  readonly error: ExposeFailure;
  readonly onDownloadOriginal: () => void;
  readonly onRetry: () => void;
  readonly online: boolean;
}) => {
  const { t } = useTranslation();
  const { code } = error;

  if (code === "engine-unavailable") {
    return (
      <Note intent="warning">
        <p className="font-bold">{t("exposeEngineOfflineTitle")}</p>
        <p className="mt-1">{t("exposeEngineOfflineBody")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            intent="outline"
            isDisabled={!online}
            onPress={onRetry}
            size="xs"
          >
            {t("exposeRetry")}
          </Button>
          <Button intent="plain" onPress={onDownloadOriginal} size="xs">
            {t("exposeDownloadOriginal")}
          </Button>
        </div>
      </Note>
    );
  }

  if (code === "engine-failed") {
    return (
      <Note intent="danger">
        <p className="font-bold">{t("exposeEngineFailedTitle")}</p>
        <p className="mt-1">{t("exposeEngineFailedBody")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button intent="outline" onPress={onRetry} size="xs">
            {t("exposeRetry")}
          </Button>
          <Button intent="plain" onPress={onDownloadOriginal} size="xs">
            {t("exposeDownloadOriginal")}
          </Button>
        </div>
      </Note>
    );
  }

  if (code === "clean-not-supported") {
    return (
      <Note intent="warning">
        <p className="font-bold">{t("exposeCleanNotSupportedTitle")}</p>
        <p className="mt-1">
          {error.group === null
            ? t("exposeCleanNotSupportedFormat", {
                format: error.format ?? "",
              })
            : t("exposeCleanNotSupportedGroup", {
                format: error.format ?? "",
                group: t(GROUP_KEY[error.group]),
              })}
        </p>
        <div className="mt-2">
          <Button intent="plain" onPress={onDownloadOriginal} size="xs">
            {t("exposeDownloadOriginal")}
          </Button>
        </div>
      </Note>
    );
  }

  if (code === "too-large") {
    return (
      <Note intent="danger">
        <p className="font-bold">{t("exposeTooLargeTitle")}</p>
        <p className="mt-1">{t("exposeTooLargeBody")}</p>
        <div className="mt-2">
          <Button intent="plain" onPress={onDownloadOriginal} size="xs">
            {t("exposeDownloadOriginal")}
          </Button>
        </div>
      </Note>
    );
  }

  return (
    <Note intent="danger">
      <p className="font-bold">{t("exposeCleanErrorTitle")}</p>
      <p className="mt-1">{t("exposeCleanErrorBody")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button intent="outline" onPress={onRetry} size="xs">
          {t("exposeRetry")}
        </Button>
        <Button intent="plain" onPress={onDownloadOriginal} size="xs">
          {t("exposeDownloadOriginal")}
        </Button>
      </div>
    </Note>
  );
};

/**
 * The redaction order: four Clean Presets, the Custom group checkboxes, the
 * remove and keep lines, the Display lock, and the one red action mark.
 *
 * Nothing here starts on a change. **Clean** is the only mark that reads the
 * file again, and it becomes **Cancel** while the cleaner runs.
 */
export const ExposeOrder = ({
  canStart,
  cancelled,
  cleanError,
  cleanProgress,
  cleaning,
  custom,
  onCancelClean,
  onChooseAnother,
  onClean,
  onDownloadOriginal,
  onSetCustom,
  onSetPreset,
  online,
  preset,
  presetReasons,
  report,
  summary,
}: ExposeOrderProps) => {
  const { t } = useTranslation();
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cleanError !== null || cancelled) {
      requestAnimationFrame(() => {
        errorRef.current?.focus();
      });
    }
  }, [cancelled, cleanError]);

  if (report.facts.format === "dng") {
    return (
      <aside
        aria-labelledby="expose-order-title"
        className="border-rule bg-card flex flex-col gap-4 border-2 p-4"
      >
        <h2
          className="font-display text-2xl font-black uppercase"
          id="expose-order-title"
        >
          {t("exposeDngReadOnlyTitle")}
        </h2>
        <Note intent="warning">
          <p className="font-bold">{t("exposeCleanNotSupportedTitle")}</p>
          <p className="mt-1">{t("exposeDngReadOnlyBody")}</p>
        </Note>
        <p className="text-muted-fg text-xs/5">{t("exposeDngReadLimit")}</p>
        <Button intent="plain" onPress={onDownloadOriginal} size="xs">
          <HiArrowDownTray aria-hidden="true" />
          {t("exposeDownloadOriginal")}
        </Button>
        <Button intent="plain" onPress={onChooseAnother} size="xs">
          <HiArrowPath aria-hidden="true" />
          {t("exposeTryAnother")}
        </Button>
      </aside>
    );
  }

  const disabledKeys = PRESET_ORDER.filter(
    (entry) =>
      presetReasons[entry] !== null &&
      (entry !== "custom" || presetReasons[entry] === "format-limit")
  );
  const reasonLines = isReadOnly(report.facts.format)
    ? [
        t(
          report.facts.format === "pdf"
            ? "exposePdfCleanUnavailable"
            : "exposeReadOnlyFormat"
        ),
      ]
    : [
        ...new Set(
          PRESET_ORDER.map((entry) =>
            presetReasonLine(presetReasons[entry], entry, t)
          ).filter((line): line is string => line !== null)
        ),
      ];
  const reason = cleanReasonLine(summary, t);

  const removableGroups = report.groups.filter(
    (entry) => entry.group !== "display" && entry.count > 0
  );

  return (
    <aside
      aria-labelledby="expose-order-title"
      className="border-rule bg-card border-t-primary flex flex-col gap-4 border-2 border-t-[3px] p-4"
    >
      <div className="flex flex-col gap-1">
        <h2
          className="font-display text-[clamp(1.5rem,3vw,2rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]"
          id="expose-order-title"
        >
          {t("exposeCleanTitle")}
        </h2>
        <p className="text-muted-fg text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
          {t("exposePresetTitle")}
        </p>
      </div>

      {cancelled ? (
        <div ref={errorRef} tabIndex={-1}>
          <Note intent="info">
            <p className="font-bold">{t("exposeCancelledTitle")}</p>
            <p className="mt-1">{t("exposeCancelledBody")}</p>
          </Note>
        </div>
      ) : null}

      {cleanError === null ? null : (
        <div ref={errorRef} tabIndex={-1}>
          <CleanFailure
            error={cleanError}
            onDownloadOriginal={onDownloadOriginal}
            onRetry={onClean}
            online={online}
          />
        </div>
      )}

      <ChoiceBox
        aria-label={t("exposePresetTitle")}
        disabledKeys={disabledKeys}
        onSelectionChange={(keys: Selection) => {
          if (keys === "all") {
            return;
          }
          const [key] = [...keys];
          if (key !== undefined) {
            // SAFETY: the only items in this list are the four Clean Presets,
            // so the selected key is one of them.
            onSetPreset(String(key) as CleanPreset);
          }
        }}
        selectedKeys={[preset]}
      >
        {PRESET_ORDER.map((entry) => {
          const selected = new Set(groupsForPreset(entry, custom));
          const count = report.groups.reduce(
            (total, group) =>
              selected.has(group.group) ? total + group.count : total,
            0
          );
          return (
            <ChoiceBoxItem
              id={entry}
              key={entry}
              textValue={t(PRESET_KEY[entry])}
            >
              <ChoiceBoxLabel className="flex items-baseline justify-between gap-3">
                <span>{t(PRESET_KEY[entry])}</span>
                <span className="num text-xs">{count}</span>
              </ChoiceBoxLabel>
              <ChoiceBoxDescription>
                {t(PRESET_NOTE_KEY[entry])}
              </ChoiceBoxDescription>
            </ChoiceBoxItem>
          );
        })}
      </ChoiceBox>

      {reasonLines.map((line) => (
        <p className="text-muted-fg text-xs/5" key={line}>
          {line}
        </p>
      ))}

      {preset === "custom" ? (
        <CheckboxGroup
          aria-label={t("exposeGroupsTitle")}
          onChange={(values: string[]) => {
            // SAFETY: every checkbox value is a Metadata Group, and Display is
            // never rendered as one.
            onSetCustom(values as MetadataGroup[]);
          }}
          value={[...custom]}
        >
          {removableGroups.map((entry) => {
            const limited = entry.removability === "format";
            return (
              <div className="flex flex-col gap-1" key={entry.group}>
                <CheckboxField isDisabled={limited} value={entry.group}>
                  <Checkbox>
                    <span className="flex w-full items-baseline justify-between gap-2">
                      <span>{t(GROUP_KEY[entry.group])}</span>
                      <span className="num text-xs">{entry.count}</span>
                    </span>
                  </Checkbox>
                </CheckboxField>
                {limited ? (
                  <p className="text-muted-fg ps-8 text-xs/5">
                    {t("exposeGroupFormatLimit")}
                  </p>
                ) : null}
              </div>
            );
          })}
        </CheckboxGroup>
      ) : null}

      <div className="border-rule flex flex-col gap-1.5 border-t-2 pt-3 text-sm/5">
        <p>{t("exposeRemoveLine", summary)}</p>
        <p>
          {t("exposeKeepLine", {
            fields: summary.keptFields,
            groups: summary.keptGroups,
          })}
        </p>
        <p>{t("exposeKeptDisplayLine", { fields: summary.displayFields })}</p>
      </div>

      <div className="border-rule flex gap-2 border-2 p-2">
        <HiLockClosed aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
            {t("exposeDisplayLock")}
          </p>
          <p className="text-muted-fg text-xs/5">{t("exposeDisplayLockWhy")}</p>
        </div>
      </div>

      <p className="text-muted-fg text-xs/5">{t("exposeEngineNote")}</p>

      {cleaning ? (
        <CleanRun onCancel={onCancelClean} progress={cleanProgress} />
      ) : (
        <>
          <Button
            aria-describedby={reason === null ? undefined : "expose-clean-why"}
            className="w-full"
            id="expose-clean"
            intent="primary"
            isDisabled={!canStart}
            onPress={onClean}
            size="md"
          >
            <HiSparkles aria-hidden="true" />
            {t("exposeClean")}
          </Button>
          {reason === null ? null : (
            <p className="text-muted-fg text-xs/5" id="expose-clean-why">
              {reason}
            </p>
          )}
        </>
      )}

      {cleaning ? null : (
        <div className="flex flex-col gap-2">
          {cleanError === null && !cancelled ? (
            <Button intent="plain" onPress={onDownloadOriginal} size="xs">
              <HiArrowDownTray aria-hidden="true" />
              {t("exposeDownloadOriginal")}
            </Button>
          ) : null}
          <Button intent="plain" onPress={onChooseAnother} size="xs">
            <HiArrowPath aria-hidden="true" />
            {t("exposeTryAnother")}
          </Button>
        </div>
      )}
    </aside>
  );
};
