'use client'

import {
  ColorArea as ColorAreaPrimitive,
  type ColorAreaProps,
} from "react-aria-components/ColorArea"
import { cx } from "@/core/utils/primitive"
import { ColorThumb } from "./color-thumb"

/**
 * A color field on a printed plate: a 2px Control Edge frame that turns ink on
 * hover and focus, the heavy bracket around the plate, and a 3px strike when
 * the field is disabled. The color inside is the true output.
 */
export function ColorArea({ className, ...props }: ColorAreaProps) {
  return (
    <ColorAreaPrimitive
      {...props}
      data-slot="color-area"
      className={cx(
        "group/area relative aspect-square w-full max-w-56 rounded-none border-2 border-input bg-muted p-0 outline-hidden",
        "transition-[border-color,box-shadow] duration-90 ease-out",
        "hover:border-fg focus-within:border-fg",
        "disabled:cursor-not-allowed disabled:border-[color-mix(in_oklab,var(--input)_40%,var(--bg))]",
        "forced-colors:bg-[GrayText]",
        className
      )}
      style={({ defaultStyle, isDisabled }) => ({
        ...defaultStyle,
        background: isDisabled ? undefined : defaultStyle.background,
      })}
    >
      <ColorThumb />
      <span
        aria-hidden
        className="bg-muted-fg pointer-events-none absolute inset-x-0 top-1/2 hidden h-[3px] -translate-y-1/2 group-disabled/area:block group-has-data-[disabled]/area:block"
      />
    </ColorAreaPrimitive>
  )
}
