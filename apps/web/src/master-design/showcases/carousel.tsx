import { cn } from "cn";

import { Badge } from "@/core/components/ui/badge";
import {
  Carousel,
  CarouselButton,
  CarouselContent,
  CarouselHandler,
  CarouselItem,
} from "@/core/components/ui/carousel";

import { Variant, VariantGrid } from "../variant";

const slides = [
  {
    name: "IMG_4021.jpg",
    before: "3.2",
    unit: "MB",
    after: "198",
    unit2: "KB",
    status: "Hit",
  },
  {
    name: "receipt-scan.png",
    before: "1.8",
    unit: "MB",
    after: "187",
    unit2: "KB",
    status: "Hit",
  },
  {
    name: "hero-banner.webp",
    before: "940",
    unit: "KB",
    after: "196",
    unit2: "KB",
    status: "Hit",
  },
];

// The card is a printed mark, so it carries every state: a 2px rule at rest,
// the outline doubled in ink on hover, solid ink when pressed, the bracket on
// focus, and muted words struck through when disabled.
const Slide = ({
  name,
  before,
  unit,
  after,
  unit2,
  status,
}: (typeof slides)[number]) => (
  <div
    className={cn(
      "group border-rule bg-card text-fg relative flex h-24 items-center justify-between gap-3 border-2 p-4 transition-[background-color,color,box-shadow] duration-100",
      // Hover: the outline doubles in ink.
      "hover:border-fg hover:shadow-[inset_0_0_0_2px_var(--fg)]",
      "[[data-demo=hover]_&]:border-fg [[data-demo=hover]_&]:shadow-[inset_0_0_0_2px_var(--fg)]",
      // Pressed: solid ink, paper words, and the badge turns to the paper side.
      "data-[pressed]:bg-fg data-[pressed]:text-bg",
      "[[data-demo=pressed]_&]:bg-fg [[data-demo=pressed]_&]:text-bg",
      "[[data-demo=pressed]_&_[data-slot=badge]]:border-(--accent-fg) [[data-demo=pressed]_&_[data-slot=badge]]:bg-transparent [[data-demo=pressed]_&_[data-slot=badge]]:text-(--accent-fg)",
      // Focus: the world's bracket, two 3px arms at each side. The card's
      // own rule clears, so the bracket stands clear of the card.
      "bracket after:inset-0",
      "data-[focus-visible]:border-transparent",
      "[[data-demo=focus]_&]:border-transparent",
      // Disabled: the rule fades, the words mute, and a strike runs through them.
      "data-[disabled]:text-muted-fg data-[disabled]:border-(--border) data-[disabled]:[&_*]:line-through",
      "[[data-demo=disabled]_&]:text-muted-fg [[data-demo=disabled]_&]:border-(--border) [[data-demo=disabled]_&_*]:line-through"
    )}
  >
    <span className="truncate text-sm font-medium">{name}</span>
    <div className="flex shrink-0 items-center gap-3">
      <span className="text-sm">
        <span className="num">{before}</span> {unit} to{" "}
        <span className="num">{after}</span> {unit2}
      </span>
      <Badge intent={status === "Hit" ? "success" : "danger"}>{status}</Badge>
    </div>
  </div>
);

const Slides = () => (
  <Carousel className="w-full">
    <CarouselContent>
      {slides.map((slide) => (
        <CarouselItem key={slide.name}>
          <Slide {...slide} />
        </CarouselItem>
      ))}
    </CarouselContent>
    <CarouselHandler>
      <CarouselButton segment="previous" />
      <CarouselButton segment="next" />
    </CarouselHandler>
  </Carousel>
);

export const CarouselShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-96" label="slides">
        <Slides />
      </Variant>
      <Variant className="w-96" demo="hover" label="hover">
        <Slides />
      </Variant>
      <Variant className="w-96" demo="pressed" label="pressed">
        <Slides />
      </Variant>
      <Variant className="w-96" demo="focus" label="focus">
        <Slides />
      </Variant>
      <Variant className="w-96" demo="disabled" label="disabled">
        <Slides />
      </Variant>
    </VariantGrid>
  </div>
);
