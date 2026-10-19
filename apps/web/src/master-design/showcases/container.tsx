import { Container } from "@/core/components/ui/container";

import { Variant, VariantGrid } from "../variant";

const Fill = ({ children }: { children: string }) => (
  <div className="bg-muted border-rule border-x-2 border-dashed py-3 text-sm font-medium">
    {children}
  </div>
);

export const ContainerShowcase = () => (
  <VariantGrid>
    <Variant className="w-full" label="default">
      <Container className="border-input border-2">
        <Fill>Padding on every width</Fill>
      </Container>
    </Variant>
    <Variant className="w-full" label="constrained">
      <Container className="border-input border-2" constrained>
        <Fill>Padding from sm up</Fill>
      </Container>
    </Variant>
  </VariantGrid>
);
