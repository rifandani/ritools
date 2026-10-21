'use client'

import { createContext, type ReactElement, use, useCallback, useId, useMemo, useState } from "react"
import { useReducedMotion } from "motion/react"
import type { ToggleButtonGroupProps } from "react-aria-components/ToggleButtonGroup"
import type {
  CartesianGridProps as CartesianGridPrimitiveProps,
  CartesianGridProps,
  LegendPayload,
  LegendProps,
  TooltipProps,
  XAxisProps as XAxisPropsPrimitive,
  YAxisProps as YAxisPrimitiveProps,
} from "recharts"
import {
  CartesianGrid as CartesianGridPrimitive,
  Legend as LegendPrimitive,
  ResponsiveContainer,
  Tooltip as TooltipPrimitive,
  XAxis as XAxisPrimitive,
  YAxis as YAxisPrimitive,
} from "recharts"
import type { ContentType as LegendContentType } from "recharts/types/component/DefaultLegendContent"
import type {
  NameType,
  Props as TooltipContentProps,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent"
import type { ContentType as TooltipContentType } from "recharts/types/component/Tooltip"
import { twJoin, cn } from "cn"
import { useIsMobile } from "@/core/hooks/use-mobile"
import { cx } from "@/core/utils/primitive"

const colonRegex = /:/g

// #region Chart Types
type ChartType = "default" | "stacked" | "percent"
type ChartLayout = "horizontal" | "vertical" | "radial"
type IntervalType = "preserveStartEnd" | "equidistantPreserveStart"

type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: ChartColorKeys | (string & {}); theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

const CHART_COLORS = {
  "chart-1": "var(--chart-1)",
  "chart-2": "var(--chart-2)",
  "chart-3": "var(--chart-3)",
  "chart-4": "var(--chart-4)",
  "chart-5": "var(--chart-5)",
} as const

type ChartColorKeys = keyof typeof CHART_COLORS | (string & {})

const DEFAULT_COLORS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] as const

type ChartContextProps = {
  chartId: string
  config: ChartConfig
  data?: Record<string, any>[]
  layout: ChartLayout
  dataKey?: string
  reduceMotion: boolean
  selectedLegend: string | null
  onLegendSelect: (legendItem: string | null) => void
}

const ChartContext = createContext<ChartContextProps | null>(null)

export function useChart() {
  const context = use(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <Chart />")
  }

  return context
}

export function valueToPercent(value: number) {
  return `${(value * 100).toFixed(0)}%`
}

const constructCategoryColors = (
  categories: string[],
  colors: readonly ChartColorKeys[]
): Map<string, ChartColorKeys> => {
  const categoryColors = new Map<string, ChartColorKeys>()

  categories.forEach((category, index) => {
    const color = colors[index % colors.length]
    if (color !== undefined) {
      categoryColors.set(category, color)
    }
  })

  return categoryColors
}

const getColorValue = (color?: string): string => {
  if (!color) {
    return "var(--chart-1)"
  }

  return CHART_COLORS[color as "chart-1"] ?? color
}

/**
 * The five proof marks. A series is named by its tone and its mark, so five
 * series never depend on color (The Proof Mark Rule).
 *   01 solid, 02 16deg rules, 03 4deg rules, 04 square dots, 05 crosshatch.
 * Dashes match the marks for strokes.
 */
const CHART_PROOF = [
  { dash: undefined, mark: "solid" },
  { dash: "10 4", mark: "rules-16" },
  { dash: "6 4", mark: "rules-4" },
  { dash: "14 4 3 4", mark: "dots" },
  { dash: "1 5", mark: "crosshatch" },
] as const

type ChartProofIndex = 0 | 1 | 2 | 3 | 4

const proofPatternId = (id: string, index: number) => `${id}-proof-${index}`

