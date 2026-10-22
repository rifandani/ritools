'use client'

import { createContext, use } from "react"
import {
  ProgressBar as ProgressBarPrimitive,
  type ProgressBarProps,
  type ProgressBarRenderProps,
} from "react-aria-components/ProgressBar"
import { cn } from "cn"
import { cx } from "@/core/utils/primitive"

const ProgressBarContext = createContext<ProgressBarRenderProps | null>(null)

export function ProgressBar({ className, children, ...props }: ProgressBarProps) {
  return (
    <ProgressBarPrimitive
      data-slot="control"
      className={cx(
        "w-full",
        "[&>[data-slot=progress-bar-header]+[data-slot=progress-bar-track]]:mt-2",
        "[&>[data-slot=progress-bar-header]+[slot='description']]:mt-1",
        "[&>[slot='description']+[data-slot=progress-bar-track]]:mt-2",
        "[&>[data-slot=progress-bar-track]+[slot=description]]:mt-2",
        "[&>[data-slot=progress-bar-track]+[slot=errorMessage]]:mt-2",
        "*:data-[slot=progress-bar-header]:font-medium",
        className
      )}
      {...props}
    >
      {(values) => (
        <ProgressBarContext value={{ ...values }}>
          {typeof children === "function" ? children(values) : children}
        </ProgressBarContext>
      )}
    </ProgressBarPrimitive>
  )
}

/**
 * The name of the run on the left, the figure on the right. The figure sits in
 * a fixed column, so the header does not move while the value changes.
 */
export function ProgressBarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="progress-bar-header"
      className={cn(
        "flex items-baseline justify-between gap-3 text-xs font-bold uppercase tracking-[0.08em] [font-stretch:87.5%] text-fg",
        className
      )}
      {...props}
    />
  )
}

/** The figure, in the one numerals face, in a fixed six-character column. */
export function ProgressBarValue({
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children">) {
  const { valueText } = use(ProgressBarContext)!
  return (
    <span
      data-slot="progress-bar-value"
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

/**
 * The run: a square frame with a solid fill inside it. The fill is Poster Red,
 * a brand field, and the figure beside it is the reading, so the colour never
 * carries the value alone.
 */
export function ProgressBarTrack({ className, ref, ...props }: React.ComponentProps<"div">) {
  const { isIndeterminate, percentage } = use(ProgressBarContext)!
  return (
    <span data-slot="progress-bar-track" className="relative block w-full">
      <style>{`
        @keyframes progress-slide {
          0% { inset-inline-start: 0% }
          50% { inset-inline-start: 70% }
          100% { inset-inline-start: 0% }
        }
      `}</style>
      <div ref={ref} className="flex w-full items-center gap-x-2" {...props}>
        <div
          data-slot="progress-container"
          className={cn(
            "relative h-4 w-full min-w-0 overflow-hidden rounded-none border-2 border-rule bg-card",
            className
          )}
        >
          <div className="absolute inset-0.5">
            {!isIndeterminate ? (
              <div
                data-slot="progress-content"
                className="h-full rounded-none bg-primary transition-[width] duration-200 ease-linear will-change-[width] motion-reduce:transition-none forced-colors:bg-[Highlight]"
                style={{ width: `${percentage}%` }}
              />
            ) : (
              <div
                data-slot="progress-content"
                className="h-full w-[30%] rounded-none bg-primary animate-[progress-slide_2000ms_steps(8,end)_infinite] motion-reduce:animate-none forced-colors:bg-[Highlight]"
              />
            )}
          </div>
        </div>
      </div>
    </span>
  )
}
