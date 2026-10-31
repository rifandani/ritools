import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { HiCheck, HiSquares2X2 } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuHeader,
  MenuItem,
  MenuSection,
} from "@/core/components/ui/menu";
import { useTranslation } from "@/features/i18n/use-translation";
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
 * The Tool switcher. It is shell navigation, so a Tool adds content and never
 * its own way between Tools.
 *
 * The menu is a plain list of links, not a radio group: the check and
 * `aria-current` mark the open Tool. It lists only the Tools, because the
 * wordmark is the way back to the Catalog and the menu never repeats it. At
 * one Tool the menu still names the set; at ten it is a shortcut.
 *
 * The trigger is one framed grid mark at every width, the same mark the
 * preferences use: it keeps the left group down to two things at 320px, and it
 * reads as a control without a word to carry it. The name stays in the
 * `aria-label`, so the mark still announces the set.
 */
export const ToolSwitcher = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const current = toolAtPath(pathname);

  return (
    <Menu>
      <Button aria-label={t("toolsTitle")} intent="outline" size="sq-md">
        <HiSquares2X2 aria-hidden="true" />
      </Button>

      <MenuContent aria-label={t("toolsTitle")}>
        <MenuSection>
          <MenuHeader separator>{t("toolsTitle")}</MenuHeader>

          {TOOLS.map((tool) => {
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
