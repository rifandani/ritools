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
import type { ConfirmHandle } from "@/core/hooks/use-confirm-request";
import type { BatchSummary } from "@/features/cinch/cinch";
import { useTranslation } from "@/features/i18n/use-translation";

interface RunBarProps {
  readonly canClear: boolean;
  readonly canDownload: boolean;
  readonly canRun: boolean;
  readonly clearConfirm: ConfirmHandle;
  readonly onClear: () => void;
  readonly onDownloadAll: () => void;
  readonly onRun: () => void;
  readonly onStop: () => void;
  readonly pendingCount: number;
  readonly running: boolean;
  readonly staleCount: number;
  readonly summary: BatchSummary;
}

/**
 * 04 Actions: the one red field, as in Squeeze. It stays at the bottom edge
 * while the Batch scrolls, so the run never leaves reach.
 */
export const CinchRunBar = ({
  canClear,
  canDownload,
  canRun,
  clearConfirm,
  onClear,
  onDownloadAll,
  onRun,
  onStop,
  pendingCount,
  running,
  staleCount,
  summary,
}: RunBarProps) => {
  const { t } = useTranslation();
  const { total } = summary;
  const settled = Math.max(0, total - pendingCount);
  const over = summary.misses + summary.rejected;
  const progress = total === 0 ? 0 : settled / total;
  const label = running
    ? t("cinchCompressing", { done: settled, total })
    : staleCount > 0
      ? t("cinchCompressAllStale", { count: staleCount })
      : t("cinchCompressAll");

  return (
    <section
      aria-label={t("cinchActions")}
      className="ground-red sticky bottom-0 z-20"
    >
      {running ? (
        <div
          aria-hidden="true"
          className="bg-primary absolute inset-x-0 top-0 h-1 origin-left transition-transform duration-500 ease-out"
          style={{ transform: `scaleX(${progress})` }}
        />
      ) : null}

      <div className="px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="num bg-primary text-primary-fg grid size-6 place-content-center text-xs font-extrabold">
              04
            </span>
            <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
              {t("cinchActions")}
            </span>
            {over > 0 ? (
              <span className="num text-xs">
                {t("cinchOverCount", { count: over })}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <Button
              className="max-sm:w-full"
              intent="primary"
              isDisabled={running ? false : !canRun}
              onPress={running ? onStop : onRun}
              size="sm"
            >
              {running ? <HiStop aria-hidden /> : <HiBolt aria-hidden />}
              {label}
            </Button>
            <Button
              intent="outline"
              isDisabled={!canDownload || running}
              onPress={onDownloadAll}
              size="sm"
            >
              <HiArrowDownTray aria-hidden />
              {t("cinchDownloadAll")}
            </Button>
            <Modal
              isOpen={clearConfirm.isOpen}
              onOpenChange={(open) => {
                if (open && running) {
                  onStop();
                }
                clearConfirm.onOpenChange(open);
              }}
            >
              <Button intent="plain" isDisabled={!canClear} size="sm">
                {t("cinchClearAll")}
              </Button>
              <ModalContent size="sm">
                <ModalHeader title={t("cinchClearTitle")} />
                <ModalBody>
                  <p className="text-sm/6">{t("cinchClearBody")}</p>
                </ModalBody>
                <ModalFooter>
                  <ModalClose>{t("cancel")}</ModalClose>
                  <ModalClose
                    intent="danger"
                    onPress={() => {
                      clearConfirm.confirm();
                      onClear();
                    }}
                  >
                    {t("cinchClearAll")}
                  </ModalClose>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </div>
        </div>

        {staleCount > 0 ? (
          <p aria-live="polite" className="mt-1.5 text-xs">
            {t("cinchStaleHint")}
          </p>
        ) : null}
      </div>
    </section>
  );
};
