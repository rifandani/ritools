import { Layer } from "effect";

import { UnmaskWorkerFactory } from "@/features/unmask/unmask.engine";
import type { UnmaskWorkerPort } from "@/features/unmask/unmask.engine";

/**
 * The Unmask Worker for the browser.
 *
 * Vite finds the Worker from this exact `new Worker(new URL(...))` shape. The
 * Worker is created only when the first Cut out starts, so a server render that
 * imports the service touches no browser API and downloads no model.
 */
export const unmaskWorkerFactoryLayer = Layer.succeed(UnmaskWorkerFactory, {
  create: (): UnmaskWorkerPort => {
    const worker = new Worker(
      // oxlint-disable-next-line unicorn/relative-url-style -- Vite bundles the Worker only from this exact form
      new URL("./unmask.worker.ts", import.meta.url),
      { name: "unmask-engine", type: "module" }
    );
    // Terminate the Worker when the page unloads. A background tab keeps it.
    globalThis.addEventListener("pagehide", () => {
      worker.terminate();
    });
    return {
      send: (request, transfer) => {
        worker.postMessage(request, [...transfer]);
      },
      subscribe: ({ error, message }) => {
        worker.addEventListener("error", (event) => {
          error(event.message || "the Unmask Worker failed");
        });
        worker.addEventListener("message", (event: MessageEvent<unknown>) => {
          message(event.data);
        });
      },
      terminate: () => {
        worker.terminate();
      },
    };
  },
});
