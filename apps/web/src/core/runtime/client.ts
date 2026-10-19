import { BrowserKeyValueStore } from "@effect/platform-browser";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { Atom } from "effect/reactivity";

import { LoggerLayer } from "@/core/observability/logger";
import { CdnClient } from "@/features/cdn/cdn.service";

/**
 * Services for effectful atoms. It also builds during SSR when a server render
 * reads one of its atoms, so it holds nothing that needs the browser.
 */
export const appRuntime = Atom.runtime(
  Layer.mergeAll(CdnClient.layer, LoggerLayer).pipe(
    Layer.provide(FetchHttpClient.layer)
  )
);

/**
 * `localStorage`, for `Atom.kvs` atoms. It is a separate runtime because the
 * server has no `localStorage`: those atoms give a server value with
 * `Atom.withServerValue`, so this runtime only builds in the browser.
 */
export const storageRuntime = Atom.runtime(
  BrowserKeyValueStore.layerLocalStorage
);
