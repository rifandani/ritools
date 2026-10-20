'use client'

import type {
  ColorSliderProps,
  SliderOutputProps,
  SliderTrackProps,
} from "react-aria-components/ColorSlider"
import {
  ColorSlider as PrimitiveColorSlider,
  SliderOutput,
  SliderTrack,
} from "react-aria-components/ColorSlider"
import { printedFieldStyles } from "@/core/components/ui/field"
import { cx } from "@/core/utils/primitive"

export function ColorSlider({ className, ...props }: ColorSliderProps) {
  return (
    <PrimitiveColorSlider
      data-slot="control"
      className={cx(
        "group orientation-vertical:flex orientation-horizontal:grid orientation-horizontal:w-full grid-cols-[1fr_auto] flex-col items-center gap-2",
        printedFieldStyles(),
        className
      )}
      {...props}
    />
  )
}

// The value is a number: the one numerals face, in a right-aligned fixed
// column, struck through when the control is disabled.
export function ColorSliderOutput({ className, ...props }: SliderOutputProps) {
  return (
    <SliderOutput
      className={cx(
        "num orientation-vertical:hidden min-w-[6ch] text-end font-semibold text-base/6 decoration-2 sm:text-sm/6",
        "group-disabled:text-muted-fg group-disabled:line-through",
        className
      )}
      {...props}
    />
  )
}

/**
 * The color run is the true output, so the track keeps its gradient and takes
 * the chrome: a 2px Control Edge frame that turns ink on hover or focus, the
 * bracket on the thumb, and a printed strike when disabled.
 */
export function ColorSliderTrack({ className, ...props }: SliderTrackProps) {
  return (
    <SliderTrack
      className={cx(
        "group/track relative col-span-2 rounded-none border-2 border-input bg-clip-padding",
        "orientation-horizontal:h-6 orientation-horizontal:w-full",
        "orientation-vertical:ms-[50%] orientation-vertical:h-56 orientation-vertical:w-6 orientation-vertical:-translate-x-[50%]",
        "transition-[border-color,opacity] duration-90 ease-out",
        "hover:border-fg focus-within:border-fg",
        "in-data-[demo=hover]:border-fg in-data-[demo=focus]:border-fg",
        "group-disabled:cursor-not-allowed group-disabled:border-[color-mix(in_oklab,var(--input)_40%,var(--bg))] group-disabled:opacity-40",
        "forced-colors:bg-[GrayText]",
        className
      )}
      {...props}
      style={({ defaultStyle }) => ({
        ...defaultStyle,
        background: `${defaultStyle.background}, repeating-conic-gradient(var(--border) 0% 25%, var(--card) 0% 50%) 50% / 16px 16px`,
      })}
    />
  )
}
