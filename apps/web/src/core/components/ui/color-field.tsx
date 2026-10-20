"use client"

import {
  ColorField as ColorFieldPrimitive,
  type ColorFieldProps,
} from "react-aria-components/ColorField"
import { cx } from "@/core/utils/primitive"
import { printedFieldStyles } from "./field"

/**
 * A well, like every other field: the Input inside carries the 2px rule, the
 * bracket, and the strike, so the label and the error line keep their
 * contrast when the field is disabled.
 */
export function ColorField({ className, ...props }: ColorFieldProps) {
  return (
    <ColorFieldPrimitive
      {...props}
      data-slot="control"
      className={cx(printedFieldStyles(), className)}
    />
  )
}
