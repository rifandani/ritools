import {
  ComboBox,
  ComboBoxContent,
  ComboBoxInput,
  ComboBoxItem,
} from "@/core/components/ui/combo-box";
import { FieldError, Label } from "@/core/components/ui/field";

import { Variant, VariantGrid } from "../variant";

const files = [
  { id: "IMG_4021.jpg", name: "IMG_4021.jpg" },
  { id: "receipt-scan.png", name: "receipt-scan.png" },
  { id: "hero-banner.webp", name: "hero-banner.webp" },
  { id: "team-photo.avif", name: "team-photo.avif" },
  { id: "screenshot-0912.png", name: "screenshot-0912.png" },
];

const states = ["hover", "focus"] as const;

const FileBox = (
  props: Omit<React.ComponentProps<typeof ComboBox>, "children">
) => (
  <ComboBox className="w-full" {...props}>
    <Label>Jump to file</Label>
    <ComboBoxInput placeholder="Type a file name" />
    <ComboBoxContent items={files}>
      {(item) => <ComboBoxItem>{item.name}</ComboBoxItem>}
    </ComboBoxContent>
    {props.isInvalid && (
      <FieldError>No file in the Batch has this name.</FieldError>
    )}
  </ComboBox>
);

export const ComboBoxShowcase = () => (
  <VariantGrid>
    <Variant label="rest, empty">
      <FileBox />
    </Variant>
    <Variant label="rest, selected">
      <FileBox defaultSelectedKey="receipt-scan.png" />
    </Variant>
    {states.map((state) => (
      <Variant demo={state} key={state} label={state}>
        <FileBox />
      </Variant>
    ))}
    <Variant demo="pressed" label="list button, pressed">
      <FileBox />
    </Variant>
    <Variant label="isInvalid">
      <FileBox allowsCustomValue defaultInputValue="IMG_9999.jpg" isInvalid />
    </Variant>
    <Variant label="isDisabled">
      <FileBox defaultSelectedKey="hero-banner.webp" isDisabled />
    </Variant>
  </VariantGrid>
);
