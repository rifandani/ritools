import { Keyboard } from "@/core/components/ui/keyboard";

import { Variant, VariantGrid } from "../variant";

export const KeyboardShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant label="shortcut">
        <Keyboard className="inline-flex">⌘K</Keyboard>
      </Variant>
      <Variant label="one key">
        <Keyboard className="inline-flex">Esc</Keyboard>
      </Variant>
      <Variant label="arrow">
        <Keyboard className="inline-flex">↑</Keyboard>
      </Variant>
    </VariantGrid>
  </div>
);
