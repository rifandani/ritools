import { ColorArea } from "@/core/components/ui/color-area";
import { ColorField } from "@/core/components/ui/color-field";
import { ColorPicker, EyeDropper } from "@/core/components/ui/color-picker";
import {
  ColorSlider,
  ColorSliderOutput,
  ColorSliderTrack,
} from "@/core/components/ui/color-slider";
import { ColorThumb } from "@/core/components/ui/color-thumb";
import { Description, Label } from "@/core/components/ui/field";
import { Input } from "@/core/components/ui/input";

import { pickedHsl, pickedHslA } from "../fixtures";
import { Variant, VariantGrid } from "../variant";

const Columns = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-56 flex-col gap-3">{children}</div>
);

export const ColorPickerShowcase = () => (
  <VariantGrid>
    <Variant className="w-72" label="default">
      <ColorPicker defaultValue={pickedHsl}>
        <Label>Batch color</Label>
        <Description>
          A local color value; nothing leaves the device.
        </Description>
        <Columns>
          <ColorArea />
          <ColorSlider channel="hue">
            <ColorSliderOutput />
            <ColorSliderTrack>
              <ColorThumb />
            </ColorSliderTrack>
          </ColorSlider>
          <ColorField>
            <Input />
          </ColorField>
        </Columns>
      </ColorPicker>
    </Variant>

    <Variant className="w-72" demo="focus" label="focus in the area">
      <ColorPicker defaultValue={pickedHsl}>
        <Label>Batch color</Label>
        <Columns>
          <ColorArea />
        </Columns>
      </ColorPicker>
    </Variant>

    <Variant className="w-72" demo="focus" label="focus in the hex field">
      <ColorPicker defaultValue={pickedHsl}>
        <Label>Batch color</Label>
        <Columns>
          <ColorField>
            <Input />
          </ColorField>
        </Columns>
      </ColorPicker>
    </Variant>

    <Variant className="w-72" label="disabled">
      <ColorPicker defaultValue={pickedHsl}>
        <Label className="text-muted-fg">Batch color</Label>
        <Description>
          A local color value; nothing leaves the device.
        </Description>
        <Columns>
          <ColorArea isDisabled />
          <ColorSlider channel="hue" isDisabled>
            <ColorSliderOutput />
            <ColorSliderTrack>
              <ColorThumb />
            </ColorSliderTrack>
          </ColorSlider>
          <ColorField isDisabled>
            <Input />
          </ColorField>
        </Columns>
      </ColorPicker>
    </Variant>

    <Variant className="w-72" label="with the eye dropper">
      <ColorPicker defaultValue={pickedHslA}>
        <Label>Batch color</Label>
        <Columns>
          <ColorArea />
          <div className="flex items-end gap-2">
            <ColorField className="min-w-0 flex-1">
              <Input />
            </ColorField>
            <EyeDropper />
          </div>
        </Columns>
      </ColorPicker>
    </Variant>
  </VariantGrid>
);
