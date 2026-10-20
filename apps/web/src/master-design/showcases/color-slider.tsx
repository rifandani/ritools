import {
  ColorSlider,
  ColorSliderOutput,
  ColorSliderTrack,
} from "@/core/components/ui/color-slider";
import { ColorThumb } from "@/core/components/ui/color-thumb";
import { Label } from "@/core/components/ui/field";

import { pickedHsl, pickedHslA } from "../fixtures";
import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus"] as const;

export const ColorSliderShowcase = () => (
  <VariantGrid>
    <Variant className="w-full" label="hue">
      <ColorSlider channel="hue" className="w-full" defaultValue={pickedHsl}>
        <Label>Hue</Label>
        <ColorSliderOutput />
        <ColorSliderTrack>
          <ColorThumb />
        </ColorSliderTrack>
      </ColorSlider>
    </Variant>
    {states.map((state) => (
      <Variant
        className="w-full"
        demo={state}
        key={state}
        label={`hue, ${state}`}
      >
        <ColorSlider channel="hue" className="w-full" defaultValue={pickedHsl}>
          <Label>Hue</Label>
          <ColorSliderOutput />
          <ColorSliderTrack>
            <ColorThumb />
          </ColorSliderTrack>
        </ColorSlider>
      </Variant>
    ))}
    <Variant className="w-full" label="hue, isDisabled">
      <ColorSlider
        channel="hue"
        className="w-full"
        defaultValue={pickedHsl}
        isDisabled
      >
        <Label>Hue</Label>
        <ColorSliderOutput />
        <ColorSliderTrack>
          <ColorThumb />
        </ColorSliderTrack>
      </ColorSlider>
    </Variant>
    <Variant className="w-full" label="saturation">
      <ColorSlider
        channel="saturation"
        className="w-full"
        defaultValue={pickedHsl}
      >
        <Label>Saturation</Label>
        <ColorSliderOutput />
        <ColorSliderTrack>
          <ColorThumb />
        </ColorSliderTrack>
      </ColorSlider>
    </Variant>
    <Variant className="w-full" label="alpha">
      <ColorSlider channel="alpha" className="w-full" defaultValue={pickedHslA}>
        <Label>Alpha</Label>
        <ColorSliderOutput />
        <ColorSliderTrack>
          <ColorThumb />
        </ColorSliderTrack>
      </ColorSlider>
    </Variant>
    <Variant label="vertical">
      <ColorSlider
        channel="hue"
        defaultValue={pickedHsl}
        orientation="vertical"
      >
        <Label>Hue</Label>
        <ColorSliderOutput />
        <ColorSliderTrack>
          <ColorThumb />
        </ColorSliderTrack>
      </ColorSlider>
    </Variant>
    <Variant label="on the ink rail">
      <div className="ground-ink w-full p-4">
        <ColorSlider channel="hue" className="w-full" defaultValue={pickedHsl}>
          <Label>Hue</Label>
          <ColorSliderOutput />
          <ColorSliderTrack>
            <ColorThumb />
          </ColorSliderTrack>
        </ColorSlider>
      </div>
    </Variant>
  </VariantGrid>
);
