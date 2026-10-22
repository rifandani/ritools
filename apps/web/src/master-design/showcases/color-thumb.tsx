import { ColorArea } from "@/core/components/ui/color-area";
import {
  ColorSlider,
  ColorSliderTrack,
} from "@/core/components/ui/color-slider";
import { ColorThumb } from "@/core/components/ui/color-thumb";

import { pickedHsl } from "../fixtures";
import { Variant, VariantGrid } from "../variant";

const Slider = () => (
  <ColorSlider channel="hue" className="w-full" defaultValue={pickedHsl}>
    <ColorSliderTrack>
      <ColorThumb />
    </ColorSliderTrack>
  </ColorSlider>
);

const states = ["hover", "pressed", "focus"] as const;

export const ColorThumbShowcase = () => (
  <VariantGrid>
    <Variant className="w-full" label="in a hue slider">
      <Slider />
    </Variant>
    {states.map((state) => (
      <Variant
        className="w-full"
        demo={state}
        key={state}
        label={`in a hue slider, ${state}`}
      >
        <Slider />
      </Variant>
    ))}
    <Variant className="w-full" label="in a hue slider, isDisabled">
      <ColorSlider
        channel="hue"
        className="w-full"
        defaultValue={pickedHsl}
        isDisabled
      >
        <ColorSliderTrack>
          <ColorThumb />
        </ColorSliderTrack>
      </ColorSlider>
    </Variant>
    <Variant label="in a color area">
      <ColorArea defaultValue={pickedHsl} />
    </Variant>
    <Variant demo="focus" label="in a color area, focus">
      <ColorArea defaultValue={pickedHsl} />
    </Variant>
  </VariantGrid>
);
