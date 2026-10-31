/* oxlint-disable promise/prefer-await-to-then -- Installed file-handle callbacks settle locally before entering the same open workflow. */
/* oxlint-disable eslint/complexity -- The route coordinates the documented session, open, failure, and dialog states. */
/* oxlint-disable react-doctor/no-giant-component -- The route owns the fixed session, open, failure, chart, dialog, and export contract. */
"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

import { Button } from "@/core/components/ui/button";
import { Container } from "@/core/components/ui/container";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { Note } from "@/core/components/ui/note";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as T from "../tabular";
import {
  chartEmptyLabelKey,
  chartTypeLabelKey,
  summarizeChart,
} from "../tabular.chart";
import type { ChartType } from "../tabular.chart";
import { boundsOf } from "../tabular.ui";
import { useTabular } from "../use-tabular";
import { useTabularChart } from "../use-tabular-chart";
import type { ChartSession } from "../use-tabular-chart";
import { TabularChart } from "./tabular-chart";
import { TabularDedupe } from "./tabular-dedupe";
import { TabularConfirm } from "./tabular-dialogs";
import { TabularDiff } from "./tabular-diff";
import { TabularError } from "./tabular-error";
import { TabularExplainer } from "./tabular-explainer";
import { TabularExport } from "./tabular-export";
import { TabularMerge } from "./tabular-merge";
import {
  TabularCellBar,
  TabularCellNote,
  TabularInput,
  TabularNotes,
  TabularRibbon,
  TabularSheetNote,
} from "./tabular-parts";
import { TabularSplit } from "./tabular-split";

const Grid = lazy(async () => {
  const module = await import("./tabular-grid");
  return { default: module.TabularGrid };
});
const phases = {
  "loading-engine": "tabularLoadingEngine",
  detecting: "tabularDetecting",
  reading: "tabularReading",
  view: "tabularUpdatingView",
  editing: "tabularApplyingEdit",
  "planning-export": "tabularPlanningExport",
  writing: "tabularWriting",
  verifying: "tabularVerifying",
} as const;

const historyKinds = {
  "set-cell": "tabularEditCell",
  paste: "tabularPasteText",
  "insert-rows": "tabularAddRow",
  "insert-columns": "tabularAddColumn",
  "delete-rows": "tabularDeleteRows",
  "delete-columns": "tabularDeleteColumns",
  "rename-header": "tabularRenameHeader",
  "revert-cell": "tabularRevertCell",
  "revert-all": "tabularRevertAll",
  dedupe: "tabularDedupe",
} as const;

declare global {
  interface Window {
    launchQueue?: {
      setConsumer: (
        consumer: (params: {
          readonly files: readonly FileSystemFileHandle[];
        }) => void
      ) => void;
    };
  }
}

// A phone folds the action marks into the More menu. Return focus to the mark
// that opened the panel, or to the More mark when that mark is hidden.
const focusFirstVisible = (ids: readonly string[]) => {
  for (const id of ids) {
    const target = document.querySelector<HTMLElement>(`#${id}`);
    if (target && target.getClientRects().length > 0) {
      target.focus();
      return;
    }
  }
};
const restoreFocus = (ids: readonly string[]) =>
  requestAnimationFrame(() => focusFirstVisible(ids));

