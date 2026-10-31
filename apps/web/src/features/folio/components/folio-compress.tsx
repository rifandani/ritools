/* oxlint-disable complexity, eslint/no-await-in-loop, react-doctor/async-await-in-loop, react-doctor/no-giant-component -- One panel owns one run, and documents are processed one at a time so memory stays bounded and progress stays exact. */
"use client";

import type { DocumentsCapability } from "@embedpdf/viewer-react";
import { makeZip } from "client-zip";
import { cn } from "cn";
import { useEffect, useMemo, useRef, useState } from "react";
import { HiArrowDownTray, HiBolt, HiStop, HiXMark } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Checkbox, CheckboxField } from "@/core/components/ui/checkbox";
import { Heading } from "@/core/components/ui/heading";
import { Note } from "@/core/components/ui/note";
import { Radio, RadioField, RadioGroup } from "@/core/components/ui/radio";
import { download } from "@/core/libs/files";
import { useTranslation } from "@/features/i18n/use-translation";

import {
  compressedNameOf,
  formatSize,
  percentSaved,
  uniqueCompressedNames,
} from "../folio.compress";
import type { FolioCompressPreset } from "../folio.compress";
import type {
  FolioCompressSkipReason,
  FolioCompressStats,
} from "../folio.compress.types";
import {
  compressFolioPdf,
  FolioCompressError,
  stopFolioCompress,
} from "../folio.compress.worker-client";
import type { FolioCompressProgress } from "../folio.compress.worker-client";

type Translate = ReturnType<typeof useTranslation>["t"];

type RowState =
  | "queued"
  | "working"
  | "compressed"
  | "unchanged"
  | "skipped"
  | "failed"
  | "stopped";

interface Row {
  readonly id: string;
  readonly name: string;
  readonly pages: number;
  readonly state: RowState;
  readonly inputBytes: number | null;
  readonly outputBytes: number | null;
  readonly bytes: Uint8Array | null;
  readonly stats: FolioCompressStats | null;
  readonly reason: FolioCompressSkipReason | null;
  readonly message: string | null;
  readonly progress: FolioCompressProgress | null;
}

const PRESET_KEY = {
  balanced: "folioCompressBalanced",
  light: "folioCompressLight",
  strong: "folioCompressStrong",
} as const;

const PRESET_HINT_KEY = {
  balanced: "folioCompressBalancedHint",
  light: "folioCompressLightHint",
  strong: "folioCompressStrongHint",
} as const;

const STATE_KEY = {
  compressed: "folioCompressDone",
  failed: "folioCompressFailed",
  queued: "folioCompressQueued",
  skipped: "folioCompressSkipped",
  stopped: "folioCompressStopped",
  unchanged: "folioCompressAlreadySmall",
  working: "folioCompressWorking",
} as const satisfies Record<RowState, string>;

const STATE_TONE = {
  compressed: "text-success-subtle-fg",
  failed: "text-danger-subtle-fg",
  queued: "text-muted-fg",
  skipped: "text-warning-subtle-fg",
  stopped: "text-muted-fg",
  unchanged: "text-muted-fg",
  working: "text-muted-fg",
} as const satisfies Record<RowState, string>;

const STATUS_CLASS =
  "text-[0.6875rem] font-bold uppercase tracking-[0.14em] whitespace-nowrap [font-stretch:87.5%]";

const blankRow = (row: Row): Row => ({
  ...row,
  bytes: null,
  inputBytes: null,
  message: null,
  outputBytes: null,
  progress: null,
  reason: null,
  state: "queued",
  stats: null,
});

const reasonOf = (row: Row, t: Translate): string | null => {
  if (row.state === "unchanged") {
    return t("folioCompressReasonAlreadySmall");
  }
  if (row.state === "failed") {
    return row.message ?? t("folioCompressReasonFailed");
  }
  if (row.state === "stopped") {
    return t("folioCompressReasonStopped");
  }
  if (row.state !== "skipped") {
    return null;
  }
  if (row.reason === "signed") {
    return t("folioCompressReasonSigned");
  }
  if (row.reason === "encrypted") {
    return t("folioCompressReasonEncrypted");
  }
  return t("folioCompressReasonRestricted");
};

