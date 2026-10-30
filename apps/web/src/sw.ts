/// <reference lib="webworker" />
/* oxlint-disable eslint/prefer-named-capture-group -- The hashed asset names are not parsed, only matched. */
import {
  cleanupOutdatedCaches,
  matchPrecache,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope;

/** Server-rendered pages the user has visited, for offline revisits. */
const PAGES_CACHE = "web-pages-v1";
/** Codec WASM, kept after its first use. */
const CODEC_CACHE = "web-codecs-v1";
/** Public Tabular Worker assets only. User data never enters this cache. */
const TABULAR_CACHE = "web-tabular-v1";
/** Public PDF viewer assets and the generated sample only. Never a user PDF. */
const FOLIO_CACHE = "web-folio-v2";
/** Static page (in `public/`) for an offline visit to an uncached page. */
const OFFLINE_FALLBACK = "/offline.html";

/** Prefixes of our runtime caches. The `spa-` ones are from before the app was renamed to `web`. */
const APP_CACHE_PREFIXES = ["web-pages-", "spa-offline-", "spa-pages-"];

/** Our own runtime caches from older workers - never Workbox precaches. */
const isStaleAppCache = (key: string) =>
  (APP_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
    key !== PAGES_CACHE) ||
  (key.startsWith("web-folio-") && key !== FOLIO_CACHE);

self.addEventListener("message", (event) => {
  // Only the pages of this origin may ask the worker to take control.
  if (event.origin !== self.location.origin) {
    return;
  }
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Keep the home page for an offline start, even when the first visit was a
// deep link. Other pages are kept as the user visits them (see below).
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE);
      await cache.add("/");
      // The generated sample is a static asset and must work offline. A user
      // PDF never enters this cache.
      const folio = await caches.open(FOLIO_CACHE);
      await folio.add("/folio/sample.pdf");
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const deletions: Promise<boolean>[] = [];
      for (const key of await caches.keys()) {
        if (isStaleAppCache(key)) {
          deletions.push(caches.delete(key));
        }
      }
      await Promise.all(deletions);
    })()
  );
});

// self.__WB_MANIFEST is the default injection point
precacheAndRoute(self.__WB_MANIFEST);
// clean old assets
cleanupOutdatedCaches();

// Every page is rendered on the server per request (there is no app-shell
// `index.html`), so prefer the network and fall back to the last copy seen.
const pages = new NetworkFirst({
  cacheName: PAGES_CACHE,
  networkTimeoutSeconds: 3,
});
registerRoute(
  new NavigationRoute(async (options) => {
    try {
      return await pages.handle(options);
    } catch {
      return (await matchPrecache(OFFLINE_FALLBACK)) ?? Response.error();
    }
  })
);

// A codec is too large for Workbox to precache (it refuses a file over 2 MiB),
// so a format is cached the first time it is used, and offline from then on.
// Addressed by content hash, so an entry never goes stale.
registerRoute(
  ({ url }) =>
    url.pathname.startsWith("/assets/") && url.pathname.endsWith(".wasm"),
  new CacheFirst({ cacheName: CODEC_CACHE })
);

// Engine jobs are local Workers. Cache only their same-origin hashed code.
// The PDF writer is a lazy chunk inside the format Worker.
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    /^\/assets\/tabular[\w.-]*-[\w-]+\.js$/u.test(url.pathname),
  new CacheFirst({ cacheName: TABULAR_CACHE })
);
// PDF viewer assets are same-origin and versioned. Cache only this allowlist;
// user files, passwords, names, and form values never enter CacheStorage.
const FOLIO_ASSET_PREFIXES = ["/folio/notices/"];
const isFolioAsset = (url: URL) =>
  url.origin === self.location.origin &&
  (url.pathname === "/folio/sample.pdf" ||
    FOLIO_ASSET_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)));
registerRoute(
  ({ url }) => isFolioAsset(url),
  new CacheFirst({ cacheName: FOLIO_CACHE })
);
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    /^\/assets\/(?:folio|embedpdf)[\w.-]*-[\w-]+\.js$/u.test(url.pathname),
  new CacheFirst({ cacheName: FOLIO_CACHE })
);
// PDF fonts are fetched by the plan or writer on first use, then kept offline.
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    url.pathname.startsWith("/fonts/pdf/"),
  new CacheFirst({ cacheName: TABULAR_CACHE })
);

self.addEventListener("push", (event) => {
  // SAFETY: the push payload is attacker-visible JSON, so both fields stay
  // optional and every read below falls back to a literal default.
  const data = (event.data?.json() ?? {}) as {
    body?: string;
    title?: string;
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Ritools", {
      body: data.body ?? "New notification",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
