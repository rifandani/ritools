'use client'

import { HiCalendarDateRange } from "react-icons/hi2"
import type { DateDuration } from "@internationalized/date"
import { Button } from "react-aria-components/Button"
import type { DateValue } from "react-aria-components/DateField"
import {
  DateRangePicker as DateRangePickerPrimitive,
  type DateRangePickerProps as DateRangePickerPrimitiveProps,
} from "react-aria-components/DateRangePicker"
import { Group } from "react-aria-components/Group"
import type { PopoverProps } from "react-aria-components/Popover"
import { twJoin } from "cn"
import { cx } from "@/core/utils/primitive"
import { DateInput } from "./date-field"
import { DatePickerOverlay } from "./date-picker"
import { printedFieldStyles } from "./field"
import type { InputGroup } from "./input"

export interface DateRangePickerProps<
  T extends DateValue,
> extends DateRangePickerPrimitiveProps<T> {
  visibleDuration?: DateDuration
  pageBehavior?: "visible" | "single"
  popover?: Omit<PopoverProps, "children">
}

export function DateRangePicker<T extends DateValue>({
  className,
  popover,
  children,
  visibleDuration = { months: 1 },
  ...props
}: DateRangePickerProps<T>) {
  return (
    <DateRangePickerPrimitive
      data-slot="control"
      className={cx(printedFieldStyles({ className: "group/date-range-picker" }), className)}
      {...props}
    >
      {(values) => (
        <>
          {typeof children === "function" ? children(values) : children}
          <DatePickerOverlay {...popover} visibleDuration={visibleDuration} range />
        </>
      )}
    </DateRangePickerPrimitive>
  )
}

/**
 * One well round both dates and the calendar button, the same print as the
 * date picker: the two date inputs drop their own wells, and the outer rule
 * doubles while the calendar is out.
 */
export function DateRangePickerTrigger({
  className,
  ...props
}: React.ComponentProps<typeof InputGroup>) {
  return (
    <Group
      data-slot="control"
      className={cx(
        "well bracket flex w-full min-w-0 items-stretch",
        "[&_.well]:border-0 [&_.well]:shadow-none [&_.well]:after:hidden",
        className
      )}
      {...props}
    >
      <DateInput slot="start" className="pe-1.5 sm:pe-1.5" />
      {/* The range dash: a short square rule, muted with the field. */}
      <span
        aria-hidden="true"
        className="pointer-events-none block h-0.5 w-2 shrink-0 self-center bg-fg group-disabled/date-range-picker:bg-muted-fg forced-colors:bg-[ButtonText] forced-colors:group-disabled/date-range-picker:bg-[GrayText]"
      />
      <DateInput slot="end" className="ps-1.5 sm:ps-1.5" />
      {/* An inner mark: muted at rest, ink on hover, solid ink when pressed. */}
      <Button
        data-slot="date-picker-trigger"
        className={twJoin(
          "ms-auto grid w-11 shrink-0 place-content-center border-input border-s-2 text-muted-fg outline-hidden sm:w-9",
          // React Aria keeps the button pressed while the calendar is out; the
          // well prints the open rule then, so the fill is only the press itself.
          "hover:text-fg [&[data-pressed]:not([data-open]_*)]:bg-fg [&[data-pressed]:not([data-open]_*)]:text-bg group-open/date-range-picker:text-fg",
          "in-data-[demo=pressed]:bg-fg in-data-[demo=pressed]:text-bg",
          "disabled:cursor-not-allowed disabled:border-[color-mix(in_oklab,var(--input)_40%,var(--bg))]",
          "*:size-5 sm:*:size-4",
          "forced-colors:text-[ButtonText] forced-colors:disabled:text-[GrayText]"
        )}
      >
        <HiCalendarDateRange />
      </Button>
    </Group>
  )
}
