"use client"

import { ProgressBar, type ProgressBarProps } from "react-aria-components/ProgressBar"
import { cn } from "cn"

interface ProgressCircleProps extends Omit<ProgressBarProps, "className"> {
  className?: string
  ref?: React.RefObject<HTMLDivElement>
}

/**
 * A printed dial: a square frame with the run travelling its edge, and the
 * figure set in the middle in the one numerals face.
 *
 * The circle is gone on purpose. This world has one round shape, the seal, and
 * a dial is not a seal. The square keeps the run on the two fixed angles and
 * lets the figure sit in a fixed column.
 */
const ProgressCircle = ({ className, ref, ...props }: ProgressCircleProps) => {
  return (
    <ProgressBar
      {...props}
      ref={ref}
      className="inline-flex w-auto shrink-0"
    >
      {({ percentage, isIndeterminate, valueText }) => (
        <svg
          className={cn("size-8 shrink-0", className)}
          viewBox="0 0 24 24"
          fill="none"
          data-slot="icon"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            stroke="var(--rule)"
            strokeWidth="2.5"
            strokeLinejoin="miter"
          />
          {isIndeterminate ? (
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="square"
              pathLength={72}
              strokeDasharray="18 54"
              className="animate-loader-run"
            />
          ) : (
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              stroke="var(--primary)"
              strokeWidth="2.5"
              pathLength={100}
              strokeDasharray={`${percentage ?? 0} 100`}
            />
          )}
          {!isIndeterminate && valueText && (
            <text
              x="12"
              y="12"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="6.5"
              fill="var(--fg)"
              className="num"
            >
              {valueText}
            </text>
          )}
        </svg>
      )}
    </ProgressBar>
  )
}

export type { ProgressCircleProps }
export { ProgressCircle }
