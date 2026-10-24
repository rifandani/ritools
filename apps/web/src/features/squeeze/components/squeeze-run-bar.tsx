"use client";

import { HiArrowDownTray, HiBolt, HiStop } from "react-icons/hi2";

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

/** The run mark's icon: a bolt to start the run, a stop square to halt it. */
const RunIcon = ({ running }: { readonly running: boolean }) =>
  running ? <HiStop aria-hidden /> : <HiBolt aria-hidden />;

type Translate = ReturnType<typeof useTranslation>["t"];

/** How far a finished Batch total sits over its budget, or `null`. */
const overBudgetOf = (options: {
  readonly batchTotalBytes: number;
  readonly settings: SqueezeSettings;
  readonly settled: number;
  readonly summary: BatchSummary;
  readonly total: number;
}): number | null => {
  const { batchTotalBytes, settings, settled, summary, total } = options;
  if (settings.sizeMode !== "batch-total" || settled !== total || total === 0) {
    return null;
  }
  return summary.outputBytes > batchTotalBytes
    ? summary.outputBytes - batchTotalBytes
    : null;
};

/** The bar's notice line: the over count, the over budget, and a budget above inputs. */
const noticesOf = (options: {
  readonly batchTotalBytes: number;
  readonly locale: string;
  readonly settings: SqueezeSettings;
  readonly settled: number;
  readonly summary: BatchSummary;
  readonly t: Translate;
  readonly total: number;
}): string[] => {
  const { batchTotalBytes, locale, settings, settled, summary, t, total } =
    options;
  const over = summary.misses + summary.rejected;
  const overBudget = overBudgetOf({
    batchTotalBytes,
    settings,
    settled,
    summary,
    total,
  });
  return [
    over > 0 ? t("squeezeOverCount", { count: over }) : null,
    overBudget === null
      ? null
      : t("squeezeOverBudget", {
          amount: formatBytes(overBudget, locale),
        }),
    settings.sizeMode === "batch-total" &&
    total > 0 &&
    summary.inputBytes < batchTotalBytes
      ? t("squeezeBudgetAboveInputs")
      : null,
  ].filter((notice): notice is string => notice !== null);
};

const runLabelOf = (options: {
  readonly running: boolean;
  readonly settled: number;
  readonly staleCount: number;
  readonly t: Translate;
  readonly total: number;
}): string => {
  if (options.running) {
    return options.t("squeezeCompressing", {
      done: Math.max(0, options.settled),
      total: options.total,
    });
  }
  return options.staleCount > 0
    ? options.t("squeezeCompressAllStale", { count: options.staleCount })
    : options.t("squeezeCompressAll");
};

/**
 * 04 Actions: the one red field. It prints the run count and the run marks, and
 * it stays at the bottom edge while the ledger scrolls, so the run never
 * leaves reach. It meets the ledger's frame with no gap between them, and the
 * measure travels along its top edge as rows land.
 */
export const SqueezeRunBar = (props: RunBarProps) => {
  const {
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
  } = props;
  const { t, locale } = useTranslation();
  const settled = total - pendingCount;
  const progress = total === 0 ? 0 : Math.round((settled / total) * 100);
  const notices = noticesOf({
    batchTotalBytes,
    locale,
    settings,
    settled,
    summary,
    t,
    total,
  });

  return (
    <section
      aria-label={t("squeezeActions")}
      className="ground-red sticky bottom-0 z-20"
    >
      {running ? (
        <div
          aria-hidden="true"
          className="bg-primary absolute inset-x-0 top-0 h-1 origin-left transition-transform duration-500 ease-out"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      ) : null}

      <div className="px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="num bg-primary text-primary-fg grid size-6 place-content-center text-xs font-extrabold">
              04
            </span>
            <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
              {t("squeezeActions")}
            </span>
            {notices.length === 0 ? null : (
              <span className="num text-xs">{notices.join(" · ")}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <Button
              className="max-sm:w-full"
              intent="primary"
              isDisabled={running ? false : !canRun}
              onPress={running ? onStop : onRun}
              size="sm"
            >
              <RunIcon running={running} />
              {runLabelOf({ running, settled, staleCount, t, total })}
            </Button>
            <Button
              intent="outline"
              isDisabled={!canDownload}
              onPress={onDownloadAll}
              size="sm"
            >
              <HiArrowDownTray aria-hidden />
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
          <p aria-live="polite" className="mt-1.5 text-xs">
            {t("squeezeStaleHint")}
          </p>
        ) : null}
      </div>
    </section>
  );
};
