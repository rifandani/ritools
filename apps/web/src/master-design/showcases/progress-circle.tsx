import { ProgressCircle } from "@/core/components/ui/progress-circle";

import { Variant, VariantGrid } from "../variant";

export const ProgressCircleShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-72" label="value 40">
        <ProgressCircle
          aria-label="Compressing IMG_4021.jpg"
          className="size-12"
          value={40}
        />
      </Variant>
      <Variant className="w-72" label="value 100">
        <ProgressCircle
          aria-label="Compressing hero-banner.webp"
          className="size-12"
          value={100}
        />
      </Variant>
      <Variant className="w-72" label="value 0">
        <ProgressCircle aria-label="Queued" className="size-12" value={0} />
      </Variant>
      <Variant className="w-72" label="indeterminate">
        <ProgressCircle
          aria-label="Searching for the Target"
          className="size-12"
          isIndeterminate
        />
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label="size 8">
        <ProgressCircle
          aria-label="Compressing the Batch"
          className="size-8"
          value={62}
        />
      </Variant>
      <Variant className="w-72" label="size 16">
        <ProgressCircle
          aria-label="Compressing the Batch"
          className="size-16"
          value={62}
        />
      </Variant>
    </VariantGrid>
  </div>
);
