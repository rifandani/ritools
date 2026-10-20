'use client'

import {
  ColorWheel as PrimitiveColorWheel,
  type ColorWheelProps as PrimitiveColorWheelProps,
  ColorWheelTrack,
} from "react-aria-components/ColorWheel"
import { cn } from "cn"
import { ColorThumb } from "./color-thumb"

export interface ColorWheelProps extends Omit<
  PrimitiveColorWheelProps,
  "outerRadius" | "innerRadius"
> {}

/**
 * The wheel is the true color output, held on a square printed plate: a 2px
 * Control Edge frame that turns ink on hover or focus, the bracket around the
 * plate, and a 3px strike when disabled.
 */
export function ColorWheel({ className, ...props }: ColorWheelProps) {
  return (
    <div
      data-slot="color-wheel"
      className={cn(
        "group/wheel relative inline-flex rounded-none border-2 border-input p-1",
        "transition-[border-color,opacity] duration-90 ease-out",
        "hover:border-fg has-[:focus-visible]:border-fg",
        "in-data-[demo=hover]:border-fg",
        "has-data-[disabled]:cursor-not-allowed has-data-[disabled]:border-[color-mix(in_oklab,var(--input)_40%,var(--bg))]",
        "forced-colors:border-[ButtonBorder]"
      )}
    >
      <PrimitiveColorWheel
        {...props}
        outerRadius={100}
        innerRadius={74}
        className={(values) =>
          cn(
            "rounded-none outline-hidden",
            typeof className === "function" ? className(values) : className
          )
        }
      >
        <ColorWheelTrack
          className="rounded-none group-has-data-[disabled]/wheel:opacity-40 forced-colors:group-has-data-[disabled]/wheel:bg-[GrayText]"
          style={({ defaultStyle }) => ({
            ...defaultStyle,
            background: `${defaultStyle.background}, repeating-conic-gradient(var(--border) 0% 25%, var(--card) 0% 50%) 50% / 16px 16px`,
          })}
        />
        <ColorThumb />
      </PrimitiveColorWheel>
      <span
        aria-hidden
        className="bg-muted-fg pointer-events-none absolute inset-x-2 top-1/2 hidden h-[3px] -translate-y-1/2 group-has-data-[disabled]/wheel:block"
      />
    </div>
  )
}
