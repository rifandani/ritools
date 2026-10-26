/* oxlint-disable unicorn/require-post-message-target-origin -- Dedicated Worker postMessage has no targetOrigin argument. */
import { Layer } from "effect";

import { TabularWorkerFactory } from "./tabular.service";
// oxlint-disable-next-line import/default -- Vite generates the default URL export for this Worker query.
import workerUrl from "./tabular.worker?worker&url";

export const tabularWorkerFactoryLayer = Layer.succeed(TabularWorkerFactory, {
  load: async () => {
    const response = await fetch(workerUrl, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error("Engine asset unavailable");
    }
  },
  offline: () => typeof navigator !== "undefined" && !navigator.onLine,
  create: () => {
    const worker = new Worker(workerUrl, {
      type: "module",
      name: "tabular-engine",
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