function ChartProofPattern({
  color,
  id,
  index,
  tile = 8,
}: {
  color: string
  id: string
  index: number
  tile?: number
}) {
  if (index === 0) {
    return null
  }

  if (index === 3) {
    return (
      <pattern height={tile} id={id} patternUnits="userSpaceOnUse" width={tile}>
        <rect fill={color} height={2} width={2} />
      </pattern>
    )
  }

  if (index === 4) {
    return (
      <>
        <pattern
          height={tile}
          id={`${id}-a`}
          patternTransform="rotate(4)"
          patternUnits="userSpaceOnUse"
          width={tile}
        >
          <rect fill={color} height={tile} width={2} />
        </pattern>
        <pattern
          height={tile}
          id={`${id}-b`}
          patternTransform="rotate(16)"
          patternUnits="userSpaceOnUse"
          width={tile}
        >
          <rect fill={color} height={tile} width={2} />
        </pattern>
        <pattern height={tile} id={id} patternUnits="userSpaceOnUse" width={tile}>
          <rect fill={`url(#${id}-a)`} height={tile} width={tile} />
          <rect fill={`url(#${id}-b)`} height={tile} width={tile} />
        </pattern>
      </>
    )
  }

  const angle = index === 1 ? 16 : 4
  return (
    <pattern
      height={tile}
      id={id}
      patternTransform={`rotate(${angle})`}
      patternUnits="userSpaceOnUse"
      width={tile}
    >
      <rect fill={color} height={tile} width={2} />
    </pattern>
  )
}

/** The defs a filled chart needs. Pass the resolved tone for each series. */
function ChartProofDefs({ colors, id }: { colors: string[]; id: string }) {
  return (
    <defs>
      {colors.map((color, index) => (
        <ChartProofPattern
          color={color}
          id={proofPatternId(id, index)}
          index={index}
          key={`${color}-${index}`}
        />
      ))}
    </defs>
  )
}

const chartProofFill = (id: string, index: number, color: string) =>
  index === 0 ? color : `url(#${proofPatternId(id, index)})`

const chartProofDash = (index: number) => CHART_PROOF[index % CHART_PROOF.length]?.dash

/** A paper plate holding the series proof, so it reads on the ink legend bar. */
function ChartProofChip({
  className,
  color,
  index,
  mode = "fill",
}: {
  className?: string
  color: string
  index: number
  mode?: "fill" | "line"
}) {
  const uniqueId = useId().replace(colonRegex, "")
  const id = `chip-${uniqueId}`
  const dash = chartProofDash(index)

  return (
    <span
      className={cn(
        "border-rule bg-card grid size-3.5 shrink-0 place-items-center border",
        className
      )}
    >
      {mode === "line" ? (
        <svg aria-hidden className="h-2 w-3" viewBox="0 0 16 8">
          <line
            stroke={color}
            strokeDasharray={dash}
            strokeWidth={2}
            x1={0}
            x2={16}
            y1={4}
            y2={4}
          />
          <rect fill={color} height={4} width={4} x={6} y={2} />
        </svg>
      ) : (
        <svg aria-hidden className="size-2.5" viewBox="0 0 10 10">
          <defs>
            <ChartProofPattern color={color} id={id} index={index} tile={4} />
          </defs>
          <rect fill={index === 0 ? color : `url(#${id})`} height={10} width={10} />
          {index === 0 ? null : (
            <rect fill="none" height={10} stroke={color} strokeWidth={1} width={10} />
          )}
        </svg>
      )}
    </span>
  )
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload && typeof payload.payload === "object" && payload.payload !== null
      ? payload.payload
      : undefined

  let configLabelKey: string = key

  if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string
  }

  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config]
}

interface BaseChartProps extends React.HTMLAttributes<HTMLDivElement> {
  containerHeight?: number
  config: ChartConfig
  data: Record<string, any>[]
  dataKey: string
  colors?: readonly (ChartColorKeys | (string & {}))[]
  type?: ChartType
  intervalType?: IntervalType
  layout?: ChartLayout
  valueFormatter?: (value: number) => string

  tooltip?: TooltipContentType<ValueType, NameType> | boolean
  tooltipProps?: Omit<TooltipProps, "content"> & {
    hideLabel?: boolean
    labelSeparator?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
  }

  cartesianGridProps?: CartesianGridProps

  legend?: LegendContentType | boolean
  legendProps?: Omit<React.ComponentProps<typeof LegendPrimitive>, "content" | "ref">

  xAxisProps?: XAxisPropsPrimitive
  yAxisProps?: YAxisPrimitiveProps

  // XAxis
  displayEdgeLabelsOnly?: boolean

  hideGridLines?: boolean
  hideXAxis?: boolean
  hideYAxis?: boolean
}

