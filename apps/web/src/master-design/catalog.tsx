import { useDebounceFn, useMount } from "@reactuses/core";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { HiBars3BottomLeft } from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSection,
} from "@/core/components/ui/menu";
import { Ransom } from "@/core/components/ui/ransom";
import { SearchField, SearchInput } from "@/core/components/ui/search-field";

import { CatalogNav } from "./catalog-nav";
import { entryIds, matchCategories } from "./registry";
import type { Category } from "./types";
import { useScrollSpy } from "./use-scroll-spy";

/** Content gutters: 16px on phones, growing with the column. */
const GUTTER = "px-4 sm:px-8 lg:px-12";

/** On phones the rail folds into this menu in the filter bar. */
const CatalogMenu = ({
  activeId,
  visible,
  onNavigate,
}: {
  activeId: string | null;
  visible: Category[];
  onNavigate: (_sectionId: string) => void;
}) => {
  const active = visible
    .flatMap((category) => category.entries)
    .find((entry) => entry.id === activeId);
  return (
    <Menu>
      <Button
        aria-label={active ? `Components, at ${active.name}` : "Components"}
        className="max-w-[44%] shrink-0 md:hidden"
        intent="secondary"
        isDisabled={visible.length === 0}
        size="sm"
      >
        <HiBars3BottomLeft />
        <span className="truncate">{active?.name ?? "Components"}</span>
      </Button>
      <MenuContent
        aria-label="Components"
        disallowEmptySelection
        onSelectionChange={(selection) => {
          const [key] = selection === "all" ? [] : selection;
          if (key !== undefined) {
            onNavigate(String(key));
          }
        }}
        popover={{ className: "max-w-[min(20rem,calc(100vw-2rem))]" }}
        selectedKeys={activeId ? new Set([activeId]) : new Set()}
        selectionMode="single"
      >
        {visible.map((category) => (
          <MenuSection id={category.id} key={category.id} label={category.name}>
            {category.entries.map((entry) => (
              <MenuItem id={entry.id} key={entry.id}>
                {entry.name}
              </MenuItem>
            ))}
          </MenuSection>
        ))}
      </MenuContent>
    </Menu>
  );
};

/** The `?q=` filter found nothing: say so at poster scale, and offer the way back. */
const EmptyResult = ({
  query,
  onClear,
}: {
  query: string;
  onClear: () => void;
}) => (
  <section
    aria-live="polite"
    className={`${GUTTER} flex flex-col items-start py-20`}
  >
    <p className="num text-fg text-[clamp(6rem,20vw,12rem)] leading-[0.8] font-extrabold">
      0
    </p>
    <span
      aria-hidden
      className="bg-primary mt-6 mb-8 block h-3 w-44 -skew-x-16"
    />
    <h2 className="font-display max-w-4xl text-[clamp(2rem,5.5vw,3.75rem)] leading-[0.95] font-black uppercase [font-stretch:75%]">
      Nothing here is called{" "}
      <span className="border-rule bg-card inline-block border-2 px-2 normal-case [font-stretch:100%]">
        {query}
      </span>
    </h2>
    <p className="text-muted-fg mt-5 max-w-[52ch] text-lg/7">
      The filter reads Component Entry names. Try a shorter part of one, like
      “date” or “menu”.
    </p>
    <Button className="mt-10" onPress={onClear} size="lg">
      Clear the filter
    </Button>
  </section>
);

