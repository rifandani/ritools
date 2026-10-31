/* oxlint-disable promise/avoid-new, unicorn/require-post-message-target-origin -- A reply to a request needs its own resolver, and a dedicated Worker has no target origin. */
import type {
  FolioFlattenActiveName,
  FolioFlattenRefusal,
} from "./folio.flatten";
import type {
  FolioFlattenCheck,
  FolioFlattenFailure,
  FolioFlattenReply,
  FolioFlattenRequest,
  FolioFlattenStats,
} from "./folio.flatten.types";

export class FolioFlattenError extends Error {
  readonly check: FolioFlattenCheck | null;
  readonly names: readonly FolioFlattenActiveName[];
  readonly reason: FolioFlattenFailure;

  constructor(
    reason: FolioFlattenFailure,
    message: string,
    check: FolioFlattenCheck | null = null,
    names: readonly FolioFlattenActiveName[] = []
  ) {
    super(message);
    this.name = "FolioFlattenError";
    this.check = check;
    this.names = names;
    this.reason = reason;
  }
}

export interface FolioFlattenProgress {
  readonly done: number;
  readonly total: number;
}

export type FolioFlattenResult =
  | {
      readonly bytes: Uint8Array;
      readonly outcome: "flattened";
      readonly stats: FolioFlattenStats;
    }
  | {
      readonly outcome: "refused";
      readonly reason: FolioFlattenRefusal;
    };

interface Active {
  readonly id: string;
  readonly progress: (progress: FolioFlattenProgress) => void;
  readonly reject: (error: FolioFlattenError) => void;
  readonly resolve: (result: FolioFlattenResult) => void;
}

let worker: Worker | null = null;
let active: Active | null = null;

const settle = (): Active | null => {
  const current = active;
  active = null;
  return current;
};

const fail = (error: FolioFlattenError) => {
  settle()?.reject(error);
  worker?.terminate();
  worker = null;
};

const onMessage = (event: MessageEvent<FolioFlattenReply>) => {
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
      settle()?.resolve({
        bytes: new Uint8Array(message.bytes),
        outcome: "flattened",
        stats: message.stats,
      });
      return;
    }
    case "refused": {
      settle()?.resolve({ outcome: "refused", reason: message.reason });
      return;
    }
    case "failed": {
      fail(
        new FolioFlattenError(
          message.reason,
          message.message || "The PDF was not flattened.",
          message.check,
          message.names
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
    new URL("./folio.flatten.worker.ts", import.meta.url),
    { name: "folio-flatten", type: "module" }
  );
  instance.addEventListener("message", onMessage);
  instance.addEventListener("error", (event) => {
    fail(
      new FolioFlattenError(
        "engine",
        event.message || "The flatten worker failed."
      )
    );
  });
  worker = instance;
  return instance;
};

/**
 * Flatten a plain copy of the pages in scope. The Worker gets its own copy of
 * the bytes; the open document is never touched. Only one run can be active
 * in a tab.
 */
const flattenFolioPdf = ({
  bytes,
  onProgress,
  pages,
}: {
  readonly bytes: Uint8Array;
  readonly onProgress?: (progress: FolioFlattenProgress) => void;
  readonly pages: number;
}): Promise<FolioFlattenResult> => {
  if (active) {
    return Promise.reject(
      new FolioFlattenError("busy", "Another flatten run is active.")
    );
  }
  const instance = ensureWorker();
  const id = crypto.randomUUID();
  const source = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(source).set(bytes);
  const deferred = Promise.withResolvers<FolioFlattenResult>();
  active = {
    id,
    progress: onProgress ?? (() => null),
    reject: deferred.reject,
    resolve: deferred.resolve,
  };
  const request: FolioFlattenRequest = {
    bytes: source,
    id,
    pages,
    type: "flatten",
  };
  instance.postMessage(request, [source]);
  return deferred.promise;
};

/** Stop the run and release the engine. The next run starts a new Worker. */
export const stopFolioFlatten = (): void => {
  if (!active) {
    return;
  }
  fail(new FolioFlattenError("stopped", "The flatten run was stopped."));
};

/** How one Flattened copy run ended. Only `flattened` carries bytes. */
export type FolioFlattenOutcome =
  | FolioFlattenResult
  | { readonly error: FolioFlattenError; readonly outcome: "failed" }
  | { readonly outcome: "stopped" };

/**
 * One run: copy the pages in scope with the viewer (a read that does not
 * change the open file), then flatten and verify the copy in the Worker. A
 * stop at any step gives `stopped`, and every other failure gives a named
 * error.
 */
export const makeFolioFlattenedCopy = async ({
  copyPages,
  onProgress,
  pages,
  signal,
}: {
  readonly copyPages: () => Promise<Uint8Array>;
  readonly onProgress?: (progress: FolioFlattenProgress) => void;
  readonly pages: number;
  readonly signal: AbortSignal;
}): Promise<FolioFlattenOutcome> => {
  let bytes: Uint8Array;
  try {
    bytes = await copyPages();
  } catch {
    return signal.aborted
      ? { outcome: "stopped" }
      : {
          error: new FolioFlattenError(
            "copy",
            "The pages could not be copied."
          ),
          outcome: "failed",
        };
  }
  if (signal.aborted) {
    return { outcome: "stopped" };
  }
  try {
    return await flattenFolioPdf({ bytes, onProgress, pages });
  } catch (error) {
    if (
      signal.aborted ||
      (error instanceof FolioFlattenError && error.reason === "stopped")
    ) {
      return { outcome: "stopped" };
    }
    return {
      error:
        error instanceof FolioFlattenError
          ? error
          : new FolioFlattenError("engine", "The PDF was not flattened."),
      outcome: "failed",
    };
  }
};
