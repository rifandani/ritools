import {
  Description,
  FieldError,
  FieldGroup,
  Fieldset,
  Label,
  Legend,
} from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";
import { TextField } from "@/core/components/ui/text-field";

import { Variant, VariantGrid } from "../variant";

/*
 * Field sets the label, description, and error pattern for every input:
 * plain print, the world goes around the control. An error is text with an
 * icon, never the hue alone.
 */
export const FieldShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-full" label="Fieldset, Legend, FieldGroup">
        <Fieldset className="w-full max-w-md">
          <Legend>Batch settings</Legend>
          <Description>Applies to every image in the Batch.</Description>
          <FieldGroup>
            <TextField defaultValue="holiday-photos">
              <Label>Batch name</Label>
              <Input />
              <Description>Names the ZIP file you download.</Description>
            </TextField>
            <TextField defaultValue="squeezed" isRequired>
              <Label>Output folder</Label>
              <Input />
            </TextField>
          </FieldGroup>
        </Fieldset>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant label="Label">
        <TextField className="w-full">
          <Label>Batch name</Label>
          <Input placeholder="holiday-photos" />
        </TextField>
      </Variant>
      <Variant label="isRequired">
        <TextField className="w-full" isRequired>
          <Label>Output folder</Label>
          <Input placeholder="squeezed" />
        </TextField>
      </Variant>
      <Variant label="Description">
        <TextField className="w-full">
          <Label>Batch name</Label>
          <Input placeholder="holiday-photos" />
          <Description>Names the ZIP file you download.</Description>
        </TextField>
      </Variant>
      <Variant label="FieldError">
        <TextField className="w-full" defaultValue="squeezed/../" isInvalid>
          <Label>Output folder</Label>
          <Input />
          <FieldError>A folder name cannot contain “..”.</FieldError>
        </TextField>
      </Variant>
      <Variant label="Description + FieldError">
        <TextField className="w-full" defaultValue="" isInvalid isRequired>
          <Label>Batch name</Label>
          <Input />
          <Description>Names the ZIP file you download.</Description>
          <FieldError>Enter a name for the Batch.</FieldError>
        </TextField>
      </Variant>
      <Variant label="isDisabled">
        <TextField className="w-full" defaultValue="squeezed" isDisabled>
          <Label>Output folder</Label>
          <Input />
          <Description>Locked while the Batch runs.</Description>
        </TextField>
      </Variant>
    </VariantGrid>
  </div>
);
