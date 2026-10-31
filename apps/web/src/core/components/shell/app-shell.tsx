"use client";

import { useLocation } from "@tanstack/react-router";
import { cn } from "cn";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { Button as ButtonPrimitive } from "react-aria-components/Button";
import { Disclosure } from "react-aria-components/Disclosure";
import {
  DisclosureGroup,
  DisclosurePanel,
  DisclosureStateContext,
} from "react-aria-components/DisclosureGroup";
import { Heading } from "react-aria-components/Heading";
import { Link as LinkPrimitive } from "react-aria-components/Link";
import { HiChevronDown, HiOutlineSquares2X2 } from "react-icons/hi2";

import { Breadcrumbs, BreadcrumbsItem } from "@/core/components/ui/breadcrumbs";
import { Button } from "@/core/components/ui/button";
import { SheetContent } from "@/core/components/ui/sheet";
import { useIsMobile } from "@/core/hooks/use-mobile";
import { ThemeToggle } from "@/features/color-mode/components/theme-toggle";
import { LanguageToggle } from "@/features/i18n/components/language-toggle";
import { useTranslation } from "@/features/i18n/use-translation";
import { ToolSwitcher } from "@/features/tools/components/tool-switcher";
import { toolAtPath, TOOLS } from "@/features/tools/tools";

import { persistSidebarOpen } from "./sidebar-state";
import { Wordmark } from "./wordmark";

const CATALOG_KEY = "tool-catalog";

/** The same panel mark the sidebar trigger draws: two columns, one filled. */
const SidebarIcon = () => (
  <svg
    aria-hidden="true"
    className="size-4"
    fill="currentcolor"
    viewBox="0 0 16 16"
  >
    <path d="M13.25 2.5c.69 0 1.25.56 1.25 1.25v8.5c0 .69-.56 1.25-1.25 1.25H7.5V15h5.75A2.75 2.75 0 0 0 16 12.25v-8.5A2.75 2.75 0 0 0 13.25 1H7.5v1.5zM5.75 1a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-3A2.75 2.75 0 0 1 0 12.25v-8.5A2.75 2.75 0 0 1 2.75 1z" />
  </svg>
);

/** The brand link: the logo, then the wordmark, or the logo alone in the dock. */
const SidebarBrand = ({
  collapsed,
  onNavigate,
}: {
  readonly collapsed: boolean;
  readonly onNavigate?: () => void;
}) => (
  <Wordmark
    className={cn(
      "bracket relative min-h-11 w-full text-[1.4rem]",
      collapsed && "justify-center"
    )}
    compact={collapsed}
    ground="auto"
    leading={
      <img
        alt=""
        className="size-8 shrink-0"
        height={32}
        src="/pwa-192x192.png"
        width={32}
      />
    }
    onPress={onNavigate}
  />
);

/** One row of the Tool catalog, ruled like a rail item on the page ground. */
const ToolRow = ({
  tool,
  isCurrent,
  onNavigate,
}: {
  readonly tool: (typeof TOOLS)[number];
  readonly isCurrent: boolean;
  readonly onNavigate?: () => void;
}) => (
  <LinkPrimitive
    aria-current={isCurrent ? "page" : undefined}
    className={cn(
      "bracket text-muted-fg relative flex min-w-0 items-center px-2 py-2 ps-9 text-[0.9375rem]/5 font-medium no-underline outline-hidden transition-colors",
      "data-hovered:bg-muted data-hovered:text-fg",
      "data-pressed:bg-fg data-pressed:text-bg",
      isCurrent && "text-fg font-bold"
    )}
    href={tool.path}
    onPress={onNavigate}
  >
    <span
      aria-hidden="true"
      className={cn(
        "bg-primary pointer-events-none absolute start-5 top-1/2 size-2 -translate-y-1/2",
        isCurrent ? "opacity-100" : "opacity-0"
      )}
    />
    {tool.name}
  </LinkPrimitive>
);

/** The Catalog trigger: the label, and the chevron that states the fold. */
const CatalogTrigger = () => {
  const { t } = useTranslation();
  const state = use(DisclosureStateContext);

  return (
    <Heading level={3}>
      <ButtonPrimitive
        className={cn(
          "bracket text-muted-fg relative flex w-full items-center gap-2.5 px-2 py-2 text-start text-[0.8125rem]/4 font-bold tracking-[0.07em] uppercase [font-stretch:87.5%] outline-hidden transition-colors",
          "data-hovered:bg-muted data-hovered:text-fg",
          "data-pressed:bg-fg data-pressed:text-bg",
          state?.isExpanded && "text-fg"
        )}
        slot="trigger"
      >
        <HiOutlineSquares2X2 aria-hidden="true" className="size-4.5 shrink-0" />
        <span>{t("toolCatalog")}</span>
        <HiChevronDown
          aria-hidden="true"
          className={cn(
            "ms-auto size-4 shrink-0 transition-transform duration-200",
            state?.isExpanded ? "rotate-0" : "-rotate-90"
          )}
        />
      </ButtonPrimitive>
    </Heading>
  );
};

/** The "Tool catalog" disclosure: a group label, then one row per Tool. */
const CatalogDisclosure = ({
  onNavigate,
}: {
  readonly onNavigate?: () => void;
}) => {
  const { pathname } = useLocation();
  const current = toolAtPath(pathname);

  return (
    <Disclosure className="w-full" id={CATALOG_KEY}>
      <CatalogTrigger />
      <DisclosurePanel className="h-(--disclosure-panel-height) overflow-clip transition-[height] duration-200">
        <ul className="flex flex-col gap-0.5 pt-0.5">
          {TOOLS.map((tool) => (
            <li key={tool.path}>
              <ToolRow
                isCurrent={current?.path === tool.path}
                onNavigate={onNavigate}
                tool={tool}
              />
            </li>
          ))}
        </ul>
      </DisclosurePanel>
    </Disclosure>
  );
};

