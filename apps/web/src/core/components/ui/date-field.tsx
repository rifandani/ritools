'use client'

import type { DateFieldProps, DateInputProps, DateValue } from "react-aria-components/DateField"
import {
  DateField as DateFieldPrimitive,
  DateInput as DateInputPrimitive,
  DateSegment,
} from "react-aria-components/DateField"
import { twJoin } from "cn"
import { cx } from "@/core/utils/primitive"
import { printedFieldStyles } from "./field"

export function DateField<T extends DateValue>({ className, ...props }: DateFieldProps<T>) {
  return (
    <DateFieldPrimitive
      {...props}
      data-slot="control"
      className={cx(printedFieldStyles({ className: "w-fit max-w-full" }), className)}
    />
  )
}

export function DateInput({ className, ...props }: Omit<DateInputProps, "children">) {
  return (
    // The well carries the rule, the bracket, and the strike (globals.css).
    <span data-slot="control" className="well bracket">
      <DateInputPrimitive
        className={cx(
          "relative flex min-w-0 items-center px-[calc(--spacing(3.5)-2px)] py-[calc(--spacing(2.5)-2px)] sm:px-[calc(--spacing(3)-2px)] sm:py-[calc(--spacing(2)-2px)]",
          "whitespace-nowrap text-base/6 outline-hidden sm:text-sm/6",
          "disabled:cursor-not-allowed forced-colors:in-disabled:text-[GrayText]",
          "dark:scheme-dark",
          className
        )}
        {...props}
      >
        {(segment) => (
          <DateSegment
            segment={segment}
            className={twJoin(
              // Every segment is a number: the one numerals face, tabular, so
              // the value never shifts while it is typed.
              "num inline-block px-0.5 type-literal:px-0 caret-transparent outline-0",
              "data-placeholder:not-data-focused:text-muted-fg",
              // The segment being typed prints solid: ink, or danger when invalid.
              "focus:bg-fg focus:text-bg focus:data-invalid:bg-danger focus:data-invalid:text-danger-fg",
              // The Component Catalog prints the first segment as typed.
              "in-data-[demo=focus]:first:bg-fg in-data-[demo=focus]:first:text-bg",
              "forced-color-adjust-none forced-colors:text-[ButtonText] forced-colors:focus:bg-[Highlight] forced-colors:focus:text-[HighlightText] forced-colors:in-disabled:text-[GrayText]"
            )}
          />
        )}
      </DateInputPrimitive>
    </span>
  )
}
