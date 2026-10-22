"use client"

import type { ComponentProps } from "react"
import { Cell, Label, Pie, PieChart as PieChartPrimitive } from "recharts"
import {
  type BaseChartProps,
  Chart,
  ChartLegend,
  ChartLegendContent,
  ChartProofDefs,
  chartProofFill,
  ChartTooltip,
  ChartTooltipContent,
  DEFAULT_COLORS,
  getColorValue,
} from "./chart"

function sumNumericArray(arr: number[]): number {
  return arr.reduce((sum, num) => sum + num, 0)
}

function calculateDefaultLabel(data: any[], valueKey: string): number {
  return sumNumericArray(data.map((dataPoint) => dataPoint[valueKey]))
}

function parseLabelInput(
  labelInput: string | undefined,
  valueFormatter: (value: number) => string,
  data: any[],
  valueKey: string
): string {
  return labelInput || valueFormatter(calculateDefaultLabel(data, valueKey))
}

interface PieChartProps extends Omit<
  BaseChartProps,
  | "hideGridLines"
  | "hideXAxis"
  | "hideYAxis"
  | "xAxisProps"
  | "yAxisProps"
  | "displayEdgeLabelsOnly"
  | "legend"
  | "legendProps"
> {
  variant?: "pie" | "donut"
  nameKey?: string

  chartProps?: Omit<ComponentProps<typeof PieChartPrimitive>, "data" | "stackOffset">

  label?: string
  showLabel?: boolean
  pieProps?: Omit<ComponentProps<typeof Pie>, "data" | "dataKey" | "name">
}

const PieChart = ({
  data = [],
  dataKey,
  colors = DEFAULT_COLORS,
  config,
  children,
  label,
  showLabel,

  // Components
  tooltip = true,
  tooltipProps,

  variant = "pie",
  nameKey,

  chartProps,

  valueFormatter = (value: number) => value.toString(),
  pieProps,
  ...props
}: PieChartProps) => {
  const parsedLabelInput = parseLabelInput(label, valueFormatter, data, dataKey)

  const cells = data.map((item, index) => {
    const name = String(item?.[nameKey ?? "name"] ?? index + 1)
    return {
      color: getColorValue(config?.[name]?.color ?? colors[index % colors.length]),
      index,
      name,
    }
  })
  const legendPayload = cells.map((cell) => ({
    color: cell.color,
    dataKey: cell.name,
    type: "circle" as const,
    value: cell.name,
  }))

  return (
    <Chart config={config} data={data} layout="radial" dataKey={dataKey} {...props}>
      {({ chartId, reduceMotion, selectedLegend }) => (
        <PieChartPrimitive
          data={data}
          margin={{
            bottom: 0,
            left: 0,
            right: 0,
            top: 0,
          }}
          {...chartProps}
        >
          <ChartProofDefs colors={cells.map((cell) => cell.color)} id={chartId} />

          {!children ? (
            <Pie
              cx={pieProps?.cx ?? "50%"}
              cy={pieProps?.cy ?? "50%"}
              data={data}
              dataKey={dataKey}
              endAngle={pieProps?.endAngle ?? -270}
              innerRadius={variant === "donut" ? "50%" : "0%"}
              isAnimationActive={!reduceMotion}
              name={nameKey}
              startAngle={pieProps?.startAngle ?? 90}
              {...pieProps}
            >
              {cells.map((cell) => {
                const isDimmed = selectedLegend !== null && selectedLegend !== cell.name
                return (
                  <Cell
                    fill={chartProofFill(chartId, cell.index, cell.color)}
                    fillOpacity={isDimmed ? 0.15 : 1}
                    key={`cell-${cell.index}`}
                    stroke="var(--bg)"
                    strokeWidth={2}
                  />
                )
              })}
              {showLabel && variant === "donut" && (
                <Label
                  className="fill-fg num"
                  fontSize={24}
                  fontWeight={600}
                  position="center"
                  value={parsedLabelInput}
                />
              )}
            </Pie>
          ) : (
            children
          )}

          {tooltip && (
            <ChartTooltip
              content={
                typeof tooltip === "boolean" ? (
                  <ChartTooltipContent
                    hideLabel
                    labelSeparator={false}
                    nameKey={nameKey}
                    accessibilityLayer
                  />
                ) : (
                  tooltip
                )
              }
              {...tooltipProps}
            />
          )}

          {/* The legend names every slice, so a pie never depends on color. */}
          <ChartLegend
            content={
              <ChartLegendContent nameKey={nameKey} payload={legendPayload} />
            }
          />
        </PieChartPrimitive>
      )}
    </Chart>
  )
}

export type { PieChartProps }
export { PieChart }
