import { HiExclamationTriangle } from "react-icons/hi2";

import { fieldErrorStyles, Label } from "@/core/components/ui/field";
import {
  NativeSelect,
  NativeSelectContent,
} from "@/core/components/ui/native-select";

import { Variant, VariantGrid } from "../variant";

const Options = () => (
  <>
    <option value="name">File name</option>
    <option value="largest">Size, largest first</option>
    <option value="smallest">Size, smallest first</option>
    <option value="misses">Misses first</option>
  </>
);

const states = ["hover", "focus"] as const;

export const NativeSelectShowcase = () => (
  <VariantGrid>
    <Variant label="rest">
      <NativeSelect className="w-full">
        <Label htmlFor="sort-rest">Sort the Batch by</Label>
        <NativeSelectContent defaultValue="largest" id="sort-rest">
          <Options />
        </NativeSelectContent>
      </NativeSelect>
    </Variant>
    {states.map((state) => (
      <Variant demo={state} key={state} label={state}>
        <NativeSelect className="w-full">
          <Label htmlFor={`sort-${state}`}>Sort the Batch by</Label>
          <NativeSelectContent defaultValue="largest" id={`sort-${state}`}>
            <Options />
          </NativeSelectContent>
        </NativeSelect>
      </Variant>
    ))}
    <Variant label="empty, isInvalid">
      <NativeSelect className="w-full">
        <Label htmlFor="sort-invalid">Sort the Batch by</Label>
        <NativeSelectContent
          aria-describedby="sort-invalid-error"
          defaultValue=""
          id="sort-invalid"
          isInvalid
        >
          <option disabled value="">
            Pick an order
          </option>
          <Options />
        </NativeSelectContent>
        {/* A native select has no React Aria field, so the error line is plain markup. */}
        <p
          className={fieldErrorStyles({ className: "mt-2" })}
          id="sort-invalid-error"
        >
          <HiExclamationTriangle aria-hidden data-slot="icon" />
          <span>Pick an order for the Batch.</span>
        </p>
      </NativeSelect>
    </Variant>
    <Variant label="disabled">
      <NativeSelect className="w-full">
        <Label htmlFor="sort-disabled">Sort the Batch by</Label>
        <NativeSelectContent defaultValue="largest" disabled id="sort-disabled">
          <Options />
        </NativeSelectContent>
      </NativeSelect>
    </Variant>
  </VariantGrid>
);