const metaOf = (row: Row, locale: string, t: Translate): string => {
  const pages = t("folioCompressPages", { count: row.pages });
  if (row.inputBytes === null) {
    return pages;
  }
  const input = formatSize(row.inputBytes, locale);
  if (row.outputBytes === null) {
    return `${pages} · ${input} → …`;
  }
  return `${pages} · ${input} → ${formatSize(row.outputBytes, locale)}`;
};

const percentOf = (row: Row): number =>
  row.inputBytes === null || row.outputBytes === null
    ? 0
    : percentSaved(row.inputBytes, row.outputBytes);

const initialRowsOf = (
  documents: DocumentsCapability,
  t: Translate
): readonly Row[] => {
  const rows: Row[] = [];
  for (const document of documents.list()) {
    if (document.status === "ready" && document.pageCount > 0) {
      rows.push({
        bytes: null,
        id: document.id,
        inputBytes: null,
        message: null,
        name: document.name ?? t("folioUntitledDocument"),
        outputBytes: null,
        pages: document.pageCount,
        progress: null,
        reason: null,
        state: "queued",
        stats: null,
      });
    }
  }
  return rows;
};

const saveRow = (row: Row) => {
  if (!row.bytes) {
    return;
  }
  // SAFETY: the engine returns a Uint8Array over an ArrayBuffer, a BlobPart.
  download(
    new Blob([row.bytes as BlobPart], { type: "application/pdf" }),
    compressedNameOf(row.name)
  );
};

