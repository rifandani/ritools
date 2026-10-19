import { HiExclamationTriangle } from "react-icons/hi2";

import {
  FieldError,
  fieldErrorStyles,
  Label,
} from "@/core/components/ui/field";
import { Radio, RadioField, RadioGroup } from "@/core/components/ui/radio";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus"] as const;

/** One option alone, so each cell prints one state. */
const Single = ({
  isSelected = false,
  label = "Keep the original",
  ...props
}: Omit<React.ComponentProps<typeof RadioGroup>, "children"> & {
  isSelected?: boolean;
  label?: string;
}) => (
  <RadioGroup
    aria-label="When an image misses its Target"
    defaultValue={isSelected ? "one" : undefined}
    {...props}
  >
    <RadioField value="one">
      <Radio>{label}</Radio>
    </RadioField>
  </RadioGroup>
);

export const RadioShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant label="rest">
        <Single />
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <Single />
        </Variant>
      ))}
      <Variant label="isDisabled">
        <Single isDisabled />
      </Variant>
    </VariantGrid>

    {/* Selected: the solid ink seal with a square paper dot. */}
    <VariantGrid>
      <Variant label="selected">
        <Single isSelected label="Keep the closest result" />
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={`selected, ${state}`}>
          <Single isSelected label="Keep the closest result" />
        </Variant>
      ))}
      <Variant label="selected, isInvalid">
        <Single isInvalid isSelected label="Overwrite the source" />
        <p className={fieldErrorStyles()}>
          <HiExclamationTriangle aria-hidden data-slot="icon" />
          <span>The Batch never writes over a source file.</span>
        </p>
      </Variant>
      <Variant label="selected, isDisabled">
        <Single isDisabled isSelected label="Keep the closest result" />
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant label="RadioGroup">
        <RadioGroup defaultValue="closest">
          <Label>When an image misses its Target</Label>
          <RadioField value="closest">
            <Radio>Keep the closest result</Radio>
          </RadioField>
          <RadioField value="original">
            <Radio>Keep the original</Radio>
          </RadioField>
          <RadioField isDisabled value="drop">
            <Radio>Drop the image</Radio>
          </RadioField>
        </RadioGroup>
      </Variant>
      <Variant label="RadioGroup, isInvalid">
        <RadioGroup isInvalid isRequired>
          <Label>When an image misses its Target</Label>
          <RadioField value="closest">
            <Radio>Keep the closest result</Radio>
          </RadioField>
          <RadioField value="original">
            <Radio>Keep the original</Radio>
          </RadioField>
          <FieldError>Pick what happens to a Miss.</FieldError>
        </RadioGroup>
      </Variant>
      <Variant label="RadioGroup, isDisabled">
        <RadioGroup defaultValue="original" isDisabled>
          <Label>When an image misses its Target</Label>
          <RadioField value="closest">
            <Radio>Keep the closest result</Radio>
          </RadioField>
          <RadioField value="original">
            <Radio>Keep the original</Radio>
          </RadioField>
        </RadioGroup>
      </Variant>
    </VariantGrid>
  </div>
);
