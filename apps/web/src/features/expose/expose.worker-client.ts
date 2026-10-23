import { Layer } from "effect";

import { ExposeWorkerFactory } from "@/features/expose/expose.service";
import type { ExposeWorkerPort } from "@/features/expose/expose.service";
import type {
  WorkerReply,
  WorkerRequest,
} from "@/features/expose/expose.worker";

/**
 * The Expose Worker for the browser.
 *
 * Vite finds the Worker from this exact `new Worker(new URL(...))` shape. The
 * Worker is created only when a read or clean starts, so a server render that
 * imports the service touches no browser API.
 */
export const exposeWorkerFactoryLayer = Layer.succeed(ExposeWorkerFactory, {
  create: (): ExposeWorkerPort => {
    const worker = new Worker(
      // oxlint-disable-next-line unicorn/relative-url-style -- Vite bundles the Worker only from this exact form
      new URL("./expose.worker.ts", import.meta.url),
      { name: "expose-engine", type: "module" }
    );
    return {
      send: (request: WorkerRequest, transfer: readonly Transferable[]) => {
        worker.postMessage(request, [...transfer]);
      },
      subscribe: ({ error, message }) => {
        worker.addEventListener("error", (event) => {
          error(event.message || "the Expose Worker failed");
        });
        worker.addEventListener(
          "message",
          (event: MessageEvent<WorkerReply>) => {
            message(event.data);
          }
        );
      },
      terminate: () => {
        worker.terminate();
      },
    };
  },
});
