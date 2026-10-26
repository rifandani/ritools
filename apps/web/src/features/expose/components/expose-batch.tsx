/* oxlint-disable react/jsx-handler-names -- named controller actions pass directly to their controls */
"use client";

import { cn } from "cn";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  HiArrowDownTray,
  HiArrowPath,
  HiCheck,
  HiClock,
  HiExclamationTriangle,
  HiMinus,
  HiNoSymbol,
  HiSparkles,
  HiXMark,
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
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { FORMAT_LABEL, METADATA_GROUPS } from "@/features/expose/expose";
import { resultStateOf } from "@/features/expose/expose.batch";
import type {
  ExposeItem,
  ExposeRowState,
} from "@/features/expose/expose.batch";
import {
  GROUP_KEY,
  PRESET_KEY,
  PRESET_NOTE_KEY,
  PRESET_ORDER,
  canPreview,
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
const ItemState = ({
  className,
  item,
}: {
  readonly className?: string;
  readonly item: ExposeItem;
}) => {
  const { t } = useTranslation();
  const Icon = STATE_ICON[item.state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-bold uppercase",
        item.state === "stale" && "text-muted-fg",
        className
      )}
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

const LABEL_CLASS =
  "text-xs/4 font-bold uppercase tracking-[0.05em] [font-stretch:87.5%]";

const Dot = () => (
  <span aria-hidden="true" className="text-border">
    ·
  </span>
);

/** The extension of a file name, for a plate that has no picture. */
const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "?" : name.slice(dot + 1, dot + 5);
};

/**
 * The file itself, in a square plate. The plate prints the extension, and the
 * picture covers it once the browser can show it. The object URL is set on the
 * element and revoked when the row leaves.
 */
