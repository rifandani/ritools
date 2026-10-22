import {
  HiOutlineBars3,
  HiOutlineSquares2X2,
  HiOutlineViewColumns,
} from "react-icons/hi2";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/core/components/ui/toggle-group";

import { Variant, VariantGrid } from "../variant";

const formats = [
  { id: "keep", label: "Keep" },
  { id: "webp", label: "WebP" },
  { id: "avif", label: "AVIF" },
] as const;

/**
 * Wraps one item so a `[data-demo]` state lands on it alone. `contents` keeps
 * the wrapper out of the strip's layout.
 */
const Demo = ({
  state,
  children,
}: {
  state: "hover" | "pressed" | "focus";
  children: React.ReactNode;
}) => (
  <span className="contents" data-demo={state}>
    {children}
  </span>
);

export const ToggleGroupShowcase = () => (
  <div className="flex flex-col gap-8">
    {/* A three-mark `md` strip and a four-mark `sm` strip outgrow the default
        13.5rem track, so this entry raises its own track until both fit
        inside the cell's right rule. */}
    <VariantGrid className="grid-cols-[repeat(auto-fill,minmax(min(100%,16.5rem),1fr))]">
      <Variant label='selectionMode="single", output format'>
        <ToggleGroup aria-label="Output format" defaultSelectedKeys={["keep"]}>
          {formats.map((format) => (
            <ToggleGroupItem id={format.id} key={format.id}>
              {format.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Variant>

      <Variant label='selectionMode="multiple", accepted inputs'>
        <ToggleGroup
          aria-label="Accepted inputs"
          defaultSelectedKeys={["jpeg", "png", "webp"]}
          selectionMode="multiple"
          size="sm"
        >
          <ToggleGroupItem id="jpeg">JPEG</ToggleGroupItem>
          <ToggleGroupItem id="png">PNG</ToggleGroupItem>
          <ToggleGroupItem id="webp">WebP</ToggleGroupItem>
          <ToggleGroupItem id="avif">AVIF</ToggleGroupItem>
        </ToggleGroup>
      </Variant>

      <Variant label='orientation="vertical", sort the Batch'>
        <ToggleGroup
          aria-label="Sort the Batch"
          defaultSelectedKeys={["saved"]}
          orientation="vertical"
          size="sm"
        >
          <ToggleGroupItem id="name">By name</ToggleGroupItem>
          <ToggleGroupItem id="saved">Most saved</ToggleGroupItem>
          <ToggleGroupItem id="misses">Misses first</ToggleGroupItem>
        </ToggleGroup>
      </Variant>

      <Variant label='size="sq-md", isCircle, layout'>
        <ToggleGroup
          aria-label="Batch layout"
          defaultSelectedKeys={["grid"]}
          isCircle
          size="sq-md"
        >
          <ToggleGroupItem aria-label="List" id="list">
            <HiOutlineBars3 />
          </ToggleGroupItem>
          <ToggleGroupItem aria-label="Grid" id="grid">
            <HiOutlineSquares2X2 />
          </ToggleGroupItem>
          <ToggleGroupItem aria-label="Before and after" id="split">
            <HiOutlineViewColumns />
          </ToggleGroupItem>
        </ToggleGroup>
      </Variant>
    </VariantGrid>

    {/* One item in each state; WebP is the selected print in every cell. */}
    <VariantGrid>
      {(["hover", "pressed", "focus"] as const).map((state) => (
        <Variant key={state} label={`"Keep" ${state}, "WebP" selected`}>
          <ToggleGroup
            aria-label="Output format"
            defaultSelectedKeys={["webp"]}
            size="sm"
          >
            <Demo state={state}>
              <ToggleGroupItem id="keep">Keep</ToggleGroupItem>
            </Demo>
            <ToggleGroupItem id="webp">WebP</ToggleGroupItem>
            <ToggleGroupItem id="avif">AVIF</ToggleGroupItem>
          </ToggleGroup>
        </Variant>
      ))}
      <Variant label='"WebP" selected and focus'>
        <ToggleGroup
          aria-label="Output format"
          defaultSelectedKeys={["webp"]}
          size="sm"
        >
          <ToggleGroupItem id="keep">Keep</ToggleGroupItem>
          <Demo state="focus">
            <ToggleGroupItem id="webp">WebP</ToggleGroupItem>
          </Demo>
          <ToggleGroupItem id="avif">AVIF</ToggleGroupItem>
        </ToggleGroup>
      </Variant>
      <Variant label='"AVIF" disabled'>
        <ToggleGroup
          aria-label="Output format"
          defaultSelectedKeys={["keep"]}
          size="sm"
        >
          <ToggleGroupItem id="keep">Keep</ToggleGroupItem>
          <ToggleGroupItem id="webp">WebP</ToggleGroupItem>
          <ToggleGroupItem id="avif" isDisabled>
            AVIF
          </ToggleGroupItem>
        </ToggleGroup>
      </Variant>
      <Variant label="isDisabled, whole group">
        <ToggleGroup
          aria-label="Output format"
          defaultSelectedKeys={["keep"]}
          isDisabled
          size="sm"
        >
          <ToggleGroupItem id="keep">Keep</ToggleGroupItem>
          <ToggleGroupItem id="webp">WebP</ToggleGroupItem>
          <ToggleGroupItem id="avif">AVIF</ToggleGroupItem>
        </ToggleGroup>
      </Variant>
      <Variant label="multiple, nothing selected (empty)">
        <ToggleGroup
          aria-label="Accepted inputs"
          selectionMode="multiple"
          size="sm"
        >
          <ToggleGroupItem id="jpeg">JPEG</ToggleGroupItem>
          <ToggleGroupItem id="png">PNG</ToggleGroupItem>
          <ToggleGroupItem id="webp">WebP</ToggleGroupItem>
        </ToggleGroup>
      </Variant>
    </VariantGrid>
  </div>
);
