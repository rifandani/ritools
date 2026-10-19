import type { AnyRouteMatch } from "@tanstack/react-router";

import { APP_CONFIG } from "@/core/config/env";
import { APP_NAME } from "@/core/constants/global";

/** What a route's `head()` returns in `meta`. */
type RouteMeta = NonNullable<AnyRouteMatch["meta"]>;

export interface SeoInput {
  /** Page title, branded as `"<title> | <app name>"`. */
  title?: string;
  description?: string;
  /** Path or absolute URL of the OG/Twitter image. */
  image?: string;
  /** Path of the page, for `og:url` and the schema.org nodes. */
  path?: string;
}

const appName = APP_NAME;
const appDescription =
  "a browser-based MMO collectible/trading-card strategy game";
const appBaseUrl = APP_CONFIG.url;
const appPublisher = "Tri Rizeki Rifandani";

/**
 * Shared schema.org fields for both the WebSite and WebPage nodes.
 */
export const ldParams = {
  author: {
    name: appPublisher,
    url: appBaseUrl,
  },
  inLanguage: ["en-US", "id-ID"],
  name: appName,
  url: appBaseUrl,
};

/**
 * Absolutize an OG/Twitter image path against the app origin.
 */
export const resolveOgImage = (image?: string) =>
  new URL(image ?? "/og.png", appBaseUrl).href;

/** Branded title, description, and absolute URL of one page. */
const resolvePage = (input: SeoInput) => ({
  description: input.description ?? appDescription,
  title: input.title ? `${input.title} | ${appName}` : appName,
  url: new URL(input.path ?? "/", appBaseUrl).href,
});

/**
 * Title, description, Open Graph, and Twitter tags for one page. TanStack's
 * `HeadContent` keeps the deepest route's tag per `name`/`property`, so a page
 * overrides the root defaults by emitting the same keys.
 */
export const buildSeoMeta = (input: SeoInput = {}): RouteMeta => {
  const { description, title, url } = resolvePage(input);
  const image = resolveOgImage(input.image);
  return [
    { title },
    { content: description, name: "description" },
    { content: title, name: "apple-mobile-web-app-title" },
    { content: title, property: "og:title" },
    { content: description, property: "og:description" },
    { content: url, property: "og:url" },
    { content: image, property: "og:image" },
    { content: "1200", property: "og:image:width" },
    { content: "630", property: "og:image:height" },
    { content: title, name: "twitter:title" },
    { content: description, name: "twitter:description" },
    { content: image, name: "twitter:image" },
  ];
};

/** schema.org WebSite + WebPage graph for one page. */
export const buildStructuredData = (input: SeoInput = {}) => {
  const { description, title, url } = resolvePage(input);
  return {
    "@context": "https://schema.org",
    "@graph": [
      { ...ldParams, "@type": "WebSite", description },
      { ...ldParams, "@type": "WebPage", description, name: title, url },
    ],
  };
};

/**
 * JSON for an inline `<script>`: `<` is escaped, so no string in the data can
 * close the script element early.
 */
const toInlineJson = <T>(value: T) =>
  JSON.stringify(value).replaceAll("<", "\\u003c");

/**
 * The `head()` of one page: meta tags plus its JSON-LD script. Only pages call
 * this - scripts are not de-duplicated, so the root emits meta only.
 *
 * Pure by design so `head()` stays a one-line adapter - see the Logic Seam
 * convention in `docs/adr/0001-unit-tests-are-pure-module-logic.md`.
 */
export const buildSeoHead = (input: SeoInput) => ({
  meta: buildSeoMeta(input),
  scripts: [
    {
      children: toInlineJson(buildStructuredData(input)),
      type: "application/ld+json",
    },
  ],
});
