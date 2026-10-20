import { Avatar } from "@/core/components/ui/avatar";

import { Variant, VariantGrid } from "../variant";

export const AvatarShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant label="xs">
        <Avatar alt="Rizeki Rifandani" initials="RR" size="xs" />
      </Variant>
      <Variant label="sm">
        <Avatar alt="Rizeki Rifandani" initials="RR" size="sm" />
      </Variant>
      <Variant label="md">
        <Avatar alt="Rizeki Rifandani" initials="RR" size="md" />
      </Variant>
      <Variant label="lg">
        <Avatar alt="Rizeki Rifandani" initials="RR" size="lg" />
      </Variant>
      <Variant label="xl">
        <Avatar alt="Rizeki Rifandani" initials="RR" size="xl" />
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant label="isSquare, the default">
        <Avatar alt="Squeeze" initials="SQ" />
      </Variant>
      <Variant label="isSquare={false}, the seal">
        <Avatar alt="Squeeze" initials="SQ" isSquare={false} />
      </Variant>
      <Variant label="with an image">
        <Avatar alt="The Ritools mark" src="/favicon.svg" />
      </Variant>
      <Variant label="initials only">
        <Avatar initials="SQ" />
      </Variant>
    </VariantGrid>
  </div>
);
