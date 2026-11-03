import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import type { IconType } from "react-icons";
import { HiCheck } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuHeader,
  MenuItem,
  MenuSection,
} from "@/core/components/ui/menu";
import type { ToolGroup } from "@/features/tools/tools";
import { toolAtPath, TOOLS } from "@/features/tools/tools";

/**
 * The check on the open Tool. React Aria's DOM filter drops `aria-current`
 * from a menu item, so the mark writes the state onto the item itself: the
 * link says "current page" to assistive technology instead of only drawing a
 * tick.
 */
const CurrentToolMark = () => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const item = ref.current?.closest('[role="menuitem"]');
    item?.setAttribute("aria-current", "page");
    return () => item?.removeAttribute("aria-current");
  }, []);

  return (
    <span className="absolute end-2 top-1/2 -translate-y-1/2" ref={ref}>
      <HiCheck aria-hidden="true" className="h-lh w-4" />
    </span>
  );
};

/**
 * One docked rail group. Its button uses the expanded group's icon and label,
 * and its menu contains only that group's links. The check and `aria-current`
 * mark the open Tool; the wordmark remains the way back to the Catalog.
 */
export const ToolSwitcher = ({
  group,
  icon: Icon,
  label,
}: {
  readonly group: ToolGroup;
  readonly icon: IconType;
  readonly label: string;
}) => {
  const { pathname } = useLocation();
  const current = toolAtPath(pathname);
  const tools = TOOLS.filter((tool) => tool.group === group);

  return (
    <Menu>
      <Button aria-label={label} intent="outline" size="sq-md">
        <Icon aria-hidden="true" />
      </Button>

      <MenuContent aria-label={label}>
        <MenuSection>
          <MenuHeader separator>{label}</MenuHeader>

          {tools.map((tool) => {
            const isCurrent = tool.path === current?.path;
            return (
              <MenuItem
                className={isCurrent ? "pe-8 font-bold" : undefined}
                href={tool.path}
                key={tool.path}
                textValue={tool.name}
              >
                {tool.name}
                {isCurrent ? <CurrentToolMark /> : null}
              </MenuItem>
            );
          })}
        </MenuSection>
      </MenuContent>
    </Menu>
  );
};
