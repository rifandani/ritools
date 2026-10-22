import { Code, Strong, Text, TextLink } from "@/core/components/ui/text";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

export const TextShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-full" label="Text, a paragraph at reading measure">
        <Text className="max-w-[65ch]">
          Squeeze compresses each image in the Batch to its Target. An image
          whose smallest useful output is still larger than its Target is a
          Miss. The codecs run in this browser, so the files never leave the
          device.
        </Text>
      </Variant>
      <Variant label="Strong">
        <Text>
          <Strong>1 Miss</Strong> in a Batch of <span className="num">10</span>.
        </Text>
      </Variant>
      <Variant label="Code">
        <Text>
          Saved as <Code>IMG_4021.jpg</Code>,{" "}
          <span className="num">198 KB</span>.
        </Text>
      </Variant>
      <Variant label="TextLink, rest">
        <Text>
          Read <TextLink href="#text">how Squeeze picks a quality</TextLink>.
        </Text>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      {states.map((state) => (
        <Variant demo={state} key={state} label={`TextLink, ${state}`}>
          <Text>
            Read{" "}
            <TextLink href="#text" isDisabled={state === "disabled"}>
              the codec list
            </TextLink>
            .
          </Text>
        </Variant>
      ))}
    </VariantGrid>
  </div>
);
