"use client"

import { parseColor } from "react-stately"

import { Button } from "@/core/components/ui/button"
import { ColorArea } from "@/core/components/ui/color-area"
import { ColorPicker } from "@/core/components/ui/color-picker"
import { ColorSlider, ColorSliderTrack } from "@/core/components/ui/color-slider"
import { ColorSwatch } from "@/core/components/ui/color-swatch"
import { ColorThumb } from "@/core/components/ui/color-thumb"
import { Dialog } from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { Popover, PopoverContent } from "@/core/components/ui/popover"
import { TextField } from "@/core/components/ui/text-field"

/** The hex a Swatch can print. An empty or invalid value prints as clear. */
const swatchColorOf = (value: string): string => {
  const text = value.trim()
  if (!/^#?(?:[\dA-Fa-f]{3}|[\dA-Fa-f]{6})$/u.test(text)) {
    return "#00000000"
  }
  return text.startsWith("#") ? text : `#${text}`
}

/** The color the picker edits. An invalid hex starts from black. */
const pickerColorOf = (value: string) => {
  const color = swatchColorOf(value)
  return parseColor(color === "#00000000" ? "#000000" : color).toFormat("hsb")
}

/**
 * A labelled color well: the swatch opens a picker, and the hex text sits
 * beside it. The picker and the text both edit the same value, so each one
 * shows the other's change at once.
 */
export const ColorWell = ({
  id,
  label,
  value,
  onBlur,
  onChange,
  pickerLabel,
  hueLabel,
}: {
  readonly id?: string
  readonly label: string
  readonly value: string
  readonly onBlur?: () => void
  readonly onChange: (value: string) => void
  readonly pickerLabel: string
  readonly hueLabel: string
}) => (
  <TextField className="min-w-0" onBlur={onBlur} value={value} onChange={onChange}>
    <Label>{label}</Label>
    <div className="mt-1.5 flex items-center gap-2">
      <Popover>
        <Button
          aria-label={pickerLabel}
          // The button's 2px mark border is offset by the swatch's -mx-0.5.
          // The swatch must match the button size at each breakpoint, or it
          // overhangs the left edge of the field group.
          className="*:data-[slot=color-swatch]:[--size:--spacing(10)] sm:*:data-[slot=color-swatch]:[--size:--spacing(8)]"
          intent="plain"
          size="sq-sm"
        >
          <ColorSwatch aria-hidden="true" color={swatchColorOf(value)} />
        </Button>
        <PopoverContent className="w-72 p-3" placement="bottom start">
          <Dialog aria-label={pickerLabel}>
            <ColorPicker
              className="flex w-full flex-col gap-3"
              value={pickerColorOf(value)}
              onChange={(color) => onChange(color.toString("hex").toLowerCase())}
            >
              <ColorArea
                aria-label={pickerLabel}
                className="max-w-none"
                colorSpace="hsb"
                xChannel="saturation"
                yChannel="brightness"
              />
              <ColorSlider aria-label={hueLabel} channel="hue" className="w-full">
                <ColorSliderTrack>
                  <ColorThumb />
                </ColorSliderTrack>
              </ColorSlider>
            </ColorPicker>
          </Dialog>
        </PopoverContent>
      </Popover>
      <div className="min-w-0 flex-1">
        <Input id={id} />
      </div>
    </div>
  </TextField>
)
