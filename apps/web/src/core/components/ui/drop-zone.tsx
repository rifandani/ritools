"use client"

import { composeRenderProps } from "react-aria-components/composeRenderProps"
import { DropZone as DropPrimitiveZone, type DropZoneProps } from "react-aria-components/DropZone"
import { cn } from "cn"

/*
 * A drop zone is a well that files fall into:
 *   rest       a 2px control edge
 *   hover      the rule turns ink
 *   drag-over  the pressed print: solid ink, the contents on the paper side
 *   invalid    `data-invalid`: the rule doubles in danger; the zone also
 *              prints an error line with an icon, so the hue is never alone
 *   disabled   faded rule, muted text, struck through
 *   focus      the heavy bracket
 * `[data-demo]` forces a state in the Component Catalog ("pressed" prints the
 * drag-over state).
 */
export function DropZone({ className, ...props }: DropZoneProps) {
  return (
    <DropPrimitiveZone
      className={composeRenderProps(className, (className, { isDropTarget }) =>
        cn(
          "bracket relative flex min-h-44 flex-col items-center justify-center gap-y-3 border-2 border-input p-6 text-center",
          "transition-[background-color,border-color,box-shadow,color] duration-90 ease-out",
          "data-hovered:border-fg in-data-[demo=hover]:border-fg",
          "data-invalid:border-danger data-invalid:shadow-[inset_0_0_0_2px_var(--danger)]",
          "in-data-[demo=pressed]:border-fg in-data-[demo=pressed]:bg-fg in-data-[demo=pressed]:text-bg in-data-[demo=pressed]:shadow-none in-data-[demo=pressed]:[--muted-fg:var(--bg)]",
          isDropTarget && "border-fg bg-fg text-bg shadow-none [--muted-fg:var(--bg)]",
          // Disabled cannot take focus, so ::after carries the strike instead.
          "data-disabled:cursor-not-allowed data-disabled:border-[color-mix(in_oklab,var(--input)_40%,var(--bg))] data-disabled:text-muted-fg data-disabled:shadow-none",
          "data-disabled:after:inset-x-[-4px] data-disabled:after:top-[calc(50%-1.5px)] data-disabled:after:bottom-auto data-disabled:after:h-[3px] data-disabled:after:border-0 data-disabled:after:bg-muted-fg data-disabled:after:opacity-100 data-disabled:after:[mask-image:none] data-disabled:after:[transform:none]",
          "forced-colors:data-invalid:border-[Mark] forced-colors:data-disabled:border-[GrayText]",
          className
        )
      )}
      {...props}
    />
  )
}
