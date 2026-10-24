"use client";

import { cn } from "cn";
import { Option } from "effect";

import { useTranslation } from "@/features/i18n/use-translation";
import { SqueezeItemRow } from "@/features/squeeze/components/squeeze-item-row";
import type {
  BatchItem,
  BatchSummary,
  ImageFormat,
  ItemResult,
  SqueezeSettings,
} from "@/features/squeeze/squeeze";
import { formatBytes, keepFormatOf } from "@/features/squeeze/squeeze";

type Translate = ReturnType<typeof useTranslation>["t"];

const OUTPUT_KEY = {
  avif: "squeezeOutputAvif",
  jpeg: "squeezeOutputJpeg",
  keep: "squeezeOutputKeep",
  multi: "squeezeOutputMulti",
  png: "squeezeOutputPng",
  webp: "squeezeOutputWebp",
} as const;

/** The format a rejected codec row names in its offline message. */
const problemFormatOf = (
  settings: SqueezeSettings,
  item: BatchItem,
  t: Translate
): string => {
  if (settings.outputFormat === "multi") {
    return t("squeezeOutputMulti");
  }
  if (settings.outputFormat === "keep") {
    return t(OUTPUT_KEY[keepFormatOf(Option.getOrNull(item.format) ?? "jpeg")]);
  }
  return t(OUTPUT_KEY[settings.outputFormat]);
};

/** A byte size split into its figure and its unit, so each takes its own voice. */
const splitBytes = (bytes: number, locale: string) => {
  const text = formatBytes(bytes, locale);
  const space = text.lastIndexOf(" ");
  return { figure: text.slice(0, space), unit: text.slice(space + 1) };
};

/** The ink a total prints in: a saving is green, a growth is a warning, no change is ink. */
type TotalTone = "good" | "neutral" | "warning";

const TOTAL_TONE = {
  good: "text-success-subtle-fg",
  neutral: "text-fg",
  warning: "text-warning-subtle-fg",
} as const satisfies Record<TotalTone, string>;

/** One total: the label over its figure, and the unit in the label voice. */
const Total = ({
  figure,
  label,
  order,
  tone = "neutral",
  unit,
}: {
  readonly figure: string;
  readonly label: string;
  readonly order: number;
  readonly tone?: TotalTone;
  readonly unit: string;
}) => (
  <div className="bg-bg flex min-w-0 flex-col gap-y-3 px-3 py-4 sm:px-5 sm:py-5">
    <dt className="text-muted-fg text-xs/4 font-bold tracking-[0.14em] uppercase [font-stretch:87.5%]">
      {label}
    </dt>
    <dd className={cn("flex items-baseline gap-x-1.5", TOTAL_TONE[tone])}>
      <span
        className="num animate-num-land inline-block origin-bottom-left text-[clamp(1.625rem,3.4vw,2.625rem)] leading-none font-extrabold"
        style={{ animationDelay: `${300 + order * 80}ms` }}
      >
        {figure}
      </span>
      <span className="text-xs font-bold tracking-[0.05em] uppercase [font-stretch:87.5%] sm:text-sm">
        {unit}
      </span>
    </dd>
  </div>
);

/**
 * The totals of a finished run, ruled off under the Batch like the foot of a
 * ledger page: total in, total out, the bytes saved, and the reduction.
 */
