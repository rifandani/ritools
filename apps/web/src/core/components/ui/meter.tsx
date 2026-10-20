'use client'

import { createContext, use } from "react"
import {
  Meter as PrimitiveMeter,
  type MeterProps as PrimitiveMeterProps,
  type MeterRenderProps as PrimitiveMeterRenderProps,
} from "react-aria-components/Meter"
import { cn } from "cn"
import { cx } from "@/core/utils/primitive"

interface MeterRenderProps extends PrimitiveMeterRenderProps {
  color?: string
}

const MeterContext = createContext<MeterRenderProps | null>(null)

interface MeterProps extends PrimitiveMeterProps, Pick<MeterRenderProps, "color"> {}

export function Meter({ className, children, color, ...props }: MeterProps) {
  return (
    <PrimitiveMeter
      data-slot="meter"
      {...props}
      className={cx(
        "w-full",
        "[&>[data-slot=meter-header]+[data-slot=meter-track]]:mt-2",
        "[&>[data-slot=meter-header]+[slot='description']]:mt-1",
        "[&>[slot='description']+[data-slot=meter-track]]:mt-2",
        "[&>[data-slot=meter-track]+[slot=description]]:mt-2",
        "[&>[data-slot=meter-track]+[slot=errorMessage]]:mt-2",
        "*:data-[slot=meter-header]:font-medium",
        className
      )}
    >
      {(values) => (
        <MeterContext value={{ ...values, color }}>
          {typeof children === "function" ? children(values) : children}
        </MeterContext>
      )}
    </PrimitiveMeter>
  )
}

/**
 * The measure: a square frame with a solid fill inside it.
 *
 * The fill is ink by default, so the reading comes from the length and from
 * the figure beside it, never from a hue. A status hue arrives only through
 * the `color` prop, and then the caller owns the label that names it.
 */
export function MeterTrack({ className, ...props }: React.ComponentProps<"div">) {
  const { percentage, color } = use(MeterContext)!
  return (
    <div
      data-slot="meter-track"
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-none border-2 border-rule bg-card",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0.5">
        <div
          data-slot="meter-fill"
          className="h-full rounded-none transition-[width] duration-200 ease-linear will-change-[width] motion-reduce:transition-none forced-colors:bg-[Highlight]"
          style={{ width: `${percentage}%`, backgroundColor: color ?? "var(--fg)" }}
        />
      </div>
    </div>
  )
}

/** The figure, in the one numerals face, in a fixed six-character column. */
export function MeterValue({
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children">) {
  const { valueText } = use(MeterContext)!
  return (
    <span
      data-slot="meter-value"
      className={cn(
        "num inline-block w-[6ch] shrink-0 text-end text-[0.875rem] font-semibold normal-case tracking-normal",
        className
      )}
      {...props}
    >
      {valueText}
    </span>
  )
}

export function MeterHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="meter-header"
      className={cn(
        "flex items-baseline justify-between gap-3 text-xs font-bold uppercase tracking-[0.08em] [font-stretch:87.5%] text-fg",
        className
      )}
      {...props}
    />
  )
}
