'use client'

import {
  TimeField as TimeFieldPrimitive,
  type TimeFieldProps,
  type TimeValue,
} from "react-aria-components/TimeField"
import { DateInput } from "@/core/components/ui/date-field"
import { cx } from "@/core/utils/primitive"
import { printedFieldStyles } from "./field"

export function TimeField<T extends TimeValue>({ className, ...props }: TimeFieldProps<T>) {
  return (
    <TimeFieldPrimitive
      {...props}
      data-slot="control"
      className={cx(printedFieldStyles({ className: "w-fit max-w-full" }), className)}
    />
  )
}

export const TimeInput = DateInput
