import { Time } from "@internationalized/date";

import { Description, FieldError, Label } from "@/core/components/ui/field";
import { TimeField, TimeInput } from "@/core/components/ui/time-field";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "focus"] as const;

export const TimeFieldShowcase = () => (
  <div className="flex flex-col gap-8">
    {/* The well: every state, side by side. A typed time has no pressed print. */}
    <VariantGrid>
      <Variant label="rest, empty">
        <TimeField>
          <Label>Taken after</Label>
          <TimeInput />
        </TimeField>
      </Variant>
      <Variant label="rest, filled">
        <TimeField defaultValue={new Time(9, 30)}>
          <Label>Taken after</Label>
          <TimeInput />
        </TimeField>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <TimeField defaultValue={new Time(9, 30)}>
            <Label>Taken after</Label>
            <TimeInput />
          </TimeField>
        </Variant>
      ))}
      <Variant label="isInvalid">
        <TimeField
          defaultValue={new Time(23, 10)}
          isInvalid
          maxValue={new Time(22, 0)}
        >
          <Label>Taken after</Label>
          <TimeInput />
          <FieldError>
            Pick a time before <span className="num">10:00</span> PM, when the
            last photo was taken.
          </FieldError>
        </TimeField>
      </Variant>
      <Variant label="isDisabled">
        <TimeField defaultValue={new Time(9, 30)} isDisabled>
          <Label>Taken after</Label>
          <TimeInput />
        </TimeField>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant label='granularity="second", hourCycle={24}'>
        <TimeField
          defaultValue={new Time(14, 5, 8)}
          granularity="second"
          hourCycle={24}
        >
          <Label>Taken at</Label>
          <TimeInput />
          <Description>From the EXIF data of team-photo.avif.</Description>
        </TimeField>
      </Variant>
      <Variant label="isReadOnly">
        <TimeField defaultValue={new Time(9, 30)} isReadOnly>
          <Label>Taken at</Label>
          <TimeInput />
        </TimeField>
      </Variant>
    </VariantGrid>
  </div>
);
