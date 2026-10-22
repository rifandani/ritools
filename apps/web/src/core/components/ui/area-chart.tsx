'use client'

import { type ComponentProps, useMemo } from "react"
import { Area, AreaChart as AreaChartPrimitive } from "recharts"
import {
  type BaseChartProps,
  CartesianGrid,
  Chart,
  ChartLegend,
  ChartLegendContent,
  ChartProofDefs,
  chartProofDash,
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

export interface AreaChartProps extends BaseChartProps {
  chartProps?: Omit<ComponentProps<typeof AreaChartPrimitive>, "data" | "stackOffset">
  areaProps?: Partial<ComponentProps<typeof Area>>
  connectNulls?: boolean
  /**
   * The prop stays for API compatibility. This world has no gradients:
   * "gradient" prints the default proof screen, "solid" a low solid tone,
   * and "none" the stroke only.
   */
  fillType?: "gradient" | "solid" | "none"
}

export function AreaChart({
  data = [],
  dataKey,
  colors = DEFAULT_COLORS,
  connectNulls = false,
  type = "default",

  fillType = "gradient",
  config,
  children,

  areaProps,

  // Components
  tooltip = true,
  tooltipProps,

  cartesianGridProps,

  legend = true,
  legendProps,

  intervalType = "equidistantPreserveStart",

  valueFormatter = (value: number) => value.toString(),

  // XAxis
  displayEdgeLabelsOnly = false,
  hideXAxis = false,
  xAxisProps,

  // YAxis
  hideYAxis = false,
  yAxisProps,

  hideGridLines = false,
  chartProps,
  ...props
}: AreaChartProps) {
  const configKeys = useMemo(() => Object.keys(config), [config])
  const categoryColors = useMemo(
    () => constructCategoryColors(configKeys, colors),
    [configKeys, colors]
  )
  const stacked = type === "stacked" || type === "percent"

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

  return (
    <Chart config={config} data={data} dataKey={dataKey} {...props}>
      {({ chartId, reduceMotion, selectedLegend }) => (
        <AreaChartPrimitive
          data={data}
          margin={{
            bottom: 0,
            left: 0,
            right: 12,
            top: 5,
          }}
          stackOffset={type === "percent" ? "expand" : undefined}
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
                typeof tooltip === "boolean" ? (
                  <ChartTooltipContent
                    {...{
                      hideIndicator: tooltipProps?.hideIndicator,
                      hideLabel: tooltipProps?.hideLabel,
                      cursor: tooltipProps?.cursor,
                      indicator: tooltipProps?.indicator,
                      labelSeparator: tooltipProps?.labelSeparator,
                      formatter: tooltipProps?.formatter,
                      labelFormatter: tooltipProps?.labelFormatter,
                    }}
                    accessibilityLayer
                  />
                ) : (
                  tooltip
                )
              }
              {...tooltipProps}
            />
          )}

          {!children
            ? configEntries.map(([category, values], index) => {
                const color = seriesColors[index] ?? "var(--chart-1)"
                const isDimmed = selectedLegend !== null && selectedLegend !== category
                // A stacked area never overlaps, so its proof screen prints at
                // full strength. A plain area overlaps its neighbors, so the
                // screen drops to a light tint and the dashes carry the series.
                const proofOpacity = stacked ? 1 : 0.12
                const fill =
                  fillType === "none"
                    ? "transparent"
                    : fillType === "solid"
                      ? color
                      : chartProofFill(chartId, index, color)

                return (
                  <Area
                    connectNulls={connectNulls}
                    dataKey={category}
                    dot={false}
                    fill={fill}
                    fillOpacity={isDimmed ? 0.08 : fillType === "solid" ? 0.16 : proofOpacity}
                    isAnimationActive={!reduceMotion}
                    key={category}
                    name={category}
                    stackId={stacked ? "stack" : undefined}
                    stroke={color}
                    strokeDasharray={chartProofDash(index)}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    strokeOpacity={isDimmed ? 0.12 : 1}
                    style={{ strokeWidth: 2 }}
                    {...areaProps}
                  />
                )
              })
            : children}
        </AreaChartPrimitive>
      )}
    </Chart>
  )
}