const Chart = ({
  id,
  className,
  children,
  config,
  data,
  dataKey,
  ref,
  layout = "horizontal",
  containerHeight,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> &
  Pick<ChartContextProps, "data" | "dataKey"> & {
    config: ChartConfig
    containerHeight?: number
    layout?: ChartLayout
    children: ReactElement | ((props: ChartContextProps) => ReactElement)
  }) => {
  const isMobile = useIsMobile()
  const reduceMotion = useReducedMotion() ?? false
  const uniqueId = useId()
  const chartId = useMemo(() => `chart-${id || uniqueId.replace(colonRegex, "")}`, [id, uniqueId])

  const [selectedLegend, setSelectedLegend] = useState<string | null>(null)

  const onLegendSelect = useCallback((legendItem: string | null) => {
    setSelectedLegend(legendItem)
  }, [])

  const _data = data ?? []
  const _dataKey = dataKey ?? "value"

  const value = useMemo(
    () => ({
      chartId,
      config,
      selectedLegend,
      onLegendSelect,
      data: _data,
      dataKey: _dataKey,
      layout,
      reduceMotion,
    }),
    [chartId, config, selectedLegend, onLegendSelect, _data, _dataKey, layout, reduceMotion]
  )

  return (
    <ChartContext value={value}>
      <div
        data-chart={chartId}
        ref={ref}
        role="figure"
        className={cn("z-20 flex w-full justify-center text-xs", className)}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <ResponsiveContainer height={containerHeight ?? (isMobile ? 200 : 370)}>
          {typeof children === "function" ? children(value) : children}
        </ResponsiveContainer>
      </div>
    </ChartContext>
  )
}

const THEMES = { light: "", dark: ".dark" } as const
const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([_, config]) => config.theme || config.color)

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

type ChartTooltipProps<TValue extends ValueType, TName extends NameType> = TooltipProps<
  TValue,
  TName
>

const tooltipWrapperStyle = { outline: "none" } as const

const cursorStyleRadial = {
  stroke: "var(--fg)",
  strokeWidth: 2,
  fill: "none",
} as const

const cursorStyleDefault = {
  stroke: "var(--fg)",
  strokeWidth: 2,
  fill: "none",
} as const

const ChartTooltip = (props: TooltipProps) => {
  const { layout } = useChart()
  const cursorStyle = layout === "radial" ? cursorStyleRadial : cursorStyleDefault

  return <TooltipPrimitive wrapperStyle={tooltipWrapperStyle} cursor={cursorStyle} {...props} />
}

type ChartLegendProps = Omit<React.ComponentProps<typeof LegendPrimitive>, "ref">

const ChartLegend = (props: ChartLegendProps) => {
  // Recharts sorts legend items by value by default. The series order is the
  // proof order, so it stays as the data declares it.
  return <LegendPrimitive align="center" itemSorter={null} verticalAlign="bottom" {...props} />
}

interface XAxisProps extends Omit<XAxisPropsPrimitive, "ref"> {
  displayEdgeLabelsOnly?: boolean
  intervalType?: IntervalType
}

const tickHorizontal = {
  transform: "translate(0, 6)",
} as const

const XAxis = ({
  displayEdgeLabelsOnly,
  className,
  intervalType = "preserveStartEnd",
  minTickGap = 5,
  ...props
}: XAxisProps) => {
  const { dataKey, data, layout } = useChart()

  const ticks =
    displayEdgeLabelsOnly && data?.length && dataKey
      ? [data[0]?.[dataKey], data[data.length - 1]?.[dataKey]]
      : undefined

  const tick = layout === "horizontal" ? tickHorizontal : undefined
  // A vertical layout puts the value on X, so its figures take the numerals
  // face. The Category axis keeps Archivo.
  const numeric = layout === "vertical"
  return (
    <XAxisPrimitive
      className={cn(
        "text-muted-fg [font-size:0.6875rem] **:[text]:fill-muted-fg",
        numeric ? "num" : "font-medium",
        className
      )}
      interval={displayEdgeLabelsOnly ? "preserveStartEnd" : intervalType}
      tick={tick}
      ticks={ticks}
      tickLine={false}
      axisLine={numeric ? false : { stroke: "var(--rule)", strokeWidth: 2 }}
      minTickGap={minTickGap}
      dataKey={layout === "horizontal" ? dataKey : undefined}
      type={numeric ? "number" : "category"}
      {...props}
    />
  )
}

const yAxisTickHorizontal = {
  transform: "translate(-3, 0)",
} as const

const yAxisTickVertical = {
  transform: "translate(0, 0)",
} as const

