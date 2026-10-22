import { HiOutlineArrowDownTray } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { VisuallyHidden } from "@/core/components/ui/visually-hidden";

import { Variant, VariantGrid } from "../variant";

/** What assistive technology reads, printed under the specimen. */
const ReadAloud = ({ children }: { children: React.ReactNode }) => (
  <p className="text-muted-fg border-border border-t-2 pt-2 font-mono text-xs">
    reads: “{children}”
  </p>
);

export const VisuallyHiddenShowcase = () => (
  <VariantGrid>
    <Variant label="names an icon button">
      <Button intent="outline" size="sq-md">
        <HiOutlineArrowDownTray />
        <VisuallyHidden>Download IMG_4021.jpg, 198 KB</VisuallyHidden>
      </Button>
      <ReadAloud>Download IMG_4021.jpg, 198 KB, button</ReadAloud>
    </Variant>
    <Variant label="adds context to a short label">
      <p className="text-sm">
        <span className="num font-semibold">1</span> Miss
        <VisuallyHidden> in a Batch of 10 images</VisuallyHidden>
      </p>
      <ReadAloud>1 Miss in a Batch of 10 images</ReadAloud>
    </Variant>
    <Variant label="spells out a unit">
      <p className="num text-sm">
        −94%
        <VisuallyHidden> smaller than the original</VisuallyHidden>
      </p>
      <ReadAloud>−94% smaller than the original</ReadAloud>
    </Variant>
  </VariantGrid>
);
