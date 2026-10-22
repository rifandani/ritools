'use client'

import { useState } from "react"
import { cn } from "cn"

export interface SkeletonProps extends React.ComponentProps<"div"> {
  isLoading?: boolean
}

/**
 * The blank: a muted plate, square, that blinks in hard steps like a press
 * running. Under reduced motion it holds the full plate, and the content
 * beside it never moves.
 */
export function Skeleton({ ref, isLoading = false, className, children, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      data-loading={isLoading ? "" : undefined}
      ref={ref}
      className={cn(
        isLoading
          ? [
              "pointer-events-none",
              // The blank plate.
              "[&>*>*>:not(:has(*))]:animate-[skeleton-blink_1.2s_steps(1)_infinite] [&>*>*>:not(:has(*))]:motion-reduce:animate-none [&>*>*>:not(:has(*))]:select-none [&>*>*>:not(:has(*))]:rounded-none [&>*>*>:not(:has(*))]:bg-muted [&>*>*>:not(:has(*))]:text-transparent [&>*>*>:not(:has(*))]:shadow-none [&>*>*>:not(:has(*))]:[-webkit-box-decoration-break:clone] [&>*>*>:not(:has(*))]:[box-decoration-break:clone]",
              "**:data-[slot=avatar]:animate-[skeleton-blink_1.2s_steps(1)_infinite] **:data-[slot=avatar]:motion-reduce:animate-none **:data-[slot=avatar]:bg-muted **:data-[slot=avatar]:outline-none [&_[data-slot=avatar]_img]:bg-transparent [&_img]:animate-[skeleton-blink_1.2s_steps(1)_infinite] [&_img]:motion-reduce:animate-none [&_img]:border-0 [&_img]:bg-muted [&_img]:text-transparent [&_img]:shadow-none [&_img]:[content-visibility:hidden]",
              "[&>*>*>*_:not(:has(*)):not(:empty)]:animate-[skeleton-blink_1.2s_steps(1)_infinite] [&>*>*>*_:not(:has(*)):not(:empty)]:motion-reduce:animate-none [&>*>*>*_:not(:has(*)):not(:empty)]:select-none [&>*>*>*_:not(:has(*)):not(:empty)]:rounded-none [&>*>*>*_:not(:has(*)):not(:empty)]:bg-muted [&>*>*>*_:not(:has(*)):not(:empty)]:text-transparent [&>*>*>*_:not(:has(*)):not(:empty)]:shadow-none",
            ]
          : "shrink-0",
        className
      )}
      {...props}
    >
      {children}
      {/* The keyframes come last, so the content keeps the first child. */}
      <style>{`
        @keyframes skeleton-blink {
          0%, 49% { opacity: 1 }
          50%, 100% { opacity: 0.45 }
        }
      `}</style>
    </div>
  )
}
