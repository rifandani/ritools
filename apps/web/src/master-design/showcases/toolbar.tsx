import {
  HiOutlineArrowDownTray,
  HiOutlineArrowsPointingIn,
  HiOutlineEye,
  HiOutlineMagnifyingGlassPlus,
  HiOutlineTrash,
} from "react-icons/hi2";

import {
  Toolbar,
  ToolbarGroup,
  ToolbarItem,
  ToolbarSeparator,
} from "@/core/components/ui/toolbar";

import { Variant, VariantGrid } from "../variant";

/** Puts one item in a forced state; `contents` keeps the toolbar layout. */
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

export const ToolbarShowcase = () => (
  <VariantGrid>
    <Variant className="w-72" label='orientation="horizontal", preview'>
      <Toolbar aria-label="Preview">
        <ToolbarGroup aria-label="Compare">
          <ToolbarItem defaultSelected>After</ToolbarItem>
          <ToolbarItem>Before</ToolbarItem>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarGroup aria-label="Zoom">
          <ToolbarItem aria-label="Zoom to 1:1" size="sq-sm">
            <HiOutlineMagnifyingGlassPlus />
          </ToolbarItem>
          <ToolbarItem
            aria-label="Fit to the view"
            defaultSelected
            size="sq-sm"
          >
            <HiOutlineArrowsPointingIn />
          </ToolbarItem>
        </ToolbarGroup>
      </Toolbar>
    </Variant>

    <Variant label='orientation="vertical", Batch'>
      <Toolbar aria-label="Batch" orientation="vertical">
        <ToolbarGroup aria-label="Filter">
          <ToolbarItem defaultSelected>All 10</ToolbarItem>
          <ToolbarItem>Misses 1</ToolbarItem>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarGroup aria-label="Sort">
          <ToolbarItem>Largest first</ToolbarItem>
        </ToolbarGroup>
      </Toolbar>
    </Variant>

    <Variant label="isCircle, icon items">
      <Toolbar aria-label="Image" isCircle>
        <ToolbarItem aria-label="Show this image" defaultSelected size="sq-sm">
          <HiOutlineEye />
        </ToolbarItem>
        <ToolbarItem aria-label="Download" size="sq-sm">
          <HiOutlineArrowDownTray />
        </ToolbarItem>
        <ToolbarItem aria-label="Remove" size="sq-sm">
          <HiOutlineTrash />
        </ToolbarItem>
      </Toolbar>
    </Variant>

    <Variant className="w-72" label="ToolbarGroup isDisabled (no image yet)">
      <Toolbar aria-label="Preview">
        <ToolbarGroup aria-label="Compare">
          <ToolbarItem defaultSelected>After</ToolbarItem>
          <ToolbarItem>Before</ToolbarItem>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarGroup aria-label="Zoom" isDisabled>
          <ToolbarItem aria-label="Zoom to 1:1" size="sq-sm">
            <HiOutlineMagnifyingGlassPlus />
          </ToolbarItem>
          <ToolbarItem aria-label="Fit to the view" size="sq-sm">
            <HiOutlineArrowsPointingIn />
          </ToolbarItem>
        </ToolbarGroup>
      </Toolbar>
    </Variant>

    <Variant
      className="w-full"
      label="item states: hover, pressed, focus, selected and focus"
    >
      <Toolbar aria-label="Item states">
        <Demo state="hover">
          <ToolbarItem>Hover</ToolbarItem>
        </Demo>
        <Demo state="pressed">
          <ToolbarItem>Pressed</ToolbarItem>
        </Demo>
        <Demo state="focus">
          <ToolbarItem>Focus</ToolbarItem>
        </Demo>
        <Demo state="focus">
          <ToolbarItem defaultSelected>Selected</ToolbarItem>
        </Demo>
      </Toolbar>
    </Variant>
  </VariantGrid>
);
