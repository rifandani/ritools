"use client"

import {
  Link as LinkPrimitive,
  type LinkProps as LinkPrimitiveProps,
} from "react-aria-components/Link"
import { cx } from "@/core/utils/primitive"

export interface LinkProps extends LinkPrimitiveProps {
  ref?: React.RefObject<HTMLAnchorElement>
}

export function Link({ className, ref, ...props }: LinkProps) {
  return (
    <LinkPrimitive
      ref={ref}
      className={cx(
        // Ink link (globals.css): a red rule at rest, a red fill on hover and
        // press, struck through when disabled, a heavy bracket on focus.
        "ink-link forced-colors:disabled:text-[GrayText]",
        "href" in props && "cursor-pointer",
        className
      )}
      {...props}
    />
  )
}
