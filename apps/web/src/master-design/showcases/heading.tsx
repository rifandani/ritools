import { Heading } from "@/core/components/ui/heading";
import { Ransom } from "@/core/components/ui/ransom";
import { Text } from "@/core/components/ui/text";

import { Variant, VariantGrid } from "../variant";

export const HeadingShowcase = () => (
  <VariantGrid>
    <Variant className="w-64" label="level 1">
      <Heading level={1}>Compress a Batch to a Target</Heading>
    </Variant>
    <Variant className="w-64" label="level 2">
      <Heading level={2}>Pick a Target per image</Heading>
    </Variant>
    <Variant label="level 3">
      <Heading level={3}>Misses</Heading>
    </Variant>
    <Variant label="level 4">
      <Heading level={4}>Output format</Heading>
    </Variant>
    <Variant className="w-64" label="level 2 over body text">
      <div className="flex flex-col gap-2">
        <Heading level={2}>Nothing leaves this device</Heading>
        <Text>
          Squeeze reads each image in this browser and writes the result here.
          There is no upload.
        </Text>
      </div>
    </Variant>
    <Variant
      className="w-64"
      label="a Tool name is a name: Ransom, not Heading"
    >
      <Ransom as="h1" className="text-5xl">
        Squeeze
      </Ransom>
    </Variant>
  </VariantGrid>
);
