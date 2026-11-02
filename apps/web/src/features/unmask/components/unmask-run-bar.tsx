"use client";

import { HiArrowDownTray, HiScissors, HiStop } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import {
  ProgressBar,
  ProgressBarHeader,
  ProgressBarTrack,
  ProgressBarValue,
} from "@/core/components/ui/progress-bar";
import { useTranslation } from "@/features/i18n/use-translation";
import type { BatchCounts } from "@/features/unmask/unmask";
import { BATCH_WARN_BYTES } from "@/features/unmask/unmask.engine";

interface RunBarProps {
  readonly batchBytes: number;
  readonly batchTotal: number;
  readonly canRun: boolean;
  readonly counts: BatchCounts;
  readonly downloadable: number;
  readonly onCancel: () => void;
  readonly onClear: () => void;
  readonly onDownloadAll: () => void;
  readonly onRun: () => void;
  readonly running: boolean;
  readonly zipFailed: boolean;
  readonly zipLeftOut: number | null;
}

/** The batch's one action strip: run, cancel, clear, and the one ZIP. */
export const UnmaskRunBar = ({
  batchBytes,
  batchTotal,
  canRun,
  counts,
  downloadable,
  onCancel,
  onClear,
  onDownloadAll,
  onRun,
  running,
  zipFailed,
  zipLeftOut,
}: RunBarProps) => {
  const { t } = useTranslation();
  const settled = Math.max(0, batchTotal - counts.queued);
  const percent =
    batchTotal === 0 ? 0 : Math.round((settled / batchTotal) * 100);

  return (
    <section
      aria-label={t("unmaskBatchActions")}
      className="ground-red sticky bottom-0 z-20"
    >
      <div className="px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="num bg-primary text-primary-fg grid size-6 place-content-center text-xs font-extrabold">
              05
            </span>
            <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
              {t("unmaskBatchActions")}
            </span>
            {counts.stale > 0 ? (
              <span className="text-warning-subtle-fg text-xs font-semibold">
                {t("unmaskBatchStaleHint")}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
            <Button
              className="max-sm:w-full"
              id="unmask-run"
              intent="primary"
              isDisabled={running ? false : !canRun}
              onPress={running ? onCancel : onRun}
              size="sm"
            >
              {running ? <HiStop aria-hidden /> : <HiScissors aria-hidden />}
              {running ? t("unmaskCancel") : t("unmaskRemoveAllBackgrounds")}
            </Button>
            <Button
              intent="outline"
              isDisabled={downloadable === 0}
              onPress={onDownloadAll}
              size="sm"
            >
              <HiArrowDownTray aria-hidden />
              {t("unmaskDownloadAll")}
            </Button>
            <Modal>
              <Button intent="plain" isDisabled={batchTotal === 0} size="sm">
                {t("unmaskBatchClear")}
              </Button>
              <ModalContent size="sm">
                <ModalHeader title={t("unmaskBatchClearTitle")} />
                <ModalBody>
                  <p className="text-sm/6">{t("unmaskBatchClearBody")}</p>
                </ModalBody>
                <ModalFooter>
                  <ModalClose>{t("cancel")}</ModalClose>
                  <ModalClose intent="danger" onPress={onClear}>
                    {t("unmaskBatchClear")}
                  </ModalClose>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </div>
        </div>

        {running ? (
          <ProgressBar
            aria-label={t("unmaskRemoving")}
            className="mt-3"
            isIndeterminate={counts.queued === 0}
            value={counts.queued === 0 ? undefined : percent}
          >
            <ProgressBarHeader>
              <span>
                {t("unmaskBatchProgress", {
                  done: String(settled),
                  total: String(batchTotal),
                })}
              </span>
              <ProgressBarValue />
            </ProgressBarHeader>
            <ProgressBarTrack />
          </ProgressBar>
        ) : null}

        {batchBytes > BATCH_WARN_BYTES ? (
          <output className="text-warning-subtle-fg mt-1.5 block text-xs">
            {t("unmaskBatchWarnBytes")}
          </output>
        ) : null}

        {zipLeftOut !== null && zipLeftOut > 0 ? (
          <p className="mt-1.5 text-xs">
            {t("unmaskBatchZipLeftOut", { count: String(zipLeftOut) })}
          </p>
        ) : null}
        {zipFailed ? (
          <p className="mt-1.5 text-xs">{t("unmaskBatchZipFailed")}</p>
        ) : null}
      </div>
    </section>
  );
};
