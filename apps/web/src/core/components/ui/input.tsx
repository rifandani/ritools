"use client"

import { Group, type GroupProps } from "react-aria-components/Group"
import {
  Input as InputPrimitive,
  type InputProps as InputPrimitiveProps,
} from "react-aria-components/Input"
import { cx } from "@/core/utils/primitive"

interface InputProps extends InputPrimitiveProps {
  ref?: React.RefObject<HTMLInputElement | null>
}
export function Input({ className, ref, ...props }: InputProps) {
  return (
    // The well carries the rule, the bracket, and the strike (globals.css).
    <span data-slot="control" className="well bracket w-full">
      <InputPrimitive
        className={cx(
          "relative block w-full appearance-none bg-transparent px-[calc(--spacing(3.5)-2px)] py-[calc(--spacing(2.5)-2px)] sm:px-[calc(--spacing(3)-2px)] sm:py-[calc(--spacing(2)-2px)]",
          "text-base/6 placeholder:text-muted-fg sm:text-sm/6",
          "outline-hidden disabled:cursor-not-allowed",
          "[&::-ms-reveal]:hidden [&::-webkit-search-cancel-button]:hidden",
          "forced-colors:in-disabled:text-[GrayText]",
          "dark:scheme-dark",
          className
        )}
        ref={ref}
        {...props}
      />
    </span>
  )
}

export function InputGroup({ className, ...props }: GroupProps) {
  return (
    <Group
      data-slot="control"
      className={cx(
        "relative isolate block",
        // icon
        "has-[>[data-slot=icon]:first-child]:[&_input]:ps-10 has-[>[data-slot=icon]:last-child]:[&_input]:pe-10 sm:has-[>[data-slot=icon]:first-child]:[&_input]:ps-8 sm:has-[>[data-slot=icon]:last-child]:[&_input]:pe-8",
        "*:data-[slot=icon]:pointer-events-none *:data-[slot=icon]:absolute *:data-[slot=icon]:top-1/2 *:data-[slot=icon]:z-10 *:data-[slot=icon]:size-5 *:data-[slot=icon]:-translate-y-1/2 sm:*:data-[slot=icon]:size-4",
        "[&>[data-slot=icon]:first-child]:start-3 sm:[&>[data-slot=icon]:first-child]:start-2.5 [&>[data-slot=icon]:last-child]:end-3 sm:[&>[data-slot=icon]:last-child]:end-2.5",

        // loader
        "has-[[data-slot=loader]:first-child]:[&_input]:ps-10 has-[[data-slot=loader]:last-child]:[&_input]:pe-10 sm:has-[[data-slot=loader]:first-child]:[&_input]:ps-8 sm:has-[[data-slot=loader]:last-child]:[&_input]:pe-8",
        "*:data-[slot=loader]:pointer-events-none *:data-[slot=loader]:absolute *:data-[slot=loader]:top-1/2 *:data-[slot=loader]:z-10 *:data-[slot=loader]:size-5 *:data-[slot=loader]:-translate-y-1/2 sm:*:data-[slot=loader]:size-4",
        "[&>[data-slot=loader]:first-child]:start-3 sm:[&>[data-slot=loader]:first-child]:start-2.5 [&>[data-slot=loader]:last-child]:end-3 sm:[&>[data-slot=loader]:last-child]:end-2.5",

        // text
        "has-[[data-slot=text]:first-child]:[&_input]:ps-[calc(var(--input-gutter-start)+--spacing(2))] has-[[data-slot=text]:last-child]:[&_input]:pe-[calc(var(--input-gutter-end)+--spacing(2))] sm:has-[[data-slot=text]:first-child]:[&_input]:ps-(--input-gutter-start,--spacing(10)) sm:has-[[data-slot=text]:last-child]:[&_input]:pe-(--input-gutter-end,--spacing(10))",
        "*:data-[slot=text]:absolute *:data-[slot=text]:top-0 *:data-[slot=text]:z-10 *:data-[slot=text]:h-full *:data-[slot=text]:max-w-fit *:data-[slot=text]:grow *:data-[slot=text]:content-center [&>[data-slot='text']:not([class*='pointer-events'])]:pointer-events-none",
        "[&>[data-slot=text]:first-child:not([class*='start-'])]:start-3 sm:[&>[data-slot=text]:first-child:not([class*='start-'])]:start-2.5 [&>[data-slot=text]:last-child:not([class*='end-'])]:end-3 sm:[&>[data-slot=text]:last-child:not([class*='end-'])]:end-2.5",

        // keyboard
        "has-[[data-slot=keyboard]:first-child]:[&_input]:ps-[calc(var(--input-gutter-start)+--spacing(2))] has-[[data-slot=keyboard]:last-child]:[&_input]:pe-[calc(var(--input-gutter-end)+--spacing(2))] sm:has-[[data-slot=keyboard]:first-child]:[&_input]:ps-(--input-gutter-start,--spacing(10)) sm:has-[[data-slot=keyboard]:last-child]:[&_input]:pe-(--input-gutter-end,--spacing(10))",
        "*:data-[slot=keyboard]:absolute *:data-[slot=keyboard]:top-0 *:data-[slot=keyboard]:z-10 *:data-[slot=keyboard]:h-full *:data-[slot=keyboard]:max-w-fit *:data-[slot=keyboard]:grow *:data-[slot=keyboard]:content-center [&>[data-slot='keyboard']:not([class*='pointer-events'])]:pointer-events-none",
        "[&>[data-slot=keyboard]:first-child:not([class*='start-'])]:start-3 sm:[&>[data-slot=keyboard]:first-child:not([class*='start-'])]:start-2.5 [&>[data-slot=keyboard]:last-child:not([class*='end-'])]:end-3 sm:[&>[data-slot=keyboard]:last-child:not([class*='end-'])]:end-2.5",

        // button
        "has-[>button:first-child]:[&_input]:ps-(--input-gutter-start,--spacing(16)) has-[>button:last-child]:[&_input]:pe-(--input-gutter-end,--spacing(16)) sm:has-[>button:first-child]:[&_input]:ps-(--input-gutter-start,--spacing(14)) sm:has-[>button:last-child]:[&_input]:pe-(--input-gutter-end,--spacing(14))",
        "[&>button[data-intent=outline]]:border-input *:[button]:absolute *:[button]:inset-y-0.5 *:[button]:z-10",
        "[&>button:first-child]:start-0.5 [&>button:last-child]:end-0.5",

        "[&>[data-slot='icon']:not([class*='text-'])]:text-muted-fg [&>[data-slot='loader']:not([class*='text-'])]:text-muted-fg [&>[data-slot='text']:not([class*='text-'])]:text-muted-fg",
        className
      )}
      {...props}
    />
  )
}
