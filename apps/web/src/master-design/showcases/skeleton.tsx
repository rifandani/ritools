import { Skeleton } from "@/core/components/ui/skeleton";

import { Variant, VariantGrid } from "../variant";

const Row = () => (
  <div className="flex items-center gap-3">
    <div>
      <p className="text-sm font-medium">IMG_4021.jpg</p>
      <p className="text-muted-fg text-xs">JPEG, 3.2 MB</p>
    </div>
  </div>
);

export const SkeletonShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-72" label="isLoading">
        <Skeleton isLoading>
          <Row />
        </Skeleton>
      </Variant>
      <Variant className="w-72" label="loaded">
        <Skeleton>
          <Row />
        </Skeleton>
      </Variant>
    </VariantGrid>
  </div>
);
