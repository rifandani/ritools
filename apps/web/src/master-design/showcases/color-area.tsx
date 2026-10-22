import { ColorArea } from "@/core/components/ui/color-area";

import { pickedHsl } from "../fixtures";
import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus"] as const;

export const ColorAreaShowcase = () => (
  <VariantGrid>
    <Variant label="rest">
      <ColorArea defaultValue={pickedHsl} />
    </Variant>
    {states.map((state) => (
      <Variant demo={state} key={state} label={state}>
        <ColorArea defaultValue={pickedHsl} />
      </Variant>
    ))}
    <Variant label="isDisabled">
      <ColorArea defaultValue={pickedHsl} isDisabled />
    </Variant>
    <Variant label="on the ink rail">
      <div className="ground-ink w-full p-3">
        <ColorArea defaultValue={pickedHsl} />
      </div>
    </Variant>
  </VariantGrid>
);
