/* oxlint-disable typescript/ban-types */
import type {
  NavigateOptions,
  RegisteredRouter,
  ToPathOption,
} from "@tanstack/react-router";
import {
  ClientOnly,
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { Effect } from "effect";
import type { AtomRegistry } from "effect/reactivity";
import type { ReactNode } from "react";
import { lazy, Suspense } from "react";
import { RouterProvider as RACRouterProvider } from "react-aria-components";

import { Wordmark } from "@/core/components/shell/wordmark";
import { OG_PATH } from "@/core/constants/global";
import { ReloadPromptSw } from "@/core/providers/reload-prompt-sw";
import { buildSeoMeta } from "@/core/utils/seo";
import {
  ColorModeScript,
  ColorModeSync,
} from "@/features/color-mode/components/color-mode";
import { ThemeToggle } from "@/features/color-mode/components/theme-toggle";
import { AppI18nProvider } from "@/features/i18n/components/i18n-provider";
import { LanguageToggle } from "@/features/i18n/components/language-toggle";
import { DEFAULT_LOCALE } from "@/features/i18n/locale";
import { requestLocale } from "@/features/i18n/locale.functions";
import { useTranslation } from "@/features/i18n/use-translation";
import { AppToaster } from "@/features/toast/components/app-toaster";
import { ToolSwitcher } from "@/features/tools/components/tool-switcher";

// Side-effect import: Start links it from the client build manifest. A `?url`
// import would take its hash from the SSR build, whose Tailwind output differs.
import "@/core/styles/globals.css";

declare module "react-aria-components" {
  interface RouterConfig {
    href: ToPathOption<RegisteredRouter, "/", "/"> | ({} & string);
    routerOptions: Omit<NavigateOptions, "to" | "from">;
  }
}

// E2E runs must not mount devtools: their overlays intercept pointer events.
const Devtools =
  import.meta.env.DEV && import.meta.env.VITE_E2E !== "true"
    ? lazy(async () => {
        const m = await import("@/core/providers/devtools");
        return { default: m.Devtools };
      })
    : null;

/**
 * The full HTML document. Start always renders it on the server - also around
 * the error and not-found components, and for routes with `ssr: false`.
 */
const RootDocument = ({ children }: { children: ReactNode }) => {
  // Undefined only when the root loader itself failed.
  const loaderData: { locale: string } | undefined = Route.useLoaderData();
  return (
    // The color-mode script sets `<html class>` before React hydrates.
    <html lang={loaderData?.locale ?? DEFAULT_LOCALE} suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Two tags share one `name`, so they bypass `head()` de-duplication. */}
        {/* The navbar is a red field in both modes; the browser chrome joins it. */}
        <meta name="theme-color" content="#d7001a" />
        <link
          as="font"
          crossOrigin="anonymous"
          href="/fonts/archivo-latin-wdth-normal.woff2"
          rel="preload"
          type="font/woff2"
        />
        <ColorModeScript />
      </head>
      <body>
        <div id="root" className="min-h-svh">
          {children}
        </div>
        <Scripts />
      </body>
    </html>
  );
};

const RootRoute = () => {
  const { locale } = Route.useLoaderData();
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <AppI18nProvider locale={locale}>
      <ColorModeSync />
      <a className="skip-link" href="#content">
        {t("skipToContent")}
      </a>
      {/*
       * RAC such as Link, Menu, Tabs, Table, and many others support rendering elements as links that perform navigation when the user interacts with them.
       * It needs to be wrapped by RAC RouterProvider component.
       */}
      <RACRouterProvider
        navigate={(to, options) =>
          router.navigate({
            ...options,
            // SAFETY: react-aria hands back an href built from this app's own
            // links; TanStack cannot verify that through the generic `navigate` hook.
            to: to as ToPathOption<RegisteredRouter, "/", "/">,
          })
        }
        useHref={(to) => router.buildLocation({ to }).href}
      >
        {/* The shell: a Tool adds content, not chrome. */}
        <header className="ground-red flex min-h-16 items-center justify-between gap-x-2 px-4 py-2.5 sm:gap-x-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-x-2 sm:gap-x-4">
            <Wordmark />
            <ToolSwitcher />
          </div>
          <div className="flex items-center gap-x-2 sm:gap-x-3">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </header>
        <main id="content">
          <Outlet />
        </main>
      </RACRouterProvider>

      {/* Last in the DOM, so a toast never takes the first focus stop. */}
      <AppToaster />

      {/* Browser-only: service workers and devtools have no server side. */}
      <ClientOnly>
        <ReloadPromptSw />
        {Devtools ? (
          <Suspense fallback={null}>
            <Devtools />
          </Suspense>
        ) : null}
      </ClientOnly>
    </AppI18nProvider>
  );
};

export const Route = createRootRouteWithContext<{
  registry: AtomRegistry.AtomRegistry;
}>()({
  // Runs on the server for the first request: the cookie and `Accept-Language`
  // header pick the Locale, so the SSR HTML and hydration agree.
  loader: async () => ({ locale: await Effect.runPromise(requestLocale) }),
  // Client navigation never needs it again; `LanguageToggle` owns changes.
  shouldReload: false,
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      {
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
        name: "viewport",
      },
      { content: "light dark", name: "color-scheme" },
      { content: "#d7001a", name: "msapplication-TileColor" },
      { content: "Ritools", name: "application-name" },
      { content: "Tri Rizeki Rifandani", name: "author" },
      { content: "TanStack Start", name: "generator" },
      { content: "Tri Rizeki Rifandani", name: "creator" },
      { content: "Tri Rizeki Rifandani", name: "publisher" },
      { content: "index, follow", name: "robots" },
      { content: "Personal Blog or Website", name: "category" },
      { content: "telephone=no", name: "format-detection" },
      { content: "yes", name: "mobile-web-app-capable" },
      { content: "default", name: "apple-mobile-web-app-status-bar-style" },
      { content: "Ritools", property: "og:site_name" },
      {
        content: loaderData?.locale === "id-id" ? "id_ID" : "en_US",
        property: "og:locale",
      },
      { content: "Indonesia", property: "og:country_name" },
      { content: "website", property: "og:type" },
      { content: "summary_large_image", name: "twitter:card" },
      { content: "https://ritools.com", name: "twitter:site" },
      // should be the id for the app itself
      { content: "@tri_rizeki", name: "twitter:site:id" },
      { content: "Tri Rizeki Rifandani", name: "twitter:creator" },
      { content: "@tri_rizeki", name: "twitter:creator:id" },
      // Defaults; each page's `head()` overrides them by name/property.
      ...buildSeoMeta(),
    ],
    links: [
      { href: "/manifest.webmanifest", rel: "manifest" },
      {
        href: "/favicon.ico",
        rel: "icon",
        sizes: "48x48",
        type: "image/x-icon",
      },
      {
        href: "/favicon.svg",
        rel: "icon",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        href: "/apple-touch-icon-180x180.png",
        rel: "apple-touch-icon",
        sizes: "180x180",
      },
      { href: "https://ritools.com", rel: "author" },
      {
        href: OG_PATH,
        media: "(orientation: portrait)",
        rel: "apple-touch-startup-image",
      },
      {
        href: OG_PATH,
        media: "(orientation: landscape)",
        rel: "apple-touch-startup-image",
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootRoute,
});
