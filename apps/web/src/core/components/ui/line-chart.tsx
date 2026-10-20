'use client'

import { useMemo } from "react"
import { Line, LineChart as LineChartPrimitive, type LineProps } from "recharts"
import {
  type BaseChartProps,
  CartesianGrid,
  Chart,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  chartProofDash,
  constructCategoryColors,
  DEFAULT_COLORS,
  getColorValue,
  valueToPercent,
  XAxis,
  YAxis,
} from "./chart"

/** A 6px proof marker: square, hollow square, plus, bar, upright bar. */
function SeriesMarker({
  color,
  cx,
  cy,
  index,
}: {
  color: string
  cx: number
  cy: number
  index: number
}) {
  switch (index % 5) {
    case 1:
      return (
        <rect
          fill="var(--bg)"
          height={6}
          stroke={color}
          strokeWidth={2}
          width={6}
          x={cx - 3}
          y={cy - 3}
        />
      )
    case 2:
      return (
        <path
          d={`M${cx - 3} ${cy}H${cx + 3}M${cx} ${cy - 3}V${cy + 3}`}
          fill="none"
          stroke={color}
          strokeWidth={2}
        />
      )
    case 3:
      return <rect fill={color} height={2} width={7} x={cx - 3.5} y={cy - 1} />
    case 4:
      return <rect fill={color} height={7} width={2} x={cx - 1} y={cy - 3.5} />
    default:
      return <rect fill={color} height={4} width={4} x={cx - 2} y={cy - 2} />
  }
}

export interface LineChartProps extends BaseChartProps {
  connectNulls?: boolean
  lineProps?: LineProps
  chartProps?: Omit<React.ComponentProps<typeof LineChartPrimitive>, "data" | "stackOffset">
}

export function LineChart({
  data = [],
  dataKey,
  colors = DEFAULT_COLORS,
  connectNulls = false,
  type = "default",
  config,
  children,

  // Components
  tooltip = true,
  tooltipProps,

  legend = true,
  legendProps,

  intervalType = "equidistantPreserveStart",

  valueFormatter = (value: number) => value.toString(),

  // XAxis
  displayEdgeLabelsOnly = false,
  xAxisProps,
  hideXAxis = false,

  // YAxis
  yAxisProps,
  hideYAxis = false,

  hideGridLines = false,
  chartProps,
  lineProps,
  ...props
}: LineChartProps) {
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

  return (
    <Chart config={config} data={data} dataKey={dataKey} {...props}>
      {({ reduceMotion, selectedLegend }) => (
        <LineChartPrimitive
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
          {!hideGridLines && <CartesianGrid />}
          <XAxis
            hide={hideXAxis}
            displayEdgeLabelsOnly={displayEdgeLabelsOnly}
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
                  <ChartLegendContent mark="line" payload={legendPayload} />
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
                const isDimmed = selectedLegend !== null && selectedLegend !== category
                const color = seriesColors[index] ?? "var(--chart-1)"

                return (
                  <Line
                    activeDot={false}
                    connectNulls={connectNulls}
                    dataKey={category}
                    dot={(markerProps) => (
                      <SeriesMarker
                        color={color}
                        cx={Number(markerProps.cx ?? 0)}
                        cy={Number(markerProps.cy ?? 0)}
                        index={index}
                      />
                    )}
                    isAnimationActive={!reduceMotion}
                    key={category}
                    name={category}
                    stroke={color}
                    strokeDasharray={chartProofDash(index)}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    style={
                      {
                        strokeOpacity: isDimmed ? 0.12 : 1,
                        strokeWidth: 2,
                        "--line-color": color,
                      } as React.CSSProperties
                    }
                    type="linear"
                    {...lineProps}
                  />
                )
              })
            : children}
        </LineChartPrimitive>
      )}
    </Chart>
  )
}
