'use client'

import { use } from "react"
import { type CalendarDate, isSameDay } from "@internationalized/date"
import { CalendarCell, CalendarGrid, CalendarGridBody } from "react-aria-components/Calendar"
import type { DateValue } from "react-aria-components/DateField"
import {
  RangeCalendar as RangeCalendarPrimitive,
  type RangeCalendarProps,
  RangeCalendarStateContext,
} from "react-aria-components/RangeCalendar"
import { tv } from "tailwind-variants"
import { CalendarGridHeader, CalendarHeader } from "./calendar"

/*
 * The same printed date as the calendar. A range prints as the selected mark
 * split in two: its ends are solid ink with the red foot, and every date
 * between them keeps the foot on a bare ground. The foot is a background
 * image from the border box, under a transparent frame, so it runs as one red
 * rule from end to end and does not rely on a fill color alone. An invalid
 * range prints its ends hollow in a doubled danger rule, and the foot between
 * them in danger.
 */
const rangeCellStyles = tv({
  base: [
    "relative flex size-11 cursor-default items-center justify-center border-2 border-transparent bg-no-repeat [background-origin:border-box] outline-hidden sm:size-9",
    "num text-base text-fg sm:text-sm",
    "transition-[background-color,color,border-color,translate] duration-90 ease-out",
    "data-focus-visible:z-10",
    "forced-colors:text-[ButtonText]",
  ],
  variants: {
    isHovered: { true: "border-fg" },
    isPressed: { true: "translate-y-px border-transparent bg-fg text-bg" },
    isSelected: {
      true: [
        "[background-image:linear-gradient(var(--red),var(--red))] [background-position:bottom] [background-size:100%_4px]",
        "forced-color-adjust-none forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
      ],
    },
    /** The first or last date of the range: solid ink. */
    isEnd: { true: "border-transparent bg-fg text-bg" },
    isInvalid: { true: "" },
    isDisabled: {
      true: "cursor-not-allowed text-muted-fg [background-image:linear-gradient(currentColor,currentColor)] [background-position:center] [background-size:100%_3px] forced-colors:text-[GrayText]",
    },
    isOutsideMonth: { true: "invisible" },
    isToday: {
      true: "before:absolute before:inset-x-0 before:top-1 before:mx-auto before:size-1 before:bg-current",
    },
    isFocusTarget: {
      true: [
        "bracket",
        "in-data-[date-demo=focus]:z-10 in-data-[date-demo=hover]:border-fg",
        "in-data-[date-demo=pressed]:translate-y-px in-data-[date-demo=pressed]:border-transparent in-data-[date-demo=pressed]:bg-fg in-data-[date-demo=pressed]:text-bg",
        // The bracket shows for a forced focus too.
        "in-data-[date-demo=focus]:after:opacity-100 in-data-[date-demo=focus]:after:[transform:none]",
      ],
    },
  },
  compoundVariants: [
    // Dates inside the range print the numeral bold over the foot.
    { isSelected: true, isEnd: false, className: "font-bold" },
    // Hover thickens the foot under any date of the range.
    { isSelected: true, isHovered: true, className: "[background-size:100%_6px]" },
    { isEnd: true, isHovered: true, className: "border-transparent" },
    {
      isSelected: true,
      isInvalid: true,
      className:
        "text-danger-subtle-fg [background-image:linear-gradient(var(--danger),var(--danger))] forced-colors:text-[MarkText]",
    },
    {
      isEnd: true,
      isInvalid: true,
      className:
        "border-danger bg-transparent font-bold text-danger-subtle-fg shadow-[inset_0_0_0_2px_var(--danger)] [background-image:none] forced-colors:border-[Mark] forced-colors:bg-transparent forced-colors:text-[ButtonText]",
    },
  ],
})

/** A date cell; it knows whether it is the calendar's roving tab stop. */
function RangeDateCell({ date }: { date: CalendarDate }) {
  const state = use(RangeCalendarStateContext)
  const isFocusTarget = state ? isSameDay(date, state.focusedDate) : false

  return (
    <CalendarCell
      date={date}
      className={({
        isSelected,
        isSelectionStart,
        isSelectionEnd,
        isHovered,
        isPressed,
        isInvalid,
        isDisabled,
        isUnavailable,
        isOutsideMonth,
        isToday,
      }) =>
        rangeCellStyles({
          isSelected,
          isEnd: isSelected && (isSelectionStart || isSelectionEnd),
          isHovered,
          isPressed,
          isInvalid,
          isDisabled: isDisabled || isUnavailable,
          isOutsideMonth,
          isToday,
          isFocusTarget,
        })
      }
    />
  )
}

export function RangeCalendar<T extends DateValue>({
  visibleDuration = { months: 1 },
  ...props
}: RangeCalendarProps<T>) {
  return (
    <RangeCalendarPrimitive
      data-slot="calendar"
      visibleDuration={visibleDuration}
      // As wide as its months, so the header arrows end over the last column.
      className="w-fit max-w-full"
      {...props}
    >
      <CalendarHeader />
      {/* Months stack on a phone and sit side by side from sm. */}
      <div className="flex flex-col items-start gap-6 sm:flex-row">
        {Array.from({ length: visibleDuration?.months ?? 1 }).map((_, index) => {
          const id = index + 1
          return (
            <CalendarGrid
              key={index}
              offset={id >= 2 ? { months: id - 1 } : undefined}
              className="[&_td]:px-0 [&_td]:py-0.5"
            >
              <CalendarGridHeader />
              <CalendarGridBody>{(date) => <RangeDateCell date={date} />}</CalendarGridBody>
            </CalendarGrid>
          )
        })}
      </div>
    </RangeCalendarPrimitive>
  )
}
