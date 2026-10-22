import { cn } from "cn";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "react-aria-components/Button";
import { Disclosure } from "react-aria-components/Disclosure";
import {
  DisclosureGroup,
  DisclosurePanel,
} from "react-aria-components/DisclosureGroup";
import { Heading } from "react-aria-components/Heading";
import { HiChevronDown } from "react-icons/hi2";

import { categories, componentCount } from "./registry";
import type { Category } from "./types";

interface CatalogNavProps {
  activeId: string | null;
  /** The Categories and Component Entries that match the filter. */
  visible: Category[];
  onNavigate: (_sectionId: string) => void;
}

const categoryIds = (cats: Category[]) =>
  new Set(cats.map((category) => category.id));

/**
 * Draws the route: one red stroke from the active Category down to the active
 * Component Entry, with a turn into the entry. It moves by writing CSS
 * variables, so the scroll spy never re-renders the list to repaint it.
 */
const useRoute = (
  navRef: React.RefObject<HTMLElement | null>,
  routeRef: React.RefObject<HTMLSpanElement | null>,
  categoryId: string | null,
  activeId: string | null
) => {
  useLayoutEffect(() => {
    const nav = navRef.current;
    const route = routeRef.current;
    if (!nav || !route) {
      return;
    }

    const place = () => {
      const trigger = categoryId
        ? nav.querySelector<HTMLElement>(
            `[data-route-category="${categoryId}"]`
          )
        : null;
      if (!trigger) {
        route.style.opacity = "0";
        return;
      }
      const origin = nav.getBoundingClientRect().top;
      const from = trigger.getBoundingClientRect();
      const top = from.top - origin + from.height / 2;
      const item = activeId
        ? nav.querySelector<HTMLElement>(`[data-entry="${activeId}"]`)
        : null;
      const to = item?.getBoundingClientRect();
      // A collapsed Category hides its entries: the route stops at its name.
      const end = to && to.height > 0 ? to.top - origin + to.height / 2 : top;
      route.style.opacity = "1";
      route.style.setProperty("--route-top", `${top}px`);
      route.style.setProperty("--route-length", `${end - top}px`);
      if (end > top) {
        route.dataset.turn = "";
      } else {
        delete route.dataset.turn;
      }

      // Keep the active entry in the rail's view without moving the page.
      const rail = nav.closest("aside");
      if (rail && to && to.height > 0) {
        const box = rail.getBoundingClientRect();
        if (to.top < box.top + 48 || to.bottom > box.bottom - 48) {
          // At once: a smooth rail scroll is dropped while the page scrolls,
          // and the route stroke's own transition already carries the motion.
          rail.scrollTo({
            behavior: "instant",
            top: rail.scrollTop + (to.top - box.top) - box.height / 2,
          });
        }
      }
    };

    place();
    // Expanding a Category or filtering resizes the list: place it again.
    const observer = new ResizeObserver(place);
    observer.observe(nav);
    return () => {
      observer.disconnect();
    };
  }, [navRef, routeRef, categoryId, activeId]);
};

const CatalogNavItem = ({
  id,
  name,
  isActive,
  onNavigate,
}: {
  id: string;
  name: string;
  isActive: boolean;
  onNavigate: (_sectionId: string) => void;
}) => (
  <li>
    <Button
      aria-current={isActive ? "location" : undefined}
      className={cn(
        "bracket text-muted-fg relative block w-full py-1.5 pr-2 pl-9 text-left text-[0.9375rem]/5 outline-0 transition-colors duration-150",
        "data-hovered:text-fg",
        isActive && "text-fg font-bold"
      )}
      data-entry={id}
      onPress={() => {
        onNavigate(id);
      }}
    >
      {name}
    </Button>
  </li>
);

/**
 * The Category rail: an ink field with collapsible Categories, their counts in
 * fixed columns, and the red route stroke that follows the scroll spy.
 */
export const CatalogNav = ({
  activeId,
  visible,
  onNavigate,
}: CatalogNavProps) => {
  const navRef = useRef<HTMLElement>(null);
  const routeRef = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    categoryIds(categories)
  );
  const isFiltered = visible !== categories;
  // While filtering, force every matching group open regardless of user state.
  const expandedKeys = isFiltered ? categoryIds(visible) : expanded;
  const activeCategory =
    visible.find((category) =>
      category.entries.some((entry) => entry.id === activeId)
    )?.id ?? null;

  useRoute(navRef, routeRef, activeCategory, activeId);

  return (
    <nav
      aria-label="Components"
      className="relative px-4 pt-7 pb-24"
      ref={navRef}
    >
      <div className="border-rule mb-5 border-b-2 pb-5">
        <p className="font-display text-[1.625rem] leading-[0.95] font-black tracking-[0.005em] uppercase [font-stretch:75%]">
          Component
          <br />
          Catalog
        </p>
        <p className="text-muted-fg mt-3 flex items-baseline gap-2 text-xs">
          <span className="num text-fg w-[3ch] text-sm font-semibold">
            {componentCount}
          </span>
          entries, dev only
        </p>
      </div>

      <span
        aria-hidden
        className={cn(
          "bg-primary pointer-events-none absolute left-4 z-10 w-1",
          "top-(--route-top) h-(--route-length) transition-[top,height,opacity] duration-500 ease-(--ease-out-expo)",
          // The station at the Category, and the turn into the entry.
          "before:bg-primary before:absolute before:-top-1.5 before:-left-1 before:size-3",
          "data-turn:after:bg-primary after:absolute after:-bottom-0.5 after:left-0 after:h-1 after:w-0 after:transition-[width] after:delay-300 after:duration-200 data-turn:after:w-4"
        )}
        ref={routeRef}
        style={{ opacity: 0 }}
      />

      {visible.length === 0 ? (
        <p className="text-muted-fg flex items-baseline gap-2 py-2 pl-9 text-sm">
          <span className="num text-fg">0</span> matches
        </p>
      ) : (
        <DisclosureGroup
          allowsMultipleExpanded
          className="flex flex-col gap-1"
          expandedKeys={expandedKeys}
          onExpandedChange={(keys) => {
            setExpanded(new Set([...keys].map(String)));
          }}
        >
          {visible.map((category) => (
            <Disclosure id={category.id} key={category.id}>
              <Heading level={2}>
                <Button
                  className="bracket group flex w-full items-center gap-2 py-2.5 pr-1 pl-9 text-left outline-0"
                  data-route-category={category.id}
                  slot="trigger"
                >
                  <span
                    className={cn(
                      "flex-1 text-[0.8125rem]/4 font-extrabold tracking-[0.07em] uppercase [font-stretch:87.5%]",
                      category.id === activeCategory
                        ? "text-fg"
                        : "text-muted-fg group-data-hovered:text-fg"
                    )}
                  >
                    {category.name}
                  </span>
                  <span className="num text-muted-fg w-[3ch] text-right text-xs">
                    {category.entries.length}
                  </span>
                  <HiChevronDown
                    aria-hidden
                    className="text-muted-fg size-4 shrink-0 transition-transform duration-200 group-aria-[expanded=false]:-rotate-90"
                  />
                </Button>
              </Heading>
              <DisclosurePanel>
                <ul className="flex flex-col pb-3">
                  {category.entries.map((entry) => (
                    <CatalogNavItem
                      id={entry.id}
                      isActive={entry.id === activeId}
                      key={entry.id}
                      name={entry.name}
                      onNavigate={onNavigate}
                    />
                  ))}
                </ul>
              </DisclosurePanel>
            </Disclosure>
          ))}
        </DisclosureGroup>
      )}
    </nav>
  );
};
