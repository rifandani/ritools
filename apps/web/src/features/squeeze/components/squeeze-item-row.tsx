"use client";

import { Button } from "@/core/components/ui/button";
import { Loader } from "@/core/components/ui/loader";
import { useTranslation } from "@/features/i18n/use-translation";
import type {
  BatchItem,
  ItemResult,
  RowState,
} from "@/features/squeeze/squeeze";
import {
  BYTES_PER_KB,
  formatBytes,
  MAX_TARGET_BYTES,
  MIN_TARGET_BYTES,
  problemKey,
  rowStateKey,
  rowViewOf,
} from "@/features/squeeze/squeeze";

interface ItemRowProps {
  readonly id: string;
  readonly item: BatchItem;
  readonly locale: string;
  readonly onDownload: (id: string) => void;
  readonly onRemove: (id: string) => void;
  readonly onTarget: (id: string, targetBytes: number | null) => void;
  readonly result: ItemResult | undefined;
  readonly usesBatchTarget: number;
}

const STATE_TONE = {
  compressed: "text-success",
  miss: "text-warning",
  rejected: "text-danger",
  "under-target": "text-muted-fg",
  working: "text-muted-fg",
} as const satisfies Record<RowState, string>;

const targetFieldClass =
  "h-8 w-20 rounded-lg border border-border bg-bg px-2 text-xs tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** One image of the Batch: what came in, what went out, and its state. */
export const SqueezeItemRow = ({
  id,
  item,
  locale,
  onDownload,
  onRemove,
  onTarget,
  result,
  usesBatchTarget,
}: ItemRowProps) => {
  const { t } = useTranslation();
  const view = rowViewOf(item, result);
  const finished = view.state !== "working";

  return (
    <li className="border-border grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="text-muted-fg flex flex-wrap items-center gap-x-2 text-xs">
          <span className={`font-medium ${STATE_TONE[view.state]}`}>
            {t(rowStateKey(view.state))}
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {formatBytes(item.size, locale)}
            {view.size === null || view.size === item.size
              ? null
              : ` → ${formatBytes(view.size, locale)}`}
          </span>
          {view.saved > 0 ? (
            <span className="text-success tabular-nums">
              {t("squeezeSaved", { percent: view.saved })}
            </span>
          ) : null}
          {view.dimension === null ? null : (
            <span className="tabular-nums">{view.dimension}</span>
          )}
          {view.resized ? <span>{t("squeezeResized")}</span> : null}
          {view.reducedColors ? <span>{t("squeezeReducedColors")}</span> : null}
        </p>
        {view.problem === null ? null : (
          <p className="text-danger text-xs">{t(problemKey(view.problem))}</p>
        )}
      </div>

      <div className="flex items-center gap-x-2">
        {finished ? (
          <>
            <label className="sr-only" htmlFor={`squeeze-target-${id}`}>
              {t("squeezeOverride")}
            </label>
            <input
              className={targetFieldClass}
              id={`squeeze-target-${id}`}
              inputMode="numeric"
              max={MAX_TARGET_BYTES / BYTES_PER_KB}
              min={MIN_TARGET_BYTES / BYTES_PER_KB}
              onChange={(event) => {
                const kb = Number(event.target.value);
                onTarget(
                  id,
                  event.target.value === "" || !Number.isFinite(kb)
                    ? null
                    : Math.round(kb * BYTES_PER_KB)
                );
              }}
              placeholder={String(Math.round(usesBatchTarget / BYTES_PER_KB))}
              title={t("squeezeOverrideHint")}
              type="number"
              value={
                item.targetBytes === null
                  ? ""
                  : Math.round(item.targetBytes / BYTES_PER_KB)
              }
            />
            <Button intent="outline" onPress={() => onDownload(id)} size="sm">
              {t("squeezeDownload")}
            </Button>
            <Button intent="plain" onPress={() => onRemove(id)} size="sm">
              {t("squeezeRemove")}
            </Button>
          </>
        ) : (
          <Loader aria-label={t("squeezeWorking")} />
        )}
      </div>
    </li>
  );
};
