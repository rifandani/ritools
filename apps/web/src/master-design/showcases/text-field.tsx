import { Description, FieldError, Label } from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
import { TextField } from "@/core/components/ui/text-field";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "focus"] as const;

export const TextFieldShowcase = () => (
  <VariantGrid>
    <Variant label="rest, empty">
      <TextField className="w-full">
        <Label>Batch name</Label>
        <Input placeholder="holiday-photos" />
      </TextField>
    </Variant>
    {states.map((state) => (
      <Variant demo={state} key={state} label={state}>
        <TextField className="w-full" defaultValue="holiday-photos">
          <Label>Batch name</Label>
          <Input />
        </TextField>
      </Variant>
    ))}
    <Variant label="description">
      <TextField className="w-full" defaultValue="holiday-photos">
        <Label>Batch name</Label>
        <Input />
        <Description>Names the ZIP file you download.</Description>
      </TextField>
    </Variant>
    <Variant label="isRequired, isInvalid">
      <TextField className="w-full" isInvalid isRequired>
        <Label>Batch name</Label>
        <Input />
        <FieldError>Enter a name for the Batch.</FieldError>
      </TextField>
    </Variant>
    <Variant label="isReadOnly">
      <TextField className="w-full" defaultValue="IMG_4021.jpg" isReadOnly>
        <Label>File</Label>
        <Input />
      </TextField>
    </Variant>
    <Variant label="isDisabled">
      <TextField className="w-full" defaultValue="squeezed" isDisabled>
        <Label>Output folder</Label>
        <Input />
      </TextField>
    </Variant>
  </VariantGrid>
);