export const SqueezeBatchTotals = ({
  locale,
  summary,
}: {
  readonly locale: string;
  readonly summary: BatchSummary;
}) => {
  const { t } = useTranslation();
  const savedBytes = summary.inputBytes - summary.outputBytes;
  const reduction =
    summary.inputBytes <= 0
      ? 0
      : Math.round((savedBytes / summary.inputBytes) * 100);
  const totalIn = splitBytes(summary.inputBytes, locale);
  const totalOut = splitBytes(summary.outputBytes, locale);
  const saved = splitBytes(Math.max(0, savedBytes), locale);
  const savedTone: TotalTone = savedBytes > 0 ? "good" : "neutral";
  const reductionTone: TotalTone =
    savedBytes > 0 ? "good" : savedBytes < 0 ? "warning" : "neutral";

  return (
    <section aria-labelledby="squeeze-totals-heading">
      <h3 className="sr-only" id="squeeze-totals-heading">
        {t("squeezeTotalsHeading")}
      </h3>
      <div className="border-rule animate-rule-print origin-left border-t-[3px]" />
      <dl className="bg-border grid grid-cols-2 gap-0.5 lg:grid-cols-4">
        <Total
          figure={totalIn.figure}
          label={t("squeezeTotalIn")}
          order={0}
          unit={totalIn.unit}
        />
        <Total
          figure={totalOut.figure}
          label={t("squeezeTotalOut")}
          order={1}
          unit={totalOut.unit}
        />
        <Total
          figure={saved.figure}
          label={t("squeezeTotalSaved")}
          order={2}
          tone={savedTone}
          unit={saved.unit}
        />
        <Total
          figure={reduction < 0 ? `−${Math.abs(reduction)}` : String(reduction)}
          label={t("squeezeTotalReduction")}
          order={3}
          tone={reductionTone}
          unit="%"
        />
      </dl>
    </section>
  );
};

interface BatchListProps {
  readonly batch: ReadonlyMap<string, BatchItem>;
  /** Whether a run has landed every row, so the totals can print. */
  readonly finished: boolean;
  readonly onDownload: (id: string) => void;
  readonly onDownloadPart: (id: string, format: ImageFormat) => void;
  readonly onRaiseTarget: () => void;
  readonly onRecompress: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onResize: () => void;
  readonly onTryFormat: () => void;
  readonly online: boolean;
  readonly results: ReadonlyMap<string, ItemResult>;
  readonly running: boolean;
  readonly settings: SqueezeSettings;
  readonly staleIds: ReadonlySet<string>;
  readonly summary: BatchSummary;
  readonly workingIds: ReadonlySet<string>;
}

/**
 * The Batch: one quiet row per image, and the totals once the run is done. An
 * empty Batch keeps the local poster: the numeral zero, a red slash, and one
 * line of words.
 */
export const SqueezeBatchList = ({
  batch,
  finished,
  onDownload,
  onDownloadPart,
  onRaiseTarget,
  onRecompress,
  onRemove,
  onResize,
  onTryFormat,
  online,
  results,
  running,
  settings,
  staleIds,
  summary,
  workingIds,
}: BatchListProps) => {
  const { t, locale } = useTranslation();

  if (batch.size === 0) {
    return (
      <>
        <h2 className="sr-only">{t("squeezeFilesHeading")}</h2>
        <div className="border-rule flex flex-col items-center justify-center border-2 px-4 py-10 text-center sm:px-6">
          <p className="num text-[clamp(4rem,12vw,7rem)] leading-none font-extrabold">
            0
          </p>
          <div
            aria-hidden="true"
            className="bg-red mt-4 h-3 w-44 -skew-x-[16deg]"
          />
          <p className="font-display mt-5 text-2xl font-black uppercase [font-stretch:75%]">
            {t("squeezeEmptyTitle")}
          </p>
          <p className="text-muted-fg mt-1 text-sm">{t("squeezeEmptyHint")}</p>
        </div>
      </>
    );
  }

  return (
    <div className="border-rule border-2">
      <h2 className="sr-only" id="squeeze-files-heading">
        {t("squeezeFilesHeading")}
      </h2>
      <ul aria-labelledby="squeeze-files-heading">
        {[...batch.entries()].map(([id, item]) => (
          <SqueezeItemRow
            id={id}
            item={item}
            key={id}
            locale={locale}
            onDownload={onDownload}
            onDownloadPart={onDownloadPart}
            onRaiseTarget={onRaiseTarget}
            onRecompress={onRecompress}
            onRemove={onRemove}
            onResize={onResize}
            onTryFormat={onTryFormat}
            online={online}
            problemFormat={problemFormatOf(settings, item, t)}
            result={results.get(id)}
            running={running}
            stale={staleIds.has(id)}
            working={workingIds.has(id)}
          />
        ))}
      </ul>
      {finished ? (
        <SqueezeBatchTotals locale={locale} summary={summary} />
      ) : null}
    </div>
  );
};
