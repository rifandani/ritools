import { ColorWheel } from "@/core/components/ui/color-wheel";

import { pickedHsl } from "../fixtures";
import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus"] as const;

export const ColorWheelShowcase = () => (
  <VariantGrid>
    <Variant label="rest">
      <ColorWheel defaultValue={pickedHsl} />
    </Variant>
    {states.map((state) => (
      <Variant demo={state} key={state} label={state}>
        <ColorWheel defaultValue={pickedHsl} />
      </Variant>
    ))}
    <Variant label="isDisabled">
      <ColorWheel defaultValue={pickedHsl} isDisabled />
    </Variant>
    <Variant label="on the ink rail">
      <div className="ground-ink p-3">
        <ColorWheel defaultValue={pickedHsl} />
      </div>
    </Variant>
  </VariantGrid>
);
