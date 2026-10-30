/* oxlint-disable react-doctor/no-giant-component -- One chart shell owns the fixed header, body, notes, and data table contract. */
/* oxlint-disable react-doctor/no-array-index-as-key -- Charted rows are immutable after a read and may repeat labels. */
/* oxlint-disable anti-slop/no-runtime-typeof -- A Charted data cell is a closed string-or-number union and never untrusted structure. */
"use client";

import { useEffect, useRef, useState } from "react";

import { AreaChart } from "@/core/components/ui/area-chart";
import { BarChart } from "@/core/components/ui/bar-chart";
import {
  Checkbox,
  CheckboxField,
  CheckboxGroup,
} from "@/core/components/ui/checkbox";
import { Description, Label } from "@/core/components/ui/field";
import { LineChart } from "@/core/components/ui/line-chart";
import { Note } from "@/core/components/ui/note";
import { PieChart } from "@/core/components/ui/pie-chart";
import { ScatterChart } from "@/core/components/ui/scatter-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/core/components/ui/select";
import { Switch, SwitchField } from "@/core/components/ui/switch";
import { useTranslation } from "@/features/i18n/use-translation";

import type * as T from "../tabular";
import {
  chartColumnTitle,
  chartEmptyLabelKey,
  chartSeriesCap,
  chartSliceCap,
  chartTypeLabelKey,
  chartTypes,
  summarizeChart,
} from "../tabular.chart";
import type {
  ChartDonutModel,
  ChartModel,
  ChartScopeKind,
  ChartScatterModel,
  ChartSeriesModel,
  ChartType,
} from "../tabular.chart";
import { ChartTypeIcon } from "./tabular-chart-icons";

export interface TabularChartProps {
  readonly embedded?: boolean;
  readonly type: ChartType;
  readonly decimalComma: boolean;
  readonly scope: ChartScopeKind;
  readonly status: "idle" | "loading" | "ready" | "failed";
  readonly model: ChartModel | null;
  readonly sheetName: string;
  readonly onTypeChange: (type: ChartType) => void;
  readonly onDecimalCommaChange: (value: boolean) => void;
  readonly onSeriesChange: (columns: readonly T.ColumnId[]) => void;
}

const gapLabel = "—";

