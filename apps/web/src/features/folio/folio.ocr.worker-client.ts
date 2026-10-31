/* oxlint-disable promise/avoid-new, unicorn/require-post-message-target-origin -- A reply to a request needs its own resolver, and a dedicated Worker has no target origin. */
import type { FolioOcrLanguage, FolioOcrPage } from "./folio.ocr";
import type {
  FolioOcrFailure,
  FolioOcrReply,
  FolioOcrRequest,
} from "./folio.ocr.types";

export class FolioOcrError extends Error {
  readonly reason: FolioOcrFailure;

  constructor(reason: FolioOcrFailure, message: string) {
    super(message);
    this.name = "FolioOcrError";
    this.reason = reason;
  }
}

export interface FolioOcrJob {
  readonly pageCount: number;
  /** OCR one rendered page, in order. */
  readonly page: (
    pageIndex: number,
    image: ArrayBuffer,
    width: number,
    height: number
  ) => Promise<FolioOcrPage>;
  /** Write the copy from the pages that finished, and release the engine. */
  readonly finish: () => Promise<{ bytes: Uint8Array; skipped: number }>;
  /** Stop the engine and keep the finished pages, so `finish` can still run. */
  readonly cancel: () => void;
  /** Terminate the worker and drop every result. */
  readonly discard: () => void;
}

interface Pending {
  readonly height: number;
  readonly reject: (error: FolioOcrError) => void;
  readonly resolve: (page: FolioOcrPage) => void;
  readonly width: number;
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly reject: (error: FolioOcrError) => void;
  resolve: (value: T) => void;
}

interface Run {
  readonly id: string;
  readonly pages: Map<number, Pending>;
  readonly ready: Deferred<FolioOcrJob>;
  readonly done: Deferred<{ bytes: Uint8Array; skipped: number }>;
}

let worker: Worker | null = null;
let run: Run | null = null;

const fail = (error: FolioOcrError) => {
  if (!run) {
    return;
  }
  const current = run;
  run = null;
  current.ready.reject(error);
  current.done.reject(error);
  for (const pending of current.pages.values()) {
    pending.reject(error);
  }
  current.pages.clear();
  worker?.terminate();
  worker = null;
};

// oxlint-disable-next-line eslint/func-style -- A hoisted declaration lets the message handler name it before its definition.
function jobOf(current: Run, pageCount: number): FolioOcrJob {
  return {
    cancel: () => {
      if (run !== current) {
        return;
      }
      const request: FolioOcrRequest = { id: current.id, type: "cancel" };
      worker?.postMessage(request);
      for (const pending of current.pages.values()) {
        pending.reject(new FolioOcrError("engine", "The OCR run was stopped."));
      }
      current.pages.clear();
    },
    discard: () => {
      if (run !== current) {
        return;
      }
      run = null;
      worker?.terminate();
      worker = null;
    },
    finish: () => {
      if (run !== current) {
        return Promise.reject(
          new FolioOcrError("engine", "The OCR run is closed.")
        );
      }
      const request: FolioOcrRequest = { id: current.id, type: "finish" };
      worker?.postMessage(request);
      return current.done.promise;
    },
    page: (pageIndex, image, width, height) =>
      new Promise((resolve, reject) => {
        if (run !== current) {
          reject(new FolioOcrError("engine", "The OCR run is closed."));
          return;
        }
        current.pages.set(pageIndex, { height, reject, resolve, width });
        const request: FolioOcrRequest = {
          height,
          id: current.id,
          image,
          pageIndex,
          type: "page",
          width,
        };
        worker?.postMessage(request, [image]);
      }),
    pageCount,
  };
}

const onMessage = (event: MessageEvent<FolioOcrReply>) => {
  const message = event.data;
  if (!run || message.id !== run.id) {
    return;
  }
  switch (message.type) {
    case "ready": {
      run.ready.resolve(jobOf(run, message.pageCount));
      return;
    }
    case "page": {
      const pending = run.pages.get(message.pageIndex);
      if (!pending) {
        return;
      }
      run.pages.delete(message.pageIndex);
      pending.resolve({
        confidence: message.confidence,
        height: pending.height,
        pageIndex: message.pageIndex,
        skipped: message.skipped,
        width: pending.width,
        words: message.words,
      });
      return;
    }
    case "page-failed": {
      const pending = run.pages.get(message.pageIndex);
      if (!pending) {
        return;
      }
      run.pages.delete(message.pageIndex);
      pending.reject(new FolioOcrError("engine", message.message));
      return;
    }
    case "done": {
      run.done.resolve({
        bytes: new Uint8Array(message.bytes),
        skipped: message.skipped,
      });
      run = null;
      return;
    }
    case "failed": {
      const current = run;
      run = null;
      const error = new FolioOcrError(message.reason, message.message);
      current.ready.reject(error);
      current.done.reject(error);
      for (const pending of current.pages.values()) {
        pending.reject(error);
      }
      current.pages.clear();
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
    new URL("./folio.ocr.worker.ts", import.meta.url),
    { name: "folio-ocr", type: "module" }
  );
  instance.addEventListener("message", onMessage);
  instance.addEventListener("error", (event) => {
    fail(
      new FolioOcrError("engine", event.message || "The OCR worker failed.")
    );
  });
  worker = instance;
  return instance;
};

/** Start one OCR run. Only one run can be active in a tab. */
export const startOcrJob = ({
  bytes,
  languages,
}: {
  readonly bytes: Uint8Array;
  readonly languages: readonly FolioOcrLanguage[];
}): Promise<FolioOcrJob> => {
  if (run) {
    return Promise.reject(
      new FolioOcrError("engine", "Another OCR run is active.")
    );
  }
  const instance = ensureWorker();
  const id = crypto.randomUUID();
  const source = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(source).set(bytes);
  const ready = Promise.withResolvers<FolioOcrJob>();
  const done = Promise.withResolvers<{ bytes: Uint8Array; skipped: number }>();
  const current: Run = {
    done,
    id,
    pages: new Map(),
    ready,
  };
  run = current;
  const request: FolioOcrRequest = {
    bytes: source,
    id,
    languages,
    type: "start",
  };
  instance.postMessage(request, [source]);
  return ready.promise;
};
