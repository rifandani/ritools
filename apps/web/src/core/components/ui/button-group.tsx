'use client'

import { cn } from "cn"
import { tv, type VariantProps } from "tailwind-variants"

const buttonGroupStyles = tv({
  base: [
    // Joined marks: each one overlaps the one before it by its own rule
    // weight, so a shared edge prints once. The mark you touch prints on top.
    "isolate flex w-fit max-w-full items-stretch has-[>[data-slot=button-group]]:gap-2",
    "*:data-hovered:z-10 *:data-pressed:z-10 *:data-focus-visible:z-20 *:focus-visible:z-20",
    "[&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  ],
  variants: {
    orientation: {
      horizontal:
        "[&>*:not(:first-child)]:-ms-[var(--mark-weight,2px)]",
      vertical:
        "flex-col [&>*:not(:first-child)]:-mt-[var(--mark-weight,2px)]",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
})

export function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupStyles>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={buttonGroupStyles({ orientation, className })}
      {...props}
    />
  )
}

export function ButtonGroupText({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-2 border-input bg-muted px-3.5 text-muted-fg text-sm/5 *:data-[slot=icon]:pointer-events-none [&_[data-slot=icon]:not([class*='size-'])]:size-5 sm:[&_[data-slot=icon]:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}