const DataTable = ({
  model,
  numberFormat,
  open,
  onOpenChange,
}: {
  readonly model: ChartModel;
  readonly numberFormat: (value: number) => string;
  readonly open: boolean;
  readonly onOpenChange: (value: boolean) => void;
}) => {
  const { t } = useTranslation();
  const blank = t("tabularBlankValue");
  let head: string[] = [];
  let body: (string | number | null)[][] = [];
  if (model.kind === "series") {
    head = [
      model.category
        ? chartColumnTitle(model.category, blank)
        : t("tabularChartRowNumber"),
      ...model.series.map((series) => series.label),
    ];
    body = model.categories.map((category, index) => [
      category,
      ...model.series.map((series) => series.values[index] ?? null),
    ]);
  } else if (model.kind === "donut") {
    head = [
      chartColumnTitle(model.category, blank),
      chartColumnTitle(model.seriesColumn, blank),
    ];
    body = model.slices.map((slice) => [slice.label, slice.value]);
  } else if (model.kind === "scatter") {
    head = [
      model.category
        ? chartColumnTitle(model.category, blank)
        : t("tabularChartSeries"),
      chartColumnTitle(model.x, blank),
      chartColumnTitle(model.y, blank),
    ];
    body = model.points.map((point) => [point.group, point.x, point.y]);
  }
  const isNumeric = head.map((_, index) =>
    body.some((row) => typeof row[index] === "number")
  );
  return (
    <details
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
      open={open}
    >
      <summary className="cursor-pointer py-2 font-semibold">
        {t("tabularChartDataTable")}
      </summary>
      {open ? (
        <div className="border-rule mt-2 max-h-80 min-w-0 overflow-auto border-2">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {head.map((label, index) => (
                  <th
                    className={`border-rule border-b-2 px-3 py-2 font-bold ${isNumeric[index] ? "text-end" : "text-start"}`}
                    key={`${label}-${index}`}
                    scope="col"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => {
                    const text =
                      cell === null
                        ? gapLabel
                        : typeof cell === "number"
                          ? numberFormat(cell)
                          : cell;
                    return cellIndex === 0 ? (
                      <th
                        className="border-rule border-t px-3 py-2 text-start font-semibold"
                        key={cellIndex}
                        scope="row"
                      >
                        {text}
                      </th>
                    ) : (
                      <td
                        className="num border-rule border-t px-3 py-2 text-end"
                        key={cellIndex}
                      >
                        {text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </details>
  );
};

const SeriesChart = ({
  model,
  aria,
  numberFormat,
}: {
  readonly model: ChartSeriesModel;
  readonly aria: string;
  readonly numberFormat: (value: number) => string;
}) => {
  const config = Object.fromEntries(
    model.series.map((series) => [series.columnId, { label: series.label }])
  );
  const data = model.categories.map((category, index) =>
    Object.fromEntries([
      ["__category", category],
      ...model.series.map((series) => [
        series.columnId,
        series.values[index] ?? null,
      ]),
    ])
  );
  const props = {
    "aria-label": aria,
    className: "w-full",
    config,
    data,
    dataKey: "__category",
    valueFormatter: numberFormat,
  };
  if (model.type === "bar") {
    return <BarChart {...props} />;
  }
  if (model.type === "area") {
    return <AreaChart {...props} />;
  }
  return <LineChart {...props} />;
};

const DonutChart = ({
  model,
  aria,
  numberFormat,
}: {
  readonly model: ChartDonutModel;
  readonly aria: string;
  readonly numberFormat: (value: number) => string;
}) => {
  const config = Object.fromEntries(
    model.slices.map((slice) => [slice.label, { label: slice.label }])
  );
  const data = model.slices.map((slice) => ({
    name: slice.label,
    value: slice.value,
  }));
  return (
    <PieChart
      aria-label={aria}
      className="w-full"
      config={config}
      data={data}
      dataKey="value"
      nameKey="name"
      valueFormatter={numberFormat}
      variant="donut"
    />
  );
};

const Scatter = ({
  model,
  aria,
  numberFormat,
}: {
  readonly model: ChartScatterModel;
  readonly aria: string;
  readonly numberFormat: (value: number) => string;
}) => {
  const config = Object.fromEntries(
    model.groups.map((group) => [group, { label: group }])
  );
  return (
    <ScatterChart
      aria-label={aria}
      className="w-full"
      config={config}
      data={model.points}
      groups={model.groups}
      valueFormatter={numberFormat}
    />
  );
};

/**
 * The Chart View shell. It holds the type switch, the Decimal comma switch, the
 * series selector, the caption, the chart, its notes, and its Charted data
 * table. It never renders while the grid is editing.
 */
/* oxlint-disable-next-line eslint/complexity -- The chart shell renders one explicit branch per fixed type, empty state, cap, and legend note. */
export const TabularChart = ({
  embedded = false,
  type,
  decimalComma,
  scope,
  status,
  model,
  sheetName,
  onTypeChange,
  onDecimalCommaChange,
  onSeriesChange,
}: TabularChartProps) => {
  const { t, locale } = useTranslation();
  const heading = useRef<HTMLHeadingElement>(null);
  const [tableOpen, setTableOpen] = useState(false);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const blank = t("tabularBlankValue");
  const scopeLabel =
    scope === "selection"
      ? t("tabularChartSelection")
      : t("tabularCurrentView");
  const typeLabel = t(chartTypeLabelKey[type]);
  const numberFormat = (value: number) => value.toLocaleString(locale);
  const summary = model
    ? summarizeChart(model, {
        rowNumberLabel: t("tabularChartRowNumber"),
        blankLabel: blank,
      })
    : null;
  const rows = (summary?.rows ?? 0).toLocaleString(locale);
  const caption =
    model?.kind === "series" && model.cap === "bar"
      ? t("tabularChartBarCaption", {
          sheet: sheetName,
          shown: model.shownRows.toLocaleString(locale),
          total: model.totalRows.toLocaleString(locale),
        })
      : t("tabularChartCaption", {
          sheet: sheetName,
          rows,
        });
  const aria = t("tabularChartAria", {
    type: typeLabel,
    scope: scopeLabel,
    sheet: sheetName,
    rows,
    category: summary?.category ?? t("tabularChartRowNumber"),
    series: summary?.series.join(", ") ?? "",
  });
  const numericColumns = model?.kind === "series" ? model.numericColumns : [];
  const selected =
    model?.kind === "series"
      ? model.series.map((series) => series.columnId)
      : [];
  const selectedSet = new Set(selected);

  return (
    <section
      aria-labelledby="tabular-chart-heading"
      className={embedded ? "bg-card min-w-0" : "border-rule min-w-0 border-2"}
    >
      <div className="border-rule flex min-w-0 flex-wrap items-start gap-3 border-b-2 p-3">
        <div className="w-full min-w-0 sm:w-48">
          <Select
            className="w-full"
            selectedKey={type}
            onSelectionChange={(key) => {
              const next = chartTypes.find((entry) => entry === key);
              if (next) {
                onTypeChange(next);
              }
            }}
          >
            <Label>{t("tabularChartType")}</Label>
            <div className="mt-1">
              <SelectTrigger />
            </div>
            <SelectContent>
              {chartTypes.map((entry) => (
                <SelectItem
                  id={entry}
                  key={entry}
                  textValue={t(chartTypeLabelKey[entry])}
                >
                  <ChartTypeIcon type={entry} />
                  <SelectLabel>{t(chartTypeLabelKey[entry])}</SelectLabel>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full min-w-0 sm:w-80">
          <SwitchField
            isSelected={decimalComma}
            onChange={onDecimalCommaChange}
          >
            <Switch className="w-fit">{t("tabularChartDecimalComma")}</Switch>
            <Description>{t("tabularChartDecimalCommaHint")}</Description>
          </SwitchField>
        </div>
        {numericColumns.length > chartSeriesCap ? (
          <div className="min-w-0 basis-full">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-base/6 font-semibold sm:text-sm/6">
                {t("tabularChartSeries")}
              </p>
              <p className="text-muted-fg text-xs">
                {t("tabularChartSeriesCount", {
                  shown: selected.length.toLocaleString(locale),
                  total: numericColumns.length.toLocaleString(locale),
                })}
              </p>
            </div>
            <p className="text-muted-fg mt-1 text-sm/6">
              {t("tabularChartSeriesHint")}
            </p>
            <CheckboxGroup
              aria-label={t("tabularChartSeries")}
              value={selected.map(String)}
              onChange={(values) => {
                const picked = new Set(values);
                const next: T.ColumnId[] = [];
                for (const column of numericColumns) {
                  if (picked.has(String(column.columnId))) {
                    next.push(column.columnId);
                  }
                }
                if (next.length && next.length <= chartSeriesCap) {
                  onSeriesChange(next);
                }
              }}
            >
              <div className="mt-2 grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                {numericColumns.map((column) => {
                  const checked = selectedSet.has(column.columnId);
                  return (
                    <CheckboxField
                      isDisabled={!checked && selected.length >= chartSeriesCap}
                      key={column.columnId}
                      value={String(column.columnId)}
                    >
                      <Checkbox>
                        {column.label.trim() ? column.label : blank}
                      </Checkbox>
                    </CheckboxField>
                  );
                })}
              </div>
            </CheckboxGroup>
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-3 p-3">
        <h2
          className="text-lg font-extrabold [overflow-wrap:anywhere]"
          id="tabular-chart-heading"
          ref={heading}
          tabIndex={-1}
        >
          {caption}
        </h2>

        {status === "loading" || status === "idle" ? (
          <p className="text-muted-fg text-sm">{t("loading")}</p>
        ) : model?.kind === "empty" ? (
          <Note intent="info">
            <p>{t(chartEmptyLabelKey[model.reason])}</p>
          </Note>
        ) : model?.kind === "series" ? (
          <SeriesChart aria={aria} model={model} numberFormat={numberFormat} />
        ) : model?.kind === "donut" ? (
          <DonutChart aria={aria} model={model} numberFormat={numberFormat} />
        ) : model?.kind === "scatter" ? (
          <Scatter aria={aria} model={model} numberFormat={numberFormat} />
        ) : null}

        {model?.kind === "series" && model.cap === "sample" ? (
          <p className="text-sm">
            {t("tabularChartSampled", {
              shown: model.shownRows.toLocaleString(locale),
              total: model.totalRows.toLocaleString(locale),
            })}
          </p>
        ) : null}
        {model?.kind === "donut" && model.tailCount ? (
          <p className="text-sm">
            {t("tabularChartDonutCapped", {
              shown: Math.min(
                chartSliceCap,
                model.slices.length - (model.other ? 1 : 0)
              ).toLocaleString(locale),
              count: model.tailCount.toLocaleString(locale),
              other: model.other ?? t("tabularChartOther"),
            })}
          </p>
        ) : null}
        {model?.kind === "donut" && model.skipped ? (
          <p className="text-sm">
            {t("tabularChartDonutSkipped", {
              count: model.skipped.toLocaleString(locale),
            })}
          </p>
        ) : null}
        {model?.kind === "scatter" &&
        model.totalGroups > model.groups.length ? (
          <p className="text-sm">{t("tabularChartGroupsCapped")}</p>
        ) : null}

        {model && model.kind !== "empty" ? (
          <DataTable
            model={model}
            numberFormat={numberFormat}
            open={tableOpen}
            onOpenChange={setTableOpen}
          />
        ) : null}
      </div>
    </section>
  );
};
