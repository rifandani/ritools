"use client";

import { Button } from "@/core/components/ui/button";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { useTranslation } from "@/features/i18n/use-translation";
import type { BatchSummary, SqueezeSettings } from "@/features/squeeze/squeeze";
import { formatBytes } from "@/features/squeeze/squeeze";

interface RunBarProps {
  readonly canClear: boolean;
  readonly canDownload: boolean;
  readonly canRun: boolean;
  readonly batchTotalBytes: number;
  readonly onClear: () => void;
  readonly onDownloadAll: () => void;
  readonly onRun: () => void;
  readonly onStop: () => void;
  readonly onStopBeforeClear: () => void;
  readonly pendingCount: number;
  readonly running: boolean;
  readonly settings: SqueezeSettings;
  readonly staleCount: number;
  readonly summary: BatchSummary;
  readonly total: number;
}

const percentOf = (input: number, output: number): number => {
  if (input <= 0) {
    return 0;
  }
  const saved = Math.round(((input - output) / input) * 100);
  return saved > 0 ? -saved : Math.abs(saved);
};

const signed = (value: number): string => {
  if (value === 0) {
    return "0%";
  }
  return value < 0 ? `−${Math.abs(value)}%` : `+${value}%`;
};

/** One tally cell: the state word over its numeral, in a fixed column. */
const Tally = ({
  count,
  label,
}: {
  readonly count: number;
  readonly label: string;
}) => (
  <div className="flex min-w-0 items-baseline gap-x-1.5 whitespace-nowrap">
    <span className="text-xs leading-3 font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
      {label}
    </span>
    <span className="num text-sm leading-4 font-extrabold">{count}</span>
  </div>
);

/**
 * 04 Actions: the one red field. It prints the totals and the run marks, and
 * it stays at the bottom edge while the ledger scrolls, so the run never
 * leaves reach. Its top rule is the measure: it travels as rows land.
 */
export const SqueezeRunBar = ({
  batchTotalBytes,
  canClear,
  canDownload,
  canRun,
  onClear,
  onDownloadAll,
  onRun,
  onStop,
  onStopBeforeClear,
  pendingCount,
  running,
  settings,
  staleCount,
  summary,
  total,
}: RunBarProps) => {
  const { t, locale } = useTranslation();
  const settled = total - pendingCount;
  const progress = total === 0 ? 0 : Math.round((settled / total) * 100);
  const savedPercent = percentOf(summary.inputBytes, summary.outputBytes);
  const overBudget =
    settings.sizeMode === "batch-total" &&
    settled === total &&
    total > 0 &&
    summary.outputBytes > batchTotalBytes
      ? summary.outputBytes - batchTotalBytes
      : null;

  return (
    <section
      aria-label={t("squeezeActions")}
      className="ground-red border-rule sticky bottom-0 z-20 border-t-[3px]"
    >
      {running ? (
        <div
          aria-hidden="true"
          className="bg-primary absolute inset-x-0 top-0 h-1 transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      ) : null}

      <div className="px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="num bg-primary text-primary-fg grid size-6 place-content-center text-xs font-extrabold">
              04
            </span>
            <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
              {t("squeezeActions")}
            </span>
            {total === 0 ? null : (
              <span className="num text-xs">
                {t("squeezeUnderTargetSummary", {
                  total,
                  under: summary.underTarget,
                })}
                {summary.misses + summary.rejected > 0
                  ? ` · ${t("squeezeOverCount", {
                      count: summary.misses + summary.rejected,
                    })}`
                  : null}
                {overBudget === null
                  ? null
                  : ` · ${t("squeezeOverBudget", {
                      amount: formatBytes(overBudget, locale),
                    })}`}
              </span>
            )}
          </div>

          {total === 0 ? null : (
            <div className="hidden flex-wrap items-baseline gap-x-4 gap-y-1 sm:flex">
              <span className="flex items-baseline gap-x-1.5">
                <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
                  {t("squeezeColIn")}
                </span>
                <span className="num text-[0.75rem]">
                  {formatBytes(summary.inputBytes, locale)}
                </span>
              </span>
              <span className="flex items-baseline gap-x-1.5">
                <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
                  {t("squeezeColOut")}
                </span>
                <span className="num text-[0.75rem]">
                  {formatBytes(summary.outputBytes, locale)}
                </span>
              </span>
              <span className="flex items-baseline gap-x-1.5">
                <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
                  {t("squeezeColDelta")}
                </span>
                <span className="num text-[0.75rem]">
                  {signed(savedPercent)}
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          {total === 0 ? (
            <span aria-hidden="true" />
          ) : (
            <div className="grid grid-cols-3 gap-x-3 gap-y-1 sm:grid-cols-5 sm:gap-x-4">
              <Tally count={summary.done} label={t("squeezeStateDone")} />
              <Tally
                count={summary.alreadyFits}
                label={t("squeezeStateAlreadyFits")}
              />
              <Tally count={summary.misses} label={t("squeezeStateMiss")} />
              <Tally count={summary.bigger} label={t("squeezeStateBigger")} />
              <Tally
                count={summary.rejected}
                label={t("squeezeStateRejected")}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <Button
              className="max-sm:w-full"
              intent="primary"
              isDisabled={running ? false : !canRun}
              onPress={running ? onStop : onRun}
              size="sm"
            >
              {running
                ? t("squeezeCompressing", {
                    done: Math.max(0, settled),
                    total,
                  })
                : staleCount > 0
                  ? t("squeezeCompressAllStale", { count: staleCount })
                  : t("squeezeCompressAll")}
            </Button>
            <Button
              intent="outline"
              isDisabled={!canDownload}
              onPress={onDownloadAll}
              size="sm"
            >
              {t("squeezeDownloadAll")}
            </Button>
            <Modal
              onOpenChange={(open) => {
                if (open) {
                  onStopBeforeClear();
                }
              }}
            >
              <Button intent="plain" isDisabled={!canClear} size="sm">
                {t("squeezeClearAll")}
              </Button>
              <ModalContent size="sm">
                <ModalHeader title={t("squeezeClearTitle")} />
                <ModalBody>
                  <p className="text-sm/6">{t("squeezeClearBody")}</p>
                </ModalBody>
                <ModalFooter>
                  <ModalClose>{t("cancel")}</ModalClose>
                  <ModalClose intent="danger" onPress={onClear}>
                    {t("squeezeClearAll")}
                  </ModalClose>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </div>
        </div>

        {staleCount > 0 ? (
          <p className="mt-1.5 text-xs">{t("squeezeStaleHint")}</p>
        ) : null}
      </div>
    </section>
  );
};
