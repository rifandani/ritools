import { HiArrowRight, HiPlus } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";

import { Variant, VariantGrid } from "../variant";

const intents = [
  "primary",
  "secondary",
  "outline",
  "plain",
  "success",
  "warning",
  "danger",
] as const;

const sizes = ["xs", "sm", "md", "lg"] as const;

const states = ["hover", "pressed", "focus", "disabled"] as const;

export const ButtonShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      {intents.map((intent) => (
        <Variant key={intent} label={`intent="${intent}"`}>
          <Button intent={intent}>Button</Button>
        </Variant>
      ))}
    </VariantGrid>

    {/* Printed marks: every state, side by side. */}
    <VariantGrid>
      <Variant label="rest">
        <Button>Compress</Button>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <Button isDisabled={state === "disabled"}>Compress</Button>
        </Variant>
      ))}
      <Variant label="isPending">
        <Button isPending>Saving</Button>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      {states.map((state) => (
        <Variant demo={state} key={state} label={`outline, ${state}`}>
          <Button intent="outline" isDisabled={state === "disabled"}>
            Cancel
          </Button>
        </Variant>
      ))}
    </VariantGrid>

    <VariantGrid>
      {sizes.map((size) => (
        <Variant key={size} label={`size="${size}"`}>
          <Button size={size}>Button</Button>
        </Variant>
      ))}
      <Variant label="with icon">
        <Button>
          Continue
          <HiArrowRight />
        </Button>
      </Variant>
      <Variant label='size="sq-md"'>
        <Button aria-label="Add" intent="outline" size="sq-md">
          <HiPlus />
        </Button>
      </Variant>
      <Variant label="isCircle">
        <Button aria-label="Add" isCircle size="sq-md">
          <HiPlus />
        </Button>
      </Variant>
    </VariantGrid>
  </div>
);
