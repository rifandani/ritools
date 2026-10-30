import {
  HiOutlineArrowsPointingIn,
  HiOutlineCheck,
  HiOutlineExclamationTriangle,
  HiOutlineNoSymbol,
  HiOutlineSquares2X2,
} from "react-icons/hi2";

import { BrandWordmark } from "@/core/components/ui/brand-wordmark";
import { Heading } from "@/core/components/ui/heading";
import {
  Sidebar,
  SidebarBadge,
  SidebarContent,
  SidebarDisclosure,
  SidebarDisclosureGroup,
  SidebarDisclosurePanel,
  SidebarDisclosureTrigger,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarItem,
  SidebarLabel,
  SidebarNav,
  SidebarProvider,
  SidebarSection,
  SidebarSeparator,
  SidebarTrigger,
} from "@/core/components/ui/sidebar";
import { Text } from "@/core/components/ui/text";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

const Items = () => (
  <>
    <SidebarSection label="Tools">
      <SidebarItem href="#sidebar" isCurrent tooltip="Squeeze">
        <HiOutlineArrowsPointingIn />
        <SidebarLabel>Squeeze</SidebarLabel>
        <SidebarBadge>10</SidebarBadge>
      </SidebarItem>
      <SidebarItem href="#sidebar" tooltip="Tool Catalog">
        <HiOutlineSquares2X2 />
        <SidebarLabel>Tool Catalog</SidebarLabel>
      </SidebarItem>
    </SidebarSection>
    <SidebarSeparator />
    <SidebarDisclosureGroup defaultExpandedKeys={["batch"]}>
      <SidebarDisclosure id="batch">
        <SidebarDisclosureTrigger>
          <SidebarLabel>This Batch</SidebarLabel>
        </SidebarDisclosureTrigger>
        <SidebarDisclosurePanel>
          <SidebarItem href="#sidebar" tooltip="Compressed">
            <HiOutlineCheck />
            <SidebarLabel>Compressed</SidebarLabel>
            <SidebarBadge>8</SidebarBadge>
          </SidebarItem>
          <SidebarItem href="#sidebar" tooltip="Miss">
            <HiOutlineExclamationTriangle />
            <SidebarLabel>Miss</SidebarLabel>
            <SidebarBadge>1</SidebarBadge>
          </SidebarItem>
          <SidebarItem href="#sidebar" isDisabled tooltip="Rejected">
            <HiOutlineNoSymbol />
            <SidebarLabel>Rejected</SidebarLabel>
            <SidebarBadge>0</SidebarBadge>
          </SidebarItem>
        </SidebarDisclosurePanel>
      </SidebarDisclosure>
    </SidebarDisclosureGroup>
  </>
);

export const SidebarShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-full" label="ink rail, expanded, with an inset">
        <SidebarProvider className="border-rule flex-col border-2 sm:h-[32rem] sm:flex-row">
          <Sidebar
            className="h-auto w-full sm:h-full sm:w-(--sidebar-width)"
            collapsible="none"
          >
            <SidebarHeader className="border-b">
              <BrandWordmark className="text-[1.75rem]" ground="ink" />
            </SidebarHeader>
            <SidebarContent>
              <Items />
            </SidebarContent>
            <SidebarFooter className="text-muted-fg justify-start border-t text-xs">
              <span>
                <span className="num text-fg text-sm font-semibold">10</span>{" "}
                images, on this device
              </span>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset role="presentation">
            <SidebarNav>
              <SidebarTrigger />
              <Heading level={4}>This Batch</Heading>
            </SidebarNav>
            <div className="flex flex-col gap-2 p-4">
              <Text>
                <span className="num text-fg">8</span> of{" "}
                <span className="num text-fg">10</span> images reached the{" "}
                <span className="num text-fg">200 KB</span> Target.
              </Text>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </Variant>

      <Variant label="collapsed to the dock">
        <SidebarProvider className="h-80" defaultOpen={false}>
          <Sidebar className="w-(--sidebar-width-dock)" collapsible="none">
            <SidebarContent>
              <Items />
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      </Variant>
    </VariantGrid>

    {/* One rail row in each state. */}
    <VariantGrid>
      <Variant label="rest">
        <SidebarProvider>
          <Sidebar className="h-auto w-full" collapsible="none">
            <SidebarSection>
              <SidebarItem href="#sidebar">
                <HiOutlineSquares2X2 />
                <SidebarLabel>Tool Catalog</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </Sidebar>
        </SidebarProvider>
      </Variant>
      <Variant label="current">
        <SidebarProvider>
          <Sidebar className="h-auto w-full" collapsible="none">
            <SidebarSection>
              <SidebarItem href="#sidebar" isCurrent>
                <HiOutlineArrowsPointingIn />
                <SidebarLabel>Squeeze</SidebarLabel>
                <SidebarBadge>10</SidebarBadge>
              </SidebarItem>
            </SidebarSection>
          </Sidebar>
        </SidebarProvider>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <SidebarProvider>
            <Sidebar className="h-auto w-full" collapsible="none">
              <SidebarSection>
                <SidebarItem href="#sidebar" isDisabled={state === "disabled"}>
                  <HiOutlineSquares2X2 />
                  <SidebarLabel>Tool Catalog</SidebarLabel>
                </SidebarItem>
              </SidebarSection>
            </Sidebar>
          </SidebarProvider>
        </Variant>
      ))}
    </VariantGrid>
  </div>
);
