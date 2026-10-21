'use client'

import {
  Button as ButtonPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
} from "react-aria-components/Button"
import { tv, type VariantProps } from "tailwind-variants"
import { cx } from "@/core/utils/primitive"

export const buttonStyles = tv({
  base: [
    // Printed marks (globals.css): outline at rest, solid when pressed, struck
    // through when disabled, a heavy bracket on focus.
    "mark isolate inline-flex items-center justify-center font-bold uppercase tracking-[0.05em] [font-stretch:87.5%] outline-0 hover:no-underline",
    "*:[svg]:-mx-0.5 *:[svg]:shrink-0 *:[svg]:self-center",
    "*:data-[slot=loader]:-mx-0.5 *:data-[slot=loader]:shrink-0 *:data-[slot=loader]:self-center",
    "forced-colors:border-[ButtonBorder] disabled:forced-colors:text-[GrayText]",
    "*:data-[slot=color-swatch]:-mx-0.5 *:data-[slot=color-swatch]:shrink-0 *:data-[slot=color-swatch]:self-center *:data-[slot=color-swatch]:[--size:--spacing(5)]",
  ],
  variants: {
    intent: {
      primary:
        "[--mark-fill:var(--primary)] [--mark-hover:var(--wash-red)] [--mark-ink:var(--primary-ink)] [--mark-line:var(--primary)] [--mark-on-fill:var(--primary-fg)] [--mark-weight:3px]",
      secondary:
        "[--mark-hover:var(--secondary)] [--mark-ink:var(--secondary-fg)] [--mark-line:var(--fg)] [--mark-rest:var(--secondary)]",
      warning:
        "[--mark-fill:var(--warning)] [--mark-hover:var(--warning-subtle)] [--mark-ink:var(--warning-subtle-fg)] [--mark-line:var(--warning-subtle-fg)] [--mark-on-fill:var(--warning-fg)]",
      danger:
        "[--mark-fill:var(--danger)] [--mark-hover:var(--danger-subtle)] [--mark-ink:var(--danger-subtle-fg)] [--mark-line:var(--danger)] [--mark-on-fill:var(--danger-fg)]",
      success:
        "[--mark-fill:var(--success)] [--mark-hover:var(--success-subtle)] [--mark-ink:var(--success-subtle-fg)] [--mark-line:var(--success)] [--mark-on-fill:var(--success-fg)]",
      outline:
        "[--mark-fill:var(--fg)] [--mark-hover-line:var(--fg)] [--mark-line:var(--input)]",
      plain:
        "[--mark-fill:var(--fg)] [--mark-hover-line:var(--fg)] [--mark-line:transparent]",
    },
    size: {
      xs: [
        "min-h-8 gap-x-1.5 px-2.5 py-1 text-xs/4 sm:min-h-7 sm:px-2",
        "*:[svg]:-mx-px *:[svg]:size-3.5 sm:*:[svg]:size-3",
        "*:data-[slot=loader]:-mx-px *:data-[slot=loader]:size-3.5 sm:*:data-[slot=loader]:size-3",
      ],
      sm: [
        "min-h-9 gap-x-1.5 px-3 py-1.5 text-[0.8125rem]/5 sm:min-h-8 sm:px-2.5",
        "*:[svg]:size-4.5 sm:*:[svg]:size-4",
        "*:data-[slot=loader]:size-4.5 sm:*:data-[slot=loader]:size-4",
      ],
      md: [
        "min-h-11 gap-x-2 px-4 py-2 text-sm/5 sm:min-h-10 sm:px-3.5",
        "*:[svg]:size-5 sm:*:[svg]:size-4.5",
        "*:data-[slot=loader]:size-5 sm:*:data-[slot=loader]:size-4.5",
      ],
      lg: [
        "min-h-12 gap-x-2 px-5 py-2.5 text-[0.9375rem]/6 sm:min-h-11 sm:px-4.5",
        "*:[svg]:size-5 sm:*:[svg]:size-5",
        "*:data-[slot=loader]:size-5 sm:*:data-[slot=loader]:size-5",
      ],
      "sq-xs": [
        "touch-target size-8 shrink-0 sm:size-7",
        "*:[svg]:size-3.5 sm:*:[svg]:size-3",
        "*:data-[slot=loader]:size-3.5 sm:*:data-[slot=loader]:size-3",
      ],
      "sq-sm": [
        "touch-target size-10 shrink-0 sm:size-8",
        "*:[svg]:size-4.5 sm:*:[svg]:size-4",
        "*:data-[slot=loader]:size-4.5 sm:*:data-[slot=loader]:size-4",
      ],
      "sq-md": [
        "touch-target size-11 shrink-0 sm:size-10",
        "*:[svg]:size-5 sm:*:[svg]:size-5",
        "*:data-[slot=loader]:size-5 sm:*:data-[slot=loader]:size-5",
      ],
      "sq-lg": [
        "touch-target size-12 shrink-0 sm:size-11",
        "*:[svg]:size-6 sm:*:[svg]:size-5",
        "*:data-[slot=loader]:size-6 sm:*:data-[slot=loader]:size-5",
      ],
    },

    isCircle: {
      // A round seal. Every other mark is square.
      true: "rounded-full",
      false: "rounded-none",
    },
  },
  defaultVariants: {
    intent: "primary",
    size: "md",
    isCircle: false,
  },
})

export interface ButtonProps extends ButtonPrimitiveProps, VariantProps<typeof buttonStyles> {
  ref?: React.Ref<HTMLButtonElement>
}

export function Button({ className, intent, size, isCircle, ref, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      ref={ref}
      {...props}
      className={cx(
        buttonStyles({
          intent,
          size,
          isCircle,
        }),
        className
      )}
    />
  )
}
