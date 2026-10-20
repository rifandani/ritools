'use client'

import { HiCheck } from "react-icons/hi2"
import type {
  ColorSwatchPickerItemProps,
  ColorSwatchPickerProps,
} from "react-aria-components/ColorSwatchPicker"
import {
  ColorSwatchPicker as PrimitiveColorSwatchPicker,
  ColorSwatchPickerItem as PrimitiveColorSwatchPickerItem,
} from "react-aria-components/ColorSwatchPicker"
import { cx } from "@/core/utils/primitive"

export function ColorSwatchPicker({ className, ...props }: ColorSwatchPickerProps) {
  return (
    <PrimitiveColorSwatchPicker
      data-slot="color-swatch-picker"
      className={cx("flex flex-wrap gap-4", className)}
      {...props}
    />
  )
}

/**
 * A swatch is a printed stamp: a 2px Control Edge frame around the true color.
 * Hover doubles the frame, press drops the stamp 1px, the selected stamp keeps
 * a 4px red foot in its bottom padding plus a paper check plate, and disabled
 * takes a faded rule and a 3px strike.
 */
export function ColorSwatchPickerItem({
  children,
  className,
  ...props
}: ColorSwatchPickerItemProps) {
  return (
    <PrimitiveColorSwatchPickerItem
      className={cx(
        "group/item bracket relative size-(--default-item-size,--spacing(10)) shrink-0 rounded-none border-2 border-input p-1 outline-hidden",
        "transition-[border-color,background-color,translate] duration-90 ease-out",
        "hover:border-fg hover:inset-ring-2 hover:inset-ring-fg",
        "in-data-[demo=hover]:border-fg in-data-[demo=hover]:inset-ring-2 in-data-[demo=hover]:inset-ring-fg",
        "pressed:translate-y-px pressed:bg-fg",
        "selected:border-fg selected:inset-ring-2 selected:inset-ring-fg",
        "selected:[background-image:linear-gradient(var(--red),var(--red))] selected:[background-position:bottom] selected:[background-repeat:no-repeat] selected:[background-size:100%_4px]",
        "disabled:cursor-not-allowed disabled:border-[color-mix(in_oklab,var(--input)_40%,var(--bg))]",
        "forced-colors:border-[ButtonBorder]",
        "*:data-[slot=color-swatch]:size-full *:data-[slot=color-swatch]:border-0",
        "disabled:*:data-[slot=color-swatch]:opacity-40",
        className
      )}
      {...props}
    >
      {(values) => (
        <>
          {values.isSelected && (
            <span
              aria-hidden
              className="border-ink bg-paper text-ink pointer-events-none absolute bottom-0 left-1/2 grid size-3.5 -translate-x-1/2 place-content-center border"
            >
              <HiCheck className="size-2.5" />
            </span>
          )}
          <span
            aria-hidden
            className="bg-muted-fg pointer-events-none absolute inset-x-1 top-1/2 hidden h-[3px] -translate-y-1/2 group-disabled/item:block group-has-data-[disabled]/item:block"
          />
          {typeof children === "function" ? children(values) : children}
        </>
      )}
    </PrimitiveColorSwatchPickerItem>
  )
}
