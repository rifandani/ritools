/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  matchPrecache,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope;

/** Server-rendered pages the user has visited, for offline revisits. */
const PAGES_CACHE = "web-pages-v1";
/** Static page (in `public/`) for an offline visit to an uncached page. */
const OFFLINE_FALLBACK = "/offline.html";

/** Prefixes of our runtime caches. The `spa-` ones are from before the app was renamed to `web`. */
const APP_CACHE_PREFIXES = ["web-pages-", "spa-offline-", "spa-pages-"];

/** Our own runtime caches from older workers - never Workbox precaches. */
const isStaleAppCache = (key: string) =>
  APP_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
  key !== PAGES_CACHE;

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

self.addEventListener("push", (event) => {
  // SAFETY: the push payload is attacker-visible JSON, so both fields stay
  // optional and every read below falls back to a literal default.
  const data = (event.data?.json() ?? {}) as {
    body?: string;
    title?: string;
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Heynbord", {
      body: data.body ?? "New notification",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
