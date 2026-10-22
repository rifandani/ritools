"use client";

import { useState } from "react";

import { Button } from "@/core/components/ui/button";
import {
  CommandMenu,
  CommandMenuFooter,
  CommandMenuItem,
  CommandMenuLabel,
  CommandMenuList,
  CommandMenuSearch,
  CommandMenuSection,
  CommandMenuSeparator,
  CommandMenuShortcut,
} from "@/core/components/ui/command-menu";

import { Variant, VariantGrid } from "../variant";

const states = ["hover", "pressed", "focus", "disabled"] as const;

/** Each cell opens its own menu, so one cell never opens another. */
const MenuCell = ({
  children,
  isPending = false,
}: {
  children: React.ReactNode;
  isPending?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button intent="outline" onPress={() => setIsOpen(true)}>
        Open
      </Button>
      <CommandMenu
        isOpen={isOpen}
        isPending={isPending}
        onOpenChange={setIsOpen}
      >
        {children}
      </CommandMenu>
    </>
  );
};

export const CommandMenuShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant label="rest">
        <MenuCell>
          <CommandMenuSearch placeholder="Search Tools…" />
          <CommandMenuList>
            <CommandMenuSection label="Tools">
              <CommandMenuItem textValue="Squeeze">
                <CommandMenuLabel>Squeeze</CommandMenuLabel>
                <CommandMenuShortcut>⌘S</CommandMenuShortcut>
              </CommandMenuItem>
              <CommandMenuItem textValue="Batch">
                <CommandMenuLabel>Batch</CommandMenuLabel>
              </CommandMenuItem>
            </CommandMenuSection>
          </CommandMenuList>
        </MenuCell>
      </Variant>

      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <Button intent="outline" isDisabled={state === "disabled"}>
            Open
          </Button>
        </Variant>
      ))}
    </VariantGrid>

    <VariantGrid>
      <Variant label="isPending">
        <MenuCell isPending>
          <CommandMenuSearch placeholder="Search Tools…" />
          <CommandMenuList>
            <CommandMenuSection label="Tools">
              <CommandMenuItem textValue="Squeeze">
                <CommandMenuLabel>Squeeze</CommandMenuLabel>
              </CommandMenuItem>
            </CommandMenuSection>
          </CommandMenuList>
        </MenuCell>
      </Variant>

      <Variant label="with a footer">
        <MenuCell>
          <CommandMenuSearch placeholder="Search Tools…" />
          <CommandMenuList>
            <CommandMenuSection label="Tools">
              <CommandMenuItem textValue="Squeeze">
                <CommandMenuLabel>Squeeze</CommandMenuLabel>
              </CommandMenuItem>
              <CommandMenuItem textValue="Target">
                <CommandMenuLabel>Target</CommandMenuLabel>
              </CommandMenuItem>
              <CommandMenuSeparator />
              <CommandMenuItem textValue="Clear the Batch">
                <CommandMenuLabel>Clear the Batch</CommandMenuLabel>
              </CommandMenuItem>
            </CommandMenuSection>
          </CommandMenuList>
          <CommandMenuFooter>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            to move
            <kbd>↵</kbd>
            to open
          </CommandMenuFooter>
        </MenuCell>
      </Variant>
    </VariantGrid>
  </div>
);
