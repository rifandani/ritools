/* oxlint-disable promise/prefer-await-to-then -- The chart read is a local Worker round trip that reports through the shared UI boundary. */
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";

import type * as T from "./tabular";
import { buildChart, chartRowIndices } from "./tabular.chart";
import type {
  ChartColumn,
  ChartModel,
  ChartScopeKind,
  ChartSourceRow,
  ChartType,
} from "./tabular.chart";
import { boundsOf, engineFailure } from "./tabular.ui";
import type { TabularController } from "./use-tabular";

export interface ChartSession {
  readonly type: ChartType;
  readonly decimalComma: boolean;
}

export interface ChartReadState {
  readonly status: "idle" | "loading" | "ready" | "failed";
  readonly model: ChartModel | null;
  readonly scope: ChartScopeKind;
}

interface ChartSource {
  readonly columns: readonly ChartColumn[];
  readonly rows: readonly ChartSourceRow[];
  readonly totalRows: number;
  readonly scope: ChartScopeKind;
}

type Page = Awaited<ReturnType<TabularController["readChartRows"]>>[number];

interface RowBuffer {
  readonly rowId: T.RowId;
  readonly cells: (T.Value | undefined)[];
}

const blankValue: T.Value = { _tag: "Blank" };

/* oxlint-disable-next-line anti-slop/no-unknown-parameters -- The rejection from an Atom promise is decoded through the shared typed boundary. */
const isStale = (error: unknown): boolean => {
  const named = engineFailure(error);
  return (
    named?._tag === "StaleSession" ||
    named?._tag === "StaleView" ||
    named?._tag === "RevisionConflict"
  );
};

/** Merge column pages into one aligned row buffer. */
const mergePages = (pages: readonly Page[], columnStart: number) => {
  const rows = new Map<number, RowBuffer>();
  for (const page of pages) {
    const offset = page.columnStart - columnStart;
    for (const line of page.rows) {
      const current = rows.get(line.viewIndex) ?? {
        rowId: line.rowId,
        cells: [],
      };
      for (const [index, cell] of line.cells.entries()) {
        current.cells[offset + index] = cell.value;
      }
      rows.set(line.viewIndex, current);
    }
  }
  return [...rows.entries()]
    .toSorted(([left], [right]) => left - right)
    .map(([viewIndex, buffer]): ChartSourceRow => ({
      rowId: buffer.rowId,
      rowNumber: viewIndex + 1,
      cells: buffer.cells.map((value) => value ?? blankValue),
    }));
};

/** Join sorted row offsets into runs no larger than the engine page budget. */
const readRuns = (
  indices: readonly number[],
  rowStart: number,
  columnCount: number
) => {
  const maxRows = Math.max(
    1,
    Math.min(32, Math.floor(4096 / Math.max(1, Math.min(columnCount, 128))))
  );
  const runs: { rowStart: number; rowCount: number }[] = [];
  let first: number | undefined;
  let last: number | undefined;
  for (const index of indices) {
    if (
      first === undefined ||
      last === undefined ||
      index !== last + 1 ||
      last - first + 1 >= maxRows
    ) {
      if (first !== undefined && last !== undefined) {
        runs.push({
          rowStart: rowStart + first,
          rowCount: last - first + 1,
        });
      }
      first = index;
    }
    last = index;
  }
  if (first !== undefined && last !== undefined) {
    runs.push({ rowStart: rowStart + first, rowCount: last - first + 1 });
  }
  return runs;
};

/**
 * Read the Chart Scope once per View revision. A series selection only
 * rebuilds the model from the rows already read. The chart is session state:
 * no atom, storage, URL, export, or edit path receives it.
 */
export const useTabularChart = (
  controller: TabularController,
  chart: ChartSession | null,
  selectedSeries?: readonly T.ColumnId[]
): ChartReadState => {
  const { t, locale } = useTranslation();
  const [state, setState] = useState<{
    status: ChartReadState["status"];
    source: ChartSource | null;
  }>({ status: "idle", source: null });
  const reader = useRef(controller.readChartRows);
  useLayoutEffect(() => {
    reader.current = controller.readChartRows;
  });
  const { columns, range, view, sheetId, busy, viewStale, reportFailure } =
    controller;
  const { anchor, extent } = range;
  const matchingRows = view?.matchingRows ?? 0;
  const columnCount = view?.columnCount ?? 0;

  useEffect(() => {
    if (!chart || !view || !sheetId) {
      if (!chart) {
        // oxlint-disable-next-line react/set-state-in-effect -- Closing the chart leaves no session state to clear anywhere else.
        setState({ status: "idle", source: null });
      }
      return;
    }
    if (columns.length < columnCount) {
      return;
    }
    if (busy || viewStale) {
      return;
    }
    let live = true;
    const box = boundsOf({ anchor, extent });
    const selected = Boolean(
      (box.rowEnd - box.rowStart + 1) * (box.columnEnd - box.columnStart + 1) >=
      2
    );
    const scope: ChartScopeKind = selected ? "selection" : "view";
    // oxlint-disable-next-line react/set-state-in-effect -- The read starts after the View settles; the effect is the Worker boundary.
    setState({ status: "loading", source: null });
    const read = async () => {
      try {
        const rowStart = selected ? box.rowStart : 0;
        const rowEnd = selected ? box.rowEnd : matchingRows - 1;
        const columnStart = selected ? box.columnStart : 0;
        const scopeColumns = selected
          ? box.columnEnd - box.columnStart + 1
          : columnCount;
        const totalRows = Math.max(0, rowEnd - rowStart + 1);
        const indices = chartRowIndices(chart.type, totalRows);
        const runs = readRuns(indices, rowStart, scopeColumns);
        const pages = runs.length
          ? await reader.current(view, runs, columnStart, scopeColumns)
          : [];
        if (!live) {
          return;
        }
        const metadata = columns.slice(columnStart, columnStart + scopeColumns);
        setState({
          status: "ready",
          source: {
            columns: metadata.map((column) => ({
              columnId: column.columnId,
              label: column.label,
            })),
            rows: mergePages(pages, columnStart),
            totalRows,
            scope,
          },
        });
      } catch (error) {
        if (!live || isStale(error)) {
          return;
        }
        setState({ status: "failed", source: null });
        reportFailure(error);
      }
    };
    void read();
    return () => {
      live = false;
    };
  }, [
    chart,
    view,
    sheetId,
    matchingRows,
    columnCount,
    columns,
    busy,
    viewStale,
    reportFailure,
    anchor,
    extent,
  ]);

  const model =
    chart && state.source
      ? buildChart(
          chart.type,
          state.source.columns,
          state.source.rows,
          state.source.totalRows,
          {
            decimalComma: chart.decimalComma,
            blankLabel: t("tabularBlankValue"),
            rowNumberLabel: t("tabularChartRowNumber"),
            seriesLabel: t("tabularChartSeries"),
            otherLabel: t("tabularChartOther"),
            otherRestLabel: t("tabularChartOtherRest"),
            numberFormat: (value) => value.toLocaleString(locale),
          },
          selectedSeries
        )
      : null;

  return {
    status: state.status,
    model,
    scope: state.source?.scope ?? "view",
  };
};
