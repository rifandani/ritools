'use client'

import { cn } from "cn"
import { tv } from "tailwind-variants"
import { cx } from "@/core/utils/primitive"
import { Link } from "./link"

export function Text({ className, ...props }: React.ComponentPropsWithoutRef<"p">) {
  return (
    <p
      data-slot="text"
      {...props}
      className={cn("text-base/6 text-muted-fg sm:text-sm/6", className)}
    />
  )
}

// The ink link (globals.css) carries every state; this only lays out icons.
export const textLinkStyles = tv({
  base: "has-data-[slot=icon]:inline-flex has-data-[slot=icon]:items-center has-data-[slot=icon]:gap-x-1",
})

export function TextLink({ className, ...props }: React.ComponentPropsWithoutRef<typeof Link>) {
  return <Link {...props} className={cx(textLinkStyles(), className)} />
}

export function Strong({ className, ...props }: React.ComponentPropsWithoutRef<"strong">) {
  return <strong {...props} className={cn("font-bold text-fg", className)} />
}

export function Code({ className, ...props }: React.ComponentPropsWithoutRef<"code">) {
  return (
    <code
      {...props}
      className={cn(
        "bg-muted px-1 py-px text-[0.8125rem] text-fg [box-decoration-break:clone] sm:text-xs",
        className
      )}
    />
  )
}
