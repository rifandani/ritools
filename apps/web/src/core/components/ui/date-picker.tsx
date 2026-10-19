"use client"

import { HiCalendarDays } from "react-icons/hi2"
import type { DateDuration } from "@internationalized/date"
import { Button } from "react-aria-components/Button"
import type { DateValue } from "react-aria-components/DateField"
import {
  DatePicker as DatePickerPrimitive,
  type DatePickerProps as DatePickerPrimitiveProps,
} from "react-aria-components/DatePicker"
import { Group, type GroupProps } from "react-aria-components/Group"
import type { PopoverProps } from "react-aria-components/Popover"
import { twJoin } from "cn"
import { useIsMobile } from "@/core/hooks/use-mobile"
import { cx } from "@/core/utils/primitive"
import { Calendar } from "./calendar"
import { DateInput } from "./date-field"
import { printedFieldStyles } from "./field"
import { ModalContent } from "./modal"
import { PopoverContent } from "./popover"
import { RangeCalendar } from "./range-calendar"

export interface DatePickerProps<T extends DateValue> extends DatePickerPrimitiveProps<T> {
  popover?: Omit<PopoverProps, "children">
}

export function DatePicker<T extends DateValue>({
  className,
  children,
  popover,
  ...props
}: DatePickerProps<T>) {
  return (
    <DatePickerPrimitive
      data-slot="control"
      className={cx(printedFieldStyles({ className: "group" }), className)}
      {...props}
    >
      {(values) => (
        <>
          {typeof children === "function" ? children(values) : children}
          <DatePickerOverlay {...popover} />
        </>
      )}
    </DatePickerPrimitive>
  )
}

export interface DatePickerOverlayProps extends Omit<PopoverProps, "children"> {
  range?: boolean
  visibleDuration?: DateDuration
  pageBehavior?: "visible" | "single"
}

export function DatePickerOverlay({
  visibleDuration = { months: 1 },
  pageBehavior = "visible",
  placement = "bottom",
  range,
  ...props
}: DatePickerOverlayProps) {
  const isMobile = useIsMobile()

  return isMobile ? (
    // On a phone the calendar is a sheet: white stock under a 2px rule, square,
    // and no blur behind it (print has no glass).
    <ModalContent
      closeButton={false}
      className="rounded-none border-rule border-t-2 inset-shadow-none ring-0 sm:border-2"
      overlay={{ className: "backdrop-blur-none" }}
    >
      <div className="flex justify-center p-6">
        {range ? (
          <RangeCalendar pageBehavior={pageBehavior} visibleDuration={visibleDuration} />
        ) : (
          <Calendar />
        )}
      </div>
    </ModalContent>
  ) : (
    <PopoverContent
      placement={placement}
      arrow={false}
      className="flex min-w-auto max-w-none justify-center p-4"
      {...props}
    >
      {range ? (
        <RangeCalendar pageBehavior={pageBehavior} visibleDuration={visibleDuration} />
      ) : (
        <Calendar />
      )}
    </PopoverContent>
  )
}

/**
 * The well a picker prints: one 2px rule round the date and its calendar
 * button. The date input inside drops its own well; the outer one carries the
 * rule, the bracket, the strike, and the doubled rule while the calendar is out.
 */
const pickerWellStyles = [
  "well bracket flex w-full min-w-0 items-stretch",
  "[&_.well]:border-0 [&_.well]:shadow-none [&_.well]:after:hidden",
]

/**
 * The calendar button is an inner mark: muted at rest, ink on hover, solid ink
 * when pressed, behind a 2px control edge.
 */
const pickerButtonStyles = [
  "ms-auto grid w-11 shrink-0 place-content-center border-input border-s-2 text-muted-fg outline-hidden sm:w-9",
  // React Aria keeps the button pressed while the calendar is out; the
  // well prints the open rule then, so the fill is only the press itself.
  "hover:text-fg [&[data-pressed]:not([data-open]_*)]:bg-fg [&[data-pressed]:not([data-open]_*)]:text-bg group-open:text-fg",
  "in-data-[demo=pressed]:bg-fg in-data-[demo=pressed]:text-bg",
  "disabled:cursor-not-allowed disabled:border-[color-mix(in_oklab,var(--input)_40%,var(--bg))]",
  "*:size-5 sm:*:size-4",
  "forced-colors:text-[ButtonText] forced-colors:disabled:text-[GrayText]",
]

export function DatePickerTrigger({ className, ...props }: GroupProps) {
  return (
    <Group
      data-slot="control"
      className={cx(twJoin(pickerWellStyles, "*:data-[slot=control]:flex-1"), className)}
      {...props}
    >
      <DateInput />
      <Button data-slot="date-picker-trigger" className={twJoin(pickerButtonStyles)}>
        <HiCalendarDays />
      </Button>
    </Group>
  )
}