const RowThumb = ({ item }: { readonly item: ExposeItem }) => {
  const image = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const format = item.report?.facts.format;
  const readable =
    format !== undefined && canPreview(format) && item.source.bytes.size > 0;

  useEffect(() => {
    const element = image.current;
    if (element === null || !readable) {
      return;
    }
    let url: string;
    try {
      url = URL.createObjectURL(item.source.bytes);
    } catch {
      // The plate keeps its extension.
      return;
    }
    element.src = url;
    return () => {
      element.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [item.source.bytes, readable]);

  return (
    <span
      aria-hidden="true"
      className="border-border bg-muted relative row-span-2 grid size-12 shrink-0 place-content-center overflow-hidden border-2 sm:row-span-1 sm:size-14"
    >
      <span className={cn("text-muted-fg", LABEL_CLASS)}>
        {extensionOf(item.source.name)}
      </span>
      {readable && !failed ? (
        <img
          alt=""
          className="absolute inset-0 size-full object-cover"
          decoding="async"
          onError={() => {
            setFailed(true);
          }}
          ref={image}
        />
      ) : null}
    </span>
  );
};

/** A mark with no word of its own: the note behind it says what it does. */
const NoteMark = ({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <Tooltip delay={0}>
    {children}
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

const FileActions = ({
  item,
  expose,
}: {
  readonly item: ExposeItem;
  readonly expose: ExposeController;
}) => {
  const { t } = useTranslation();
  const downloadLabel = t("exposeDownloadNamed", {
    name: item.source.name,
  });
  const removeLabel = t("exposeRemoveNamed", { name: item.source.name });
  return (
    <div className="col-start-3 row-start-1 flex items-center gap-x-1.5 sm:col-start-4">
      {item.state === "cleaned" ? (
        <NoteMark label={downloadLabel}>
          <Button
            aria-label={downloadLabel}
            intent="outline"
            onPress={() => expose.actions.downloadOne(item.id)}
            size="sq-xs"
          >
            <HiArrowDownTray aria-hidden="true" />
          </Button>
        </NoteMark>
      ) : (
        // Holds the column, so the marks line up down the Batch.
        <span aria-hidden="true" className="size-8 sm:size-7" />
      )}
      <NoteMark label={removeLabel}>
        <Button
          aria-label={removeLabel}
          intent="plain"
          onPress={() => {
            expose.actions.remove(item.id);
          }}
          size="sq-xs"
        >
          <HiXMark aria-hidden="true" />
        </Button>
      </NoteMark>
    </div>
  );
};

const FileName = ({
  item,
  expose,
}: {
  readonly item: ExposeItem;
  readonly expose: ExposeController;
}) => (
  <div className="flex min-w-0 flex-col items-start gap-0.5">
    <Button
      className="h-auto min-h-8 max-w-full justify-start text-left [overflow-wrap:anywhere] normal-case"
      data-focus-id={`expose-open-${item.id}`}
      id={`expose-open-${item.id}`}
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
    <>
      {report?.gps ? (
        <span className="border-rule border-2 px-1.5 py-0.5 text-xs/4 font-bold">
          GPS
        </span>
      ) : null}
      {ai ? (
        <span className="border-rule border-2 px-1.5 py-0.5 text-xs/4 font-bold">
          {t("exposeAiBadge")}
        </span>
      ) : null}
    </>
  );
};

/** The format, the size, the dimensions, the field count, and the signals. */
const RowMeta = ({
  item,
  locale,
}: {
  readonly item: ExposeItem;
  readonly locale: string;
}) => {
  const { t } = useTranslation();
  const { report } = item;
  const facts = report?.facts ?? null;
  const remaining = item.result?.verification.read.counts.fields ?? null;
  return (
    <p className="text-muted-fg flex flex-wrap items-center gap-x-2 gap-y-1 text-xs/5">
      {facts === null ? null : (
        <>
          <span className={LABEL_CLASS}>{FORMAT_LABEL[facts.format]}</span>
          <Dot />
        </>
      )}
      <span className="num">{formatBytes(item.source.bytes.size, locale)}</span>
      {facts === null ||
      facts.width === null ||
      facts.height === null ? null : (
        <>
          <Dot />
          <span className="num">
            {facts.width}×{facts.height}
          </span>
        </>
      )}
      {report === null ? null : (
        <>
          <Dot />
          <span>
            {remaining === null
              ? t("exposeFieldCount", { count: report.counts.fields })
              : t("exposeRemaining", { count: remaining })}
          </span>
        </>
      )}
      <FileSignals item={item} />
    </p>
  );
};

export const ExposeBatchSettings = ({
  expose,
}: {
  readonly expose: ExposeController;
}) => {
  const { t } = useTranslation();
  return (
    <aside
      aria-labelledby="expose-batch-title"
      className="border-rule bg-card min-w-0 self-start border-2 lg:col-start-1 lg:row-span-2 lg:row-start-1"
    >
      <header className="border-red flex items-baseline justify-between gap-x-2 border-b-[3px] px-3 py-2.5">
        <h2
          className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]"
          id="expose-batch-title"
        >
          {t("exposeBatchTitle")}
        </h2>
        <span className="num text-xs">
          {t("exposeBatchCount", { count: expose.items.length })}
        </span>
      </header>
      <div className="flex flex-col gap-4 p-3">
        <section className="flex flex-col gap-3">
          <h3 className="border-rule flex items-center gap-x-2 border-b-2 pb-1.5">
            <span
              aria-hidden="true"
              className="num bg-fg text-bg grid size-6 shrink-0 place-content-center text-xs font-extrabold"
            >
              01
            </span>
            <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
              {t("exposeCleanTitle")}
            </span>
          </h3>
          <ChoiceBox
            aria-label={t("exposePresetTitle")}
            className="[--gutter:--spacing(2.5)]"
            onSelectionChange={(keys) => {
              if (keys === "all") {
                return;
              }
              const [key] = [...keys];
              const preset = PRESET_ORDER.find((entry) => entry === key);
              if (preset !== undefined) {
                expose.actions.setPreset(preset);
              }
            }}
            selectedKeys={[expose.preset]}
          >
            {PRESET_ORDER.map((preset) => (
              <ChoiceBoxItem
                id={preset}
                key={preset}
                textValue={t(PRESET_KEY[preset])}
              >
                <ChoiceBoxLabel className="text-[0.875rem] font-bold tracking-[0.04em] uppercase [font-stretch:87.5%]">
                  {t(PRESET_KEY[preset])}
                </ChoiceBoxLabel>
                <ChoiceBoxDescription className="text-xs leading-4">
                  {t(PRESET_NOTE_KEY[preset])}
                </ChoiceBoxDescription>
              </ChoiceBoxItem>
            ))}
          </ChoiceBox>
        </section>
        {expose.preset === "custom" ? (
          <CheckboxGroup
            aria-label={t("exposeGroupsTitle")}
            className="grid gap-3 space-y-0 sm:grid-cols-2 lg:grid-cols-1"
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
        <div className="border-rule flex flex-col gap-2 border-t-2 py-3 text-xs/5">
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
      </div>
    </aside>
  );
};

/**
 * 02 Actions: the one red field. It prints the Batch marks and stays at the
 * bottom edge of the ledger, so the run never leaves reach.
 */
const ExposeBatchActions = ({
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
    <section
      aria-label={t("exposeActions")}
      className="ground-red sticky bottom-0 z-20"
    >
      <div className="px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="num bg-primary text-primary-fg grid size-6 place-content-center text-xs font-extrabold">
              02
            </span>
            <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
              {t("exposeActions")}
            </span>
            {expose.cleaning ? (
              <span className="num text-xs">
                {expose.completed} / {expose.runTotal}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <Button
              className="max-sm:w-full"
              id="expose-clean-all"
              intent="primary"
              isDisabled={!expose.canCleanAll}
              onPress={expose.actions.cleanAll}
              size="sm"
            >
              <HiSparkles aria-hidden="true" />
              {t("exposeCleanAll")}
            </Button>
            <Button
              intent="outline"
              isDisabled={readyCount === 0 || expose.zipStatus === "building"}
              onPress={expose.actions.downloadAll}
              size="sm"
            >
              <HiArrowDownTray aria-hidden="true" />
              {expose.zipStatus === "building"
                ? t("exposeZipBuilding")
                : t("exposeDownloadAll")}
            </Button>
            <Button
              intent="plain"
              onPress={() => setConfirmClear(true)}
              size="sm"
            >
              {t("exposeClear")}
            </Button>
          </div>
        </div>
        {expose.cleaning ? (
          <ProgressBar
            aria-label={t("exposeBatchProgress")}
            className="mt-3"
            value={percent}
          >
            <ProgressBarTrack />
          </ProgressBar>
        ) : null}
        {/* The summary is the focus target after a run. Keep it for assistive
            tech; the Batch header and row states carry the visual count. */}
        <p
          className={expose.cancelled ? "text-sm/6 outline-hidden" : "sr-only"}
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
          <output aria-live="polite" className="mt-2 block text-sm">
            {t("exposeZipDone", { count: expose.zipLeftOut })}
          </output>
        ) : null}
        {expose.zipStatus === "failed" ? (
          <Note className="mt-3" intent="danger">
            {t("exposeZipFailed")}
          </Note>
        ) : null}
      </div>
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
    </section>
  );
};

export const ExposeBatch = ({
  expose,
}: {
  readonly expose: ExposeController;
}) => {
  const { t, locale } = useTranslation();
  return (
    <div className="flex min-w-0 flex-col">
      <ul aria-label={t("exposeBatchList")} className="border-rule border-2">
        {expose.items.map((item) => (
          <li
            className="border-border grid grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 border-b-2 px-3 py-3 last:border-b-0 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-x-5 sm:px-4"
            key={item.id}
          >
            <RowThumb item={item} />
            <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-0.5">
              <FileName item={item} expose={expose} />
              <RowMeta item={item} locale={locale} />
            </div>
            <ItemState
              className="col-start-2 row-start-2 sm:col-start-3 sm:row-start-1 sm:justify-end"
              item={item}
            />
            <FileActions expose={expose} item={item} />
          </li>
        ))}
      </ul>
      <ExposeBatchActions expose={expose} />
    </div>
  );
};
