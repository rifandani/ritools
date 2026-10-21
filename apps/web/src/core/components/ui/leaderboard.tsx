"use client"

import { Label, type LabelProps } from "react-aria-components/Label"
import { ProgressBar, type ProgressBarProps } from "react-aria-components/ProgressBar"
import { twJoin, cn } from "cn"
import { cx } from "@/core/utils/primitive"

export function Leaderboard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-y-(--leaderboard-gutter,--spacing(4))", className)}
      {...props}
    />
  )
}

export function LeaderboardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="leaderboard-header"
      className={cn(
        "grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-(--gutter) has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  )
}

/** The name of the board, in the Title voice. */
export function LeaderboardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="leaderboard-title"
      className={cn(
        "text-balance text-lg font-extrabold uppercase tracking-[0.02em] [font-stretch:75%]",
        className
      )}
      {...props}
    />
  )
}

export function LeaderboardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="leaderboard-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
}

export function LeaderboardContent({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="leaderboard-content"
      className={cn("flex max-h-96 list-none flex-col gap-y-3", className)}
      {...props}
    />
  )
}

interface LeaderboardItemProps extends ProgressBarProps {
  onAction?: () => void
}

/**
 * A row of the board: the name, the figure in a fixed column, and the run
 * under them. The run is a 4px ink stroke over a 2px rule, so the value reads
 * by weight and not by hue.
 */
export function LeaderboardItem({
  minValue = 0,
  className,
  children,
  onAction,
  ...props
}: LeaderboardItemProps) {
  return (
    <li className="group/bar" data-slot="leaderboard-item">
      <ProgressBar
        onClick={onAction}
        minValue={minValue}
        className={cx(
          "relative block w-full cursor-default overflow-hidden px-1.5 py-1 text-sm/6 outline-hidden",
          "[&_svg:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          "hover:bg-accent hover:text-accent-fg",
          "[[data-demo=hover]_&]:bg-accent [[data-demo=hover]_&]:text-accent-fg",
          // Focus: the world's bracket, two 3px arms at each side.
          "bracket after:inset-0",
          "[[data-demo=pressed]_&]:bg-accent [[data-demo=pressed]_&]:text-accent-fg",
          "[[data-demo=disabled]_&]:text-muted-fg [[data-demo=disabled]_&_*]:line-through",
          className
        )}
        {...props}
      >
        {(values) => (
          <>
            <span className="relative z-2 flex items-baseline justify-between gap-3 font-medium">
              {typeof children === "function" ? children(values) : children}
            </span>
            <span aria-hidden className="relative mt-1 block h-1 w-full">
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-input" />
              <span
                className="absolute bottom-0 start-0 h-1 bg-fg group-hover/bar:bg-accent-fg [[data-demo=hover]_&]:bg-accent-fg"
                style={{ width: `${values.percentage}%` }}
              />
            </span>
          </>
        )}
      </ProgressBar>
    </li>
  )
}

export function LeaderboardStart({ className, ...props }: LabelProps) {
  return (
    <Label
      data-slot="leaderboard-start"
      className={cn("flex min-w-0 items-center gap-x-2", className)}
      {...props}
    />
  )
}

/** The figure, in the one numerals face, in a fixed six-character column. */
export function LeaderboardEnd({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="leaderboard-end"
      className={cn(
        "num w-[6ch] shrink-0 text-end text-[0.875rem] font-semibold tabular-nums",
        className
      )}
      {...props}
    />
  )
}