/** One row in the Batch list. The checkbox selects it for the next run. */
const CompressRow = ({
  locale,
  onDownload,
  onToggle,
  row,
  running,
  selected,
  t,
}: {
  readonly locale: string;
  readonly onDownload: (row: Row) => void;
  readonly onToggle: (id: string, selected: boolean) => void;
  readonly row: Row;
  readonly running: boolean;
  readonly selected: boolean;
  readonly t: Translate;
}) => {
  const reason = reasonOf(row, t);
  const settled = row.state === "compressed" || row.state === "unchanged";
  const percent = percentOf(row);
  const progress =
    row.state === "working" && row.progress && row.progress.total > 0
      ? t("folioCompressImageProgress", {
          done: row.progress.done,
          total: row.progress.total,
        })
      : null;
  return (
    <li className="border-rule grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 border-b-2 px-3 py-3 last:border-b-0">
      <CheckboxField
        className="mt-0.5"
        isDisabled={running}
        isSelected={selected}
        onChange={(isSelected) => {
          onToggle(row.id, isSelected);
        }}
      >
        <Checkbox aria-label={t("folioCompressSelect", { name: row.name })} />
      </CheckboxField>
      <div className="min-w-0">
        <p className="text-fg truncate text-sm/5 font-bold" title={row.name}>
          {row.name}
        </p>
        <p className="text-muted-fg mt-0.5 text-xs/4">
          {metaOf(row, locale, t)}
        </p>
        {progress ? (
          <p className="text-muted-fg mt-1 text-xs/4">{progress}</p>
        ) : null}
        {reason ? (
          <p
            className={cn(
              "mt-1 text-xs/4",
              row.state === "failed"
                ? "text-danger-subtle-fg"
                : row.state === "skipped"
                  ? "text-warning-subtle-fg"
                  : "text-muted-fg"
            )}
          >
            {reason}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={cn(STATUS_CLASS, STATE_TONE[row.state])}>
          {t(STATE_KEY[row.state])}
        </span>
        {settled ? (
          <span
            className={cn(
              "num text-xs font-bold",
              row.state === "compressed"
                ? "text-success-subtle-fg"
                : "text-muted-fg"
            )}
          >
            {percent > 0 ? `−${percent}%` : "0%"}
          </span>
        ) : null}
        {row.bytes ? (
          <Button
            aria-label={t("folioCompressDownloadName", { name: row.name })}
            intent="plain"
            onPress={() => {
              onDownload(row);
            }}
            size="sq-xs"
          >
            <HiArrowDownTray aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
      </div>
    </li>
  );
};

const Totals = ({
  input,
  locale,
  output,
  percent,
  saved,
  t,
}: {
  readonly input: number;
  readonly locale: string;
  readonly output: number;
  readonly percent: number;
  readonly saved: number;
  readonly t: Translate;
}) => (
  <section aria-labelledby="folio-compress-totals">
    <h3 className="sr-only" id="folio-compress-totals">
      {t("folioCompressTotals")}
    </h3>
    <dl className="bg-border grid grid-cols-2 gap-0.5">
      <div className="bg-bg px-3 py-2">
        <dt className="text-muted-fg text-xs font-bold tracking-[0.14em] uppercase [font-stretch:87.5%]">
          {t("folioCompressTotalIn")}
        </dt>
        <dd className="num mt-1 text-sm font-bold">
          {formatSize(input, locale)}
        </dd>
      </div>
      <div className="bg-bg px-3 py-2">
        <dt className="text-muted-fg text-xs font-bold tracking-[0.14em] uppercase [font-stretch:87.5%]">
          {t("folioCompressTotalOut")}
        </dt>
        <dd className="num mt-1 text-sm font-bold">
          {formatSize(output, locale)}
        </dd>
      </div>
      <div className="bg-bg px-3 py-2">
        <dt className="text-muted-fg text-xs font-bold tracking-[0.14em] uppercase [font-stretch:87.5%]">
          {t("folioCompressTotalSaved")}
        </dt>
        <dd className="num mt-1 text-sm font-bold">
          {formatSize(saved, locale)}
        </dd>
      </div>
      <div className="bg-bg px-3 py-2">
        <dt className="text-muted-fg text-xs font-bold tracking-[0.14em] uppercase [font-stretch:87.5%]">
          {t("folioCompressTotalReduction")}
        </dt>
        <dd className="num mt-1 text-sm font-bold">{percent}%</dd>
      </div>
    </dl>
  </section>
);

/**
 * The Compress panel: every open PDF is a row, and each run writes a smaller
 * copy for the rows the user selects. The open files never change.
 */
export const FolioCompress = ({
  documents,
  onClose,
}: {
  readonly documents: DocumentsCapability;
  readonly onClose: () => void;
}) => {
  const { locale, t } = useTranslation();
  const [rows, setRows] = useState<readonly Row[]>(() =>
    initialRowsOf(documents, t)
  );
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(rows.map((row) => row.id))
  );
  const [preset, setPreset] = useState<FolioCompressPreset>("balanced");
  const [runPreset, setRunPreset] = useState<FolioCompressPreset | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "stopped">(
    "idle"
  );
  const [progress, setProgress] = useState<FolioCompressProgress>({
    done: 0,
    total: 0,
  });
  const cancel = useRef(false);
  const runningRef = useRef(false);

  useEffect(() => {
    cancel.current = false;
    return () => {
      cancel.current = true;
      stopFolioCompress();
    };
  }, []);

  const update = (id: string, patch: Partial<Row>) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  };

  const running = phase === "running";
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const totals = useMemo(() => {
    const settled = rows.filter(
      (row) =>
        row.inputBytes !== null &&
        row.outputBytes !== null &&
        row.outputBytes > 0
    );
    const input = settled.reduce((sum, row) => sum + (row.inputBytes ?? 0), 0);
    const output = settled.reduce(
      (sum, row) => sum + (row.outputBytes ?? 0),
      0
    );
    return {
      count: settled.length,
      input,
      output,
      percent: percentSaved(input, output),
      saved: Math.max(0, input - output),
    };
  }, [rows]);
  const downloadable = rows.filter(
    (row): row is Row & { readonly bytes: Uint8Array } => row.bytes !== null
  );
  const hasResults = rows.some(
    (row) => row.state !== "queued" && row.state !== "working"
  );
  const stale = hasResults && runPreset !== null && runPreset !== preset;

  const toggle = (id: string, isSelected: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (isSelected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
  };

  const downloadAll = async () => {
    if (downloadable.length === 0) {
      return;
    }
    const names = uniqueCompressedNames(downloadable.map((row) => row.name));
    const stream = makeZip(
      downloadable.map((row, index) => ({
        input: row.bytes,
        name: names[index] ?? compressedNameOf(row.name),
      }))
    );
    const blob = await new Response(stream).blob();
    download(
      blob,
      `folio-compressed-${new Date().toISOString().slice(0, 10)}.zip`
    );
  };

  const clear = () => {
    setRows((current) => current.map(blankRow));
    setPhase("idle");
    setProgress({ done: 0, total: 0 });
  };

  const stop = () => {
    cancel.current = true;
    stopFolioCompress();
  };

  const run = async () => {
    if (runningRef.current) {
      return;
    }
    const chosen = rows.filter((row) => selected.has(row.id));
    if (chosen.length === 0) {
      return;
    }
    runningRef.current = true;
    cancel.current = false;
    setPhase("running");
    setRunPreset(preset);
    setProgress({ done: 0, total: 0 });
    for (const row of chosen) {
      if (cancel.current) {
        break;
      }
      setProgress({ done: 0, total: 0 });
      update(row.id, {
        bytes: null,
        inputBytes: null,
        message: null,
        outputBytes: null,
        progress: null,
        reason: null,
        state: "working",
        stats: null,
      });
      if (!documents.canDownload(row.id)) {
        update(row.id, { reason: "restricted", state: "skipped" });
        continue;
      }
      try {
        const bytes = await documents.download(row.id);
        update(row.id, { inputBytes: bytes.byteLength });
        const result = await compressFolioPdf({
          bytes,
          onProgress: (next) => {
            setProgress(next);
            update(row.id, { progress: next });
          },
          preset,
        });
        if (result.outcome === "compressed" && result.bytes) {
          update(row.id, {
            bytes: result.bytes,
            outputBytes: result.stats.outputBytes,
            state: "compressed",
            stats: result.stats,
          });
        } else if (result.outcome === "unchanged") {
          update(row.id, {
            outputBytes: result.stats.outputBytes,
            state: "unchanged",
            stats: result.stats,
          });
        } else {
          update(row.id, {
            reason: result.reason,
            state: "skipped",
            stats: result.stats,
          });
        }
      } catch (error) {
        if (error instanceof FolioCompressError && error.reason === "stopped") {
          update(row.id, { state: "stopped" });
        } else {
          update(row.id, {
            message:
              error instanceof Error
                ? error.message
                : t("folioCompressReasonFailed"),
            state: "failed",
          });
        }
      }
    }
    runningRef.current = false;
    setPhase(cancel.current ? "stopped" : "done");
  };

  const percent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <aside
      aria-label={t("folioCompressTitle")}
      className="border-rule bg-overlay text-overlay-fg flex flex-col border-t-2 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:max-h-[72svh] lg:w-[30rem] lg:shrink-0 lg:border-s-2 lg:border-t-0"
    >
      <header className="border-rule flex items-start justify-between gap-2 border-b-2 px-5 py-4">
        <Heading className="min-w-0 flex-1" level={2}>
          {t("folioCompressTitle")}
        </Heading>
        <Button
          aria-label={t("close")}
          intent="plain"
          onPress={onClose}
          size="sq-sm"
        >
          <HiXMark aria-hidden="true" className="size-4.5" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        <p className="text-muted-fg text-sm/6">{t("folioCompressIntro")}</p>

        <fieldset>
          <legend className="text-fg text-sm font-bold">
            {t("folioCompressPreset")}
          </legend>
          <RadioGroup
            aria-label={t("folioCompressPreset")}
            className="mt-2 space-y-2"
            isDisabled={running}
            onChange={(value) => {
              if (
                value === "light" ||
                value === "balanced" ||
                value === "strong"
              ) {
                setPreset(value);
              }
            }}
            value={preset}
          >
            {(["light", "balanced", "strong"] as const).map((value) => (
              <RadioField key={value} value={value}>
                <Radio>
                  <span className="font-bold">{t(PRESET_KEY[value])}</span>
                  <span className="text-muted-fg">
                    {" · "}
                    {t(PRESET_HINT_KEY[value])}
                  </span>
                </Radio>
              </RadioField>
            ))}
          </RadioGroup>
        </fieldset>

        <p className="text-muted-fg text-xs/5">{t("folioCompressNoteJpeg")}</p>
        <p className="text-muted-fg text-xs/5">
          {t("folioCompressNoteRebuild")}
        </p>
        <p className="text-muted-fg text-xs/5">
          {t("folioCompressNoteMetadata")}
        </p>

        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-fg text-sm font-bold">
              {t("folioCompressBatch")}
            </h3>
            <Button
              intent="plain"
              isDisabled={running || rows.length === 0}
              onPress={toggleAll}
              size="sm"
            >
              {allSelected
                ? t("folioCompressSelectNone")
                : t("folioCompressSelectAll")}
            </Button>
          </div>
          {rows.length === 0 ? (
            <Note className="mt-2" intent="warning">
              {t("folioCompressEmpty")}
            </Note>
          ) : (
            <ul className="border-rule mt-2 border-2">
              {rows.map((row) => (
                <CompressRow
                  key={row.id}
                  locale={locale}
                  onDownload={saveRow}
                  onToggle={toggle}
                  row={row}
                  running={running}
                  selected={selected.has(row.id)}
                  t={t}
                />
              ))}
            </ul>
          )}
        </section>

        {totals.count > 0 ? (
          <Totals
            input={totals.input}
            locale={locale}
            output={totals.output}
            percent={totals.percent}
            saved={totals.saved}
            t={t}
          />
        ) : null}

        <output aria-live="polite" className="sr-only">
          {running
            ? t("folioCompressLive")
            : phase === "done"
              ? t("folioCompressLiveDone")
              : ""}
        </output>
      </div>

      <footer className="border-rule bg-overlay border-t-2">
        {running ? (
          <div aria-hidden="true" className="bg-border h-1">
            <div
              className={cn(
                "bg-accent h-full transition-[width] duration-200 ease-linear motion-reduce:transition-none",
                progress.total === 0 ? "w-1/3 animate-pulse" : ""
              )}
              style={
                progress.total === 0 ? undefined : { width: `${percent}%` }
              }
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-2 px-5 py-4">
          {stale && !running ? (
            <p className="text-warning-subtle-fg text-xs/4">
              {t("folioCompressStale")}
            </p>
          ) : null}
          {running ? (
            <Button intent="danger" onPress={stop}>
              <HiStop aria-hidden="true" />
              {progress.total > 0
                ? t("folioCompressStop", {
                    done: progress.done,
                    total: progress.total,
                  })
                : t("folioCompressStopIdle")}
            </Button>
          ) : (
            <Button
              intent="primary"
              isDisabled={selected.size === 0 || rows.length === 0}
              onPress={() => {
                void run();
              }}
            >
              <HiBolt aria-hidden="true" />
              {t("folioCompressRun")}
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              intent="outline"
              isDisabled={downloadable.length === 0}
              onPress={() => {
                void downloadAll();
              }}
            >
              <HiArrowDownTray aria-hidden="true" />
              {t("folioCompressDownloadAll")}
            </Button>
            {hasResults && !running ? (
              <Button intent="plain" onPress={clear}>
                {t("folioCompressClear")}
              </Button>
            ) : null}
          </div>
        </div>
      </footer>
    </aside>
  );
};
