import { useState } from "react";

import { BarList } from "@/core/components/ui/bar-list";

import { Variant, VariantGrid } from "../variant";

const sources = [
  { name: "IMG_4021.jpg", value: 3200 },
  { name: "receipt-scan.png", value: 1800 },
  { name: "hero-banner.webp", value: 940 },
  { name: "team-photo.avif", value: 412 },
];

const kb = (value: number) => `${value} KB`;

const Rows = ({ isAction = false }: { isAction?: boolean }) => {
  const [chosen, setChosen] = useState<string | null>(
    isAction ? "IMG_4021.jpg" : null
  );
  return (
    <>
      <BarList
        className="w-full"
        data={sources}
        onValueChange={
          isAction
            ? (item) => {
                setChosen(item.name);
              }
            : undefined
        }
        valueFormatter={kb}
      />
      {chosen ? <p className="text-muted-fg text-xs">Picked {chosen}</p> : null}
    </>
  );
};

export const BarListShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-72" label="descending">
        <Rows />
      </Variant>
      <Variant className="w-72" label="ascending">
        <BarList
          className="w-full"
          data={sources}
          sortOrder="ascending"
          valueFormatter={kb}
        />
      </Variant>
      <Variant className="w-72" label="sortOrder=none">
        <BarList
          className="w-full"
          data={sources}
          sortOrder="none"
          valueFormatter={kb}
        />
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label="with links">
        <BarList
          className="w-full"
          data={sources.map((source) => ({ ...source, href: "#" }))}
          valueFormatter={kb}
        />
      </Variant>
      <Variant className="w-72" demo="hover" label="with an action, hovered">
        <Rows isAction />
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label="rest">
        <Rows />
      </Variant>
      <Variant className="w-72" demo="hover" label="hover">
        <Rows />
      </Variant>
      <Variant className="w-72" demo="pressed" label="pressed">
        <Rows isAction />
      </Variant>
      <Variant className="w-72" demo="focus" label="focus">
        <Rows isAction />
      </Variant>
      <Variant className="w-72" demo="disabled" label="disabled">
        <Rows />
      </Variant>
    </VariantGrid>
  </div>
);
