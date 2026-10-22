'use client'

import {
  ColorThumb as ColorThumbPrimitive,
  type ColorThumbProps,
} from "react-aria-components/ColorThumb"
import { cx } from "@/core/utils/primitive"

/**
 * A square printed block: a 3px ink frame on the picked color, with a paper
 * hairline outside so the frame reads on a dark field and the paper edge reads
 * on a bright one. Hover doubles the frame inward, a drag fills it solid, and
 * focus takes the heavy bracket.
 */
export function ColorThumb({ className, ...props }: ColorThumbProps) {
  return (
    <ColorThumbPrimitive
      {...props}
      style={({ defaultStyle, isDisabled }) => ({
        ...defaultStyle,
        backgroundColor: isDisabled ? undefined : defaultStyle.backgroundColor,
      })}
      className={cx(
        "bracket top-1/2 left-1/2 size-5 rounded-none border-[3px] border-fg bg-bg outline-hidden",
        "shadow-[0_0_0_1px_var(--bg)]",
        "transition-[border-width,box-shadow,background-color,opacity] duration-90 ease-out",
        "hover:inset-ring-2 hover:inset-ring-fg",
        "in-data-[demo=hover]:inset-ring-2 in-data-[demo=hover]:inset-ring-fg",
        "dragging:border-[6px] in-data-[demo=pressed]:border-[6px]",
        "disabled:border-[color-mix(in_oklab,var(--fg)_40%,var(--bg))] disabled:bg-muted disabled:opacity-50 disabled:shadow-none",
        "forced-colors:border-[ButtonText] forced-colors:bg-[ButtonFace]",
        className
      )}
    />
  )
}
