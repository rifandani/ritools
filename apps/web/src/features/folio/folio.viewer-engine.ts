import { localEngine } from "@embedpdf/engine";
import wasmUrl from "@embedpdf/engine-runtime-wasm32/wasm-url";
import workerUrl from "@embedpdf/engine/workers/embedpdf-worker.js?url";
import { Schema } from "effect";

import { loadLibrary } from "@/core/libs/library-load";

const Ready = Schema.Struct({ kind: Schema.Literal("ready") });
const InitError = Schema.Struct({
  kind: Schema.Literal("init-error"),
  error: Schema.String,
});

/** Wait for PDFium's startup handshake before the viewer receives any user file. */
export const createFolioViewerEngine = (signal: AbortSignal, attempt: number) =>
  loadLibrary(
    "PDFium",
    async () => {
      const worker = new Worker(workerUrl, {
        name: `folio-viewer-${attempt}`,
        type: "module",
      });
      const ready = Promise.withResolvers<null>();
      const onMessage = (event: MessageEvent<unknown>) => {
        if (Schema.is(Ready)(event.data)) {
          ready.resolve(null);
        } else if (Schema.is(InitError)(event.data)) {
          ready.reject(new Error(event.data.error));
        }
      };
      const onError = (event: ErrorEvent) =>
        ready.reject(new Error(event.message || "PDFium Worker failed"));
      const onAbort = () =>
        ready.reject(new DOMException("Cancelled", "AbortError"));
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      signal.addEventListener("abort", onAbort, { once: true });
      const engine = localEngine({ worker, wasmUrl });
      engine.warmup();
      try {
        if (signal.aborted) {
          onAbort();
        }
        await ready.promise;
        return engine;
      } catch (error) {
        await engine.destroy();
        throw error;
      } finally {
        signal.removeEventListener("abort", onAbort);
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
      }
    },
    signal
  );
