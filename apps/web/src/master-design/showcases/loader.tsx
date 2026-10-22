import { Button } from "@/core/components/ui/button";
import { Loader } from "@/core/components/ui/loader";

import { Variant, VariantGrid } from "../variant";

export const LoaderShowcase = () => (
  <VariantGrid>
    <Variant label='variant="ring"'>
      <Loader aria-label="Loading" variant="ring" />
    </Variant>
    <Variant label='variant="spin"'>
      <Loader aria-label="Loading" variant="spin" />
    </Variant>
    <Variant label="ring, size-10, red">
      <Loader
        aria-label="Loading"
        className="text-primary-ink size-10"
        variant="ring"
      />
    </Variant>
    <Variant label="spin, size-10">
      <Loader aria-label="Loading" className="size-10" variant="spin" />
    </Variant>
    <Variant label="in a pending Button">
      <Button isPending>
        <Loader aria-label="Compressing" />
        Compressing
      </Button>
    </Variant>
  </VariantGrid>
);
