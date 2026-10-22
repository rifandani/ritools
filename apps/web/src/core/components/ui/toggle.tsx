"use client"

import { composeRenderProps } from "react-aria-components/composeRenderProps"
import { ToggleButton, type ToggleButtonProps } from "react-aria-components/ToggleButton"
import { cn } from "cn"
import { tv, type VariantProps } from "tailwind-variants"

export const toggleStyles = tv({
  base: [
    // Printed marks (globals.css), plus the selected print: a solid fill with
    // a red foot. Toggles, toggle groups, and toolbars share it.
    "mark isolate inline-flex items-center justify-center font-bold uppercase tracking-[0.05em] [font-stretch:87.5%] outline-0",
    "*:[svg]:-mx-0.5 *:[svg]:shrink-0 *:[svg]:self-center",
    "*:data-[slot=loader]:-mx-0.5 *:data-[slot=loader]:shrink-0 *:data-[slot=loader]:self-center",
    "forced-colors:border-[ButtonBorder]",
  ],
  variants: {
    intent: {
      outline: "[--mark-fill:var(--fg)] [--mark-hover-line:var(--fg)] [--mark-line:var(--input)]",
      plain: "[--mark-fill:var(--fg)] [--mark-hover-line:var(--fg)] [--mark-line:transparent]",
    },
    size: {
      xs: [
        "min-h-8 gap-x-1.5 px-2.5 py-1 text-xs/4 sm:min-h-7 sm:px-2",
        "*:[svg]:-mx-px *:[svg]:size-3.5 sm:*:[svg]:size-3",
      ],
      sm: [
        "min-h-9 gap-x-1.5 px-3 py-1.5 text-[0.8125rem]/5 sm:min-h-8 sm:px-2.5",
        "*:[svg]:size-4.5 sm:*:[svg]:size-4",
      ],
      md: [
        "min-h-11 gap-x-2 px-4 py-2 text-sm/5 sm:min-h-10 sm:px-3.5",
        "*:[svg]:size-5 sm:*:[svg]:size-4.5",
      ],
      lg: [
        "min-h-12 gap-x-2 px-5 py-2.5 text-[0.9375rem]/6 sm:min-h-11 sm:px-4.5",
        "*:[svg]:size-5 sm:*:[svg]:size-5",
      ],
      "sq-xs": ["touch-target size-8 shrink-0 sm:size-7", "*:[svg]:size-3.5 sm:*:[svg]:size-3"],
      "sq-sm": ["touch-target size-10 shrink-0 sm:size-8", "*:[svg]:size-4.5 sm:*:[svg]:size-4"],
      "sq-md": ["touch-target size-11 shrink-0 sm:size-10", "*:[svg]:size-5 sm:*:[svg]:size-5"],
      "sq-lg": ["touch-target size-12 shrink-0 sm:size-11", "*:[svg]:size-6 sm:*:[svg]:size-5"],
    },
    isCircle: {
      // A round seal for icon toggles. Every other mark is square.
      true: "rounded-full",
      false: "rounded-none",
    },
    isDisabled: {
      true: "forced-colors:text-[GrayText]",
    },
  },
  defaultVariants: {
    intent: "plain",
    size: "md",
    isCircle: false,
  },
})

export interface ToggleProps extends ToggleButtonProps, VariantProps<typeof toggleStyles> {
  ref?: React.Ref<HTMLButtonElement>
}
export function Toggle({ className, size, intent, isCircle, ref, ...props }: ToggleProps) {
  return (
    <ToggleButton
      ref={ref}
      className={composeRenderProps(className, (className, renderProps) =>
        cn(
          toggleStyles({
            ...renderProps,
            isCircle,
            size,
            intent,
            className,
          })
        )
      )}
      {...props}
    />
  )
}