/** The sidebar's one content tree, shared by the desk rail and the phone sheet. */
const SidebarBody = ({
  collapsed,
  onNavigate,
}: {
  readonly collapsed: boolean;
  readonly onNavigate?: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "border-rule flex h-16 shrink-0 items-center border-b-2",
          collapsed ? "justify-center px-2" : "px-4"
        )}
      >
        <SidebarBrand collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      <nav
        aria-label={t("toolCatalog")}
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto",
          collapsed ? "items-center gap-1.5 p-2" : "p-2"
        )}
      >
        {collapsed ? (
          <ToolSwitcher />
        ) : (
          <DisclosureGroup
            className="w-full"
            defaultExpandedKeys={[CATALOG_KEY]}
          >
            <CatalogDisclosure onNavigate={onNavigate} />
          </DisclosureGroup>
        )}
      </nav>

      <div
        className={cn(
          "border-rule mt-auto flex shrink-0 gap-2 border-t-2 p-2",
          collapsed ? "flex-col items-center" : "items-center"
        )}
      >
        <LanguageToggle block compact={collapsed} />
        <ThemeToggle className="shrink-0" />
      </div>
    </div>
  );
};

/**
 * The page trail: the Catalog, then the Tool or page that is open. A Tool
 * names itself in the trail: its ransom name is the page's one `h1`, so the
 * shell bar carries the title and the page starts at its work.
 */
const ShellBreadcrumbs = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const tool = toolAtPath(pathname);
  const page =
    tool?.name ??
    (pathname === "/master-design" ? "Component Catalog" : t("title"));

  return (
    <Breadcrumbs
      aria-label={t("breadcrumb")}
      className="min-w-0 flex-1"
      separator="slash"
    >
      {page === t("title") ? null : (
        <BreadcrumbsItem className="shrink-0" href="/">
          {t("title")}
        </BreadcrumbsItem>
      )}
      {tool ? (
        <BreadcrumbsItem className="min-w-0" ransom>
          {page}
        </BreadcrumbsItem>
      ) : (
        <BreadcrumbsItem className="min-w-0 truncate">{page}</BreadcrumbsItem>
      )}
    </Breadcrumbs>
  );
};

/** The phone sheet: the same rail at full height, closed by its own mark. */
const SheetSidebar = ({
  isOpen,
  onOpenChange,
  title,
}: {
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
}) => (
  <SheetContent
    aria-label={title}
    className="bg-bg text-fg p-0"
    isOpen={isOpen}
    onOpenChange={onOpenChange}
    side="left"
  >
    <SidebarBody
      collapsed={false}
      onNavigate={() => {
        onOpenChange(false);
      }}
    />
  </SheetContent>
);

export interface AppShellProps {
  readonly defaultOpen: boolean;
  readonly children: React.ReactNode;
}

/**
 * The app frame: a tool catalog rail and its top bar, then the page. The rail
 * sits on the page ground, so the color mode switches it with the content.
 * Below 768px it folds into a sheet; the top bar keeps the way in.
 */
export const AppShell = ({ defaultOpen, children }: AppShellProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(defaultOpen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobileRef = useRef(isMobile);

  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  const toggle = useCallback(() => {
    if (isMobileRef.current) {
      setMobileOpen((current) => !current);
      return;
    }
    setOpen((current) => !current);
  }, []);

  // Remember the desk rail across a reload; the server reads the same cookie.
  useEffect(() => {
    persistSidebarOpen(open);
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== "b"
      ) {
        return;
      }
      const active = document.activeElement;
      const inTextInput =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active?.getAttribute("contenteditable") === "true" ||
        active?.getAttribute("role") === "textbox";
      if (inTextInput) {
        return;
      }
      event.preventDefault();
      toggle();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  const label = isMobile
    ? t("openSidebar")
    : open
      ? t("collapseSidebar")
      : t("expandSidebar");

  return (
    <div className="bg-bg text-fg flex min-h-svh">
      <aside
        className={cn(
          "border-rule bg-bg text-fg sticky top-0 z-20 hidden h-svh shrink-0 flex-col overflow-hidden border-r-2 transition-[width] duration-200 ease-linear md:flex",
          open ? "w-70" : "w-15"
        )}
        data-state={open ? "expanded" : "collapsed"}
        id="app-sidebar"
      >
        <SidebarBody collapsed={!open} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-rule bg-bg text-fg sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b-2 px-4 py-2.5 sm:gap-4 sm:px-6">
          <Button
            aria-controls={isMobile ? undefined : "app-sidebar"}
            aria-expanded={isMobile ? mobileOpen : open}
            aria-label={label}
            intent="plain"
            onPress={toggle}
            size="sq-md"
          >
            <SidebarIcon />
          </Button>
          <ShellBreadcrumbs />
        </header>

        <main className="flex min-h-0 flex-1 flex-col" id="content">
          {children}
        </main>
      </div>

      {isMobile ? (
        <SheetSidebar
          isOpen={mobileOpen}
          onOpenChange={setMobileOpen}
          title={t("toolCatalog")}
        />
      ) : null}
    </div>
  );
};
