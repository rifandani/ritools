/// <reference lib="webworker" />
import { createPdfRuntime } from "@embedpdf/engine-runtime";
import type { PdfRuntimeModule } from "@embedpdf/engine-runtime";
import wasmUrl from "@embedpdf/engine-runtime-wasm32/wasm-url";

import { repairPdf } from "@/features/folio/folio.repair.engine";
import type {
  FolioRepairReply,
  FolioRepairRequest,
} from "@/features/folio/folio.repair.types";
import { isFolioRepairRequest } from "@/features/folio/folio.repair.types";

declare let self: DedicatedWorkerGlobalScope;

let runtime: PdfRuntimeModule | null = null;
let loading: Promise<PdfRuntimeModule> | null = null;

const loadRuntime = async (): Promise<PdfRuntimeModule> => {
  if (runtime) {
    return runtime;
  }
  loading ??= (async () => {
    const module = await createPdfRuntime({ prefer: "wasm", wasmUrl });
    // PDFium requires exactly one library init before any other call.
    module.fn.FPDF_InitLibrary();
    return module;
  })();
  try {
    runtime = await loading;
    return runtime;
  } catch (error) {
    loading = null;
    throw error;
  }
};

const post = (
  message: FolioRepairReply,
  transfer: readonly Transferable[] = []
): void => {
  self.postMessage(message, { transfer: [...transfer] });
};

const handle = async (request: FolioRepairRequest): Promise<void> => {
  const module = await loadRuntime();
  const { id } = request;
  const outcome = repairPdf(module, new Uint8Array(request.bytes), {
    onProgress: (progress) => {
      post({ ...progress, id, type: "progress" });
    },
  });
  if (outcome.type !== "repaired") {
    post({ ...outcome, id });
    return;
  }
  // SAFETY: `saveDocument` returns a view over a fresh ArrayBuffer of its own.
  const bytes = outcome.bytes.buffer as ArrayBuffer;
  post({ ...outcome, bytes, id }, [bytes]);
};

/**
 * A request is handled one at a time. A DedicatedWorker receives messages only
 * from the document that created it, and Chrome reports `event.origin` as an
 * empty string for those messages, so an origin check here would drop every
 * request. The payload is the boundary.
 */
let queue: Promise<void> = Promise.resolve();

const runQueued = async (request: FolioRepairRequest): Promise<void> => {
  try {
    await queue;
    await handle(request);
  } catch (error) {
    post({
      id: request.id,
      message:
        error instanceof Error ? error.message : "the repair engine failed",
      type: "error",
    });
  }
};

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  const request = event.data;
  if (!isFolioRepairRequest(request)) {
    return;
  }
  queue = runQueued(request);
});
