/* oxlint-disable promise/avoid-new, unicorn/require-post-message-target-origin -- A reply to a request needs its own resolver, and a dedicated Worker has no target origin. */
import type { FolioCompressPreset } from "./folio.compress";
import type {
  FolioCompressFailure,
  FolioCompressReply,
  FolioCompressRequest,
  FolioCompressSkipReason,
  FolioCompressStats,
} from "./folio.compress.types";
import { startFolioRun } from "./folio.worker-run";

export class FolioCompressError extends Error {
  readonly reason: FolioCompressFailure;

  constructor(reason: FolioCompressFailure, message: string) {
    super(message);
    this.name = "FolioCompressError";
    this.reason = reason;
  }
}

export interface FolioCompressProgress {
  readonly done: number;
  readonly total: number;
}

export interface FolioCompressResult {
  readonly bytes: Uint8Array | null;
  readonly outcome: "compressed" | "unchanged" | "skipped";
  readonly reason: FolioCompressSkipReason | null;
  readonly stats: FolioCompressStats;
}

interface Deferred {
  readonly reject: (error: FolioCompressError) => void;
  resolve: (result: FolioCompressResult) => void;
}

interface Active extends Deferred {
  readonly id: string;
  readonly progress: (progress: FolioCompressProgress) => void;
}

let worker: Worker | null = null;
let active: Active | null = null;

const settle = (error?: FolioCompressError): Active | null => {
  const current = active;
  active = null;
  if (current && error) {
    current.reject(error);
  }
  return current;
};

const fail = (error: FolioCompressError) => {
  const current = settle(error);
  worker?.terminate();
  worker = null;
  return current;
};

const onMessage = (event: MessageEvent<FolioCompressReply>) => {
  const message = event.data;
  if (!active || message.id !== active.id) {
    return;
  }
  switch (message.type) {
    case "progress": {
      active.progress({ done: message.done, total: message.total });
      return;
    }
    case "done": {
      const current = settle();
      current?.resolve({
        bytes: new Uint8Array(message.bytes),
        outcome: "compressed",
        reason: null,
        stats: message.stats,
      });
      return;
    }
    case "unchanged": {
      const current = settle();
      current?.resolve({
        bytes: null,
        outcome: "unchanged",
        reason: null,
        stats: message.stats,
      });
      return;
    }
    case "skipped": {
      const current = settle();
      current?.resolve({
        bytes: null,
        outcome: "skipped",
        reason: message.reason,
        stats: message.stats,
      });
      return;
    }
    case "failed": {
      fail(
        new FolioCompressError(
          message.reason,
          message.message || "The PDF could not be compressed."
        )
      );
      break;
    }
    default: {
      break;
    }
  }
};

const ensureWorker = () => {
  if (worker) {
    return worker;
  }
  const instance = new Worker(
    // oxlint-disable-next-line unicorn/relative-url-style -- Vite bundles the Worker only from this exact form
    new URL("./folio.compress.worker.ts", import.meta.url),
    { name: "folio-compress", type: "module" }
  );
  instance.addEventListener("message", onMessage);
  instance.addEventListener("error", (event) => {
    fail(
      new FolioCompressError(
        "engine",
        event.message || "The compression worker failed."
      )
    );
  });
  worker = instance;
  return instance;
};

/** Start one compression run. Only one run can be active in a tab. */
export const compressFolioPdf = ({
  bytes,
  onProgress,
  preset,
}: {
  readonly bytes: Uint8Array;
  readonly onProgress?: (progress: FolioCompressProgress) => void;
  readonly preset: FolioCompressPreset;
}): Promise<FolioCompressResult> => {
  if (active) {
    return Promise.reject(
      new FolioCompressError("busy", "Another compression run is active.")
    );
  }
  const instance = ensureWorker();
  const run = startFolioRun<
    FolioCompressResult,
    FolioCompressProgress,
    FolioCompressRequest
  >({
    bytes,
    onProgress,
    request: (id, source) => ({ bytes: source, id, preset, type: "compress" }),
    worker: instance,
  });
  active = run.run;
  return run.promise;
};

/** Stop the run and release the engine. The next run starts a new Worker. */
export const stopFolioCompress = (): void => {
  if (!active) {
    return;
  }
  fail(new FolioCompressError("stopped", "The compression run was stopped."));
};