export const TabularPage = () => {
  const { t, locale } = useTranslation();
  const c = useTabular();
  const [chart, setChart] = useState<ChartSession | null>(null);
  const [series, setSeries] = useState<readonly T.ColumnId[] | null>(null);
  const savedRange = useRef<{
    range: typeof c.range;
    viewId: T.ViewId | null;
  }>({ range: c.range, viewId: null });
  const [splitSession, setSplitSession] = useState<T.SessionId | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [mergeSession, setMergeSession] = useState<T.SessionId | null>(null);
  const [merging, setMerging] = useState(false);
  const [dedupeSession, setDedupeSession] = useState<T.SessionId | null>(null);
  const [deduping, setDeduping] = useState(false);
  const [diffSession, setDiffSession] = useState<T.SessionId | null>(null);
  const [diffing, setDiffing] = useState(false);
  const chartState = useTabularChart(c, chart, series ?? undefined);
  useEffect(() => {
    const box = boundsOf(c.range);
    if (
      (box.rowEnd - box.rowStart + 1) * (box.columnEnd - box.columnStart + 1) >=
      2
    ) {
      savedRange.current = {
        range: c.range,
        viewId: c.view?.viewId ?? null,
      };
    }
  }, [c.range, c.view?.viewId]);
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<readonly File[]>([]);
  const [exporting, setExporting] = useState(false);
  const [dropping, setDropping] = useState(false);
  const takeFiles = (incoming: readonly File[]) => {
    const [first] = incoming;
    if (incoming.length > 1) {
      setFiles(incoming);
    } else if (first) {
      c.openFile(first);
    }
  };
  const keydown = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.isComposing ||
      (event.target instanceof Element &&
        event.target.closest("input,textarea,select,[contenteditable=true]"))
    ) {
      return;
    }
    if (event.key === "/") {
      event.preventDefault();
      const target = document.querySelector("#tabular-search");
      if (target instanceof HTMLElement) {
        target.focus();
      }
    }
    if (
      (event.metaKey || event.ctrlKey) &&
      (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")
    ) {
      event.preventDefault();
      if (!c.busy && !c.pending) {
        void c.applyChange(
          event.shiftKey || event.key.toLowerCase() === "y" ? "redo" : "undo"
        );
      }
    }
  });
  const launched = useEffectEvent((incoming: readonly File[]) =>
    takeFiles(incoming)
  );
  const launchFailed = useEffectEvent(() => c.reportFailure(null));
  useEffect(() => {
    window.addEventListener("keydown", keydown);
    window.launchQueue?.setConsumer((params) => {
      void Promise.all(params.files.map((handle) => handle.getFile()))
        .then(launched)
        .catch(launchFailed);
    });
    return () => {
      window.removeEventListener("keydown", keydown);
      window.launchQueue?.setConsumer(() => {
        /* Stop deliveries after this route leaves. */
      });
    };
  }, []);
  const openExport = () => {
    setExporting(true);
    requestAnimationFrame(() => {
      const target = document.querySelector("#tabular-export-format");
      if (target instanceof HTMLElement) {
        target.focus();
        target.scrollIntoView({ block: "center" });
      }
    });
  };
  const closeSplit = () => {
    setSplitting(false);
    restoreFocus(["tabular-open-split", "tabular-open-more"]);
  };
  const closeMerge = () => {
    setMerging(false);
    restoreFocus(["tabular-open-merge", "tabular-open-more"]);
  };
  const closeDedupe = () => {
    setDeduping(false);
    restoreFocus(["tabular-open-dedupe", "tabular-open-more"]);
  };
  const closeDiff = () => {
    setDiffing(false);
    restoreFocus(["tabular-open-diff", "tabular-open-more"]);
  };
  const openChart = (type: ChartType) => {
    savedRange.current = {
      range: c.range,
      viewId: c.view?.viewId ?? null,
    };
    setChart({ type, decimalComma: false });
    setSeries(null);
  };
  const returnToTable = () => {
    setChart(null);
    const saved = savedRange.current;
    requestAnimationFrame(() => {
      if (saved.viewId === (c.view?.viewId ?? null)) {
        c.setRange(saved.range);
      }
      focusFirstVisible(["tabular-open-chart", "tabular-open-more"]);
    });
  };
  const chartSummary =
    chart && chartState.model
      ? summarizeChart(chartState.model, {
          rowNumberLabel: t("tabularChartRowNumber"),
          blankLabel: t("tabularBlankValue"),
        })
      : null;
  const chartNotice =
    chart && chartState.model && chartSummary
      ? chartState.model.kind === "empty"
        ? t(chartEmptyLabelKey[chartState.model.reason])
        : t("tabularChartReady", {
            type: t(chartTypeLabelKey[chart.type]),
            rows: chartSummary.rows.toLocaleString(locale),
            series: chartSummary.series.length.toLocaleString(locale),
          })
      : "";
  return (
    <Container className="flex max-w-none min-w-0 flex-col gap-8 py-10">
      {c.session ? null : (
        <TabularInput
          controller={c}
          onFiles={takeFiles}
          onOpenFile={() => input.current?.click()}
        />
      )}
      <input
        ref={input}
        type="file"
        accept=".csv,.xls,.xlsx,.tsv,.tab,.txt"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          takeFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
      <output className="sr-only" aria-live="polite">
        {c.busy
          ? t(phases[c.progress?.phase ?? "reading"])
          : c.notice === "tabularDownloadReady" && c.receipt
            ? t("tabularDownloadReady", {
                sheets: c.receipt.writtenSheets.toLocaleString(locale),
                rows: c.receipt.writtenRows.toLocaleString(locale),
              })
            : c.notice === "tabularPdfDownloadReady" && c.receipt
              ? t("tabularPdfDownloadReady", {
                  pages: c.receipt.writtenPages.toLocaleString(locale),
                  rows: c.receipt.writtenRows.toLocaleString(locale),
                })
              : c.historyNotice
                ? t("tabularHistoryDone", {
                    operation: `${t(c.historyNotice.direction === "undo" ? "tabularUndo" : "tabularRedo")}: ${t(historyKinds[c.historyNotice.kind])}`,
                    sheet: c.historyNotice.sheet,
                  })
                : c.notice &&
                    c.notice !== "tabularDownloadReady" &&
                    c.notice !== "tabularPdfDownloadReady"
                  ? t(c.notice)
                  : chart
                    ? chartNotice
                    : c.view && c.view.search === c.query.search
                      ? t("tabularRowCounts", {
                          matched: c.view.matchingRows.toLocaleString(locale),
                          total: c.view.totalRows.toLocaleString(locale),
                          columns: (c.sheet?.columnCount ?? 0).toLocaleString(
                            locale
                          ),
                        })
                      : ""}
      </output>
      {c.slowBusy ? (
        <Note intent="info">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>{t(phases[c.progress?.phase ?? "reading"])}</p>
            <Button intent="outline" onPress={() => c.cancel()}>
              {t("tabularCancel")}
            </Button>
          </div>
        </Note>
      ) : null}
      {c.failure ? (
        <>
          <TabularError error={c.failure} />
          {c.failure._tag === "InvalidPaste" ? null : (
            <div className="flex flex-wrap gap-2">
              <Button
                intent="outline"
                onPress={() => {
                  if (c.source) {
                    c.retryOpen();
                  } else {
                    input.current?.click();
                  }
                }}
              >
                {t("tabularRetry")}
              </Button>
              <Button intent="plain" onPress={() => input.current?.click()}>
                {t("tabularChooseAnother")}
              </Button>
            </div>
          )}
        </>
      ) : null}
      {c.session ? (
        <>
          <TabularSheetNote controller={c} />
          <div
            className={`border-rule bg-card flex min-w-0 flex-col border-2 ${dropping ? "outline-red outline-2 outline-offset-2" : ""}`}
            id="tabular-frame"
            onDragLeave={() => setDropping(false)}
            onDragOver={(event) => {
              event.preventDefault();
              setDropping(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDropping(false);
              if (!c.busy) {
                takeFiles([...event.dataTransfer.files]);
              }
            }}
          >
            <TabularRibbon
              controller={c}
              charting={Boolean(chart)}
              onOpenFile={() => input.current?.click()}
              onExport={openExport}
              onChart={openChart}
              onTable={returnToTable}
              onSplit={() => {
                setSplitSession(c.session?.sessionId ?? null);
                setSplitting(true);
              }}
              onMerge={() => {
                setMergeSession(c.session?.sessionId ?? null);
                setMerging(true);
              }}
              onDedupe={() => {
                setDedupeSession(c.session?.sessionId ?? null);
                setDeduping(true);
              }}
              onDiff={() => {
                setDiffSession(c.session?.sessionId ?? null);
                setDiffing(true);
              }}
            />
            {chart ? (
              <TabularChart
                embedded
                decimalComma={chart.decimalComma}
                model={chartState.model}
                scope={chartState.scope}
                sheetName={c.sheet?.name ?? ""}
                status={chartState.status}
                type={chart.type}
                onDecimalCommaChange={(decimalComma) => {
                  setChart({ ...chart, decimalComma });
                  setSeries(null);
                }}
                onSeriesChange={setSeries}
                onTypeChange={(type) => {
                  setChart({ ...chart, type });
                  setSeries(null);
                }}
              />
            ) : (
              <Suspense
                fallback={
                  <output className="p-6 text-sm">{t("loading")}</output>
                }
              >
                <Grid
                  controller={c}
                  onPaste={(text) => {
                    if (text) {
                      void c.paste(text);
                    }
                  }}
                />
              </Suspense>
            )}
            {chart ? null : <TabularCellBar controller={c} />}
          </div>
          {chart ? null : <TabularCellNote controller={c} />}
          <TabularNotes controller={c} />
          {exporting ? (
            <TabularExport
              controller={c}
              onClose={() => {
                setExporting(false);
                restoreFocus(["tabular-open-export"]);
              }}
            />
          ) : null}
          {splitting && c.session?.sessionId === splitSession ? (
            <TabularSplit controller={c} onClose={closeSplit} />
          ) : null}
          {merging && c.session?.sessionId === mergeSession ? (
            <TabularMerge controller={c} onClose={closeMerge} />
          ) : null}
          {deduping && c.session?.sessionId === dedupeSession ? (
            <TabularDedupe controller={c} onClose={closeDedupe} />
          ) : null}
          {diffing && c.session?.sessionId === diffSession ? (
            <TabularDiff controller={c} onClose={closeDiff} />
          ) : null}
        </>
      ) : null}
      <TabularExplainer />
      {c.pending ? (
        <TabularConfirm
          title={t("tabularDiscardTitle")}
          confirmLabel={t("tabularDiscardContinue")}
          description={t("tabularDiscardBody", {
            cells: (c.session?.history.changedCellCount ?? 0).toLocaleString(
              locale
            ),
            headers: (
              c.session?.history.changedHeaderCount ?? 0
            ).toLocaleString(locale),
            structure: (
              c.session?.history.structuralEditCount ?? 0
            ).toLocaleString(locale),
          })}
          onCancel={() => c.keepWorking()}
          onConfirm={() => c.discard()}
        />
      ) : null}
      {files.length ? (
        <ModalContent
          isOpen
          aria-label={t("tabularOneFile")}
          size="sm"
          onOpenChange={(open) => {
            if (!open) {
              setFiles([]);
            }
          }}
        >
          <ModalHeader title={t("tabularOneFile")} />
          <ModalBody>
            <div className="flex flex-col gap-2">
              {files.map((file) => (
                <Button
                  intent="outline"
                  key={`${file.name}:${file.size}:${file.lastModified}`}
                  className="h-auto min-h-11 [overflow-wrap:anywhere] whitespace-normal"
                  onPress={() => {
                    c.openFile(file);
                    setFiles([]);
                  }}
                >
                  {file.name}
                </Button>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button intent="plain" onPress={() => setFiles([])}>
              {t("tabularCancel")}
            </Button>
          </ModalFooter>
        </ModalContent>
      ) : null}
    </Container>
  );
};
