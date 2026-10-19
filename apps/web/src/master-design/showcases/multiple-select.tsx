import { FieldError, Label } from "@/core/components/ui/field";
import {
  MultipleSelect,
  MultipleSelectContent,
  MultipleSelectItem,
} from "@/core/components/ui/multiple-select";

import { Variant, VariantGrid } from "../variant";

// MultipleSelect finds MultipleSelectContent among its direct children, so
// each Variant passes it inline.

const formats = [
  { id: "jpeg", name: "JPEG" },
  { id: "png", name: "PNG" },
  { id: "webp", name: "WebP" },
  { id: "avif", name: "AVIF" },
];

export const MultipleSelectShowcase = () => (
  <VariantGrid>
    <Variant label="empty, placeholder">
      <MultipleSelect
        className="w-full"
        placeholder="No format picked"
        searchPlaceholder="Find a format"
      >
        <Label>Formats to squeeze</Label>
        <MultipleSelectContent items={formats}>
          {(item) => <MultipleSelectItem>{item.name}</MultipleSelectItem>}
        </MultipleSelectContent>
      </MultipleSelect>
    </Variant>
    <Variant label="selected">
      <MultipleSelect
        className="w-full"
        defaultValue={["jpeg", "webp", "avif"]}
        searchPlaceholder="Find a format"
      >
        <Label>Formats to squeeze</Label>
        <MultipleSelectContent items={formats}>
          {(item) => <MultipleSelectItem>{item.name}</MultipleSelectItem>}
        </MultipleSelectContent>
      </MultipleSelect>
    </Variant>
    <Variant demo="hover" label="hover">
      <MultipleSelect
        className="w-full"
        defaultValue={["png"]}
        searchPlaceholder="Find a format"
      >
        <Label>Formats to squeeze</Label>
        <MultipleSelectContent items={formats}>
          {(item) => <MultipleSelectItem>{item.name}</MultipleSelectItem>}
        </MultipleSelectContent>
      </MultipleSelect>
    </Variant>
    <Variant demo="focus" label="focus, on the add mark">
      <MultipleSelect
        className="w-full"
        defaultValue={["png"]}
        searchPlaceholder="Find a format"
      >
        <Label>Formats to squeeze</Label>
        <MultipleSelectContent items={formats}>
          {(item) => <MultipleSelectItem>{item.name}</MultipleSelectItem>}
        </MultipleSelectContent>
      </MultipleSelect>
    </Variant>
    <Variant label="isInvalid">
      <MultipleSelect
        className="w-full"
        isInvalid
        placeholder="No format picked"
        searchPlaceholder="Find a format"
      >
        <Label>Formats to squeeze</Label>
        <MultipleSelectContent items={formats}>
          {(item) => <MultipleSelectItem>{item.name}</MultipleSelectItem>}
        </MultipleSelectContent>
        <FieldError>Pick at least one format.</FieldError>
      </MultipleSelect>
    </Variant>
    <Variant label="isDisabled">
      <MultipleSelect
        className="w-full"
        defaultValue={["jpeg"]}
        isDisabled
        searchPlaceholder="Find a format"
      >
        <Label>Formats to squeeze</Label>
        <MultipleSelectContent items={formats}>
          {(item) => <MultipleSelectItem>{item.name}</MultipleSelectItem>}
        </MultipleSelectContent>
      </MultipleSelect>
    </Variant>
  </VariantGrid>
);
