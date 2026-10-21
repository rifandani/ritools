import { ColorWheel } from "@/core/components/ui/color-wheel";

import { pickedHsl } from "../fixtures";
import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus"] as const;

export const ColorWheelShowcase = () => (
  /* The wheel is a fixed 200px square on a 212px plate; with the ink-rail
   * panel around it, a cell needs 17.25rem before the plate prints past the
   * right rule. */
  <VariantGrid className="grid-cols-[repeat(auto-fill,minmax(min(100%,17.25rem),1fr))]">
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
