"use client";

/* oxlint-disable react/jsx-handler-names -- The controller exposes domain actions, not React handlers. */

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

  const hasBatch = controller.batch.length > 0;
  const { current } = controller;

  return (
    <Container className="flex max-w-none min-w-0 flex-col gap-y-10 py-8 sm:py-10">
      <header className="flex flex-col gap-y-3">
        <p className="font-display max-w-[24ch] text-[clamp(2.25rem,6vw,4.5rem)] leading-[0.92] font-black tracking-[0.01em] uppercase [font-stretch:75%]">
          {t("unmaskPromise")}
        </p>
        <p className="text-muted-fg max-w-[64ch] text-base/6 text-pretty">
          {t("unmaskDeck")}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="border-fg border-2 px-2 py-0.5 text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
            {t("unmaskLocal")}
          </span>
          <span className="text-muted-fg">{t("unmaskLocalNote")}</span>
        </p>
        <ul className="border-rule flex flex-col divide-y-2 border-t-2 border-b-2 sm:flex-row sm:divide-x-2 sm:divide-y-0">
          {(
            [
              "unmaskFactFormats",
              "unmaskFactModel",
              "unmaskFactLocal",
              "unmaskFactBatch",
            ] as const
          ).map((key) => (
            <li
              className="text-muted-fg flex-1 px-3 py-2 text-xs leading-4"
              key={key}
            >
              {t(key)}
            </li>
          ))}
        </ul>
      </header>

      {hasBatch ? null : (
        <>
          <UnmaskDropZone
            onFiles={addFiles}
            onSample={controller.loadSample}
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

      {controller.batch.length < 2 ? null : (
        <div className="flex flex-col gap-y-2">
          {current === null ? (
            <UnmaskSettingsBar
              className="mb-2"
              layout="bar"
              onChange={controller.changeSettings}
              settings={controller.settings}
            />
          ) : null}
          <UnmaskBatchList
            batch={controller.batch}
            folderPath={controller.folderPath}
            onDownload={controller.downloadOne}
            onOpen={controller.open}
            onRemove={removeRow}
            onRetry={controller.retry}
            skipped={controller.skipped}
          />
          <UnmaskRunBar
            batchTotal={controller.batch.length}
            canRun={controller.canRun}
            counts={controller.counts}
            downloadable={controller.downloadable}
            onCancel={controller.cancel}
            onClear={controller.clear}
            onDownloadAll={() => {
              void (async () => {
                const outcome = await controller.downloadAll();
                setZipState({
                  failed: outcome.failed,
                  leftOut: outcome.leftOut,
                });
              })();
            }}
            onRemoveAll={controller.removeAll}
            onRun={controller.run}
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
