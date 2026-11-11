"use client";

import { cn } from "cn";

import { formatBytes } from "@/core/utils/file-size";
import type {
  BatchItem,
  BatchSummary,
  ItemResult,
} from "@/features/cinch/cinch";
import { savedPercentOf } from "@/features/cinch/cinch";
import { CinchItemRow } from "@/features/cinch/components/cinch-item-row";
import { useTranslation } from "@/features/i18n/use-translation";

/** One total: the label over its figure. */
const Total = ({
  figure,
  label,
  tone = "text-fg",
}: {
  readonly figure: string;
  readonly label: string;
  readonly tone?: string;
}) => (
  <div className="bg-bg flex min-w-0 flex-col gap-y-3 px-3 py-4 sm:px-5 sm:py-5">
    <dt className="text-muted-fg text-xs/4 font-bold tracking-[0.14em] uppercase [font-stretch:87.5%]">
      {label}
    </dt>
    <dd
      className={cn(
        "num text-[clamp(1.5rem,3.2vw,2.5rem)] leading-none font-extrabold",
        tone
      )}
    >
      {figure}
    </dd>
  </div>
);

/** The totals of a finished run: in, out, saved, and the reduction. */
const CinchBatchTotals = ({ summary }: { readonly summary: BatchSummary }) => {
  const { t, locale } = useTranslation();
  const saved = summary.inputBytes - summary.outputBytes;
  const percent = savedPercentOf(summary.inputBytes, summary.outputBytes);
  const tone =
    saved > 0
      ? "text-success-subtle-fg"
      : saved < 0
        ? "text-warning-subtle-fg"
        : "text-fg";
  return (
    <section aria-labelledby="cinch-totals-heading">
      <h3 className="sr-only" id="cinch-totals-heading">
        {t("cinchTotalsHeading")}
      </h3>
      <div className="border-rule border-t-[3px]" />
      <dl className="bg-border grid grid-cols-2 gap-0.5 lg:grid-cols-4">
        <Total
          figure={formatBytes(summary.inputBytes, locale)}
          label={t("cinchTotalIn")}
        />
        <Total
          figure={formatBytes(summary.outputBytes, locale)}
          label={t("cinchTotalOut")}
        />
        <Total
          figure={formatBytes(Math.max(0, saved), locale)}
          label={t("cinchTotalSaved")}
          tone={saved > 0 ? "text-success-subtle-fg" : "text-fg"}
        />
        <Total
          figure={percent < 0 ? `−${Math.abs(percent)} %` : `${percent} %`}
          label={t("cinchTotalReduction")}
          tone={tone}
        />
      </dl>
    </section>
  );
};

interface BatchListProps {
  readonly batch: ReadonlyMap<string, BatchItem>;
  readonly finished: boolean;
  readonly onDownload: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly results: ReadonlyMap<string, ItemResult>;
  readonly staleIds: ReadonlySet<string>;
  readonly summary: BatchSummary;
  /** Progress of each video encoding now, from 0 to 1, keyed by id. */
  readonly working: ReadonlyMap<string, number>;
}

/**
 * The Batch: one quiet row per video, and the totals once the run is done.
 * An empty Batch keeps the same poster as Squeeze.
 */
export const CinchBatchList = ({
  batch,
  finished,
  onDownload,
  onRemove,
  results,
  staleIds,
  summary,
  working,
}: BatchListProps) => {
  const { t, locale } = useTranslation();

  if (batch.size === 0) {
    return (
      <>
        <h2 className="sr-only">{t("cinchFilesHeading")}</h2>
        <div className="border-rule flex flex-col items-center justify-center border-2 px-4 py-10 text-center sm:px-6">
          <p className="num text-[clamp(4rem,12vw,7rem)] leading-none font-extrabold">
            0
          </p>
          <div
            aria-hidden="true"
            className="bg-red mt-4 h-3 w-44 -skew-x-[16deg]"
          />
          <p className="font-display mt-5 text-2xl font-black uppercase [font-stretch:75%]">
            {t("cinchEmptyTitle")}
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="border-rule border-2">
      <h2 className="sr-only" id="cinch-files-heading">
        {t("cinchFilesHeading")}
      </h2>
      <ul aria-labelledby="cinch-files-heading">
        {[...batch.values()].map((item) => (
          <CinchItemRow
            item={item}
            key={item.id}
            locale={locale}
            onDownload={onDownload}
            onRemove={onRemove}
            progress={working.get(item.id) ?? null}
            result={results.get(item.id)}
            stale={staleIds.has(item.id)}
          />
        ))}
      </ul>
      {finished ? <CinchBatchTotals summary={summary} /> : null}
    </div>
  );
};
