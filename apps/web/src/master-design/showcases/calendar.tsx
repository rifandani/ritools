import type { DateValue } from "@internationalized/date";
import { CalendarDate } from "@internationalized/date";

import { Calendar } from "@/core/components/ui/calendar";

import { Variant, VariantGrid } from "../variant";

const shotOn = new CalendarDate(2026, 8, 11);

/** The catalog prints a forced state on the date that takes focus: 13 August. */
const stateDate = new CalendarDate(2026, 8, 13);

const states = ["hover", "pressed", "focus"] as const;

/** Days with no photos in the Batch. */
const noPhotos = (date: DateValue) => date.day === 15 || date.day === 16;

export const CalendarShowcase = () => (
  <VariantGrid>
    <Variant className="w-80" label="empty: this month, today ticked">
      <Calendar aria-label="Taken on" />
    </Variant>
    <Variant className="w-80" label="selected">
      <Calendar aria-label="Taken on" defaultValue={shotOn} />
    </Variant>
    {states.map((state) => (
      <Variant className="w-80" key={state} label={`${state}, on 13 August`}>
        <div data-date-demo={state}>
          <Calendar
            aria-label="Taken on"
            defaultFocusedValue={stateDate}
            defaultValue={shotOn}
          />
        </div>
      </Variant>
    ))}
    <Variant className="w-80" label="minValue, maxValue: dates struck">
      <Calendar
        aria-label="Taken on"
        defaultValue={shotOn}
        maxValue={new CalendarDate(2026, 8, 28)}
        minValue={new CalendarDate(2026, 8, 4)}
      />
    </Variant>
    <Variant className="w-80" label="isDateUnavailable: no photos">
      <Calendar
        aria-label="Taken on"
        defaultValue={shotOn}
        isDateUnavailable={noPhotos}
      />
    </Variant>
    <Variant className="w-80" label="isInvalid">
      <Calendar aria-label="Taken on" defaultValue={shotOn} isInvalid />
    </Variant>
    <Variant className="w-80" label="isReadOnly">
      <Calendar aria-label="Taken on" defaultValue={shotOn} isReadOnly />
    </Variant>
    <Variant className="w-80" label="isDisabled">
      <Calendar aria-label="Taken on" defaultValue={shotOn} isDisabled />
    </Variant>
  </VariantGrid>
);
