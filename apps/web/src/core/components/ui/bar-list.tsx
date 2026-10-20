'use client'

import { useMemo } from "react"
import { Button } from "react-aria-components/Button"
import { twJoin, cn } from "cn"
import { Link } from "./link"

type Bar<T> = T & {
  key?: string
  href?: string
  value: number
  name: string
}

interface BarListProps<T = unknown> extends React.ComponentProps<"div"> {
  data: Bar<T>[]
  valueFormatter?: (value: number) => string
  onValueChange?: (payload: Bar<T>) => void
  sortOrder?: "ascending" | "descending" | "none"
}

/** @deprecated Use Leaderboard component instead */
export function BarList<T>({
  data = [],
  valueFormatter = (value) => value.toString(),
  onValueChange,
  sortOrder = "descending",
  className,
  ref,
  ...props
}: BarListProps<T>) {
  const Component = onValueChange ? Button : "div"
  const sortedData = useMemo(() => {
    if (sortOrder === "none") {
      return data
    }
    return [...data].sort((a, b) => {
      return sortOrder === "ascending" ? a.value - b.value : b.value - a.value
    })
  }, [data, sortOrder])

  const widths = useMemo(() => {
    const maxValue = Math.max(...sortedData.map((item) => item.value), 0)
    return sortedData.map((item) =>
      item.value === 0 ? 0 : Math.max((item.value / maxValue) * 100, 2)
    )
  }, [sortedData])

  return (
    <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props}>
      {sortedData.map((item, index) => (
        <Component
          key={item.key ?? item.name}
          onClick={() => {
            onValueChange?.(item)
          }}
          className={twJoin(
            "group relative w-full overflow-hidden rounded-none text-start",
            // Hover and press print the solid ink bar.
            "hover:bg-accent hover:text-accent-fg",
            "[[data-demo=hover]_&]:bg-accent [[data-demo=hover]_&]:text-accent-fg",
            "data-[pressed]:bg-accent data-[pressed]:text-accent-fg",
            "[[data-demo=pressed]_&]:bg-accent [[data-demo=pressed]_&]:text-accent-fg",
            // Focus: the world's bracket, two 3px arms at each side.
            "bracket after:inset-0",
            // Disabled: muted words, struck through.
            "[[data-demo=disabled]_&]:text-muted-fg [[data-demo=disabled]_&_*]:line-through",
            onValueChange ? "cursor-pointer" : "",
          )}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 px-1.5 py-1">
            <div className="min-w-0">
              {item.href ? (
                <Link
                  href={item.href}
                  className="truncate whitespace-nowrap text-sm/6"
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                >
                  {item.name}
                </Link>
              ) : (
                <p className="truncate whitespace-nowrap text-sm/6">{item.name}</p>
              )}
              {/* The run: a 4px ink stroke over a 2px rule, so the value reads
                  by weight and not by hue. */}
              <span aria-hidden className="relative mt-1 block h-1 w-full">
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-input" />
                <span
                  className="absolute bottom-0 start-0 h-1 bg-fg group-hover:bg-accent-fg [[data-demo=hover]_&]:bg-accent-fg"
                  style={{ width: `${widths[index]}%` }}
                />
              </span>
            </div>
            <p className="num w-[8ch] shrink-0 text-end text-[0.875rem] font-semibold tabular-nums">
              {valueFormatter(item.value)}
            </p>
          </div>
        </Component>
      ))}
    </div>
  )
}
