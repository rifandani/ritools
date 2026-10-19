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

import { ReloadPromptSw } from "@/core/providers/reload-prompt-sw";
import { buildSeoMeta } from "@/core/utils/seo";
import {
  ColorModeScript,
  ColorModeSync,
} from "@/features/color-mode/components/color-mode";
import { AppI18nProvider } from "@/features/i18n/components/i18n-provider";
import { DEFAULT_LOCALE } from "@/features/i18n/locale";
import { requestLocale } from "@/features/i18n/locale.functions";
import { AppToaster } from "@/features/toast/components/app-toaster";

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
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#ffffff"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#020203"
        />
        <ColorModeScript />
      </head>
      <body>
        <main id="root" className="min-h-svh">
          {children}
        </main>
        <Scripts />
      </body>
    </html>
  );
};

const RootRoute = () => {
  const { locale } = Route.useLoaderData();
  const router = useRouter();
  return (
    <AppI18nProvider locale={locale}>
      <ColorModeSync />
      <AppToaster />
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
        <Outlet />
      </RACRouterProvider>

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
      { content: "#ffffff", name: "msapplication-TileColor" },
      { content: "Heynbord", name: "application-name" },
      { content: "Tri Rizeki Rifandani", name: "author" },
      { content: "TanStack Start", name: "generator" },
      { content: "Tri Rizeki Rifandani", name: "creator" },
      { content: "Tri Rizeki Rifandani", name: "publisher" },
      { content: "index, follow", name: "robots" },
      { content: "Personal Blog or Website", name: "category" },
      { content: "telephone=no", name: "format-detection" },
      { content: "yes", name: "mobile-web-app-capable" },
      { content: "default", name: "apple-mobile-web-app-status-bar-style" },
      { content: "Heynbord", property: "og:site_name" },
      {
        content: loaderData?.locale === "id-id" ? "id_ID" : "en_US",
        property: "og:locale",
      },
      { content: "Indonesia", property: "og:country_name" },
      { content: "website", property: "og:type" },
      { content: "summary_large_image", name: "twitter:card" },
      { content: "https://heynbord.com", name: "twitter:site" },
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
      { href: "https://heynbord.com", rel: "author" },
      {
        href: "/og.png",
        media: "(orientation: portrait)",
        rel: "apple-touch-startup-image",
      },
      {
        href: "/og.png",
        media: "(orientation: landscape)",
        rel: "apple-touch-startup-image",
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootRoute,
});
