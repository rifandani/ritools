import { ColorField } from "@/core/components/ui/color-field";
import { Description, FieldError, Label } from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "focus"] as const;

export const ColorFieldShowcase = () => (
  <VariantGrid>
    <Variant label="rest">
      <ColorField className="w-full" defaultValue="#0F766E">
        <Label>Batch color</Label>
        <Input />
      </ColorField>
    </Variant>
    {states.map((state) => (
      <Variant demo={state} key={state} label={state}>
        <ColorField className="w-full" defaultValue="#0F766E">
          <Label>Batch color</Label>
          <Input />
        </ColorField>
      </Variant>
    ))}
    <Variant label="Description">
      <ColorField className="w-full" defaultValue="#0F766E">
        <Label>Batch color</Label>
        <Input />
        <Description>
          A local color value; nothing leaves the device.
        </Description>
      </ColorField>
    </Variant>
    <Variant label="isInvalid">
      <ColorField className="w-full" defaultValue="#0F76" isInvalid>
        <Label>Batch color</Label>
        <Input />
        <FieldError>Use a full six-digit hex, like #0F766E.</FieldError>
      </ColorField>
    </Variant>
    <Variant label="isDisabled">
      <ColorField className="w-full" defaultValue="#0F766E" isDisabled>
        <Label>Batch color</Label>
        <Input />
      </ColorField>
    </Variant>
  </VariantGrid>
);
