import { Link } from "@/core/components/ui/link";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

export const LinkShowcase = () => (
  <VariantGrid>
    <Variant label="rest">
      <Link href="#">Documentation</Link>
    </Variant>
    {states.map((state) => (
      <Variant demo={state} key={state} label={state}>
        <Link href="#" isDisabled={state === "disabled"}>
          Documentation
        </Link>
      </Variant>
    ))}
    <Variant className="w-full" label="inline, in body text">
      <p className="max-w-[60ch] text-base/7">
        Each Tool runs on the device. Read{" "}
        <Link href="#">how Squeeze picks a quality</Link> before you set a
        Target for the whole Batch.
      </p>
    </Variant>
  </VariantGrid>
);
