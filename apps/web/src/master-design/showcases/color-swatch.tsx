import { Button } from "@/core/components/ui/button";
import { ColorSwatch } from "@/core/components/ui/color-swatch";

import { Variant, VariantGrid } from "../variant";

const colors = ["#0F766E", "#B45309", "#1D4ED8", "#FFFFFF", "#0B0B0B"] as const;

export const ColorSwatchShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      {colors.map((color) => (
        <Variant key={color} label={color}>
          <ColorSwatch color={color} />
        </Variant>
      ))}
    </VariantGrid>

    <VariantGrid>
      <Variant label="small">
        <ColorSwatch className="[--size:--spacing(6)]" color="#0F766E" />
      </Variant>
      <Variant label="default">
        <ColorSwatch color="#0F766E" />
      </Variant>
      <Variant label="large">
        <ColorSwatch className="[--size:--spacing(12)]" color="#0F766E" />
      </Variant>
      <Variant label="white on the ink rail">
        <div className="ground-ink flex items-center gap-3 p-3">
          <ColorSwatch color="#FFFFFF" />
          <ColorSwatch color="#0B0B0B" />
        </div>
      </Variant>
      <Variant label="inside a Button">
        <Button intent="secondary">
          <ColorSwatch color="#0F766E" />
          Batch color
        </Button>
      </Variant>
    </VariantGrid>
  </div>
);
