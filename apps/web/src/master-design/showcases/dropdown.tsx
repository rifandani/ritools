import {
  DropdownItem,
  DropdownLabel,
  DropdownSection,
  DropdownSeparator,
} from "@/core/components/ui/dropdown";
import { ListBox } from "@/core/components/ui/list-box";

import { Variant, VariantGrid } from "../variant";

export const DropdownShowcase = () => (
  <VariantGrid>
    <Variant label="in ListBox">
      <ListBox aria-label="The Batch" className="w-48" selectionMode="single">
        <DropdownSection title="Output format">
          <DropdownItem id="keep">
            <DropdownLabel>Keep each format</DropdownLabel>
          </DropdownItem>
          <DropdownItem id="webp">
            <DropdownLabel>WebP</DropdownLabel>
          </DropdownItem>
          <DropdownItem id="avif">
            <DropdownLabel>AVIF</DropdownLabel>
          </DropdownItem>
        </DropdownSection>
      </ListBox>
    </Variant>

    <Variant label="selected and disabled">
      <ListBox
        aria-label="The Batch"
        className="w-48"
        defaultSelectedKeys={new Set(["webp"])}
        selectionMode="single"
      >
        <DropdownSection title="Output format">
          <DropdownItem id="keep">
            <DropdownLabel>Keep each format</DropdownLabel>
          </DropdownItem>
          <DropdownItem id="webp">
            <DropdownLabel>WebP</DropdownLabel>
          </DropdownItem>
          <DropdownItem id="avif" isDisabled>
            <DropdownLabel>AVIF</DropdownLabel>
          </DropdownItem>
        </DropdownSection>
      </ListBox>
    </Variant>

    <Variant label="with a separator">
      <ListBox aria-label="Actions" className="w-48">
        <DropdownItem id="squeeze">
          <DropdownLabel>Squeeze the Batch</DropdownLabel>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem id="clear" intent="danger">
          <DropdownLabel>Clear the Batch</DropdownLabel>
        </DropdownItem>
      </ListBox>
    </Variant>
  </VariantGrid>
);
