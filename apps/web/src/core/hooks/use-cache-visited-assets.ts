import { useEffect } from "react";

import { visitedAssetUrl } from "@/core/utils/sw";

const cacheableAssetUrl = (
  entry: PerformanceEntry,
  origin: string,
  saved: ReadonlySet<string>,
  disposed: boolean
) => {
  const candidate = visitedAssetUrl(entry, origin);
  return candidate !== null && !saved.has(candidate) && !disposed
    ? candidate
    : null;
};

const cacheAsset = async (url: string, isDisposed: () => boolean) => {
  const response = await fetch(url, {
    cache: "only-if-cached",
    mode: "same-origin",
  });
  if (!response.ok || isDisposed()) {
    return;
  }
  const cache = await caches.open("web-quill-v1");
  await cache.put(url, response);
};

/** Keep the first visit offline even when its assets arrived before SW control. */
export const useCacheVisitedAssets = () => {
  // oxlint-disable-next-line react-doctor/no-fetch-in-effect -- These requests copy completed public resources from the HTTP cache and never download data.
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("caches" in window)) {
      return;
    }
    let disposed = false;
    let observer: PerformanceObserver | null = null;
    const saved = new Set<string>();
    const save = async (entry: PerformanceEntry) => {
      const url = cacheableAssetUrl(
        entry,
        window.location.origin,
        saved,
        disposed
      );
      if (url === null) {
        return;
      }
      saved.add(url);
      try {
        // This mode never downloads an asset. A browser-cache miss returns 504.
        await cacheAsset(url, () => disposed);
      } catch {
        // Cache quota and browser support do not affect the current operation.
      }
    };
    const prepare = async () => {
      try {
        await navigator.serviceWorker.ready;
        if (disposed) {
          return;
        }
        for (const entry of performance.getEntriesByType("resource")) {
          void save(entry);
        }
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            void save(entry);
          }
        });
        observer.observe({ type: "resource", buffered: true });
      } catch {
        /* Offline caching is best effort. */
      }
    };
    void prepare();
    return () => {
      disposed = true;
      observer?.disconnect();
    };
  }, []);
};
