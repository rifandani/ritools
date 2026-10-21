import { Layer } from "effect";

import type { CodecReply, CodecWorkerPort } from "@/features/squeeze/squeeze";
import { CodecWorkerFactory } from "@/features/squeeze/squeeze.codec";

/**
 * The codec Worker for the browser.
 *
 * Vite finds the Worker from this exact `new Worker(new URL(...))` shape and
 * bundles it, together with the WASM each codec loads. Nothing here builds a
 * Worker at import time, so a server render that loads this module is safe.
 */
export const codecWorkerFactoryLayer = Layer.succeed(CodecWorkerFactory, {
  create: (): CodecWorkerPort => {
    const worker = new Worker(
      // oxlint-disable-next-line unicorn/relative-url-style -- Vite bundles the Worker only from this exact form
      new URL("./squeeze.worker.ts", import.meta.url),
      { name: "squeeze-codec", type: "module" }
    );
    return {
      send: (request, transfer) => {
        worker.postMessage(request, [...transfer]);
      },
      subscribe: ({ error, message }) => {
        worker.addEventListener("error", (event) => {
          error(event.message || "the codec Worker failed");
        });
        worker.addEventListener(
          "message",
          (event: MessageEvent<CodecReply>) => {
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
