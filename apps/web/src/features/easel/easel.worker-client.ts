import { startLibraryWorker } from "@/core/libs/library-load";
import type { OutputFormat } from "@/features/easel/easel.plan";
import { qualityOf } from "@/features/easel/easel.protocol";
import type {
  EncodeReply,
  EncodeRequest,
} from "@/features/easel/easel.protocol";

/**
 * The page's side of the Easel Worker. The Worker starts on the first export
 * (ADR-0036), so a page load downloads no codec.
 */

let worker: Worker | null = null;
let sequence = 0;
const waiting = new Map<
  number,
  {
    readonly reject: (error: Error) => void;
    readonly resolve: (bytes: Uint8Array) => void;
  }
>();

const failAll = (message: string): void => {
  for (const entry of waiting.values()) {
    entry.reject(new Error(message));
  }
  waiting.clear();
  worker?.terminate();
  worker = null;
};

const workerOf = (): Worker => {
  if (worker !== null) {
    return worker;
  }
  const next = startLibraryWorker(
    "Easel encoder",
    () =>
      new Worker(
        // oxlint-disable-next-line unicorn/relative-url-style -- Vite bundles the Worker only from this exact form
        new URL("./easel.worker.ts", import.meta.url),
        { name: "easel-encoder", type: "module" }
      )
  );
  next.addEventListener("message", (event: MessageEvent<EncodeReply>) => {
    const reply = event.data;
    const entry = waiting.get(reply.id);
    if (entry === undefined) {
      return;
    }
    waiting.delete(reply.id);
    if (reply.ok) {
      entry.resolve(new Uint8Array(reply.bytes));
    } else {
      entry.reject(new Error(reply.message));
    }
  });
  next.addEventListener("error", (event) => {
    failAll(event.message || "the Easel Worker failed");
  });
  worker = next;
  return next;
};

/** Encodes one RGBA image. The buffer moves to the Worker. */
export const encodeInWorker = (options: {
  readonly format: OutputFormat;
  readonly height: number;
  readonly quality: number;
  readonly rgba: ArrayBuffer;
  readonly width: number;
}): Promise<Uint8Array> => {
  sequence += 1;
  const request: EncodeRequest = {
    format: options.format,
    height: options.height,
    id: sequence,
    quality: qualityOf(options.quality),
    rgba: options.rgba,
    type: "easel:encode",
    width: options.width,
  };
  const { promise, reject, resolve } = Promise.withResolvers<Uint8Array>();
  waiting.set(request.id, { reject, resolve });
  try {
    workerOf().postMessage(request, [request.rgba]);
  } catch (error) {
    waiting.delete(request.id);
    reject(error instanceof Error ? error : new Error(String(error)));
  }
  return promise;
};
