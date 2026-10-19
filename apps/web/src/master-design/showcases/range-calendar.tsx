import type { DateValue } from "@internationalized/date";
import { CalendarDate } from "@internationalized/date";

import { RangeCalendar } from "@/core/components/ui/range-calendar";

import { Variant, VariantGrid } from "../variant";

const trip = {
  end: new CalendarDate(2026, 8, 18),
  start: new CalendarDate(2026, 8, 11),
};

/** The catalog prints a forced state on the date that takes focus: 21 August. */
const stateDate = new CalendarDate(2026, 8, 21);

const states = ["hover", "pressed", "focus"] as const;

/** Days with no photos in the Batch. */
const noPhotos = (date: DateValue) => date.day === 15 || date.day === 16;

export const RangeCalendarShowcase = () => (
  <div className="flex flex-col gap-8">
    {/* The ends print solid; the foot runs as one red rule from end to end. */}
    <VariantGrid>
      <Variant className="w-80" label="empty: this month, today ticked">
        <RangeCalendar aria-label="Taken between" />
      </Variant>
      <Variant className="w-80" label="selected range">
        <RangeCalendar aria-label="Taken between" defaultValue={trip} />
      </Variant>
      <Variant className="w-80" label="selected, one day">
        <RangeCalendar
          aria-label="Taken between"
          defaultValue={{ end: trip.start, start: trip.start }}
        />
      </Variant>
      {states.map((state) => (
        <Variant className="w-80" key={state} label={`${state}, on 21 August`}>
          <div data-date-demo={state}>
            <RangeCalendar
              aria-label="Taken between"
              defaultFocusedValue={stateDate}
              defaultValue={trip}
            />
          </div>
        </Variant>
      ))}
      <Variant className="w-80" label="isDateUnavailable, isInvalid">
        <RangeCalendar
          aria-label="Taken between"
          defaultValue={trip}
          isDateUnavailable={noPhotos}
          isInvalid
        />
      </Variant>
      <Variant className="w-80" label="minValue, maxValue: dates struck">
        <RangeCalendar
          aria-label="Taken between"
          defaultValue={trip}
          maxValue={new CalendarDate(2026, 8, 28)}
          minValue={new CalendarDate(2026, 8, 4)}
        />
      </Variant>
      <Variant className="w-80" label="isDisabled">
        <RangeCalendar
          aria-label="Taken between"
          defaultValue={trip}
          isDisabled
        />
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant
        className="w-full"
        label="visibleDuration={{ months: 2 }}: wraps on a phone"
      >
        <RangeCalendar
          aria-label="Taken between"
          defaultValue={{
            end: new CalendarDate(2026, 9, 3),
            start: new CalendarDate(2026, 8, 27),
          }}
          visibleDuration={{ months: 2 }}
        />
      </Variant>
    </VariantGrid>
  </div>
);
