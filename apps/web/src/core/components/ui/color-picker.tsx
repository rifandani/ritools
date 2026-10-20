'use client'

import { HiEyeDropper } from "react-icons/hi2"
import { parseColor } from "react-stately"
import { use } from "react"
import {
  ColorPicker as ColorPickerPrimitive,
  type ColorPickerProps as ColorPickerPrimitiveProps,
  ColorPickerStateContext,
} from "react-aria-components/ColorPicker"
import { cn } from "cn"
import { Button } from "./button"
import { printedFieldStyles } from "./field"

interface ColorPickerProps extends ColorPickerPrimitiveProps {
  className?: string
}

/**
 * A picker is the field group, not a new surface: its area, sliders, and
 * color field each print their own chrome, and the group keeps its children
 * in the field rhythm.
 */
const ColorPicker = ({ className, ...props }: ColorPickerProps) => {
  return (
    <div data-slot="control" className={cn(printedFieldStyles({ className: "w-fit" }), className)}>
      <ColorPickerPrimitive {...props} />
    </div>
  )
}

declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
  }
}

const EyeDropper = () => {
  const state = use(ColorPickerStateContext)!

  if (!window.EyeDropper) {
    return <span className="text-muted-fg text-sm/6">EyeDropper is not supported in this browser.</span>
  }

  return (
    <Button
      className="shrink-0"
      aria-label="Eye dropper"
      size="sq-md"
      intent="outline"
      onPress={() => {
        const eyeDropper = window.EyeDropper ? new window.EyeDropper() : null
        eyeDropper?.open().then((result) => state.setColor(parseColor(result.sRGBHex)))
      }}
    >
      <HiEyeDropper />
    </Button>
  )
}

export type { ColorPickerProps }
export { ColorPicker, EyeDropper }
