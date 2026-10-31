"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { Button } from "@/core/components/ui/button";
import { Container } from "@/core/components/ui/container";
import { Note } from "@/core/components/ui/note";
import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";
import { SqueezeBatchList } from "@/features/squeeze/components/squeeze-batch-list";
import { SqueezeDropZone } from "@/features/squeeze/components/squeeze-drop-zone";
import { SqueezeExplainer } from "@/features/squeeze/components/squeeze-explainer";
import { SqueezeRunBar } from "@/features/squeeze/components/squeeze-run-bar";
import { SqueezeSettingsBar } from "@/features/squeeze/components/squeeze-settings-bar";
import { SqueezeStateGallery } from "@/features/squeeze/components/squeeze-state-gallery";
import { allCodecOffline } from "@/features/squeeze/squeeze";
import type {
  ItemResult,
  OutputFormat,
  SqueezeSettings,
} from "@/features/squeeze/squeeze";
import { useSqueeze } from "@/features/squeeze/use-squeeze";

const OUTPUT_KEY = {
  avif: "squeezeOutputAvif",
  jpeg: "squeezeOutputJpeg",
  keep: "squeezeOutputKeep",
  multi: "squeezeOutputMulti",
  png: "squeezeOutputPng",
  webp: "squeezeOutputWebp",
} as const;

/** Browser-only flags: false in the server render, then true after hydration. */
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

/** The watcher's marks: only a hydrated client can show or withhold them. */
const watchMarksOf = (ready: boolean, watch: null | (() => Promise<void>)) =>
  ready
    ? { reason: watch === null, supported: watch !== null }
    : { reason: false, supported: false };

const countWords = (counts: readonly number[]): number =>
  counts.reduce((sum, count) => sum + count, 0);

/** The field a next-action should land in, focused and selected. */
const focusField = (id: string) => {
  const field = document.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (field instanceof HTMLInputElement) {
    field.focus();
    field.select();
    return;
  }
  field?.focus();
};

type Translate = ReturnType<typeof useTranslation>["t"];

const quarterOf = (settled: number, total: number): number =>
  total === 0 ? 0 : Math.min(4, Math.floor((settled / total) * 4));

const finishedOf = (
  running: boolean,
  total: number,
  pendingCount: number,
  resultCount: number
): boolean => !running && total > 0 && pendingCount === 0 && resultCount > 0;

const offlineAllOf = (
  results: ReadonlyMap<string, ItemResult>,
  settings: SqueezeSettings
): boolean =>
  results.size > 0 &&
  settings.outputFormat !== "multi" &&
  allCodecOffline(results);

/** The status line's words, in a fixed order. */
const messagesOf = (
  options: {
    readonly leftOut: number | null;
    readonly status: {
      readonly duplicates: number;
      readonly skipped: number;
      readonly watched: number;
    };
    readonly zipFailed: boolean;
  },
  t: Translate
): string[] =>
  [
    options.status.duplicates > 0
      ? t("squeezeDuplicateCount", { count: options.status.duplicates })
      : null,
    options.status.skipped > 0
      ? t("squeezeSkippedCount", { count: options.status.skipped })
      : null,
    options.status.watched > 0
      ? t("squeezeWatchedCount", { count: options.status.watched })
      : null,
    options.leftOut !== null && options.leftOut > 0
      ? t("squeezeZipLeftOut", { count: options.leftOut })
      : null,
    options.zipFailed ? t("squeezeZipFailed") : null,
  ].filter((message): message is string => message !== null);

/** The codec-offline note for a Batch that lost every format it could use. */
const OfflineAllNote = ({ format }: { readonly format: OutputFormat }) => {
  const { t } = useTranslation();
  return (
    <Note aria-live="polite" className="mt-3" intent="danger">
      {t("squeezeCodecOfflineAll", { format: t(OUTPUT_KEY[format]) })}
    </Note>
  );
};

/** The status counts and the watch refusal. */
const SqueezeStatus = ({
  messages,
  watchDenied,
  watchRevoked,
}: {
  readonly messages: readonly string[];
  readonly watchDenied: boolean;
  readonly watchRevoked: boolean;
}) => {
  const { t } = useTranslation();
  if (
    messages.length === 0 &&
    watchDenied === false &&
    watchRevoked === false
  ) {
    return null;
  }
  return (
    <p aria-live="polite" className="text-muted-fg text-xs leading-4">
      {messages.map((message, index) => (
        <span key={message}>
          {index === 0 ? null : " · "}
          {message}
        </span>
      ))}
      {watchDenied || watchRevoked ? (
        <span className="text-danger-subtle-fg font-semibold">
          {messages.length === 0 ? null : " · "}
          {watchDenied ? t("squeezeWatchDenied") : t("squeezeWatchRevoked")}
        </span>
      ) : null}
    </p>
  );
};

