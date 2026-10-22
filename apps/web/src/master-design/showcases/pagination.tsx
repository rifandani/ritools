import {
  Pagination,
  PaginationFirst,
  PaginationGap,
  PaginationItem,
  PaginationLabel,
  PaginationLast,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from "@/core/components/ui/pagination";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

export const PaginationShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant label="default">
        <Pagination>
          <PaginationList>
            <PaginationPrevious href="#" />
            <PaginationItem href="#">1</PaginationItem>
            <PaginationItem href="#" isCurrent>
              2
            </PaginationItem>
            <PaginationItem href="#">3</PaginationItem>
            <PaginationNext href="#" />
          </PaginationList>
        </Pagination>
      </Variant>

      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <Pagination>
            <PaginationList>
              <PaginationItem href="#" isDisabled={state === "disabled"}>
                2
              </PaginationItem>
            </PaginationList>
          </Pagination>
        </Variant>
      ))}
    </VariantGrid>

    {/* Nine marks make a 324px strip, wider than one 13.5rem track: the wide
        specimen spans two tracks from lg, and the row raises its track to
        16rem so the `md` specimen also stays inside the cell's right rule. */}
    <VariantGrid className="grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))]">
      <Variant label="with first and last" span={2}>
        <Pagination>
          <PaginationList className="flex-wrap justify-center">
            <PaginationFirst href="#" />
            <PaginationPrevious href="#" />
            <PaginationItem href="#">1</PaginationItem>
            <PaginationItem href="#" isCurrent>
              2
            </PaginationItem>
            <PaginationItem href="#">3</PaginationItem>
            <PaginationGap />
            <PaginationItem href="#">12</PaginationItem>
            <PaginationNext href="#" />
            <PaginationLast href="#" />
          </PaginationList>
        </Pagination>
      </Variant>

      <Variant label="with a label">
        <Pagination>
          <PaginationList>
            <PaginationLabel>
              Page <strong>2</strong> of <strong>12</strong>
            </PaginationLabel>
          </PaginationList>
        </Pagination>
      </Variant>

      <Variant label='size="md"'>
        <Pagination>
          <PaginationList>
            <PaginationPrevious href="#" size="md" />
            <PaginationItem href="#" size="md">
              1
            </PaginationItem>
            <PaginationItem href="#" isCurrent size="md">
              2
            </PaginationItem>
            <PaginationItem href="#" size="md">
              3
            </PaginationItem>
            <PaginationNext href="#" size="md" />
          </PaginationList>
        </Pagination>
      </Variant>
    </VariantGrid>
  </div>
);
