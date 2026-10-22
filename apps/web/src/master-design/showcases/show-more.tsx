import { ShowMore } from "@/core/components/ui/show-more";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

const label = ({ isSelected }: { isSelected: boolean }) =>
  isSelected ? "Show fewer" : "Show 6 more";

export const ShowMoreShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-64" label='as="button", rest'>
        <ShowMore aria-label="Show 6 more images">{label}</ShowMore>
      </Variant>
      <Variant className="w-64" label='as="button", selected (open)'>
        <ShowMore aria-label="Show 6 more images" defaultSelected>
          {label}
        </ShowMore>
      </Variant>
      <Variant className="w-64" label='as="text"'>
        <ShowMore as="text" text="Or add a folder" />
      </Variant>
      <Variant label='orientation="vertical"'>
        <div className="flex h-36 items-stretch">
          <span className="num self-center text-sm">4 shown</span>
          <ShowMore aria-label="Show 6 more images" orientation="vertical">
            More
          </ShowMore>
          <span className="num self-center text-sm">6 hidden</span>
        </div>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      {states.map((state) => (
        <Variant className="w-64" demo={state} key={state} label={state}>
          <ShowMore
            aria-label="Show 6 more images"
            isDisabled={state === "disabled"}
          >
            {label}
          </ShowMore>
        </Variant>
      ))}
    </VariantGrid>
  </div>
);
