"use client"

import type { ComponentProps } from "react"
import {
  Slider as PrimitiveSlider,
  SliderFill as PrimitiveSliderFill,
  type SliderFillProps,
  SliderOutput as PrimitiveSliderOutput,
  SliderThumb as PrimitiveSliderThumb,
  SliderTrack as PrimitiveSliderTrack,
} from "react-aria-components/Slider"
import { cn } from "cn"
import { cx } from "@/core/utils/primitive"

export function SliderGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-x-3 *:data-[slot=icon]:size-5", className)}
      {...props}
    />
  )
}

export function Slider({ className, ...props }: ComponentProps<typeof PrimitiveSlider>) {
  return (
    <PrimitiveSlider
      data-slot="control"
      className={cx(
        "group relative flex touch-none select-none flex-col disabled:cursor-not-allowed",
        "orientation-horizontal:w-full orientation-horizontal:min-w-fit orientation-horizontal:gap-y-3",
        "orientation-vertical:h-full orientation-vertical:min-h-fit orientation-vertical:w-5 orientation-vertical:items-center orientation-vertical:gap-y-3",
        className
      )}
      {...props}
    />
  )
}

// The value is a number: the one numerals face, tabular, in a right-aligned
// column so it does not shift as it changes.
export function SliderOutput({
  className,
  ...props
}: ComponentProps<typeof PrimitiveSliderOutput>) {
  return (
    <PrimitiveSliderOutput
      className={cx(
        "num min-w-[6ch] text-end font-semibold text-base/6 tabular-nums decoration-2 sm:text-sm/6 group-disabled:text-muted-fg group-disabled:line-through",
        className
      )}
      {...props}
    />
  )
}

// A square block on the rule with a heavy ink frame. Hover doubles the frame,
// a drag prints it solid, focus takes the bracket.
export function SliderThumb({ className, ...props }: ComponentProps<typeof PrimitiveSliderThumb>) {
  return (
    <PrimitiveSliderThumb
      className={cx(
        "bracket top-[50%] left-[50%] size-5 border-[3px] border-fg bg-bg outline-hidden",
        "transition-[background-color,box-shadow] duration-90 ease-out",
        "hover:inset-ring-2 hover:inset-ring-fg in-data-[demo=hover]:inset-ring-2 in-data-[demo=hover]:inset-ring-fg",
        "dragging:bg-fg in-data-[demo=pressed]:bg-fg",
        "disabled:border-[color-mix(in_oklab,var(--fg)_40%,var(--bg))] disabled:inset-ring-0",
        "forced-colors:border-[ButtonText] forced-colors:bg-[ButtonFace] forced-colors:dragging:bg-[Highlight]",
        className
      )}
      {...props}
    />
  )
}

export function SliderTrack({
  className,
  children,
  ...props
}: ComponentProps<typeof PrimitiveSliderTrack>) {
  return (
    <PrimitiveSliderTrack
      className={cx(
        // The run is a 2px rule in control edge; the reach is a 4px ink stroke,
        // so the value reads by weight, not by hue.
        "before:absolute before:bg-(--slider-track-bg,var(--color-input)) before:content-['']",
        "group-orientation-horizontal:before:inset-x-0 group-orientation-horizontal:before:top-1/2 group-orientation-horizontal:before:h-0.5 group-orientation-horizontal:before:-translate-y-1/2",
        "group-orientation-vertical:before:inset-y-0 group-orientation-vertical:before:left-1/2 group-orientation-vertical:before:w-0.5 group-orientation-vertical:before:-translate-x-1/2",
        "group/track relative cursor-default",
        "grow group-orientation-horizontal:h-1 group-orientation-horizontal:w-full group-orientation-vertical:w-1 group-orientation-vertical:flex-1",
        "disabled:cursor-not-allowed disabled:before:bg-[color-mix(in_oklab,var(--input)_40%,var(--bg))]",
        "forced-colors:before:bg-[ButtonText]",
        className
      )}
      {...props}
    >
      {(values) => (
        <>
          {typeof children === "function"
            ? children(values)
            : (children ?? (
                <>
                  <SliderFill />
                  <SliderThumb />
                </>
              ))}
        </>
      )}
    </PrimitiveSliderTrack>
  )
}

export function SliderFill({ className, ...props }: SliderFillProps) {
  return (
    <PrimitiveSliderFill
      className={cx(
        "pointer-events-none bg-fg disabled:bg-[color-mix(in_oklab,var(--fg)_40%,var(--bg))] forced-colors:bg-[Highlight]",
        className
      )}
      {...props}
    />
  )
}
