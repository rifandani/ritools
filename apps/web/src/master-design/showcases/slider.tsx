import { Label } from "@/core/components/ui/field";
import { Slider, SliderOutput, SliderTrack } from "@/core/components/ui/slider";

import { Variant, VariantGrid } from "../variant";

/** The Squeeze Target: a file size in kilobytes, in the numerals face. */
const KB = { style: "unit", unit: "kilobyte" } as const;

const states = ["hover", "pressed", "focus"] as const;

const Target = (
  props: Omit<React.ComponentProps<typeof Slider>, "children">
) => (
  <Slider
    className="w-full"
    defaultValue={200}
    formatOptions={KB}
    maxValue={1000}
    minValue={10}
    step={10}
    {...props}
  >
    <div className="flex items-baseline justify-between gap-3">
      <Label>Target</Label>
      <SliderOutput />
    </div>
    <SliderTrack />
  </Slider>
);

export const SliderShowcase = () => (
  <VariantGrid>
    <Variant label="rest">
      <Target />
    </Variant>
    {states.map((state) => (
      <Variant demo={state} key={state} label={state}>
        <Target />
      </Variant>
    ))}
    <Variant label="at minValue">
      <Target defaultValue={10} />
    </Variant>
    <Variant label="at maxValue">
      <Target defaultValue={1000} />
    </Variant>
    <Variant label="isDisabled">
      <Target isDisabled />
    </Variant>
  </VariantGrid>
);
