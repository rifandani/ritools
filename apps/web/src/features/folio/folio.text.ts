/* oxlint-disable eslint/func-style, eslint/no-use-before-define -- Cleanup and the two listeners form one pair; function declarations hoist so each can name the other. */
import type {
  FolioTextEdit,
  FolioTextObject,
  FolioTextRefusal,
  FolioTextReply,
  FolioTextRequest,
} from "./folio.text.types";

export type {
  FolioTextEdit,
  FolioTextObject,
  FolioTextRefusal,
} from "./folio.text.types";

let worker: Worker | null = null;

const textWorker = () => {
  worker ??= new Worker(
    // oxlint-disable-next-line unicorn/relative-url-style -- Vite bundles the Worker only from this exact form
    new URL("./folio.text.worker.ts", import.meta.url),
    { name: "folio-text", type: "module" }
  );
  return worker;
};

const stopWorker = () => {
  worker?.terminate();
  worker = null;
};

const copyBytes = (bytes: Uint8Array) => {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
};

const send = <T>(
  request: FolioTextRequest,
  select: (reply: FolioTextReply) => T | null
): Promise<T> => {
  let instance: Worker;
  try {
    instance = textWorker();
  } catch (error) {
    return Promise.reject(
      error instanceof Error ? error : new Error("the text worker failed")
    );
  }

  const { promise, reject, resolve } = Promise.withResolvers<T>();

  function cleanup() {
    instance.removeEventListener("message", onMessage);
    instance.removeEventListener("error", onError);
  }

  function onError(event: ErrorEvent) {
    cleanup();
    stopWorker();
    reject(new Error(event.message || "the text worker failed"));
  }

  function onMessage(event: MessageEvent<FolioTextReply>) {
    if (event.data.id !== request.id) {
      return;
    }
    cleanup();
    if (event.data.type === "failed") {
      reject(new Error(event.data.message));
      return;
    }
    const value = select(event.data);
    if (value === null) {
      reject(new Error("the text worker sent an unexpected reply"));
      return;
    }
    resolve(value);
  }

  instance.addEventListener("message", onMessage);
  instance.addEventListener("error", onError);
  instance.postMessage(request, [request.bytes]);

  return promise;
};

/**
 * List the text objects one page draws. The UI hit-tests a click against the
 * returned boxes, so it never maps coordinates to a PDFium index itself.
 */
export const listTextObjects = (
  bytes: Uint8Array,
  pageIndex: number
): Promise<{
  readonly objects: readonly FolioTextObject[];
  readonly tagged: boolean;
}> => {
  const request: FolioTextRequest = {
    bytes: copyBytes(bytes),
    id: crypto.randomUUID(),
    pageIndex,
    type: "list",
  };
  return send(request, (reply) =>
    reply.type === "objects"
      ? { objects: reply.objects, tagged: reply.tagged }
      : null
  );
};

/**
 * Measure a candidate string against the free space on its line, without
 * writing the file. The editor uses it to block an edit that would overflow.
 */
export const measureTextFit = (
  bytes: Uint8Array,
  edit: FolioTextEdit
): Promise<{
  readonly fits: boolean;
  readonly free: number;
  readonly needed: number;
}> => {
  const request: FolioTextRequest = {
    bytes: copyBytes(bytes),
    edit,
    id: crypto.randomUUID(),
    type: "measure",
  };
  return send(request, (reply) =>
    reply.type === "measured"
      ? { fits: reply.fits, free: reply.free, needed: reply.needed }
      : null
  );
};

/**
 * Rewrite one PDF Text Object in its own font, size, and baseline. The worker
 * returns bytes only after the saved file passes every check.
 */
export const rewriteTextObject = (
  bytes: Uint8Array,
  edit: FolioTextEdit
): Promise<
  | { readonly bytes: Uint8Array; readonly ok: true; readonly tagged: boolean }
  | { readonly ok: false; readonly reason: FolioTextRefusal }
> => {
  const request: FolioTextRequest = {
    bytes: copyBytes(bytes),
    edit,
    id: crypto.randomUUID(),
    type: "rewrite",
  };
  return send(request, (reply) => {
    switch (reply.type) {
      case "rewritten": {
        return {
          bytes: new Uint8Array(reply.bytes),
          ok: true,
          tagged: reply.tagged,
        } as const;
      }
      case "refused": {
        return { ok: false, reason: reply.reason } as const;
      }
      default: {
        return null;
      }
    }
  });
};
