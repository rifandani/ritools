/* oxlint-disable unicorn/require-post-message-target-origin -- Dedicated Worker postMessage has no targetOrigin argument. */
import { Layer } from "effect";

import { FolioWorkerFactory } from "./folio.service";
// oxlint-disable-next-line import/default -- Vite generates the default URL export for this Worker query.
import workerUrl from "./folio.worker?worker&url";
import { folioPdfWorkerUrl } from "./folio.worker-assets";

export const folioWorkerFactoryLayer = Layer.succeed(FolioWorkerFactory, {
  load: async () => {
    const responses = await Promise.all([
      fetch(workerUrl, { cache: "force-cache" }),
      fetch(folioPdfWorkerUrl, { cache: "force-cache" }),
    ]);
    if (responses.some((response) => !response.ok)) {
      throw new Error("Engine asset unavailable");
    }
  },
  offline: () => typeof navigator !== "undefined" && !navigator.onLine,
  create: () => {
    const worker = new Worker(workerUrl, {
      type: "module",
      name: "folio-engine",
    });
    return {
      send: (request) => worker.postMessage(request),
      subscribe: (handlers) => {
        worker.addEventListener("message", (event: MessageEvent<unknown>) =>
          handlers.message(event.data)
        );
        worker.addEventListener("error", () => handlers.error());
        worker.addEventListener("messageerror", () => handlers.error());
      },
      terminate: () => worker.terminate(),
    };
  },
});
