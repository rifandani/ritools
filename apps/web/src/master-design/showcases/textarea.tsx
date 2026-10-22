import { Description, FieldError, Label } from "@/core/components/ui/field";
import { TextField } from "@/core/components/ui/text-field";
import { Textarea } from "@/core/components/ui/textarea";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "focus"] as const;

// A textarea value is plain text, so its figures stay in the text face.
const NOTE =
  "Hero shots for the shop. Keep receipt-scan.png under 200 kB for the upload form.";

export const TextareaShowcase = () => (
  <VariantGrid>
    <Variant label="rest, empty">
      <TextField className="w-full">
        <Label>Batch notes</Label>
        <Textarea placeholder="What is this Batch for?" />
        <Description>Stays on this device.</Description>
      </TextField>
    </Variant>
    <Variant label="rest, filled">
      <TextField className="w-full" defaultValue={NOTE}>
        <Label>Batch notes</Label>
        <Textarea />
      </TextField>
    </Variant>
    {states.map((state) => (
      <Variant demo={state} key={state} label={state}>
        <TextField className="w-full" defaultValue={NOTE}>
          <Label>Batch notes</Label>
          <Textarea />
        </TextField>
      </Variant>
    ))}
    <Variant label="isInvalid">
      <TextField className="w-full" defaultValue="ok" isInvalid>
        <Label>Batch notes</Label>
        <Textarea />
        <FieldError>
          Write at least <span className="num">10</span> characters, or leave it
          empty.
        </FieldError>
      </TextField>
    </Variant>
    <Variant label="isDisabled">
      <TextField className="w-full" defaultValue={NOTE} isDisabled>
        <Label>Batch notes</Label>
        <Textarea />
      </TextField>
    </Variant>
  </VariantGrid>
);
