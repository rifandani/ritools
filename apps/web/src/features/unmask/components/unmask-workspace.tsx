"use client";

import { cn } from "cn";
import { useCallback, useState } from "react";
import { HiArrowUturnLeft } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Note } from "@/core/components/ui/note";
import type { DroppedFile } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";
import { UnmaskBatchList } from "@/features/unmask/components/unmask-batch-list";
import { UnmaskDropZone } from "@/features/unmask/components/unmask-drop-zone";
import { UnmaskEditor } from "@/features/unmask/components/unmask-editor";
import { UnmaskRunBar } from "@/features/unmask/components/unmask-run-bar";
import { UnmaskSettingsBar } from "@/features/unmask/components/unmask-settings-bar";
import type { UnmaskController } from "@/features/unmask/use-unmask";

const focusRow = (id: string | null) => {
  requestAnimationFrame(() => {
    const row =
      id === null
        ? null
        : document.querySelector<HTMLElement>(
            `[data-unmask-open="${CSS.escape(id)}"]`
          );
    const target =
      row ??
      document.querySelector<HTMLElement>("#unmask-batch-heading") ??
      document.querySelector<HTMLElement>("#unmask-choose-files");
    target?.focus();
  });
};

/** The drop zone stays available in both the list and the image editor. */
export const UnmaskWorkspace = ({
  controller,
}: {
  readonly controller: UnmaskController;
}) => {
  const { t } = useTranslation();
  const [zipState, setZipState] = useState<{
    readonly failed: boolean;
    readonly leftOut: number | null;
  }>({ failed: false, leftOut: null });
  const handleAddFiles = controller.addFiles;
  const addFiles = useCallback(
    (files: readonly DroppedFile[]) => {
      setZipState({ failed: false, leftOut: null });
      handleAddFiles(files);
    },
    [handleAddFiles]
  );
  const removeRow = (id: string) => {
    const ids = controller.batch.map((item) => item.id);
    const index = ids.indexOf(id);
    const next = ids[index + 1] ?? ids[index - 1] ?? null;
    controller.remove(id);
    focusRow(next);
  };
  const handleBackToBatch = () => {
    const id = controller.current?.id ?? null;
    controller.open(null);
    focusRow(id);
  };
  const hasFiles = controller.batch.length > 0;
  const { current } = controller;
  const showList = hasFiles && current === null;
  const handleDownload = controller.downloadOne;
  const handleOpen = controller.open;
  const handleRetry = controller.retry;
  const handleCancel = controller.cancel;
  const handleClear = controller.clear;
  const handleRun = controller.run;
  const handleSample = controller.loadSample;
  const handleChangeSettings = controller.changeSettings;

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-1",
        showList
          ? "gap-y-5 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-6"
          : "gap-y-10"
      )}
      data-unmask-workspace=""
    >
      <div
        className={cn("min-w-0", showList && "lg:col-start-2 lg:row-start-1")}
      >
        <UnmaskDropZone
          compact={hasFiles}
          isDisabled={controller.running}
          onFiles={addFiles}
          onSample={handleSample}
          sampleFailed={controller.sampleFailed}
        />
      </div>
      {!hasFiles && controller.skipped > 0 ? (
        <Note intent="info">
          {t("unmaskSkipped", { count: controller.skipped })}
        </Note>
      ) : null}

      {showList ? (
        <>
          <div className="flex min-w-0 flex-col lg:col-start-2 lg:row-start-2">
            <UnmaskBatchList
              batch={controller.batch}
              folderPath={controller.folderPath}
              onDownload={handleDownload}
              onOpen={handleOpen}
              onRemove={removeRow}
              onRetry={handleRetry}
              skipped={controller.skipped}
            />
            <UnmaskRunBar
              batchBytes={controller.batchBytes}
              batchTotal={controller.batch.length}
              canRun={controller.canRun}
              counts={controller.counts}
              downloadable={controller.downloadable}
              onCancel={handleCancel}
              onClear={handleClear}
              onDownloadAll={() => {
                void (async () => {
                  setZipState(await controller.downloadAll());
                })();
              }}
              onRun={handleRun}
              running={controller.running}
              zipFailed={zipState.failed}
              zipLeftOut={zipState.leftOut}
            />
          </div>
          <UnmaskSettingsBar
            className="min-w-0 self-start lg:col-start-1 lg:row-span-2 lg:row-start-1"
            onChange={handleChangeSettings}
            settings={controller.settings}
            summary={t("unmaskBatchCount", { count: controller.batch.length })}
          />
        </>
      ) : null}

      {current === null ? null : (
        <div className="flex min-w-0 flex-col gap-6">
          <Button
            className="self-start"
            intent="outline"
            onPress={handleBackToBatch}
            size="md"
          >
            <HiArrowUturnLeft aria-hidden />
            {t("unmaskBackToBatch")}
          </Button>
          <UnmaskEditor
            controller={controller}
            item={current}
            key={current.id}
            onBackToBatch={handleBackToBatch}
          />
        </div>
      )}
    </div>
  );
};
