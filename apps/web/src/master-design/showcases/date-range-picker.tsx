import { CalendarDate } from "@internationalized/date";

import {
  DateRangePicker,
  DateRangePickerTrigger,
} from "@/core/components/ui/date-range-picker";
import { Description, FieldError, Label } from "@/core/components/ui/field";

import { Variant, VariantGrid } from "../variant";

const trip = {
  end: new CalendarDate(2026, 8, 18),
  start: new CalendarDate(2026, 8, 11),
};

const states = ["hover", "pressed", "focus"] as const;

export const DateRangePickerShowcase = () => (
  <div className="flex flex-col gap-8">
    {/* One well round both dates and the calendar button. */}
    <VariantGrid>
      <Variant className="w-72" label="rest, empty">
        <DateRangePicker>
          <Label>Taken between</Label>
          <DateRangePickerTrigger />
        </DateRangePicker>
      </Variant>
      <Variant className="w-72" label="rest, filled, open it">
        <DateRangePicker defaultValue={trip}>
          <Label>Taken between</Label>
          <DateRangePickerTrigger />
        </DateRangePicker>
      </Variant>
      {states.map((state) => (
        <Variant className="w-72" demo={state} key={state} label={state}>
          <DateRangePicker defaultValue={trip}>
            <Label>Taken between</Label>
            <DateRangePickerTrigger />
          </DateRangePicker>
        </Variant>
      ))}
      <Variant className="w-72" label="isInvalid">
        <DateRangePicker
          defaultValue={{
            end: new CalendarDate(2026, 8, 18),
            start: new CalendarDate(2026, 8, 25),
          }}
          isInvalid
        >
          <Label>Taken between</Label>
          <DateRangePickerTrigger />
          <FieldError>The end date comes before the start date.</FieldError>
        </DateRangePicker>
      </Variant>
      <Variant className="w-72" label="isDisabled">
        <DateRangePicker defaultValue={trip} isDisabled>
          <Label>Taken between</Label>
          <DateRangePickerTrigger />
        </DateRangePicker>
      </Variant>
      <Variant
        className="w-72"
        label="visibleDuration={{ months: 2 }}, open it"
      >
        <DateRangePicker defaultValue={trip} visibleDuration={{ months: 2 }}>
          <Label>Taken between</Label>
          <DateRangePickerTrigger />
          <Description>
            <span className="num">48</span> photos in this range.
          </Description>
        </DateRangePicker>
      </Variant>
    </VariantGrid>
  </div>
);
