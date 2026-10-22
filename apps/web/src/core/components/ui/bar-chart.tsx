"use client"

import { type ComponentProps, startTransition, useMemo } from "react"
import { Bar, BarChart as BarChartPrimitive } from "recharts"
import {
  type BaseChartProps,
  CartesianGrid,
  Chart,
  ChartLegend,
  ChartLegendContent,
  ChartProofDefs,
  chartProofFill,
  ChartTooltip,
  ChartTooltipContent,
  constructCategoryColors,
  DEFAULT_COLORS,
  getColorValue,
  valueToPercent,
  XAxis,
  YAxis,
} from "./chart"

export interface BarChartProps extends BaseChartProps {
  barCategoryGap?: number
  /** Kept for API compatibility. This world prints square bars. */
  barRadius?: number
  barGap?: number
  barSize?: number
  cartesianGridProps?: ComponentProps<typeof CartesianGrid>
  barProps?: Partial<React.ComponentProps<typeof Bar>>
  chartProps?: Omit<ComponentProps<typeof BarChartPrimitive>, "data" | "stackOffset">
}

export function BarChart({
  data = [],
  dataKey,
  colors = DEFAULT_COLORS,
  type = "default",
  config,
  children,
  layout = "horizontal",

  // Components
  tooltip = true,
  tooltipProps,

  legend = true,
  legendProps,

  intervalType = "equidistantPreserveStart",

  barCategoryGap = 5,
  barGap,
  barSize,
  barRadius: _barRadius,

  barProps,

  valueFormatter = (value: number) => value.toString(),

  // XAxis
  displayEdgeLabelsOnly = false,
  xAxisProps,
  hideXAxis = false,

  // YAxis
  yAxisProps,
  hideYAxis = false,

  hideGridLines = false,
  cartesianGridProps,
  chartProps,

  ...props
}: BarChartProps) {
  const configKeys = useMemo(() => Object.keys(config), [config])
  const categoryColors = useMemo(
    () => constructCategoryColors(configKeys, colors),
    [configKeys, colors]
  )

  const configEntries = useMemo(() => Object.entries(config), [config])
  const seriesColors = useMemo(
    () =>
      configEntries.map(([category, values]) =>
        getColorValue(values.color || categoryColors.get(category))
      ),
    [categoryColors, configEntries]
  )
  const legendPayload = useMemo(
    () =>
      configEntries.map(([category], index) => ({
        color: seriesColors[index] ?? "var(--chart-1)",
        dataKey: category,
        type: "circle" as const,
        value: category,
      })),
    [configEntries, seriesColors]
  )

  const stacked = type === "stacked" || type === "percent"

  return (
    <Chart config={config} data={data} dataKey={dataKey} layout={layout} {...props}>
      {({ chartId, onLegendSelect, reduceMotion, selectedLegend }) => (
        <BarChartPrimitive
          barCategoryGap={barCategoryGap}
          barGap={barGap}
          barSize={barSize}
          data={data}
          layout={layout === "radial" ? "horizontal" : layout}
          margin={{
            bottom: 0,
            left: 5,
            right: 12,
            top: 5,
          }}
          stackOffset={type === "percent" ? "expand" : stacked ? "sign" : undefined}
          {...chartProps}
        >
          <ChartProofDefs colors={seriesColors} id={chartId} />
          {!hideGridLines && <CartesianGrid {...cartesianGridProps} />}
          <XAxis
            displayEdgeLabelsOnly={displayEdgeLabelsOnly}
            hide={hideXAxis}
            intervalType={intervalType}
            {...xAxisProps}
          />
          <YAxis
            hide={hideYAxis}
            tickFormatter={type === "percent" ? valueToPercent : valueFormatter}
            {...yAxisProps}
          />

          {legend && (
            <ChartLegend
              content={
                typeof legend === "boolean" ? (
                  <ChartLegendContent payload={legendPayload} />
                ) : (
                  legend
                )
              }
              {...legendProps}
            />
          )}

          {tooltip && (
            <ChartTooltip
              content={
                typeof tooltip === "boolean" ? <ChartTooltipContent accessibilityLayer /> : tooltip
              }
              {...tooltipProps}
            />
          )}

          {!children
            ? configEntries.map(([category], index) => {
                const color = seriesColors[index] ?? "var(--chart-1)"
                const isDimmed = selectedLegend !== null && selectedLegend !== category

                return (
                  <Bar
                    dataKey={category}
                    fill={chartProofFill(chartId, index, color)}
                    fillOpacity={isDimmed ? 0.1 : 1}
                    isAnimationActive={!reduceMotion}
                    key={category}
                    name={category}
                    onClick={(_item, _number, event) => {
                      event.stopPropagation()

                      startTransition(() => {
                        onLegendSelect(category)
                      })
                    }}
                    radius={0}
                    stackId={stacked ? "stack" : undefined}
                    stroke={color}
                    strokeOpacity={isDimmed ? 0.2 : 1}
                    strokeWidth={2}
                    {...barProps}
                  />
                )
              })
            : children}
        </BarChartPrimitive>
      )}
    </Chart>
  )
}