const YAxis = ({
  className,
  width,
  domain = ["auto", "auto"],
  type,
  ...props
}: Omit<YAxisPrimitiveProps, "ref">) => {
  const { layout, dataKey } = useChart()

  const tick = layout === "horizontal" ? yAxisTickHorizontal : yAxisTickVertical
  const numeric = layout === "horizontal"

  return (
    <YAxisPrimitive
      className={cn(
        "text-muted-fg [font-size:0.6875rem] **:[text]:fill-muted-fg",
        numeric ? "num" : "font-medium",
        className
      )}
      width={width ?? (layout === "horizontal" ? 48 : 80)}
      domain={domain}
      tick={tick}
      dataKey={layout === "horizontal" ? undefined : dataKey}
      type={type ?? (layout === "horizontal" ? "number" : "category")}
      interval={layout === "horizontal" ? undefined : "equidistantPreserveStart"}
      axisLine={numeric ? false : { stroke: "var(--rule)", strokeWidth: 2 }}
      tickLine={false}
      {...props}
    />
  )
}

const CartesianGrid = ({ className, ...props }: CartesianGridPrimitiveProps) => {
  const { layout } = useChart()
  return (
    <CartesianGridPrimitive
      className={cn("stroke-2 stroke-border", className)}
      horizontal={layout !== "vertical"}
      vertical={layout === "vertical"}
      {...props}
    />
  )
}