/** The all-miss block: no image reached the target. */
const AllMissNote = ({
  misses,
  onRaiseTarget,
  onResize,
  onTryAvif,
  outputFormat,
  total,
  underTarget,
}: {
  readonly misses: number;
  readonly onRaiseTarget: () => void;
  readonly onResize: () => void;
  readonly onTryAvif: () => void;
  readonly outputFormat: OutputFormat;
  readonly total: number;
  readonly underTarget: number;
}) => {
  const { t } = useTranslation();
  if (total === 0 || misses === 0 || underTarget > 0) {
    return null;
  }
  return (
    <div className="mt-4 flex flex-col gap-y-2">
      <Ransom as="p" className="text-[clamp(2rem,5vw,3.25rem)]">
        {t("squeezeStateMiss")}
      </Ransom>
      <Note intent="warning">
        <p>{t("squeezeAllMiss")}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button intent="outline" onPress={onRaiseTarget} size="xs">
            {t("squeezeActionRaiseTarget")}
          </Button>
          <Button intent="plain" onPress={onResize} size="xs">
            {t("squeezeActionResize")}
          </Button>
          {outputFormat === "avif" ? null : (
            <Button intent="plain" onPress={onTryAvif} size="xs">
              {t("squeezeActionTryAvif")}
            </Button>
          )}
        </div>
      </Note>
    </div>
  );
};

/** The polite live region for the run's progress or result. */
const SqueezeAnnouncement = ({
  over,
  quarter,
  running,
  settled,
  total,
  underTarget,
}: {
  readonly over: number;
  readonly quarter: number;
  readonly running: boolean;
  readonly settled: number;
  readonly total: number;
  readonly underTarget: number;
}) => {
  const { t } = useTranslation();
  const summary = t("squeezeUnderTargetSummary", { total, under: underTarget });
  return (
    <output aria-live="polite" className="sr-only">
      {running
        ? quarter > 0
          ? t("squeezeAnnounceProgress", { percent: quarter * 25 })
          : null
        : settled > 0
          ? over > 0
            ? `${summary} · ${t("squeezeOverCount", { count: over })}`
            : summary
          : null}
    </output>
  );
};

