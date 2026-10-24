import { Masthead } from "@/core/components/ui/masthead";

import { Variant, VariantGrid } from "../variant";

export const MastheadShowcase = () => (
  <VariantGrid>
    <Variant className="w-full" label="the widest tool name sets the column">
      <Masthead
        name="Squeeze"
        tagline="Compress the whole batch of images to a target file size"
        note="A very large image can run out of memory. The Batch lives in this tab. A reload clears it."
      />
    </Variant>
    <Variant className="w-full" label="a short name keeps the same column">
      <Masthead
        name="Expose"
        tagline="Read the metadata in an image, then remove the groups you choose."
        note="Every Metadata Field, the GPS point, the AI Provenance, and a Clean that tells you what stayed. The file never leaves this device."
      />
    </Variant>
    <Variant className="w-full" label="no note">
      <Masthead
        name="Squeeze"
        tagline="Compress the whole batch of images to a target file size"
      />
    </Variant>
  </VariantGrid>
);
