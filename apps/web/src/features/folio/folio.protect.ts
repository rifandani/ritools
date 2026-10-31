/* oxlint-disable eslint/func-style, eslint/no-use-before-define -- Cleanup and the two listeners form one pair; function declarations hoist so each can name the other. */
import type {
  FolioProtectReply,
  FolioProtectRequest,
} from "./folio.protect.types";

let worker: Worker | null = null;

const protectWorker = () => {
  worker ??= new Worker(
    // oxlint-disable-next-line unicorn/relative-url-style -- Vite bundles the Worker only from this exact form
    new URL("./folio.protect.worker.ts", import.meta.url),
    { name: "folio-protect", type: "module" }
  );
  return worker;
};

const stopWorker = () => {
  worker?.terminate();
  worker = null;
};

/** Protect a PDF with a user password, an owner password, and its permission bits. */
export const protectPdf = (
  bytes: Uint8Array,
  options: {
    readonly flags: number;
    readonly ownerPassword: string;
    readonly userPassword: string;
  }
): Promise<Uint8Array> => {
  let instance: Worker;
  try {
    instance = protectWorker();
  } catch (error) {
    return Promise.reject(
      error instanceof Error ? error : new Error("the protection worker failed")
    );
  }

  const id = crypto.randomUUID();
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const request: FolioProtectRequest = {
    bytes: buffer,
    flags: options.flags,
    id,
    ownerPassword: options.ownerPassword,
    userPassword: options.userPassword,
  };

  const { promise, reject, resolve } = Promise.withResolvers<Uint8Array>();

  function cleanup() {
    instance.removeEventListener("message", onMessage);
    instance.removeEventListener("error", onError);
  }

  function onError(event: ErrorEvent) {
    cleanup();
    stopWorker();
    reject(new Error(event.message || "the protection worker failed"));
  }

  function onMessage(event: MessageEvent<FolioProtectReply>) {
    if (event.data.id !== id) {
      return;
    }
    cleanup();
    if (event.data.ok) {
      resolve(new Uint8Array(event.data.bytes));
      return;
    }
    reject(new Error(event.data.message));
  }

  instance.addEventListener("message", onMessage);
  instance.addEventListener("error", onError);
  instance.postMessage(request, [request.bytes]);

  return promise;
};
