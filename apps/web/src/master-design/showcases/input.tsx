import { HiMagnifyingGlass } from "react-icons/hi2";

import { FieldError, Label } from "@/core/components/ui/field";
import { Input, InputGroup } from "@/core/components/ui/input";
import { Loader } from "@/core/components/ui/loader";
import { TextField } from "@/core/components/ui/text-field";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "focus"] as const;

export const InputShowcase = () => (
  <div className="flex flex-col gap-8">
    {/* The well: every state, side by side. A text box has no pressed print. */}
    <VariantGrid>
      <Variant label="rest, empty">
        <TextField aria-label="Batch name" className="w-full">
          <Input placeholder="holiday-photos" />
        </TextField>
      </Variant>
      <Variant label="rest, filled">
        <TextField
          aria-label="Batch name"
          className="w-full"
          defaultValue="holiday-photos"
        >
          <Input />
        </TextField>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <TextField
            aria-label="Batch name"
            className="w-full"
            defaultValue="holiday-photos"
          >
            <Input />
          </TextField>
        </Variant>
      ))}
      <Variant label="isInvalid">
        <TextField
          aria-label="Output folder"
          className="w-full"
          defaultValue="squeezed/../"
          isInvalid
        >
          <Input />
          <FieldError>A folder name cannot contain “..”.</FieldError>
        </TextField>
      </Variant>
      <Variant label="isDisabled">
        <TextField
          aria-label="Batch name"
          className="w-full"
          defaultValue="holiday-photos"
          isDisabled
        >
          <Input />
        </TextField>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant label="InputGroup, icon">
        <TextField className="w-full">
          <Label>Filter the Batch</Label>
          <InputGroup>
            <HiMagnifyingGlass data-slot="icon" />
            <Input placeholder="File name" />
          </InputGroup>
        </TextField>
      </Variant>
      <Variant label="InputGroup, text">
        <TextField className="w-full" defaultValue="200">
          <Label>Target</Label>
          <InputGroup className="[--input-gutter-end:--spacing(8)]">
            <Input className="num" inputMode="numeric" />
            <span data-slot="text">kB</span>
          </InputGroup>
        </TextField>
      </Variant>
      <Variant label="on the ink rail">
        <div className="ground-ink w-full p-4">
          <TextField className="w-full" defaultValue="holiday-photos">
            <Label>Batch name</Label>
            <Input />
          </TextField>
        </div>
      </Variant>
      <Variant label="on the red field">
        <div className="ground-red w-full p-4">
          <TextField className="w-full">
            <Label>Batch name</Label>
            <Input placeholder="holiday-photos" />
          </TextField>
        </div>
      </Variant>
      <Variant label="InputGroup, loading">
        <TextField className="w-full" defaultValue="holiday-photos">
          <Label>Batch name</Label>
          <InputGroup>
            <Input />
            <Loader aria-label="Checking the name" />
          </InputGroup>
        </TextField>
      </Variant>
    </VariantGrid>
  </div>
);
