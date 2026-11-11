"use client";

import { useCallback } from "react";

import { Container } from "@/core/components/ui/container";
import { Note } from "@/core/components/ui/note";
import { useAgentActions } from "@/core/hooks/use-agent-actions";
import { useConfirmRequest } from "@/core/hooks/use-confirm-request";
import { CINCH_AGENT_ACTIONS } from "@/features/cinch/cinch.agent";
import type { CinchAgentController } from "@/features/cinch/cinch.agent";
import { CinchBatchList } from "@/features/cinch/components/cinch-batch-list";
import { CinchDropZone } from "@/features/cinch/components/cinch-drop-zone";
import { CinchExplainer } from "@/features/cinch/components/cinch-explainer";
import { CinchRunBar } from "@/features/cinch/components/cinch-run-bar";
import { CinchSettingsBar } from "@/features/cinch/components/cinch-settings-bar";
import { useCinch } from "@/features/cinch/use-cinch";
import type { DropStatus } from "@/features/cinch/use-cinch";
import { useTranslation } from "@/features/i18n/use-translation";

/** The status line under the drop zone: duplicates, skips, and a ZIP failure. */
const CinchStatus = ({
  status,
  zipFailed,
}: {
  readonly status: DropStatus;
  readonly zipFailed: boolean;
}) => {
  const { t } = useTranslation();
  const messages = [
    status.duplicates > 0
      ? t("cinchDuplicateCount", { count: status.duplicates })
      : null,
    status.skipped > 0
      ? t("cinchSkippedCount", { count: status.skipped })
      : null,
    zipFailed ? t("cinchZipFailed") : null,
  ].filter((message): message is string => message !== null);
  if (messages.length === 0) {
    return null;
  }
  return (
    <p aria-live="polite" className="text-muted-fg text-xs leading-4">
      {messages.join(" · ")}
    </p>
  );
};

/** Cinch: the whole Tool. The layout is the same as Squeeze. */
export const CinchPage = () => {
  const { t } = useTranslation();
  const cinch = useCinch();
  const {
    add,
    batch,
    canRun,
    clear,
    downloadAll,
    downloadOne,
    issues,
    pending,
    remove,
    results,
    run,
    running,
    setSettings,
    settings,
    staleIds,
    status,
    stop,
    summary,
    supported,
    working,
    writable,
    zipFailed,
  } = cinch;
  const clearConfirm = useConfirmRequest();

  const downloadable =
    summary.done + summary.alreadyFits + summary.misses + summary.bigger;
  const finished =
    !running && summary.total > 0 && pending.length === 0 && results.size > 0;

  /** Remove keeps the keyboard in the list: the next row's Remove, else the drop zone. */
  const removeRow = useCallback(
    (id: string) => {
      const ids = [...batch.keys()];
      const next = ids[ids.indexOf(id) + 1] ?? null;
      remove(id);
      requestAnimationFrame(() => {
        const target =
          next === null
            ? document.querySelector<HTMLElement>("#cinch-choose-files")
            : document.querySelector<HTMLElement>(
                `#cinch-remove-${CSS.escape(next)}`
              );
        target?.focus();
      });
    },
    [batch, remove]
  );

  const agentController: CinchAgentController = {
    batch,
    confirmClear: () => {
      if (running) {
        stop();
      }
      return clearConfirm.request();
    },
    downloadAll,
    downloadOne,
    pendingIds: new Set(pending.map((item) => item.id)),
    results,
    runRows: cinch.runRows,
    running,
    setSettings,
    settings,
    staleIds,
    stop,
    writable,
  };
  useAgentActions(CINCH_AGENT_ACTIONS, agentController);

  return (
    <Container className="flex max-w-none flex-col gap-y-10 py-8 sm:py-10">
      <h1 className="sr-only">{t("cinchName")}</h1>
      <div className="grid grid-cols-1 gap-y-5 lg:grid-cols-[25%_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-6">
        <div className="flex flex-col gap-y-3 lg:col-start-2 lg:row-start-1">
          {supported === false ? (
            <Note intent="danger">{t("cinchUnsupported")}</Note>
          ) : null}
          <CinchDropZone onFiles={add} />
          <CinchStatus status={status} zipFailed={zipFailed} />
        </div>

        <CinchSettingsBar
          count={batch.size}
          issues={issues}
          onChange={setSettings}
          settings={settings}
          writable={writable}
        />

        <div className="flex flex-col lg:col-start-2 lg:row-start-2">
          <CinchBatchList
            batch={batch}
            finished={finished}
            onDownload={downloadOne}
            onRemove={removeRow}
            results={results}
            staleIds={staleIds}
            summary={summary}
            working={working}
          />

          <CinchRunBar
            canClear={batch.size > 0}
            canDownload={downloadable > 0}
            canRun={canRun}
            clearConfirm={clearConfirm}
            onClear={() => {
              clear();
              requestAnimationFrame(() => {
                document
                  .querySelector<HTMLElement>("#cinch-choose-files")
                  ?.focus();
              });
            }}
            onDownloadAll={() => {
              void downloadAll();
            }}
            onRun={run}
            onStop={stop}
            pendingCount={pending.length}
            running={running}
            staleCount={staleIds.size}
            summary={summary}
          />
        </div>
      </div>

      <output aria-live="polite" className="sr-only">
        {finished
          ? t("cinchAnnounceDone", {
              done: summary.done + summary.alreadyFits,
              total: summary.total,
            })
          : null}
      </output>

      <CinchExplainer />
    </Container>
  );
};
