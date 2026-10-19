"use client"

import { use } from "react"
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2"
import { type CalendarDate, isSameDay } from "@internationalized/date"
import {
  Calendar as CalendarPrimitive,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader as CalendarGridHeaderPrimitive,
  CalendarHeaderCell,
  CalendarMonthPicker,
  type CalendarProps as CalendarPrimitiveProps,
  CalendarStateContext,
  CalendarYearPicker,
  type DateValue,
} from "react-aria-components/Calendar"
import { composeRenderProps } from "react-aria-components/composeRenderProps"
import { Heading } from "react-aria-components/Heading"
import { useLocale } from "react-aria-components/I18nProvider"
import { cn } from "cn"
import { tv } from "tailwind-variants"
import { Button } from "./button"
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "./select"

interface CalendarProps<T extends DateValue> extends CalendarPrimitiveProps<T> {
  className?: string
}

/*
 * A date is a printed mark in a fixed square, set in the one numerals face:
 *   rest      bare numeral
 *   hover     a 2px ink frame
 *   pressed   solid ink
 *   selected  solid ink with the red foot (the toggle's selected print)
 *   invalid   a selected date prints hollow in a doubled danger rule (the
 *             well's invalid print), so the shape changes, not only the hue
 *   disabled  struck through, so a run of dates out of reach reads as one rule
 *   today     a square tick over the numeral
 *   focus     the heavy bracket
 * The foot and the strike are background images from the border box: they
 * paint under the transparent frame, so they run edge to edge and join from
 * date to date.
 */
const dateCellStyles = tv({
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
        "border-transparent bg-fg text-bg",
        "[background-image:linear-gradient(var(--red),var(--red))] [background-position:bottom] [background-size:100%_4px]",
        "forced-color-adjust-none forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
      ],
    },
    isInvalid: { true: "" },
    isDisabled: {
      true: "cursor-not-allowed text-muted-fg [background-image:linear-gradient(currentColor,currentColor)] [background-position:center] [background-size:100%_3px] forced-colors:text-[GrayText]",
    },
    // Dates of the next or last month repeat in its own grid: hidden here.
    isOutsideMonth: { true: "invisible" },
    isToday: {
      true: "before:absolute before:inset-x-0 before:top-1 before:mx-auto before:size-1 before:bg-current",
    },
    /*
     * The date that takes focus (the roving tab stop). The bracket lives on
     * it, and the Component Catalog prints its forced states on it only, with
     * `[data-date-demo]`: the catalog-wide `[data-demo]` would also force the
     * month, year, and arrow controls of the header.
     */
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
    // A selected date is already solid: hover thickens the foot.
    {
      isSelected: true,
      isHovered: true,
      className: "border-transparent [background-size:100%_6px]",
    },
    {
      isSelected: true,
      isInvalid: true,
      className:
        "border-danger bg-transparent font-bold text-danger-subtle-fg shadow-[inset_0_0_0_2px_var(--danger)] [background-image:none] forced-colors:border-[Mark] forced-colors:bg-transparent forced-colors:text-[ButtonText]",
    },
  ],
})

/** A date cell; it knows whether it is the calendar's roving tab stop. */
function DateCell({ date, className }: { date: CalendarDate; className?: string }) {
  const state = use(CalendarStateContext)
  const isFocusTarget = state ? isSameDay(date, state.focusedDate) : false

  return (
    <CalendarCell
      date={date}
      className={composeRenderProps(
        className,
        (
          className,
          { isSelected, isHovered, isPressed, isInvalid, isDisabled, isUnavailable, isToday, isOutsideMonth }
        ) =>
          dateCellStyles({
            isSelected,
            isHovered,
            isPressed,
            isInvalid,
            isDisabled: isDisabled || isUnavailable,
            isToday,
            isOutsideMonth,
            isFocusTarget,
            className,
          })
      )}
    />
  )
}

const Calendar = <T extends DateValue>({ className, ...props }: CalendarProps<T>) => {
  return (
    <CalendarPrimitive data-slot="calendar" {...props}>
      <CalendarHeader />
      <CalendarGrid className="[&_td]:px-0 [&_td]:py-0.5">
        <CalendarGridHeader />
        <CalendarGridBody>{(date) => <DateCell date={date} className={className} />}</CalendarGridBody>
      </CalendarGrid>
    </CalendarPrimitive>
  )
}

const CalendarHeader = ({ className, ...props }: React.ComponentProps<"header">) => {
  const { direction } = useLocale()
  return (
    <header
      data-slot="calendar-header"
      className={cn(
        "flex w-full items-center justify-between gap-1 pb-3",
        // An invalid date is not an invalid month or year: the pickers keep their rule.
        "in-data-invalid:**:[.well]:shadow-none in-data-invalid:**:[.well]:[--well-line:var(--input)]",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-1">
        {/* Short month names keep the header inside the seven date columns. */}
        <CalendarMonthPicker format="short">
          {({ items, ...props }) => (
            <Select {...props} className="w-auto">
              <SelectTrigger />
              <SelectContent items={items}>
                {(item) => (
                  <SelectItem textValue={item.formatted}>
                    <SelectLabel>{item.formatted}</SelectLabel>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </CalendarMonthPicker>
        <CalendarYearPicker>
          {({ items, ...props }) => (
            <Select {...props} className="w-auto">
              <SelectTrigger />
              <SelectContent items={items}>
                {(item) => (
                  <SelectItem textValue={item.formatted}>
                    {/* A year is a number: the one numerals face. */}
                    <SelectLabel className="num">{item.formatted}</SelectLabel>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </CalendarYearPicker>
      </div>
      <Heading className="sr-only" />
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sq-md" intent="outline" slot="previous">
          {direction === "rtl" ? <HiChevronRight /> : <HiChevronLeft />}
        </Button>
        <Button size="sq-md" intent="outline" slot="next">
          {direction === "rtl" ? <HiChevronLeft /> : <HiChevronRight />}
        </Button>
      </div>
    </header>
  )
}

// Weekday initials in the group label voice over a 2px rule.
const CalendarGridHeader = () => {
  return (
    <CalendarGridHeaderPrimitive>
      {(day) => (
        <CalendarHeaderCell className="border-rule border-b-2 pb-1.5 text-center font-bold text-muted-fg text-xs/4 uppercase tracking-[0.08em] [font-stretch:87.5%]">
          {day}
        </CalendarHeaderCell>
      )}
    </CalendarGridHeaderPrimitive>
  )
}

export type { CalendarProps }
export { Calendar, CalendarGridHeader, CalendarHeader }
