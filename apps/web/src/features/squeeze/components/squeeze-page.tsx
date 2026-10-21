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
import type { OutputFormat } from "@/features/squeeze/squeeze";
import { useSqueeze } from "@/features/squeeze/use-squeeze";

const OUTPUT_KEY = {
  avif: "squeezeOutputAvif",
  jpeg: "squeezeOutputJpeg",
  keep: "squeezeOutputKeep",
  multi: "squeezeOutputMulti",
  png: "squeezeOutputPng",
  webp: "squeezeOutputWebp",
} as const;

const FACTS = [
  "squeezeFactLocal",
  "squeezeFactTarget",
  "squeezeFactBulk",
] as const;

/** A browser-only flag: false in the server render, then true after hydration. */
const noopSubscribe = () => () => {
  // No external store changes after hydration.
};
const clientTrue = () => true;
const serverFalse = () => false;
const readShowStates = () =>
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get("states") === "1";

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

/** The title, tagline, intro, and the three facts. */
const SqueezeHeader = () => {
  const { t } = useTranslation();
  return (
    <header className="flex flex-col gap-y-4">
      <div className="flex flex-col gap-y-4 lg:flex-row lg:items-end lg:justify-between lg:gap-x-16">
        <Ransom
          as="h1"
          className="text-[clamp(2.75rem,8vw,7rem)] max-sm:[--angle-tilt:0deg] max-sm:[--slash-run:0]"
        >
          {t("squeezeName")}
        </Ransom>
        <div className="flex max-w-[48ch] flex-col gap-y-2">
          <p className="text-lg leading-7 font-semibold">
            {t("squeezeTagline")}
          </p>
          <p className="text-muted-fg text-sm/6">{t("squeezeIntro")}</p>
        </div>
      </div>
      <ul className="text-muted-fg flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]">
        {FACTS.map((fact, index) => (
          <li className="flex items-center gap-x-4 max-sm:gap-x-0" key={fact}>
            {index === 0 ? null : (
              <span
                aria-hidden="true"
                className="bg-rule hidden h-3 w-0.5 sm:block"
              />
            )}
            {t(fact)}
          </li>
        ))}
      </ul>
    </header>
  );
};

/** The device line, then the status counts and the watch refusal. */
const SqueezeStatus = ({
  messages,
  watchDenied,
}: {
  readonly messages: readonly string[];
  readonly watchDenied: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-muted-fg text-xs leading-4">
        {t("squeezeDeviceLimit")} {t("squeezeBatchTabNote")}
      </p>
      {messages.length === 0 && watchDenied === false ? null : (
        <p className="text-muted-fg text-xs leading-4">
          {messages.map((message, index) => (
            <span key={message}>
              {index === 0 ? null : " · "}
              {message}
            </span>
          ))}
          {watchDenied ? (
            <span className="text-danger-subtle-fg font-semibold">
              {messages.length === 0 ? null : " · "}
              {t("squeezeWatchDenied")}
            </span>
          ) : null}
        </p>
      )}
    </>
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
  quarter,
  running,
  settled,
  total,
  underTarget,
}: {
  readonly quarter: number;
  readonly running: boolean;
  readonly settled: number;
  readonly total: number;
  readonly underTarget: number;
}) => {
  const { t } = useTranslation();
  return (
    <output aria-live="polite" className="sr-only">
      {running
        ? quarter > 0
          ? t("squeezeAnnounceProgress", { percent: quarter * 25 })
          : null
        : settled > 0
          ? t("squeezeUnderTargetSummary", { total, under: underTarget })
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
    pending,
    recompress,
    remove,
    results,
    run,
    running,
    setSettings,
    setTarget,
    settings,
    staleIds,
    startWatch,
    status,
    stop,
    stopWatching,
    summary,
    watching,
  } = useSqueeze();
  const [leftOut, setLeftOut] = useState<number | null>(null);
  // Both flags are client-only. The server snapshot is false, so the markup
  // matches on hydration; the client snapshot then turns each flag on.
  const ready = useSyncExternalStore(noopSubscribe, clientTrue, serverFalse);
  const showStates = useSyncExternalStore(
    noopSubscribe,
    readShowStates,
    serverFalse
  );

  const { underTarget, total } = summary;
  const settled = Math.max(0, total - pending.length);
  const quarter =
    total === 0 ? 0 : Math.min(4, Math.floor((settled / total) * 4));
  const downloadable =
    summary.done + summary.alreadyFits + summary.misses + summary.bigger;
  const offlineAll =
    results.size > 0 &&
    settings.outputFormat !== "multi" &&
    allCodecOffline(results);

  const raiseTarget = useCallback(
    (id?: string) => {
      if (settings.sizeMode === "batch-total") {
        focusField("squeeze-batch-budget");
        return;
      }
      if (settings.sizeMode === "per-image") {
        focusField(
          id === undefined ? "squeeze-target" : `squeeze-target-${id}`
        );
      }
    },
    [settings.sizeMode]
  );

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

  const messages: string[] = [];
  if (status.duplicates > 0) {
    messages.push(t("squeezeDuplicateCount", { count: status.duplicates }));
  }
  if (status.skipped > 0) {
    messages.push(t("squeezeSkippedCount", { count: status.skipped }));
  }
  if (status.watched > 0) {
    messages.push(t("squeezeWatchedCount", { count: status.watched }));
  }
  if (leftOut !== null && leftOut > 0) {
    messages.push(t("squeezeZipLeftOut", { count: leftOut }));
  }

  if (import.meta.env.DEV && showStates) {
    return <SqueezeStateGallery />;
  }

  return (
    <Container className="flex flex-col gap-y-10 py-8 [--container-breakpoint:90rem] sm:py-10">
      <SqueezeHeader />

      <div className="grid grid-cols-1 gap-y-5 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-6">
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
            showWatchReason={ready && startWatch === null}
            watchSupported={ready && startWatch !== null}
            watching={watching}
          />
          <SqueezeStatus messages={messages} watchDenied={status.watchDenied} />
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
            batchTarget={
              settings.sizeMode === "per-image" ? settings.targetBytes : null
            }
            onDownload={downloadOne}
            onDownloadPart={downloadPart}
            onRaiseTarget={raiseTarget}
            onRecompress={recompress}
            onRemove={removeRow}
            onResize={focusResize}
            onTarget={setTarget}
            onTryFormat={tryFormat}
            overrideEnabled={settings.sizeMode === "per-image"}
            results={results}
            running={running}
            settings={settings}
            staleIds={staleIds}
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

          {offlineAll ? (
            <Note className="mt-3" intent="danger">
              {t("squeezeCodecOfflineAll", {
                format: t(OUTPUT_KEY[settings.outputFormat]),
              })}
            </Note>
          ) : null}

          <SqueezeRunBar
            batchTotalBytes={settings.batchTotalBytes}
            canClear={results.size > 0}
            canDownload={downloadable > 0}
            canRun={canRun}
            onClear={() => {
              setLeftOut(null);
              clear();
            }}
            onDownloadAll={() => {
              void (async () => {
                try {
                  setLeftOut(await downloadAll());
                } catch {
                  // A ZIP that cannot be built leaves the Batch untouched.
                }
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
