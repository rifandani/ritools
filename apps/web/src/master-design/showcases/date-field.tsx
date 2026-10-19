import { CalendarDate, CalendarDateTime } from "@internationalized/date";

import { DateField, DateInput } from "@/core/components/ui/date-field";
import { Description, FieldError, Label } from "@/core/components/ui/field";

import { Variant, VariantGrid } from "../variant";

const shotOn = new CalendarDate(2026, 8, 11);

const states = ["hover", "focus"] as const;

export const DateFieldShowcase = () => (
  <div className="flex flex-col gap-8">
    {/* The well: every state, side by side. A typed date has no pressed print. */}
    <VariantGrid>
      <Variant label="rest, empty">
        <DateField>
          <Label>Taken on or after</Label>
          <DateInput />
        </DateField>
      </Variant>
      <Variant label="rest, filled">
        <DateField defaultValue={shotOn}>
          <Label>Taken on or after</Label>
          <DateInput />
        </DateField>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <DateField defaultValue={shotOn}>
            <Label>Taken on or after</Label>
            <DateInput />
          </DateField>
        </Variant>
      ))}
      <Variant label="isInvalid">
        <DateField
          defaultValue={new CalendarDate(2027, 1, 4)}
          isInvalid
          maxValue={new CalendarDate(2026, 10, 19)}
        >
          <Label>Taken on or after</Label>
          <DateInput />
          <FieldError>A photo cannot be taken in the future.</FieldError>
        </DateField>
      </Variant>
      <Variant label="isDisabled">
        <DateField defaultValue={shotOn} isDisabled>
          <Label>Taken on or after</Label>
          <DateInput />
        </DateField>
      </Variant>
      <Variant label="isReadOnly">
        <DateField defaultValue={shotOn} isReadOnly>
          <Label>Taken on</Label>
          <DateInput />
        </DateField>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant label='granularity="minute", Description'>
        <DateField
          defaultValue={new CalendarDateTime(2026, 8, 11, 9, 42)}
          granularity="minute"
        >
          <Label>Taken at</Label>
          <DateInput />
          <Description>From the EXIF data of IMG_4021.jpg.</Description>
        </DateField>
      </Variant>
      <Variant label="isRequired, empty">
        <DateField isRequired>
          <Label>Taken on or after</Label>
          <DateInput />
        </DateField>
      </Variant>
      <Variant label="on the ink rail">
        <div className="ground-ink w-full p-4">
          <DateField defaultValue={shotOn}>
            <Label>Taken on or after</Label>
            <DateInput />
          </DateField>
        </div>
      </Variant>
    </VariantGrid>
  </div>
);
