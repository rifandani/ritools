import { ColorSwatch } from "@/core/components/ui/color-swatch";
import {
  ColorSwatchPicker,
  ColorSwatchPickerItem,
} from "@/core/components/ui/color-swatch-picker";

import { Variant, VariantGrid } from "../variant";

const colors = [
  { name: "Teal", value: "#0F766E" },
  { name: "Amber", value: "#B45309" },
  { name: "Blue", value: "#1D4ED8" },
  { name: "Violet", value: "#6D28D9" },
  { name: "Ink", value: "#0B0B0B" },
] as const;

const Picker = ({
  disabled,
  selected = "#0F766E",
}: {
  disabled?: string;
  selected?: string;
}) => (
  <ColorSwatchPicker aria-label="Batch tag color" defaultValue={selected}>
    {colors.map((color) => (
      <ColorSwatchPickerItem
        color={color.value}
        isDisabled={disabled === color.value}
        key={color.value}
      >
        <ColorSwatch />
      </ColorSwatchPickerItem>
    ))}
  </ColorSwatchPicker>
);

export const ColorSwatchPickerShowcase = () => (
  <VariantGrid>
    <Variant className="w-72" label="selected">
      <Picker />
    </Variant>
    <Variant className="w-72" demo="hover" label="hover">
      <Picker />
    </Variant>
    <Variant className="w-72" demo="focus" label="focus">
      <Picker />
    </Variant>
    <Variant className="w-72" label="one disabled">
      <Picker disabled="#6D28D9" />
    </Variant>
    <Variant className="w-72" label="selected and disabled">
      <Picker disabled="#0F766E" />
    </Variant>
    <Variant className="w-72" label="on the ink rail">
      <div className="ground-ink w-full p-3">
        <Picker />
      </div>
    </Variant>
  </VariantGrid>
);
