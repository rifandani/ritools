import { Label } from "@/core/components/ui/field";
import { SearchField, SearchInput } from "@/core/components/ui/search-field";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "focus"] as const;

export const SearchFieldShowcase = () => (
  <VariantGrid>
    <Variant label="rest, empty">
      <SearchField className="w-full">
        <Label>Filter the Batch</Label>
        <SearchInput placeholder="File name" />
      </SearchField>
    </Variant>
    <Variant label="rest, filled">
      <SearchField className="w-full" defaultValue="IMG_40">
        <Label>Filter the Batch</Label>
        <SearchInput placeholder="File name" />
      </SearchField>
    </Variant>
    {states.map((state) => (
      <Variant demo={state} key={state} label={state}>
        <SearchField className="w-full" defaultValue="IMG_40">
          <Label>Filter the Batch</Label>
          <SearchInput placeholder="File name" />
        </SearchField>
      </Variant>
    ))}
    <Variant demo="pressed" label="clear, pressed">
      <SearchField className="w-full" defaultValue="IMG_40">
        <Label>Filter the Batch</Label>
        <SearchInput placeholder="File name" />
      </SearchField>
    </Variant>
    <Variant label="isDisabled">
      <SearchField className="w-full" defaultValue="IMG_40" isDisabled>
        <Label>Filter the Batch</Label>
        <SearchInput placeholder="File name" />
      </SearchField>
    </Variant>
  </VariantGrid>
);