/** Squeeze: the whole Tool. */
export const SqueezePage = () => {
  const { t } = useTranslation();
  const {
    add,
    batch,
    canRun,
    clear,
    downloadAll,
    downloadOne,
    downloadPart,
    issues,
    online,
    pending,
    recompress,
    remove,
    results,
    run,
    running,
    setSettings,
    settings,
    staleIds,
    startWatch,
    status,
    stop,
    stopWatching,
    summary,
    watching,
    working,
  } = useSqueeze();
  const [zipState, setZipState] = useState<{
    readonly failed: boolean;
    readonly leftOut: number | null;
  }>({ failed: false, leftOut: null });
  // Both flags are client-only. The server snapshot is false, so the markup
  // matches on hydration; the client snapshot then turns each flag on.
  const { ready, showStates } = useSyncExternalStore(
    noopSubscribe,
    readClientFlags,
    readServerFlags
  );
  const { failed: zipFailed, leftOut } = zipState;

  const { underTarget, total } = summary;
  const settled = Math.max(0, total - pending.length);
  const quarter = quarterOf(settled, total);
  const downloadable = countWords([
    summary.done,
    summary.alreadyFits,
    summary.misses,
    summary.bigger,
  ]);
  // The totals print once a run has landed every row under the settings in force.
  const finished = finishedOf(running, total, pending.length, results.size);
  const offlineAll = offlineAllOf(results, settings);
  const watchMarks = watchMarksOf(ready, startWatch);

  const raiseTarget = useCallback(() => {
    if (settings.sizeMode === "batch-total") {
      focusField("squeeze-batch-budget");
      return;
    }
    if (settings.sizeMode === "per-image") {
      focusField("squeeze-target");
    }
  }, [settings.sizeMode]);

  const focusResize = useCallback(() => {
    focusField("squeeze-maxWidth");
  }, []);

  const tryFormat = useCallback(() => {
    const field =
      document.querySelector<HTMLElement>(
        "#squeeze-output-format [data-selected]"
      ) ??
      document.querySelector<HTMLElement>("#squeeze-output-format [role=row]");
    field?.scrollIntoView({ block: "center" });
    field?.focus();
  }, []);

  const tryAvif = useCallback(() => {
    setSettings({ ...settings, outputFormat: "avif" });
  }, [setSettings, settings]);

  /** Remove keeps the keyboard in the ledger: next row's Remove, else the drop zone. */
  const removeRow = useCallback(
    (id: string) => {
      const ids = [...batch.keys()];
      const next = ids[ids.indexOf(id) + 1] ?? null;
      remove(id);
      requestAnimationFrame(() => {
        const target =
          next === null
            ? document.querySelector<HTMLElement>("#squeeze-choose-files")
            : document.querySelector<HTMLElement>(
                `#squeeze-remove-${CSS.escape(next)}`
              );
        target?.focus();
      });
    },
    [batch, remove]
  );

  const messages = messagesOf({ leftOut, status, zipFailed }, t);

  if (showStates) {
    return <SqueezeStateGallery />;
  }

  return (
    <Container className="flex max-w-none flex-col gap-y-10 py-8 sm:py-10">
      <p className="text-muted-fg max-w-[56ch] text-base/6 text-pretty">
        {t("squeezeTagline")}
      </p>
      <div className="grid grid-cols-1 gap-y-5 lg:grid-cols-[25%_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-6">
        <div className="flex flex-col gap-y-3 lg:col-start-2 lg:row-start-1">
          <SqueezeDropZone
            onFiles={add}
            onWatchToggle={() => {
              if (watching) {
                stopWatching();
                return;
              }
              void startWatch?.();
            }}
            showWatchReason={watchMarks.reason}
            watchSupported={watchMarks.supported}
            watching={watching}
          />
          <SqueezeStatus
            messages={messages}
            watchDenied={status.watchDenied}
            watchRevoked={status.watchRevoked}
          />
        </div>

        <SqueezeSettingsBar
          items={[...batch.values()]}
          issues={issues}
          onChange={setSettings}
          settings={settings}
        />

        <div className="flex flex-col lg:col-start-2 lg:row-start-2">
          <SqueezeBatchList
            batch={batch}
            finished={finished}
            onDownload={downloadOne}
            onDownloadPart={downloadPart}
            onRaiseTarget={raiseTarget}
            onRecompress={recompress}
            onRemove={removeRow}
            onResize={focusResize}
            onTryFormat={tryFormat}
            online={online}
            results={results}
            running={running}
            settings={settings}
            staleIds={staleIds}
            summary={summary}
            workingIds={working}
          />

          <AllMissNote
            misses={summary.misses}
            onRaiseTarget={raiseTarget}
            onResize={focusResize}
            onTryAvif={tryAvif}
            outputFormat={settings.outputFormat}
            total={total}
            underTarget={underTarget}
          />

          {offlineAll && <OfflineAllNote format={settings.outputFormat} />}

          <SqueezeRunBar
            batchTotalBytes={settings.batchTotalBytes}
            canClear={results.size > 0}
            canDownload={downloadable > 0}
            canRun={canRun}
            onClear={() => {
              setZipState({ failed: false, leftOut: null });
              clear();
              // The Clear mark disables itself once the Batch is empty, so the
              // focus it restored would land on nothing. Send it to the way in.
              requestAnimationFrame(() => {
                document
                  .querySelector<HTMLElement>("#squeeze-choose-files")
                  ?.focus();
              });
            }}
            onDownloadAll={() => {
              void (async () => {
                const outcome = await downloadAll();
                setZipState({
                  failed: outcome.failed,
                  leftOut: outcome.leftOut,
                });
              })();
            }}
            onRun={run}
            onStop={stop}
            onStopBeforeClear={() => {
              if (running) {
                stop();
              }
            }}
            pendingCount={pending.length}
            running={running}
            settings={settings}
            staleCount={staleIds.size}
            summary={summary}
            total={total}
          />
        </div>
      </div>

      <SqueezeAnnouncement
        over={summary.misses + summary.rejected}
        quarter={quarter}
        running={running}
        settled={settled}
        total={total}
        underTarget={underTarget}
      />

      <SqueezeExplainer />
    </Container>
  );
};
