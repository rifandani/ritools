import { HiOutlineGlobeAlt, HiOutlineMoon } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import {
  Navbar,
  NavbarItem,
  NavbarMobile,
  NavbarProvider,
  NavbarSection,
  NavbarSeparator,
  NavbarSpacer,
  NavbarStart,
  NavbarTrigger,
} from "@/core/components/ui/navbar";
import { Ransom } from "@/core/components/ui/ransom";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

const Toggles = () => (
  <>
    <Button aria-label="Color mode" intent="outline" size="sq-sm">
      <HiOutlineMoon />
    </Button>
    <Button intent="plain" size="sm">
      <HiOutlineGlobeAlt />
      {/* Globe only on phones; the name stays for assistive technology. */}
      <span className="max-sm:sr-only">English</span>
    </Button>
  </>
);

export const NavbarShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant
        className="w-full"
        label="red field; below 768px it folds into a sheet"
      >
        <NavbarProvider className="w-full">
          <Navbar>
            <NavbarStart className="py-0">
              <Ransom className="text-[1.75rem]" ground="red">
                Ritools
              </Ransom>
            </NavbarStart>
            <NavbarSection>
              <NavbarItem href="#navbar">Tools</NavbarItem>
              <NavbarItem href="#navbar" isCurrent>
                Squeeze
              </NavbarItem>
            </NavbarSection>
            <NavbarSpacer />
            <NavbarSection className="gap-2">
              <Toggles />
            </NavbarSection>
          </Navbar>
          <NavbarMobile>
            <NavbarTrigger />
            <Ransom className="text-[1.75rem]" ground="red">
              Ritools
            </Ransom>
            <NavbarSpacer />
            <Toggles />
          </NavbarMobile>
        </NavbarProvider>
      </Variant>
    </VariantGrid>

    {/* Each item state, printed on the red field. */}
    <VariantGrid>
      <Variant label="rest">
        <div className="ground-red flex w-full p-3">
          <NavbarSection>
            <NavbarItem href="#navbar">Tools</NavbarItem>
          </NavbarSection>
        </div>
      </Variant>
      <Variant label="current">
        <div className="ground-red flex w-full p-3 pb-4 max-md:ps-7">
          <NavbarSection>
            <NavbarItem href="#navbar" isCurrent>
              Squeeze
            </NavbarItem>
          </NavbarSection>
        </div>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <div className="ground-red flex w-full p-3">
            <NavbarSection>
              <NavbarItem href="#navbar" isDisabled={state === "disabled"}>
                Tools
              </NavbarItem>
            </NavbarSection>
          </div>
        </Variant>
      ))}
      <Variant label="NavbarSeparator">
        <div className="ground-red flex h-14 w-full items-center gap-3 px-3">
          <NavbarItem href="#navbar">Tools</NavbarItem>
          <NavbarSeparator />
          <NavbarItem href="#navbar">Squeeze</NavbarItem>
        </div>
      </Variant>
    </VariantGrid>
  </div>
);
