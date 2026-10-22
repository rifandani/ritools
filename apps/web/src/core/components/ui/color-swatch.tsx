'use client'

import {
  ColorSwatch as ColorSwatchPrimitive,
  type ColorSwatchProps,
} from "react-aria-components/ColorSwatch"
import { cx } from "@/core/utils/primitive"

/**
 * A square color plate with a 2px rule on its own edge. The rule is the
 * chrome, so a white swatch reads on white stock and a black swatch reads on
 * carbon; the color inside is the true output.
 */
export function ColorSwatch({ className, ...props }: ColorSwatchProps) {
  return (
    <ColorSwatchPrimitive
      data-slot="color-swatch"
      className={cx(
        "size-(--size) shrink-0 rounded-none border-2 border-rule [--size:--spacing(8)]",
        "shadow-[inset_0_0_0_1px_var(--chip-edge)] forced-colors:border-[CanvasText]",
        className
      )}
      {...props}
    />
  )
}
