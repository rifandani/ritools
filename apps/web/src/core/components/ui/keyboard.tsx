"use client"

import { Keyboard as KeyboardPrimitive } from "react-aria-components/Keyboard"
import { cn } from "cn"

/**
 * A printed key cap: square, a 2px rule, the code voice. It is a mark on the
 * page, so it takes the same edge and the same muted ink as every other rule.
 */
export function Keyboard({ className, ...props }: React.ComponentProps<typeof KeyboardPrimitive>) {
  return (
    <KeyboardPrimitive
      data-slot="keyboard"
      className={cn(
        "hidden items-center justify-center rounded-none border-2 border-input bg-card px-1.5 py-0.5 font-mono text-[0.6875rem] leading-4 tracking-[0.08em] [font-stretch:87.5%] text-muted-fg lg:inline-flex group-hover:border-fg group-focus:border-fg group-disabled:opacity-50 forced-colors:group-focus:text-[HighlightText]",
        className
      )}
      {...props}
    />
  )
}
