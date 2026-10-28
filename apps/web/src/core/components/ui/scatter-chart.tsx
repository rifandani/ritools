'use client'

import { useMemo } from 'react'
import {
  Scatter,
  ScatterChart as ScatterChartPrimitive,
  type ScatterPointItem,
} from 'recharts'
import {
  type BaseChartProps,
  CartesianGrid,
  Chart,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  constructCategoryColors,
  DEFAULT_COLORS,
  getColorValue,
  XAxis,
  YAxis,
} from './chart'

/** The same five proof marks the line chart prints, as 7px point shapes. */
function ScatterMark({
  color,
  cx,
  cy,
  index,
  opacity,
}: {
  color: string
  cx: number | undefined
  cy: number | undefined
  index: number
  opacity: number
}) {
  if (cx === undefined || cy === undefined) {
    return <g />
  }

  switch (index % 5) {
    case 1:
      return (
        <rect
          fill="var(--bg)"
          height={7}
          opacity={opacity}
          stroke={color}
          strokeWidth={2}
          width={7}
          x={cx - 3.5}
          y={cy - 3.5}
        />
      )
    case 2:
      return (
        <path
          d={`M${cx - 3.5} ${cy}H${cx + 3.5}M${cx} ${cy - 3.5}V${cy + 3.5}`}
          fill="none"
          opacity={opacity}
          stroke={color}
          strokeWidth={2}
        />
      )
    case 3:
      return (
        <rect
          fill={color}
          height={3}
          opacity={opacity}
          width={9}
          x={cx - 4.5}
          y={cy - 1.5}
        />
      )
    case 4:
      return (
        <rect
          fill={color}
          height={9}
          opacity={opacity}
          width={3}
          x={cx - 1.5}
          y={cy - 4.5}
        />
      )
    default:
      return (
        <rect
          fill={color}
          height={6}
          opacity={opacity}
          width={6}
          x={cx - 3}
          y={cy - 3}
        />
      )
  }
}

export interface ScatterChartProps
  extends Omit<BaseChartProps, 'data' | 'dataKey'> {
  data: readonly { x: number; y: number; group: string }[]
  xKey?: string
  yKey?: string
  groups?: readonly string[]
}

/**
 * A scatter of numeric x/y pairs. Each group is a series with its own tone and
 * point shape, so color is never the only encoding. The axes are numeric and
 * the chart never invents a chronological order.
 */
export function ScatterChart({
  data,
  xKey = 'x',
  yKey = 'y',
  groups,
  colors = DEFAULT_COLORS,
  config,
  valueFormatter = (value: number) => value.toString(),

  tooltip = true,
  tooltipProps,

  legend = true,
  legendProps,

  xAxisProps,
  yAxisProps,

  hideGridLines = false,

  ...props
}: ScatterChartProps) {
  const groupNames = useMemo(
    () => groups ?? [...new Set(data.map((point) => point.group))],
    [groups, data]
  )
  const categoryColors = useMemo(
    () => constructCategoryColors([...groupNames], colors),
    [groupNames, colors]
  )
  const seriesColors = useMemo(
    () =>
      groupNames.map((group) =>
        getColorValue(config?.[group]?.color ?? categoryColors.get(group))
      ),
    [categoryColors, config, groupNames]
  )
  const pointsByGroup = useMemo(() => {
    const map = new Map<string, { x: number; y: number; group: string }[]>()
    for (const point of data) {
      const current = map.get(point.group)
      if (current) {
        current.push(point)
      } else {
        map.set(point.group, [point])
      }
    }
    return map
  }, [data])
  const legendPayload = useMemo(
    () =>
      groupNames.map((group, index) => ({
        color: seriesColors[index] ?? 'var(--chart-1)',
        dataKey: group,
        type: 'circle' as const,
        value: group,
      })),
    [groupNames, seriesColors]
  )

  return (
    <Chart config={config} data={data as unknown as Record<string, any>[]} dataKey={xKey} {...props}>
      {({ reduceMotion, selectedLegend }) => (
        <ScatterChartPrimitive
          data={data as unknown as Record<string, any>[]}
          margin={{ bottom: 0, left: 5, right: 12, top: 5 }}
        >
          {!hideGridLines && <CartesianGrid />}
          <XAxis numeric {...xAxisProps} />
          <YAxis numeric type="number" dataKey={yKey} {...yAxisProps} />

          {legend && (
            <ChartLegend
              content={
                typeof legend === 'boolean' ? (
                  <ChartLegendContent mark="point" payload={legendPayload} />
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
                typeof tooltip === 'boolean' ? (
                  <ChartTooltipContent
                    accessibilityLayer
                    formatter={(value) =>
                      typeof value === 'number' ? valueFormatter(value) : value
                    }
                  />
                ) : (
                  tooltip
                )
              }
              {...tooltipProps}
            />
          )}

          {groupNames.map((group, index) => {
            const color = seriesColors[index] ?? 'var(--chart-1)'
            const isDimmed = selectedLegend !== null && selectedLegend !== group
            return (
              <Scatter
                data={pointsByGroup.get(group) ?? []}
                fill={color}
                isAnimationActive={!reduceMotion}
                key={group}
                name={group}
                shape={(marker: ScatterPointItem) => (
                  <ScatterMark
                    color={color}
                    cx={marker.cx}
                    cy={marker.cy}
                    index={index}
                    opacity={isDimmed ? 0.12 : 1}
                  />
                )}
              />
            )
          })}
        </ScatterChartPrimitive>
      )}
    </Chart>
  )
}

export type { ScatterPointItem }
