import { CalendarDate } from "@internationalized/date";

import {
  DatePicker,
  DatePickerTrigger,
} from "@/core/components/ui/date-picker";
import { Description, FieldError, Label } from "@/core/components/ui/field";

import { Variant, VariantGrid } from "../variant";

const shotOn = new CalendarDate(2026, 8, 11);

const states = ["hover", "pressed", "focus"] as const;

export const DatePickerShowcase = () => (
  <div className="flex flex-col gap-8">
    {/* One well round the date and its calendar button. Pressed fills the button. */}
    <VariantGrid>
      <Variant label="rest, empty">
        <DatePicker>
          <Label>Taken on or after</Label>
          <DatePickerTrigger />
        </DatePicker>
      </Variant>
      <Variant label="rest, filled, open it">
        <DatePicker defaultValue={shotOn}>
          <Label>Taken on or after</Label>
          <DatePickerTrigger />
        </DatePicker>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <DatePicker defaultValue={shotOn}>
            <Label>Taken on or after</Label>
            <DatePickerTrigger />
          </DatePicker>
        </Variant>
      ))}
      <Variant label="isInvalid">
        <DatePicker
          defaultValue={new CalendarDate(2027, 1, 4)}
          isInvalid
          maxValue={new CalendarDate(2026, 10, 19)}
        >
          <Label>Taken on or after</Label>
          <DatePickerTrigger />
          <FieldError>A photo cannot be taken in the future.</FieldError>
        </DatePicker>
      </Variant>
      <Variant label="isDisabled">
        <DatePicker defaultValue={shotOn} isDisabled>
          <Label>Taken on or after</Label>
          <DatePickerTrigger />
        </DatePicker>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant label="minValue, maxValue, Description, open it">
        <DatePicker
          defaultValue={shotOn}
          maxValue={new CalendarDate(2026, 8, 28)}
          minValue={new CalendarDate(2026, 8, 4)}
        >
          <Label>Taken on</Label>
          <DatePickerTrigger />
          <Description>Only dates with photos in this Batch.</Description>
        </DatePicker>
      </Variant>
    </VariantGrid>
  </div>
);