const ChartTooltipContent = <TValue extends ValueType, TName extends NameType>({
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelSeparator = true,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
  ref,
}: TooltipContentProps<TValue, TName> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean
    labelSeparator?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
  }) => {
  const { config } = useChart()

  const tooltipLabel = useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null
    }

    const [item] = payload

    if (!item) {
      return null
    }

    const key = `${labelKey || item.dataKey || item.name || "value"}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value =
      !labelKey && typeof label === "string"
        ? config[label as keyof typeof config]?.label || label
        : itemConfig?.label

    if (labelFormatter) {
      return <div className={labelClassName}>{labelFormatter(value, payload)}</div>
    }

    if (!value) {
      return null
    }

    return <div className={labelClassName}>{value}</div>
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey])

  if (!payload?.length) {
    return null
  }

  const nestLabel = payload.length === 1 && indicator !== "dot"

  return (
    <div
      ref={ref}
      className={cn(
        "border-rule bg-overlay text-overlay-fg grid min-w-48 items-start rounded-none border-2 p-3 text-xs shadow-none",
        className
      )}
    >
      {!hideLabel && (
        <>
          {!nestLabel ? (
            <span className="font-bold text-[0.75rem] uppercase tracking-[0.08em] [font-stretch:87.5%]">
              {tooltipLabel}
            </span>
          ) : null}
          {labelSeparator && <span aria-hidden className="bg-rule mt-2 mb-3 block h-0.5 w-full" />}
        </>
      )}
      <div className="grid gap-3">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)
          const payloadStroke = (item.payload as { stroke?: string } | undefined)?.stroke
          const itemStroke = (item as { stroke?: string }).stroke
          const indicatorColor =
            [color, item.color, payloadStroke, itemStroke].find(
              (value): value is string =>
                typeof value === "string" && value.length > 0 && !value.startsWith("url(")
            ) ??
            getColorValue(
              itemConfig?.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
            )
          // The tooltip carries one item per hovered mark, so the payload index
          // is not the series index. The config order is the proof order.
          const configIndex = Object.keys(config).indexOf(key)
          const proofIndex = configIndex >= 0 ? configIndex : index

          return (
            <div
              key={key}
              className={cn(
                "flex w-full flex-wrap items-stretch gap-2 *:[svg]:text-muted-fg",
                indicator === "dot" && "items-center *:[svg]:size-2.5",
                indicator === "line" && "*:[svg]:h-full *:[svg]:w-2.5"
              )}
            >
              {formatter && item?.value !== undefined && item.name ? (
                formatter(item.value, item.name, item, index, item.payload)
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator &&
                    (indicator === "dot" ? (
                      <ChartProofChip color={indicatorColor} index={proofIndex} />
                    ) : (
                      <span
                        aria-hidden
                        className={cn(
                          "shrink-0 self-stretch",
                          indicator === "line" && "w-1 bg-(--color-bg)",
                          indicator === "dashed" &&
                            "w-0 border-[1.5px] border-dashed border-(--color-border) bg-transparent",
                          nestLabel && indicator === "dashed" && "my-0.5"
                        )}
                        style={
                          {
                            "--color-bg": indicatorColor,
                            "--color-border": indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    ))
                  )}
                  <div
                    className={cn(
                      "flex flex-1 justify-between leading-none",
                      nestLabel ? "items-end" : "items-center"
                    )}
                  >
                    <div className="grid gap-1.5">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-muted-fg">{itemConfig?.label || item.name}</span>
                    </div>

                    {item.value !== undefined && item.value !== null && (
                      <span className="num text-fg font-semibold">{String(item.value)}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

type ChartLegendContentProps = Pick<
  ToggleButtonGroupProps,
  "onSelectionChange"
> &
  Pick<LegendProps, "align" | "verticalAlign"> & {
    className?: string
    payload?: ReadonlyArray<LegendPayload>
    hideIcon?: boolean
    mark?: "fill" | "line"
    nameKey?: string
    ref?: React.Ref<any>
  }

const ChartLegendContent = ({
  className,
  hideIcon = false,
  mark = "fill",
  payload,
  align = "right",
  verticalAlign = "bottom",
  nameKey,
  onSelectionChange,
  ref,
}: ChartLegendContentProps) => {
  const { config, selectedLegend, onLegendSelect } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        twJoin(
          "flex flex-wrap items-center gap-1",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          align === "right" ? "justify-end" : align === "left" ? "justify-start" : "justify-center"
        ),
        className
      )}
      ref={ref}
      role="group"
    >
      {payload.map((item: LegendPayload, index) => {
        const lookupKey = `${nameKey || item.dataKey || "value"}`
        const itemConfig = getPayloadConfigFromPayload(config, item, lookupKey)
        // The visible series name is the stable identity. For a pie, the
        // dataKey is the shared value key; its value is the band. A payload
        // with neither falls back to its position, so two marks never share a
        // React key.
        const key =
          item.value == null
            ? `${String(item.dataKey ?? lookupKey)}-${index}`
            : String(item.value)
        const directColor =
          typeof item.color === "string" && !item.color.startsWith("url(") ? item.color : undefined
        const color =
          directColor ??
          getColorValue(itemConfig?.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length])
        const label = itemConfig?.label ?? item.value ?? key
        const isSelected = selectedLegend === key

        return (
          <button
            aria-label={typeof label === "string" ? `Only ${label}` : "Legend item"}
            aria-pressed={isSelected}
            className={cn(
              // A row mark: rest is bare, hover and focus put the solid ink bar
              // behind it, and selected keeps the bar and takes the red foot.
              "text-muted-fg relative flex min-h-8 cursor-default items-center gap-2 rounded-none px-2 py-1 text-xs select-none outline-hidden",
              "hover:bg-accent hover:text-accent-fg",
              "focus-visible:bg-accent focus-visible:text-accent-fg",
              "data-[selected]:bg-accent data-[selected]:text-accent-fg data-[selected]:font-bold",
              "data-[selected]:shadow-[inset_0_-4px_0_var(--red)]"
            )}
            data-selected={isSelected ? "true" : undefined}
            key={key}
            onClick={(event) => {
              // The legend sits inside the chart SVG. A click here must not
              // reach the chart's own click, which clears the soloed series.
              event.stopPropagation()
              const next = isSelected ? null : key
              onLegendSelect(next)
              onSelectionChange?.(new Set(next ? [next] : []))
            }}
            type="button"
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <ChartProofChip color={color} index={index} mode={mark} />
            )}
            {label}
          </button>
        )
      })}
    </div>
  )
}

export type {
  BaseChartProps,
  ChartColorKeys,
  ChartConfig,
  ChartLayout,
  ChartLegendContentProps,
  ChartLegendProps,
  ChartTooltipProps,
  ChartType,
  IntervalType,
  XAxisProps,
}
export {
  CartesianGrid,
  CHART_COLORS,
  CHART_PROOF,
  Chart,
  ChartLegend,
  ChartLegendContent,
  ChartProofChip,
  ChartProofDefs,
  chartProofDash,
  chartProofFill,
  ChartTooltip,
  ChartTooltipContent,
  constructCategoryColors,
  DEFAULT_COLORS,
  getColorValue,
  XAxis,
  YAxis,
}
