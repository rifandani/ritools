import { Description, FieldError, Label } from "@/core/components/ui/field";
import { NumberField, NumberInput } from "@/core/components/ui/number-field";

import { Variant, VariantGrid } from "../variant";

/** The Squeeze Target: a file size in kilobytes, in the numerals face. */
const KB = { style: "unit", unit: "kilobyte" } as const;

const states = ["hover", "focus"] as const;

export const NumberFieldShowcase = () => (
  <VariantGrid>
    <Variant label="rest">
      <NumberField
        className="w-full"
        defaultValue={200}
        formatOptions={KB}
        minValue={10}
        step={10}
      >
        <Label>Target</Label>
        <NumberInput />
        <Description>Each image is squeezed to this size or less.</Description>
      </NumberField>
    </Variant>
    {states.map((state) => (
      <Variant demo={state} key={state} label={state}>
        <NumberField
          className="w-full"
          defaultValue={200}
          formatOptions={KB}
          minValue={10}
          step={10}
        >
          <Label>Target</Label>
          <NumberInput />
        </NumberField>
      </Variant>
    ))}
    <Variant demo="pressed" label="increment, pressed">
      <NumberField
        className="w-full"
        defaultValue={200}
        formatOptions={KB}
        minValue={10}
        step={10}
      >
        <Label>Target</Label>
        <NumberInput />
      </NumberField>
    </Variant>
    <Variant label="at minValue">
      <NumberField
        className="w-full"
        defaultValue={10}
        formatOptions={KB}
        minValue={10}
        step={10}
      >
        <Label>Target</Label>
        <NumberInput />
        <Description>
          The smallest Target is <span className="num">10 kB</span>.
        </Description>
      </NumberField>
    </Variant>
    <Variant label="isInvalid">
      <NumberField
        className="w-full"
        defaultValue={2}
        formatOptions={KB}
        isInvalid
      >
        <Label>Target</Label>
        <NumberInput />
        <FieldError>
          Set a Target of <span className="num">10 kB</span> or more.
        </FieldError>
      </NumberField>
    </Variant>
    <Variant label="isDisabled">
      <NumberField
        className="w-full"
        defaultValue={200}
        formatOptions={KB}
        isDisabled
      >
        <Label>Target</Label>
        <NumberInput />
      </NumberField>
    </Variant>
  </VariantGrid>
);
