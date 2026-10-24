import { BrowserKeyValueStore } from "@effect/platform-browser";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { Atom } from "effect/reactivity";

import { LoggerLayer } from "@/core/observability/logger";
import { CdnClient } from "@/features/cdn/cdn.service";
import { ExposeEngineLive } from "@/features/expose/expose.service";
import { exposeWorkerFactoryLayer } from "@/features/expose/expose.worker-client";
import { SqueezeClient } from "@/features/squeeze/squeeze.service";
import { codecWorkerFactoryLayer } from "@/features/squeeze/squeeze.worker-client";

/**
 * Services for effectful atoms. It also builds during SSR when a server render
 * reads one of its atoms, so it holds nothing that needs the browser. The codec
 * Worker is created on first use, never at build time.
 */
export const appRuntime = Atom.runtime(
  Layer.mergeAll(
    CdnClient.layer,
    LoggerLayer,
    SqueezeClient.layer,
    ExposeEngineLive
  ).pipe(
    Layer.provide(
      Layer.mergeAll(
        FetchHttpClient.layer,
        codecWorkerFactoryLayer,
        exposeWorkerFactoryLayer
      )
    )
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
