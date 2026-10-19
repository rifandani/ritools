import {
  HiOutlineEye,
  HiOutlineLockClosed,
  HiOutlineMagnifyingGlassPlus,
} from "react-icons/hi2";

import { Toggle } from "@/core/components/ui/toggle";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

const sizes = ["xs", "sm", "md", "lg"] as const;

export const ToggleShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant label='intent="outline"'>
        <Toggle intent="outline">Lock Target</Toggle>
      </Variant>
      <Variant label='intent="plain"'>
        <Toggle intent="plain">Lock Target</Toggle>
      </Variant>
      <Variant label='intent="outline", selected'>
        <Toggle defaultSelected intent="outline">
          Lock Target
        </Toggle>
      </Variant>
      <Variant label='intent="plain", selected'>
        <Toggle defaultSelected intent="plain">
          Lock Target
        </Toggle>
      </Variant>
    </VariantGrid>

    {/* Off: every printed-mark state, side by side. */}
    <VariantGrid>
      <Variant label="off, rest">
        <Toggle intent="outline">Show Misses</Toggle>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={`off, ${state}`}>
          <Toggle intent="outline" isDisabled={state === "disabled"}>
            Show Misses
          </Toggle>
        </Variant>
      ))}
    </VariantGrid>

    {/* On: the selected print (solid fill, red foot) in every state. */}
    <VariantGrid>
      <Variant label="selected, rest">
        <Toggle defaultSelected intent="outline">
          Show Misses
        </Toggle>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={`selected, ${state}`}>
          <Toggle
            defaultSelected
            intent="outline"
            isDisabled={state === "disabled"}
          >
            Show Misses
          </Toggle>
        </Variant>
      ))}
    </VariantGrid>

    <VariantGrid>
      {sizes.map((size) => (
        <Variant key={size} label={`size="${size}"`}>
          <Toggle defaultSelected intent="outline" size={size}>
            <HiOutlineLockClosed />
            Lock Target
          </Toggle>
        </Variant>
      ))}
      <Variant label='size="sq-md", off and on'>
        <div className="flex gap-3">
          <Toggle aria-label="Zoom to 1:1" intent="outline" size="sq-md">
            <HiOutlineMagnifyingGlassPlus />
          </Toggle>
          <Toggle
            aria-label="Show Misses"
            defaultSelected
            intent="outline"
            size="sq-md"
          >
            <HiOutlineEye />
          </Toggle>
        </div>
      </Variant>
      <Variant label="isCircle, off and on">
        <div className="flex gap-3">
          <Toggle
            aria-label="Lock Target"
            intent="outline"
            isCircle
            size="sq-md"
          >
            <HiOutlineLockClosed />
          </Toggle>
          <Toggle
            aria-label="Lock Target"
            defaultSelected
            intent="outline"
            isCircle
            size="sq-md"
          >
            <HiOutlineLockClosed />
          </Toggle>
        </div>
      </Variant>
      <Variant label="on the red field, off and on">
        <div className="ground-red flex gap-3 p-3">
          <Toggle intent="plain" size="sm">
            EN
          </Toggle>
          <Toggle defaultSelected intent="plain" size="sm">
            ID
          </Toggle>
        </div>
      </Variant>
    </VariantGrid>
  </div>
);
