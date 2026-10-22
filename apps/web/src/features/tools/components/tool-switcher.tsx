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
  MenuSeparator,
} from "@/core/components/ui/menu";
import { useTranslation } from "@/features/i18n/use-translation";
import { TOOLS } from "@/features/tools/tools";

/** A Tool owns its route and every route under it. */
const ownsPath = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

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
 * `aria-current` mark the open Tool, and `All tools` is an action, not a
 * fourth choice. At one Tool the menu still names the set and offers the
 * Catalog; at ten it is a shortcut.
 *
 * The trigger keeps the left group down to two things at 320px. On a phone it
 * is a framed grid mark, which reads as a control beside the framed toggles.
 * From 640px the frame drops and the word stands beside the wordmark, because
 * a word needs no frame to read as a way in.
 */
export const ToolSwitcher = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const current = TOOLS.find((tool) => ownsPath(pathname, tool.path));

  return (
    <Menu>
      <Button
        aria-label={t("toolsTitle")}
        className="w-11 shrink-0 px-0 [--mark-line:var(--input)] sm:min-h-10 sm:w-auto sm:px-3.5 sm:[--mark-line:transparent]"
        intent="outline"
      >
        <HiSquares2X2 aria-hidden="true" className="sm:hidden" />
        <span className="sr-only sm:not-sr-only">{t("toolsTitle")}</span>
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

        <MenuSeparator />
        <MenuItem href="/" textValue={t("toolsAll")}>
          {t("toolsAll")}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
};
