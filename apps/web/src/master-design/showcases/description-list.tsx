import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from "@/core/components/ui/description-list";

import { Variant, VariantGrid } from "../variant";

export const DescriptionListShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-96" label="Batch summary">
        <DescriptionList>
          <DescriptionTerm>Target</DescriptionTerm>
          <DescriptionDetails>
            <span className="num">200</span> KB per image
          </DescriptionDetails>
          <DescriptionTerm>Files</DescriptionTerm>
          <DescriptionDetails>
            <span className="num">10</span>
          </DescriptionDetails>
          <DescriptionTerm>Before</DescriptionTerm>
          <DescriptionDetails>
            <span className="num">24.5</span> MB
          </DescriptionDetails>
          <DescriptionTerm>After</DescriptionTerm>
          <DescriptionDetails>
            <span className="num">1.9</span> MB
          </DescriptionDetails>
          <DescriptionTerm>Ratio</DescriptionTerm>
          <DescriptionDetails>
            <span className="num">92</span>%
          </DescriptionDetails>
        </DescriptionList>
      </Variant>
    </VariantGrid>
  </div>
);
