import {
  ProgressBar,
  ProgressBarHeader,
  ProgressBarTrack,
  ProgressBarValue,
} from "@/core/components/ui/progress-bar";

import { Variant, VariantGrid } from "../variant";

export const ProgressBarShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-72" label="value 40">
        <ProgressBar aria-label="Compressing IMG_4021.jpg" value={40}>
          <ProgressBarHeader>
            <span>Compressing</span>
            <ProgressBarValue />
          </ProgressBarHeader>
          <ProgressBarTrack />
        </ProgressBar>
      </Variant>
      <Variant className="w-72" label="value 100">
        <ProgressBar aria-label="Compressing hero-banner.webp" value={100}>
          <ProgressBarHeader>
            <span>Compressing</span>
            <ProgressBarValue />
          </ProgressBarHeader>
          <ProgressBarTrack />
        </ProgressBar>
      </Variant>
      <Variant className="w-72" label="value 0">
        <ProgressBar aria-label="Waiting for the first image" value={0}>
          <ProgressBarHeader>
            <span>Queued</span>
            <ProgressBarValue />
          </ProgressBarHeader>
          <ProgressBarTrack />
        </ProgressBar>
      </Variant>
      <Variant className="w-72" label="indeterminate">
        <ProgressBar aria-label="Searching for the Target" isIndeterminate>
          <ProgressBarHeader>
            <span>Searching</span>
            <ProgressBarValue />
          </ProgressBarHeader>
          <ProgressBarTrack />
        </ProgressBar>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label="no value column">
        <ProgressBar aria-label="Compressing the Batch" value={62}>
          <ProgressBarHeader>
            <span>Compressing the Batch</span>
          </ProgressBarHeader>
          <ProgressBarTrack />
        </ProgressBar>
      </Variant>
      <Variant className="w-72" label="bare track">
        <ProgressBar aria-label="Compressing the Batch" value={62}>
          <ProgressBarTrack />
        </ProgressBar>
      </Variant>
    </VariantGrid>
  </div>
);
