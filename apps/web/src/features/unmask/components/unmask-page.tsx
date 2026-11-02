"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { Container } from "@/core/components/ui/container";
import { Note } from "@/core/components/ui/note";
import type { DroppedFile } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";
import { UnmaskBatchList } from "@/features/unmask/components/unmask-batch-list";
import { UnmaskDropZone } from "@/features/unmask/components/unmask-drop-zone";
import { UnmaskEditor } from "@/features/unmask/components/unmask-editor";
import { UnmaskExplainer } from "@/features/unmask/components/unmask-explainer";
import { UnmaskRunBar } from "@/features/unmask/components/unmask-run-bar";
import { UnmaskSettingsBar } from "@/features/unmask/components/unmask-settings-bar";
import { UnmaskStateGallery } from "@/features/unmask/components/unmask-state-gallery";
import { useUnmask } from "@/features/unmask/use-unmask";

interface PageFlags {
  readonly ready: boolean;
  readonly showStates: boolean;
}

const SERVER_FLAGS: PageFlags = { ready: false, showStates: false };
let clientFlags: PageFlags | null = null;

const noopSubscribe = () => () => {
  // No external store changes after hydration.
};
const readClientFlags = (): PageFlags => {
  clientFlags ??= {
    ready: true,
    showStates:
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get("states") === "1",
  };
  return clientFlags;
};
const readServerFlags = (): PageFlags => SERVER_FLAGS;

const visible = (element: HTMLElement) => element.offsetParent !== null;

const focusNextRow = (id: string) => {
  requestAnimationFrame(() => {
    const target =
      [
        ...document.querySelectorAll<HTMLElement>(
          `[data-unmask-open="${CSS.escape(id)}"]`
        ),
      ].find(visible) ??
      document.querySelector<HTMLElement>("#unmask-batch-heading");
    target?.focus();
  });
};

/** Unmask: the local cutting room. */
export const UnmaskPage = () => {
  const { t } = useTranslation();
  const controller = useUnmask();
  const { ready, showStates } = useSyncExternalStore(
    noopSubscribe,
    readClientFlags,
    readServerFlags
  );
  const [zipState, setZipState] = useState<{
    readonly failed: boolean;
    readonly leftOut: number | null;
  }>({ failed: false, leftOut: null });

  const addFiles = useCallback(
    (files: readonly DroppedFile[]) => {
      setZipState({ failed: false, leftOut: null });
      controller.addFiles(files);
    },
    [controller]
  );

  const removeRow = useCallback(
    (id: string) => {
      const ids = controller.batch.map((item) => item.id);
      const index = ids.indexOf(id);
      const next = ids[index + 1] ?? ids[index - 1] ?? null;
      controller.remove(id);
      if (next === null) {
        requestAnimationFrame(() => {
          document.querySelector<HTMLElement>("#unmask-choose-files")?.focus();
        });
        return;
      }
      focusNextRow(next);
    },
    [controller]
  );

  if (showStates && ready) {
    return (
      <Container className="flex max-w-none min-w-0 flex-col py-8 sm:py-10">
        <UnmaskStateGallery />
      </Container>
    );
  }

  const handleCancel = controller.cancel;
  const handleChangeSettings = controller.changeSettings;
  const handleClear = controller.clear;
  const handleDownloadOne = controller.downloadOne;
  const handleOpen = controller.open;
  const handleRemoveAll = controller.removeAll;
  const handleRetry = controller.retry;
  const handleRun = controller.run;
  const handleSample = controller.loadSample;

  const hasBatch = controller.batch.length > 0;
  const { current } = controller;

  return (
    <Container className="flex max-w-none min-w-0 flex-col gap-y-10 py-8 sm:py-10">
      {hasBatch ? null : (
        <>
          <UnmaskDropZone
            onFiles={addFiles}
            onSample={handleSample}
            sampleFailed={controller.sampleFailed}
          />
          {controller.skipped > 0 ? (
            <Note intent="info">
              {t("unmaskSkipped", { count: controller.skipped })}
            </Note>
          ) : null}
        </>
      )}

      {current === null ? null : (
        <UnmaskEditor controller={controller} item={current} key={current.id} />
      )}

      {current !== null || controller.batch.length < 2 ? null : (
        <>
          <UnmaskSettingsBar
            className="mb-2"
            onChange={handleChangeSettings}
            settings={controller.settings}
          />
          <UnmaskBatchList
            batch={controller.batch}
            folderPath={controller.folderPath}
            onDownload={handleDownloadOne}
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
                const outcome = await controller.downloadAll();
                setZipState({
                  failed: outcome.failed,
                  leftOut: outcome.leftOut,
                });
              })();
            }}
            onRemoveAll={handleRemoveAll}
            onRun={handleRun}
            running={controller.running}
            zipFailed={zipState.failed}
            zipLeftOut={zipState.leftOut}
          />
        </>
      )}

      {current === null || controller.batch.length < 2 ? null : (
        <div className="flex flex-col gap-y-2">
          <UnmaskBatchList
            batch={controller.batch}
            folderPath={controller.folderPath}
            onDownload={handleDownloadOne}
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
                const outcome = await controller.downloadAll();
                setZipState({
                  failed: outcome.failed,
                  leftOut: outcome.leftOut,
                });
              })();
            }}
            onRemoveAll={handleRemoveAll}
            onRun={handleRun}
            running={controller.running}
            zipFailed={zipState.failed}
            zipLeftOut={zipState.leftOut}
          />
        </div>
      )}

      <output aria-live="polite" className="sr-only">
        {controller.announcement}
      </output>

      <UnmaskExplainer />
    </Container>
  );
};
