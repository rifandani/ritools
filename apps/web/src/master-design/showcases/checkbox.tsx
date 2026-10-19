import {
  Checkbox,
  CheckboxField,
  CheckboxGroup,
} from "@/core/components/ui/checkbox";
import { Description, FieldError, Label } from "@/core/components/ui/field";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus"] as const;

export const CheckboxShowcase = () => (
  <div className="flex flex-col gap-8">
    {/* Off: every printed state, side by side. */}
    <VariantGrid>
      <Variant label="rest">
        <CheckboxField>
          <Checkbox>Keep EXIF data</Checkbox>
        </CheckboxField>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <CheckboxField>
            <Checkbox>Keep EXIF data</Checkbox>
          </CheckboxField>
        </Variant>
      ))}
      <Variant label="isInvalid">
        <CheckboxField isInvalid isRequired>
          <Checkbox>I keep the originals</Checkbox>
          <FieldError>Confirm this before the Batch runs.</FieldError>
        </CheckboxField>
      </Variant>
      <Variant label="isDisabled">
        <CheckboxField isDisabled>
          <Checkbox>Keep EXIF data</Checkbox>
        </CheckboxField>
      </Variant>
    </VariantGrid>

    {/* On: the solid ink box; the check is the signal. */}
    <VariantGrid>
      <Variant label="selected">
        <CheckboxField defaultSelected>
          <Checkbox>Strip location data</Checkbox>
        </CheckboxField>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={`selected, ${state}`}>
          <CheckboxField defaultSelected>
            <Checkbox>Strip location data</Checkbox>
          </CheckboxField>
        </Variant>
      ))}
      <Variant label="isIndeterminate">
        <CheckboxField isIndeterminate>
          <Checkbox>
            Select all <span className="num">10</span> files
          </Checkbox>
        </CheckboxField>
      </Variant>
      <Variant label="selected, isInvalid">
        <CheckboxField defaultSelected isInvalid>
          <Checkbox>Overwrite the originals</Checkbox>
          <FieldError>The Batch never writes over a source file.</FieldError>
        </CheckboxField>
      </Variant>
      <Variant label="selected, isDisabled">
        <CheckboxField defaultSelected isDisabled>
          <Checkbox>Strip location data</Checkbox>
        </CheckboxField>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant label="CheckboxField, Description">
        <CheckboxField defaultSelected>
          <Checkbox>Strip location data</Checkbox>
          <Description>Removes GPS tags from every image.</Description>
        </CheckboxField>
      </Variant>
      <Variant label="CheckboxGroup">
        <CheckboxGroup defaultValue={["jpeg", "webp"]}>
          <Label>Formats to squeeze</Label>
          <CheckboxField value="jpeg">
            <Checkbox>JPEG</Checkbox>
          </CheckboxField>
          <CheckboxField value="png">
            <Checkbox>PNG</Checkbox>
          </CheckboxField>
          <CheckboxField value="webp">
            <Checkbox>WebP</Checkbox>
          </CheckboxField>
          <CheckboxField isDisabled value="avif">
            <Checkbox>AVIF</Checkbox>
          </CheckboxField>
        </CheckboxGroup>
      </Variant>
      <Variant label="on the ink rail, off and on">
        <div className="ground-ink w-full space-y-3 p-4">
          <CheckboxField>
            <Checkbox>Keep EXIF data</Checkbox>
          </CheckboxField>
          <CheckboxField defaultSelected>
            <Checkbox>Strip location data</Checkbox>
          </CheckboxField>
        </div>
      </Variant>
      <Variant label="CheckboxGroup, isInvalid">
        <CheckboxGroup isInvalid>
          <Label>Formats to squeeze</Label>
          <CheckboxField value="jpeg">
            <Checkbox>JPEG</Checkbox>
          </CheckboxField>
          <CheckboxField value="png">
            <Checkbox>PNG</Checkbox>
          </CheckboxField>
          <FieldError>Pick at least one format.</FieldError>
        </CheckboxGroup>
      </Variant>
    </VariantGrid>
  </div>
);
