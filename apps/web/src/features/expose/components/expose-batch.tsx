/* oxlint-disable react/jsx-handler-names -- named controller actions pass directly to their controls */
"use client";

import { useState } from "react";
import {
  HiArrowDownTray,
  HiArrowPath,
  HiCheck,
  HiClock,
  HiExclamationTriangle,
  HiMinus,
  HiNoSymbol,
  HiXMark,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import {
  Checkbox,
  CheckboxField,
  CheckboxGroup,
} from "@/core/components/ui/checkbox";
import {
  ModalContent,
  ModalHeader,
  ModalFooter,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import {
  ProgressBar,
  ProgressBarTrack,
} from "@/core/components/ui/progress-bar";
import { Radio, RadioField, RadioGroup } from "@/core/components/ui/radio";
import { FORMAT_LABEL, METADATA_GROUPS } from "@/features/expose/expose";
import { resultStateOf } from "@/features/expose/expose.batch";
import type {
  ExposeItem,
  ExposeRowState,
} from "@/features/expose/expose.batch";
import {
  GROUP_KEY,
  PRESET_KEY,
  PRESET_ORDER,
  formatBytes,
} from "@/features/expose/expose.view";
import type { ExposeController } from "@/features/expose/use-expose";
import { useTranslation } from "@/features/i18n/use-translation";

const STATE_KEY = {
  ready: "exposeStateReady",
  cleaning: "exposeStateCleaning",
  cleaned: "exposeStateCleaned",
  incomplete: "exposeStateIncomplete",
  "not-supported": "exposeStateNotSupported",
  "too-large": "exposeStateTooLarge",
  rejected: "exposeStateRejected",
  failed: "exposeStateFailed",
  stale: "exposeStateStale",
} as const;
const STATE_ICON = {
  ready: HiMinus,
  cleaning: HiArrowPath,
  cleaned: HiCheck,
  incomplete: HiExclamationTriangle,
  "not-supported": HiNoSymbol,
  "too-large": HiExclamationTriangle,
  rejected: HiXMark,
  failed: HiXMark,
  stale: HiClock,
} satisfies Record<ExposeRowState, typeof HiCheck>;

/** Every state has a printed shape and a word in both color modes. */
const ItemState = ({ item }: { readonly item: ExposeItem }) => {
  const { t } = useTranslation();
  const Icon = STATE_ICON[item.state];
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-bold uppercase ${item.state === "stale" ? "text-muted-fg" : ""}`}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span>
        {item.reading ? t("exposeReading") : t(STATE_KEY[item.state])}
      </span>
      {item.state === "stale" && item.result !== null ? (
        <span className="text-muted-fg">
          {" "}
          · {t(STATE_KEY[resultStateOf(item.result)])}
        </span>
      ) : null}
    </span>
  );
};

const FileActions = ({
  item,
  expose,
  mobile,
}: {
  readonly item: ExposeItem;
  readonly expose: ExposeController;
  readonly mobile: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        aria-label={t("exposeDownloadNamed", { name: item.source.name })}
        intent="outline"
        isDisabled={item.state !== "cleaned"}
        onPress={() => expose.actions.downloadOne(item.id)}
        size="sm"
      >
        <HiArrowDownTray aria-hidden="true" />
        {t("exposeRowDownload")}
      </Button>
      <Button
        aria-label={t("exposeRemoveNamed", { name: item.source.name })}
        intent="plain"
        onPress={() => {
          expose.actions.remove(item.id);
        }}
        size="sm"
        data-mobile={mobile}
      >
        {t("exposeRemove")}
      </Button>
    </div>
  );
};

const FileName = ({
  item,
  expose,
  mobile,
}: {
  readonly item: ExposeItem;
  readonly expose: ExposeController;
  readonly mobile: boolean;
}) => (
  <div className="flex min-w-0 flex-col items-start gap-1">
    <Button
      className="h-auto min-h-11 max-w-full justify-start text-left [overflow-wrap:anywhere] normal-case"
      data-focus-id={`expose-open-${item.id}`}
      id={`expose-open-${mobile ? "mobile-" : ""}${item.id}`}
      intent="plain"
      onPress={() => expose.actions.openItem(item.id)}
      size="sm"
    >
      {item.source.name}
    </Button>
    {item.folderPath === null ? null : (
      <span className="text-muted-fg max-w-full text-xs [overflow-wrap:anywhere]">
        {item.folderPath}
      </span>
    )}
  </div>
);

const FileSignals = ({ item }: { readonly item: ExposeItem }) => {
  const { t } = useTranslation();
  const { report } = item;
  const ai =
    report !== null &&
    (report.ai.c2pa !== null ||
      report.ai.signals.length > 0 ||
      report.ai.generationParameters.length > 0 ||
      report.ai.digitalSourceTypes.length > 0);
  return (
    <span className="flex flex-wrap gap-2 text-xs font-bold">
      {report?.gps ? (
        <span className="border-rule border-2 px-1.5 py-0.5">GPS</span>
      ) : null}
      {ai ? (
        <span className="border-rule border-2 px-1.5 py-0.5">
          {t("exposeAiBadge")}
        </span>
      ) : null}
      {report !== null && !report.gps && !ai ? (
        <HiMinus aria-label={t("exposeNoSignals")} className="size-4" />
      ) : null}
    </span>
  );
};

const FieldCount = ({ item }: { readonly item: ExposeItem }) => {
  const { t } = useTranslation();
  return (
    <div className="text-sm/6">
      <span className="num">{item.report?.counts.fields ?? "—"}</span>
      {item.result === null ? null : (
        <p className="text-muted-fg text-xs/5">
          {t("exposeRemaining", {
            count: item.result.verification.read.counts.fields,
          })}
        </p>
      )}
    </div>
  );
};

export const ExposeBatchSettings = ({
  expose,
}: {
  readonly expose: ExposeController;
}) => {
  const { t } = useTranslation();
  const [confirmClear, setConfirmClear] = useState(false);
  const percent =
    expose.runTotal === 0
      ? 0
      : Math.floor((expose.completed / expose.runTotal) * 100);
  const readyCount = expose.items.filter(
    (item) => item.state === "cleaned"
  ).length;
  return (
    <aside
      aria-labelledby="expose-batch-title"
      className="border-rule bg-card min-w-0 self-start border-2 lg:col-start-1 lg:row-span-2 lg:row-start-1"
    >
      <header className="border-red border-b-[3px] px-3 py-2.5">
        <h2
          className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]"
          id="expose-batch-title"
        >
          {t("exposeBatchTitle", { count: expose.items.length })}
        </h2>
      </header>
      <div className="flex flex-col gap-4 p-3">
        <RadioGroup
          aria-label={t("exposePresetTitle")}
          className="grid space-y-0 gap-x-4 sm:grid-cols-2 lg:grid-cols-1"
          onChange={(value) => {
            const preset = PRESET_ORDER.find((entry) => entry === value);
            if (preset !== undefined) {
              expose.actions.setPreset(preset);
            }
          }}
          value={expose.preset}
        >
          {PRESET_ORDER.map((preset) => (
            <RadioField key={preset} value={preset}>
              <Radio className="min-h-11 items-center *:data-[slot=indicator]:mt-0">
                {t(PRESET_KEY[preset])}
              </Radio>
            </RadioField>
          ))}
        </RadioGroup>
        {expose.preset === "custom" ? (
          <CheckboxGroup
            aria-label={t("exposeGroupsTitle")}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"
            onChange={(values) =>
              expose.actions.setCustom(
                METADATA_GROUPS.filter(
                  (group) => group !== "display" && values.includes(group)
                )
              )
            }
            value={[...expose.custom]}
          >
            {METADATA_GROUPS.map((group) =>
              group === "display" ? null : (
                <CheckboxField key={group} value={group}>
                  <Checkbox>{t(GROUP_KEY[group])}</Checkbox>
                </CheckboxField>
              )
            )}
          </CheckboxGroup>
        ) : null}
        <div className="border-rule flex flex-col gap-2 border-y-2 py-3 text-xs/5">
          <p>{t("exposeRemoveLine", expose.summary)}</p>
          <p>
            {t("exposeKeepLine", {
              fields: expose.summary.keptFields,
              groups: expose.summary.keptGroups,
            })}
          </p>
          <p>
            {t("exposeDisplayLock")} · {t("exposeDisplayLockWhy")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            id="expose-clean-all"
            intent="primary"
            isDisabled={!expose.canCleanAll}
            onPress={expose.actions.cleanAll}
            size="md"
          >
            {t("exposeCleanAll")}
          </Button>
          <Button
            intent="outline"
            isDisabled={!expose.cleaning}
            onPress={expose.actions.cancelClean}
            size="md"
          >
            {t("exposeCancel")}
          </Button>
          <Button
            className="col-span-2"
            intent="outline"
            isDisabled={readyCount === 0 || expose.zipStatus === "building"}
            onPress={expose.actions.downloadAll}
            size="md"
          >
            <HiArrowDownTray aria-hidden="true" />
            {expose.zipStatus === "building"
              ? t("exposeZipBuilding")
              : t("exposeDownloadAll")}
          </Button>
          <Button
            className="col-span-2"
            intent="plain"
            onPress={() => setConfirmClear(true)}
            size="md"
          >
            {t("exposeClear")}
          </Button>
        </div>
        {expose.cleaning ? (
          <ProgressBar aria-label={t("exposeBatchProgress")} value={percent}>
            <p className="num text-sm">
              {expose.completed} / {expose.runTotal}
            </p>
            <ProgressBarTrack />
          </ProgressBar>
        ) : null}
        <p
          className="text-sm/6 outline-hidden"
          id="expose-batch-summary"
          tabIndex={-1}
        >
          {expose.cancelled
            ? t("exposeBatchCancelled")
            : t("exposeBatchSummary", {
                cleaned: readyCount,
                count: expose.items.length,
              })}
        </p>
        <output aria-live="polite" className="sr-only">
          {expose.runTotal > 0
            ? [25, 50, 75, 100]
                .filter((quarter) => quarter <= percent)
                .map((quarter) =>
                  t("exposeBatchAnnouncement", { percent: quarter })
                )
                .join(" ")
            : ""}
        </output>
        {expose.zipStatus === "done" ? (
          <output aria-live="polite" className="text-sm">
            {t("exposeZipDone", { count: expose.zipLeftOut })}
          </output>
        ) : null}
        {expose.zipStatus === "failed" ? (
          <Note intent="danger">{t("exposeZipFailed")}</Note>
        ) : null}
        {confirmClear ? (
          <ModalContent
            aria-label={t("exposeClearTitle")}
            isOpen
            onOpenChange={setConfirmClear}
            role="alertdialog"
            size="sm"
          >
            <ModalHeader
              title={t("exposeClearTitle")}
              description={t("exposeClearBody")}
            />
            <ModalFooter>
              <Button
                intent="danger"
                onPress={() => {
                  setConfirmClear(false);
                  expose.actions.clear();
                }}
                size="md"
              >
                {t("exposeClear")}
              </Button>
              <Button
                intent="outline"
                onPress={() => setConfirmClear(false)}
                size="md"
              >
                {t("exposeCancel")}
              </Button>
            </ModalFooter>
          </ModalContent>
        ) : null}
      </div>
    </aside>
  );
};

export const ExposeBatch = ({
  expose,
}: {
  readonly expose: ExposeController;
}) => {
  const { t, locale } = useTranslation();
  return (
    <section
      aria-label={t("exposeBatchList")}
      className="flex min-w-0 flex-col gap-5"
    >
      <table className="border-rule hidden w-full table-fixed border-separate border-spacing-0 border-2 text-left md:table">
        <caption className="sr-only">{t("exposeBatchList")}</caption>
        <thead>
          <tr>
            {(
              [
                "exposeFileColumn",
                "exposeFormatColumn",
                "exposeFieldsColumn",
                "exposeSignalsColumn",
                "exposeStateColumn",
              ] as const
            ).map((key) => (
              <th
                className="border-rule border-b-2 p-3 text-xs font-bold uppercase first:w-[28%] last:w-[30%]"
                key={key}
                scope="col"
              >
                {t(key)}
              </th>
            ))}
          </tr>
        </thead>
        {/* The last row must not print its own rule next to the table's outer
            border, or the bottom edge reads as double thickness. */}
        <tbody className="[&>tr:last-child>td]:border-b-0">
          {expose.items.map((item) => (
            <tr key={item.id}>
              <td className="border-rule border-b-2 p-3 align-top">
                <FileName item={item} expose={expose} mobile={false} />
              </td>
              <td className="border-rule border-b-2 p-3 align-top text-sm/6">
                {item.report === null
                  ? "—"
                  : FORMAT_LABEL[item.report.facts.format]}
                <p className="num text-muted-fg text-xs">
                  {formatBytes(item.source.bytes.size, locale)}
                </p>
              </td>
              <td className="border-rule border-b-2 p-3 align-top">
                <FieldCount item={item} />
              </td>
              <td className="border-rule border-b-2 p-3 align-top">
                <FileSignals item={item} />
              </td>
              <td className="border-rule space-y-3 border-b-2 p-3 align-top">
                <ItemState item={item} />
                <FileActions item={item} expose={expose} mobile={false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="flex flex-col gap-3 md:hidden">
        {expose.items.map((item) => (
          <li
            className="border-rule bg-card flex min-w-0 flex-col gap-3 border-2 p-4"
            key={item.id}
          >
            <FileName item={item} expose={expose} mobile />
            <p className="num text-muted-fg text-xs">
              {item.report === null
                ? "—"
                : FORMAT_LABEL[item.report.facts.format]}{" "}
              · {formatBytes(item.source.bytes.size, locale)}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                {t("exposeFieldsColumn")}: <FieldCount item={item} />
              </div>
              <FileSignals item={item} />
            </div>
            <ItemState item={item} />
            <FileActions item={item} expose={expose} mobile />
          </li>
        ))}
      </ul>
    </section>
  );
};
