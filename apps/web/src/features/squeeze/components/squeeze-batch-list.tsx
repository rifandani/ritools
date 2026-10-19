"use client";

import { Button } from "@/core/components/ui/button";
import { Card } from "@/core/components/ui/card";
import { useTranslation } from "@/features/i18n/use-translation";
import { SqueezeItemRow } from "@/features/squeeze/components/squeeze-item-row";
import type {
  BatchItem,
  BatchSummary,
  ItemResult,
} from "@/features/squeeze/squeeze";
import { formatBytes } from "@/features/squeeze/squeeze";

interface BatchListProps {
  readonly batch: ReadonlyMap<string, BatchItem>;
  readonly onClear: () => void;
  readonly onDownload: (id: string) => void;
  readonly onDownloadAll: () => void;
  readonly onRemove: (id: string) => void;
  readonly onTarget: (id: string, targetBytes: number | null) => void;
  readonly results: ReadonlyMap<string, ItemResult>;
  readonly summary: BatchSummary;
  readonly targetBytes: number;
}

/** The Batch: one row per image, and the totals above them. */
export const SqueezeBatchList = ({
  batch,
  onClear,
  onDownload,
  onDownloadAll,
  onRemove,
  onTarget,
  results,
  summary,
  targetBytes,
}: BatchListProps) => {
  const { t, locale } = useTranslation();

  if (batch.size === 0) {
    return null;
  }

  const savedBytes = Math.max(0, summary.inputBytes - summary.outputBytes);

  return (
    <Card className="gap-y-0 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-sm font-medium tabular-nums">
            {t("squeezeImageCount", { count: summary.total })}
          </p>
          <p className="text-muted-fg text-xs tabular-nums">
            {t("squeezeDoneCount", { count: summary.done })}
          </p>
          {savedBytes > 0 ? (
            <p className="text-success text-xs tabular-nums">
              {t("squeezeSavedTotal", {
                amount: formatBytes(savedBytes, locale),
              })}
            </p>
          ) : null}
          {summary.misses > 0 ? (
            <p className="text-warning text-xs tabular-nums">
              {t("squeezeMissCount", { count: summary.misses })}
            </p>
          ) : null}
          {summary.rejected > 0 ? (
            <p className="text-danger text-xs tabular-nums">
              {t("squeezeRejectedCount", { count: summary.rejected })}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-x-2">
          <Button intent="outline" onPress={onClear} size="sm">
            {t("squeezeClear")}
          </Button>
          <Button intent="primary" onPress={onDownloadAll} size="sm">
            {t("squeezeDownloadAll")}
          </Button>
        </div>
      </div>

      <ul className="mt-3">
        {[...batch.entries()].map(([id, item]) => (
          <SqueezeItemRow
            id={id}
            item={item}
            key={id}
            locale={locale}
            onDownload={onDownload}
            onRemove={onRemove}
            onTarget={onTarget}
            result={results.get(id)}
            usesBatchTarget={targetBytes}
          />
        ))}
      </ul>
    </Card>
  );
};
