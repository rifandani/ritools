/* oxlint-disable unicorn/require-post-message-target-origin -- A dedicated Worker has no target origin. */
import type { FolioLostStructure, FolioRepairPath } from "./folio.repair";
import type {
  FolioRepairAttempt,
  FolioRepairFailure,
  FolioRepairProgress,
  FolioRepairRefusal,
} from "./folio.repair.engine";
import type {
  FolioRepairReply,
  FolioRepairRequest,
} from "./folio.repair.types";
import { startFolioRun } from "./folio.worker-run";

/** Why a run stopped before the engine gave an outcome. */
export type FolioRepairStop = "busy" | "engine" | "stopped";

export class FolioRepairError extends Error {
  readonly reason: FolioRepairStop;

  constructor(reason: FolioRepairStop, message: string) {
    super(message);
    this.name = "FolioRepairError";
    this.reason = reason;
  }
}

export type FolioRepairResult =
  | {
      readonly attempts: readonly FolioRepairAttempt[];
      readonly bytes: Uint8Array;
      readonly damaged: boolean;
      readonly lost: readonly FolioLostStructure[];
      readonly pages: number;
      readonly path: FolioRepairPath;
      readonly type: "repaired";
    }
  | { readonly reason: FolioRepairRefusal; readonly type: "refused" }
  | {
      readonly attempts: readonly FolioRepairAttempt[];
      readonly reason: FolioRepairFailure;
      readonly type: "failed";
    };

interface Active {
  readonly id: string;
  readonly progress: (progress: FolioRepairProgress) => void;
  readonly reject: (error: FolioRepairError) => void;
  readonly resolve: (result: FolioRepairResult) => void;
}

let worker: Worker | null = null;
let active: Active | null = null;

const settle = (): Active | null => {
  const current = active;
  active = null;
  return current;
};

const fail = (error: FolioRepairError) => {
  settle()?.reject(error);
  worker?.terminate();
  worker = null;
};

const onMessage = (event: MessageEvent<FolioRepairReply>) => {
  const message = event.data;
  if (!active || message.id !== active.id) {
    return;
  }
  switch (message.type) {
    case "progress": {
      active.progress({
        done: message.done,
        path: message.path,
        total: message.total,
      });
      return;
    }
    case "repaired": {
      settle()?.resolve({
        attempts: message.attempts,
        bytes: new Uint8Array(message.bytes),
        damaged: message.damaged,
        lost: message.lost,
        pages: message.pages,
        path: message.path,
        type: "repaired",
      });
      return;
    }
    case "refused": {
      settle()?.resolve({ reason: message.reason, type: "refused" });
      return;
    }
    case "failed": {
      settle()?.resolve({
        attempts: message.attempts,
        reason: message.reason,
        type: "failed",
      });
      return;
    }
    case "error": {
      fail(new FolioRepairError("engine", message.message));
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
    new URL("./folio.repair.worker.ts", import.meta.url),
    { name: "folio-repair", type: "module" }
  );
  instance.addEventListener("message", onMessage);
  instance.addEventListener("error", (event) => {
    fail(
      new FolioRepairError(
        "engine",
        event.message || "The repair worker failed."
      )
    );
  });
  worker = instance;
  return instance;
};

/**
 * Start one repair run on a copy of the bytes. Only one run can be active in a
 * tab, and the caller's bytes never change.
 */
export const repairFolioPdf = ({
  bytes,
  onProgress,
}: {
  readonly bytes: Uint8Array;
  readonly onProgress?: (progress: FolioRepairProgress) => void;
}): Promise<FolioRepairResult> => {
  if (active) {
    return Promise.reject(
      new FolioRepairError("busy", "Another repair run is active.")
    );
  }
  const instance = ensureWorker();
  const run = startFolioRun<
    FolioRepairResult,
    FolioRepairProgress,
    FolioRepairRequest
  >({
    bytes,
    onProgress,
    request: (id, source) => ({ bytes: source, id, type: "repair" }),
    worker: instance,
  });
  active = run.run;
  return run.promise;
};

/** Stop the run and release the engine. The next run starts a new Worker. */
export const stopFolioRepair = (): void => {
  if (!active) {
    return;
  }
  fail(new FolioRepairError("stopped", "The repair run was stopped."));
};
