'use client'

import { Separator as Divider, type SeparatorProps } from "react-aria-components/Separator"
import { cn } from "cn"

export function Separator({ orientation = "horizontal", className, ...props }: SeparatorProps) {
  return (
    <Divider
      orientation={orientation}
      className={cn(
        // A 2px rule. It takes the ground's rule color: ink on paper, paper
        // in dark mode and on the ink rail, white on the red field.
        "shrink-0 border-0 bg-rule forced-colors:bg-[ButtonBorder]",
        orientation === "horizontal" ? "h-0.5 w-full" : "h-full w-0.5",
        className
      )}
      {...props}
    />
  )
}
