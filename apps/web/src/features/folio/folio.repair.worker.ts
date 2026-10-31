/// <reference lib="webworker" />
import {
  FOLIO_REPAIR_PATHS,
  repairPdf,
} from "@/features/folio/folio.repair.engine";
import type {
  FolioRepairReply,
  FolioRepairRequest,
} from "@/features/folio/folio.repair.types";
import { isFolioRepairRequest } from "@/features/folio/folio.repair.types";
import { loadFolioRuntime } from "@/features/folio/folio.worker-runtime";

declare let self: DedicatedWorkerGlobalScope;

const post = (
  message: FolioRepairReply,
  transfer: readonly Transferable[] = []
): void => {
  self.postMessage(message, { transfer: [...transfer] });
};

const handle = async (request: FolioRepairRequest): Promise<void> => {
  const module = await loadFolioRuntime();
  const { id } = request;
  const outcome = repairPdf(module, new Uint8Array(request.bytes), {
    onProgress: (progress) => {
      post({ ...progress, id, type: "progress" });
    },
    paths: FOLIO_REPAIR_PATHS,
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
