'use client'

import { useLayoutEffect, useRef } from "react"
import { twJoin, cn } from "cn"

type ScrollAreaOrientation = "vertical" | "horizontal" | "both"

const EDGE =
  "pointer-events-none absolute z-10 bg-rule opacity-0 transition-opacity duration-150 ease-out"

export interface ScrollAreaProps extends React.ComponentPropsWithRef<"div"> {
  scrollFade?: boolean
  scrollbarGutter?: boolean
  orientation?: ScrollAreaOrientation
}

export function ScrollArea({
  ref: forwardedRef,
  className,
  children,
  scrollFade = false,
  scrollbarGutter = false,
  orientation = "both",
  ...props
}: ScrollAreaProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const isThrottledRef = useRef(false)

  const allowY = orientation === "vertical" || orientation === "both"
  const allowX = orientation === "horizontal" || orientation === "both"

  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const update = () => {
      const rawHasY = el.scrollHeight > el.clientHeight + 1
      const rawHasX = el.scrollWidth > el.clientWidth + 1

      const hasY = allowY && rawHasY
      const hasX = allowX && rawHasX

      el.toggleAttribute("data-has-overflow-y", hasY)
      el.toggleAttribute("data-has-overflow-x", hasX)

      const yStart = hasY ? Math.max(0, el.scrollTop) : 0
      const yEnd = hasY ? Math.max(0, el.scrollHeight - el.clientHeight - el.scrollTop) : 0
      const xStart = hasX ? Math.max(0, el.scrollLeft) : 0
      const xEnd = hasX ? Math.max(0, el.scrollWidth - el.clientWidth - el.scrollLeft) : 0

      el.style.setProperty("--scroll-area-overflow-y-start", `${yStart}px`)
      el.style.setProperty("--scroll-area-overflow-y-end", `${yEnd}px`)
      el.style.setProperty("--scroll-area-overflow-x-start", `${xStart}px`)
      el.style.setProperty("--scroll-area-overflow-x-end", `${xEnd}px`)

      // The root prints a rule on each edge that hides more content.
      const root = el.parentElement
      root?.toggleAttribute("data-edge-top", yStart > 0)
      root?.toggleAttribute("data-edge-bottom", yEnd > 0)
      root?.toggleAttribute("data-edge-start", xStart > 0)
      root?.toggleAttribute("data-edge-end", xEnd > 0)
    }

    const scheduleUpdate = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(update)
    }

    const throttledScrollUpdate = () => {
      if (isThrottledRef.current) return
      isThrottledRef.current = true
      scheduleUpdate()
      setTimeout(() => {
        isThrottledRef.current = false
      }, 16)
    }

    const ro = new ResizeObserver(scheduleUpdate)
    ro.observe(el)

    el.addEventListener("scroll", throttledScrollUpdate, { passive: true })
    update()

    return () => {
      el.removeEventListener("scroll", throttledScrollUpdate)
      ro.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [allowX, allowY])

  return (
    <div
      ref={forwardedRef}
      className={cn(
        // A keyboard user who tabs into the viewport gets the focus bracket.
        "group/scroll-area bracket relative size-full min-h-0",
        "has-[>[data-slot=scroll-area-viewport]:focus-visible]:after:transform-none has-[>[data-slot=scroll-area-viewport]:focus-visible]:after:opacity-100",
        className
      )}
      {...props}
    >
      <div
        ref={viewportRef}
        className={twJoin(
          "h-full overscroll-auto rounded-none outline-none data-has-overflow-y:overscroll-y-contain data-has-overflow-x:overscroll-x-contain",

          orientation === "vertical"
            ? "overflow-y-auto overflow-x-hidden"
            : orientation === "horizontal"
              ? "overflow-x-auto overflow-y-hidden"
              : "overflow-auto",
          scrollbarGutter
            ? [allowY && "data-has-overflow-y:pe-2.5", allowX && "data-has-overflow-x:pb-2.5"]
            : ""
        )}
        data-slot="scroll-area-viewport"
      >
        {children}
      </div>
      {/*
       * Print has no fade: an edge that hides more content takes a second 2px
       * rule, 4px inside the edge, so it reads apart from a frame. It shows at
       * once under reduced motion.
       */}
      {scrollFade && (
        <>
          {allowY && (
            <>
              <span aria-hidden className={twJoin(EDGE, "inset-x-0 top-1 h-0.5 group-data-edge-top/scroll-area:opacity-100")} />
              <span aria-hidden className={twJoin(EDGE, "inset-x-0 bottom-1 h-0.5 group-data-edge-bottom/scroll-area:opacity-100")} />
            </>
          )}
          {allowX && (
            <>
              <span aria-hidden className={twJoin(EDGE, "inset-y-0 start-1 w-0.5 group-data-edge-start/scroll-area:opacity-100")} />
              <span aria-hidden className={twJoin(EDGE, "inset-y-0 end-1 w-0.5 group-data-edge-end/scroll-area:opacity-100")} />
            </>
          )}
        </>
      )}
    </div>
  )
}
