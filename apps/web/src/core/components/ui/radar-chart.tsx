"use client"

import { type ComponentProps, type ReactNode, useMemo } from "react"
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RadarChartPrimitive,
} from "recharts"
import { useIsMobile } from "@/core/hooks/use-mobile"
import {
  Chart,
  type ChartConfig,
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
} from "./chart"

export interface RadarChartSeries {
  dataKey: string
  name?: string
  radarProps?: Omit<ComponentProps<typeof Radar>, "dataKey" | "name">
}

export interface RadarChartProps extends Omit<ComponentProps<"div">, "children"> {
  config: ChartConfig
  data: Record<string, any>[]
  dataKey: string
  series: RadarChartSeries[]
  colors?: readonly string[]
  containerHeight?: number
  legend?: boolean
  tooltip?: boolean | ComponentProps<typeof ChartTooltip>["content"]
  tooltipProps?: Omit<ComponentProps<typeof ChartTooltip>, "content">
  polarGridProps?: ComponentProps<typeof PolarGrid>
  angleAxisProps?: Omit<ComponentProps<typeof PolarAngleAxis>, "dataKey">
  radiusAxisProps?: ComponentProps<typeof PolarRadiusAxis>
  chartProps?: Omit<ComponentProps<typeof RadarChartPrimitive>, "data">
  children?: ReactNode
}

export function RadarChart({
  config,
  data,
  dataKey,
  series,
  colors = DEFAULT_COLORS,
  containerHeight = 360,
  legend = series.length > 1,
  tooltip = true,
  tooltipProps,
  polarGridProps,
  angleAxisProps,
  radiusAxisProps,
  chartProps,
  children,
  ...props
}: RadarChartProps) {
  const isMobile = useIsMobile()
  const seriesKeys = useMemo(() => series.map((item) => item.dataKey), [series])
  const categoryColors = useMemo(
    () => constructCategoryColors(seriesKeys, colors),
    [seriesKeys, colors]
  )
  const seriesColors = useMemo(
    () =>
      series.map((item, index) =>
        getColorValue(
          config[item.dataKey]?.color ?? categoryColors.get(item.dataKey) ?? colors[index % colors.length]
        )
      ),
    [categoryColors, colors, config, series]
  )
  const legendPayload = useMemo(
    () =>
      series.map((item, index) => ({
        color: seriesColors[index] ?? "var(--chart-1)",
        dataKey: item.dataKey,
        type: "circle" as const,
        value: item.name ?? item.dataKey,
      })),
    [series, seriesColors]
  )

  return (
    <Chart
      config={config}
      data={data}
      dataKey={dataKey}
      containerHeight={containerHeight}
      layout="radial"
      {...props}
    >
      {({ chartId, reduceMotion, selectedLegend }) => (
        <RadarChartPrimitive data={data} outerRadius={isMobile ? "62%" : "72%"} {...chartProps}>
          <ChartProofDefs colors={seriesColors} id={chartId} />
          <PolarGrid stroke="var(--border)" strokeWidth={2} {...polarGridProps} />
          <PolarAngleAxis
            dataKey={dataKey}
            tick={{ fill: "var(--muted-fg)", fontSize: isMobile ? 10 : 12 }}
            {...angleAxisProps}
          />
          <PolarRadiusAxis axisLine={false} tick={false} {...radiusAxisProps} />
          {children}
          {tooltip ? (
            <ChartTooltip
              content={
                typeof tooltip === "boolean" ? <ChartTooltipContent accessibilityLayer /> : tooltip
              }
              {...tooltipProps}
            />
          ) : null}
          {legend ? <ChartLegend content={<ChartLegendContent payload={legendPayload} />} /> : null}
          {series.map((item, index) => {
            const color = seriesColors[index] ?? "var(--chart-1)"
            const isDimmed = selectedLegend !== null && selectedLegend !== item.dataKey
            const {
              fillOpacity = series.length > 1 ? 0.16 : 0.3,
              strokeOpacity = 1,
              ...radarProps
            } = item.radarProps ?? {}

            return (
              <Radar
                dataKey={item.dataKey}
                fill={chartProofFill(chartId, index, color)}
                fillOpacity={isDimmed ? 0.04 : fillOpacity}
                isAnimationActive={!reduceMotion}
                key={item.dataKey}
                name={item.name ?? item.dataKey}
                stroke={color}
                strokeDasharray={chartProofDash(index)}
                strokeOpacity={isDimmed ? 0.12 : strokeOpacity}
                strokeWidth={2}
                {...radarProps}
              />
            )
          })}
        </RadarChartPrimitive>
      )}
    </Chart>
  )
}