export const MasterDesignCatalog = () => {
  // The filter lives in the validated `?q=` search param, so it survives
  // reloads and can be shared as a link.
  const filter = useSearch({
    from: "/master-design",
    select: (search) => search.q ?? "",
  });
  const navigate = useNavigate({ from: "/master-design" });
  const setFilter = (value: string) => {
    void navigate({
      hash: true,
      replace: true,
      // Typing must not jump the page back to the top.
      resetScroll: false,
      // Drop the key when empty. A present `q: undefined` decodes to the
      // string "undefined" in `validateSearch`.
      search: value ? { q: value } : {},
    });
  };
  // The field shows each keystroke and each deleted character at once, but the
  // filter behind it — the URL, the rail and the list — waits for a 500ms
  // pause. Deleting keeps the same wait: an empty filter renders the whole
  // catalog, and doing that inside the key event would hold up the text.
  const [draft, setDraft] = useState(filter);
  const { run: queueFilter } = useDebounceFn(setFilter, 500);
  const onFilterChange = (value: string) => {
    setDraft(value);
    queueFilter(value);
  };
  const query = filter.trim().toLowerCase();
  const visible = useMemo(() => matchCategories(query), [query]);
  // A stable list per query, as the scroll spy expects.
  const visibleIds = useMemo(
    () =>
      visible.flatMap((category) => category.entries.map((entry) => entry.id)),
    [visible]
  );
  const { activeId, scrollTo } = useScrollSpy(visibleIds);
  const shown = visibleIds.length;

  // Read the deep link before the scroll spy writes its own hash. A ref keeps
  // the first render's value; later renders see the spy's hash and ignore it.
  const initialHash = useRef(
    typeof window === "undefined" ? "" : window.location.hash.slice(1)
  );

  // Honor deep links like /master-design#combo-box once sections have painted.
  useMount(() => {
    const hash = initialHash.current;
    if (hash && entryIds.includes(hash)) {
      requestAnimationFrame(() => {
        scrollTo(hash);
      });
    }
  });

  return (
    <div className="flex min-h-svh w-full">
      <h1 className="sr-only">Component Catalog</h1>
      <aside className="ground-ink sticky top-0 hidden h-svh w-70 shrink-0 overflow-y-auto overscroll-contain md:block">
        <CatalogNav
          activeId={activeId}
          onNavigate={scrollTo}
          visible={visible}
        />
      </aside>

      <div className="min-w-0 flex-1">
        <div className="border-rule bg-bg sticky top-0 z-20 border-b-[3px]">
          <div className={`${GUTTER} flex items-center gap-3 py-3`}>
            <CatalogMenu
              activeId={activeId}
              onNavigate={scrollTo}
              visible={visible}
            />
            <SearchField
              aria-label="Filter components"
              className="me-1 min-w-0 flex-1 sm:max-w-sm"
              onChange={onFilterChange}
              value={draft}
            >
              <SearchInput placeholder="Filter by name" />
            </SearchField>
            <p
              aria-live="polite"
              className="text-muted-fg ml-auto hidden items-baseline gap-1 text-xs sm:flex"
            >
              <span className="num text-fg w-[3ch] text-right text-sm font-semibold">
                {shown}
              </span>
              <span className="num">/</span>
              <span className="num w-[3ch] text-sm">{entryIds.length}</span>
              <span className="ml-1">shown</span>
            </p>
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyResult
            onClear={() => {
              onFilterChange("");
            }}
            query={filter.trim()}
          />
        ) : (
          <div className="flex flex-col gap-y-32 pt-14 pb-[50vh]">
            {visible.map((category) => (
              <section
                aria-labelledby={`category-${category.id}`}
                className="scroll-mt-28"
                key={category.id}
              >
                {/* Poster scale, cropped by the right edge of the page. */}
                <div className="overflow-x-clip">
                  <Ransom
                    as="h2"
                    className={`${GUTTER} block text-[clamp(4rem,9vw,8.5rem)]`}
                    id={`category-${category.id}`}
                  >
                    {category.name}
                  </Ransom>
                  <div className="bg-rule mt-6 ml-4 h-[3px] sm:ml-8 lg:ml-12" />
                </div>

                {category.guide && (
                  <div className={GUTTER}>
                    <p className="text-muted-fg mt-8 max-w-[62ch] text-lg/7 text-pretty">
                      {category.guide.description}
                    </p>
                  </div>
                )}

                <div className={`${GUTTER} mt-14 flex flex-col gap-y-24`}>
                  {category.entries.map((entry) => (
                    <section
                      className="max-w-6xl scroll-mt-28"
                      data-md-section
                      id={entry.id}
                      key={entry.id}
                    >
                      <div className="mb-7 flex flex-col items-start gap-1.5">
                        <Ransom
                          as="h3"
                          // `w-full` gives the size container a width: a
                          // shrunk-to-fit block resolves its `cqi` to zero and
                          // the title vanishes.
                          className="w-full max-w-3xl text-[clamp(2rem,4.2vw,3.25rem)]"
                          fit
                        >
                          {entry.name}
                        </Ransom>
                        {category.guide && (
                          <a
                            className="text-muted-fg hover:text-fg focus-visible:outline-ring font-mono text-xs/5 outline-0 focus-visible:outline-2 focus-visible:outline-offset-2"
                            href={`#${entry.id}`}
                          >
                            #{entry.id}
                          </a>
                        )}
                      </div>
                      <entry.Showcase />
                    </section>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
