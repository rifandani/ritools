"use client"

import { type ComponentProps, type ReactNode, useMemo } from "react"
import { Cell, PolarAngleAxis, RadialBar, RadialBarChart as RadialBarChartPrimitive } from "recharts"
import {
  type BaseChartProps,
  Chart,
  type ChartConfig,
  ChartLegend,
  ChartLegendContent,
  ChartProofDefs,
  chartProofFill,
  ChartTooltip,
  ChartTooltipContent,
  constructCategoryColors,
  DEFAULT_COLORS,
  getColorValue,
} from "./chart"

export interface RadialBarChartSeries {
  dataKey: string
  name?: string
  radialBarProps?: Omit<ComponentProps<typeof RadialBar>, "dataKey" | "name">
}

export interface RadialBarChartProps extends Omit<ComponentProps<"div">, "children"> {
  config: ChartConfig
  data: Record<string, any>[]
  dataKey: string
  nameKey?: string
  series: RadialBarChartSeries[]
  colors?: readonly string[]
  containerHeight?: number
  legend?: BaseChartProps["legend"]
  legendProps?: BaseChartProps["legendProps"]
  tooltip?: boolean | ComponentProps<typeof ChartTooltip>["content"]
  tooltipProps?: Omit<ComponentProps<typeof ChartTooltip>, "content">
  angleAxisProps?: ComponentProps<typeof PolarAngleAxis>
  chartProps?: Omit<ComponentProps<typeof RadialBarChartPrimitive>, "data">
  children?: ReactNode
}

export function RadialBarChart({
  config,
  data,
  dataKey,
  nameKey,
  series,
  colors = DEFAULT_COLORS,
  containerHeight = 360,
  legend = series.length > 1,
  legendProps,
  tooltip = true,
  tooltipProps,
  angleAxisProps,
  chartProps,
  children,
  ...props
}: RadialBarChartProps) {
  const seriesKeys = useMemo(() => series.map((item) => item.dataKey), [series])
  const categoryColors = useMemo(
    () => constructCategoryColors(seriesKeys, colors),
    [seriesKeys, colors]
  )
  const usesDataColors = series.length === 1 && typeof series[0]?.radialBarProps?.fill !== "string"
  const seriesColors = series.map((item, index) =>
    typeof item.radialBarProps?.fill === "string"
      ? item.radialBarProps.fill
      : getColorValue(
          config[item.dataKey]?.color ??
            categoryColors.get(item.dataKey) ??
            colors[index % colors.length]
        )
  )
  const dataColors = data.map((item, index) => {
    const category = nameKey && typeof item[nameKey] === "string" ? item[nameKey] : undefined
    return getColorValue(
      (category ? config[category]?.color : undefined) ?? colors[index % colors.length]
    )
  })
  const dataLabels = data.map((item, index) =>
    String((nameKey ? item[nameKey] : undefined) ?? item.name ?? index + 1)
  )
  // One series over many rows is a ring per row: the legend names the rows,
  // not the series, so every ring has a printed name.
  const legendPayload = usesDataColors
    ? data.map((_item, index) => ({
        color: dataColors[index] ?? "var(--chart-1)",
        dataKey: dataLabels[index] ?? String(index + 1),
        type: "circle" as const,
        value: dataLabels[index] ?? String(index + 1),
      }))
    : series.map((item, index) => ({
        color: seriesColors[index] ?? "var(--chart-1)",
        dataKey: item.dataKey,
        type: "circle" as const,
        value: item.name ?? item.dataKey,
      }))
  const proofColors = usesDataColors ? dataColors : seriesColors

  return (
    <Chart
      config={config}
      data={data}
      dataKey={dataKey}
      containerHeight={containerHeight}
      layout="radial"
      {...props}
    >
      {({ chartId, reduceMotion, selectedLegend }) => {
        const chartData = usesDataColors
          ? data.map((item, index) => {
              if (typeof item.fill === "string") {
                return item
              }

              const tone = dataColors[index] ?? "var(--chart-1)"

              return { ...item, fill: chartProofFill(chartId, index, tone) }
            })
          : data

        return (
        <RadialBarChartPrimitive data={chartData} innerRadius="25%" {...chartProps}>
          <ChartProofDefs colors={proofColors} id={chartId} />
          {angleAxisProps ? (
            <PolarAngleAxis type="number" tick={false} {...angleAxisProps} />
          ) : null}
          {children}
          {tooltip ? (
            <ChartTooltip
              cursor={false}
              content={
                typeof tooltip === "boolean" ? (
                  <ChartTooltipContent
                    hideLabel
                    nameKey={nameKey}
                    accessibilityLayer
                  />
                ) : (
                  tooltip
                )
              }
              {...tooltipProps}
            />
          ) : null}
          {legend ? (
            <ChartLegend
              content={
                typeof legend === "boolean"
                  ? (contentProps) => (
                      <ChartLegendContent
                        align={contentProps.align}
                        verticalAlign={contentProps.verticalAlign}
                        payload={legendPayload}
                      />
                    )
                  : legend
              }
              {...legendProps}
            />
          ) : null}
          {series.map((item, index) => {
            const color = seriesColors[index] ?? "var(--chart-1)"
            const fill = usesDataColors ? undefined : chartProofFill(chartId, index, color)
            const isDimmed = selectedLegend !== null && selectedLegend !== item.dataKey
            const { fillOpacity = 1, ...radialBarProps } = item.radialBarProps ?? {}

            return (
              <RadialBar
                background={{ fill: "var(--muted)" }}
                barSize={18}
                dataKey={item.dataKey}
                fill={fill}
                fillOpacity={isDimmed ? 0.12 : fillOpacity}
                isAnimationActive={!reduceMotion}
                key={item.dataKey}
                name={item.name ?? item.dataKey}
                stroke={usesDataColors ? "var(--bg)" : color}
                strokeWidth={2}
                {...radialBarProps}
              >
                {usesDataColors
                  ? chartData.map((row, rowIndex) => {
                      const label = dataLabels[rowIndex] ?? String(rowIndex + 1)
                      const rowDimmed = selectedLegend !== null && selectedLegend !== label
                      return (
                        <Cell
                          fill={row.fill}
                          fillOpacity={rowDimmed ? 0.12 : 1}
                          key={label}
                        />
                      )
                    })
                  : null}
              </RadialBar>
            )
          })}
        </RadialBarChartPrimitive>
        )
      }}
    </Chart>
  )
}
