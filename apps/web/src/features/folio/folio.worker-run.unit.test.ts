import { describe, expect, it } from "vitest";

import { startFolioRun } from "./folio.worker-run";
import type { FolioWorkerPort } from "./folio.worker-run";

interface Request {
  readonly bytes: ArrayBuffer;
  readonly id: string;
}

/** A Worker that records what the client posts, without starting a thread. */
const recordingWorker = () => {
  const messages: Request[] = [];
  const transfers: Transferable[][] = [];
  const worker: FolioWorkerPort<Request> = {
    postMessage: (message, transfer) => {
      messages.push(message);
      transfers.push(transfer);
    },
  };
  return { messages, transfers, worker };
};

describe("startFolioRun", () => {
  it("copies the bytes and posts one transferable request", () => {
    const { messages, transfers, worker } = recordingWorker();
    const bytes = new Uint8Array([1, 2, 3]);
    const { run } = startFolioRun<string, { readonly done: number }, Request>({
      bytes,
      onProgress: () => null,
      request: (id, source) => ({ bytes: source, id }),
      worker,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.id).toBe(run.id);
    expect(new Uint8Array(messages[0]?.bytes ?? new ArrayBuffer(0))).toEqual(
      bytes
    );
    expect(transfers[0]).toEqual([messages[0]?.bytes]);
    // The caller's bytes stay untouched, because the Worker owns the copy.
    expect(bytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("resolves the run with the result", async () => {
    const { worker } = recordingWorker();
    const { promise, run } = startFolioRun<string, number, Request>({
      bytes: new Uint8Array(),
      request: (id, source) => ({ bytes: source, id }),
      worker,
    });
    run.resolve("done");
    await expect(promise).resolves.toBe("done");
  });

  it("rejects the run with the error", async () => {
    const { worker } = recordingWorker();
    const { promise, run } = startFolioRun<string, number, Request>({
      bytes: new Uint8Array(),
      request: (id, source) => ({ bytes: source, id }),
      worker,
    });
    run.reject(new Error("the engine stopped"));
    await expect(promise).rejects.toThrow("the engine stopped");
  });

  it("accepts progress when the caller passes no handler", () => {
    const { worker } = recordingWorker();
    const { run } = startFolioRun<string, number, Request>({
      bytes: new Uint8Array(),
      request: (id, source) => ({ bytes: source, id }),
      worker,
    });
    expect(() => run.progress(1)).not.toThrow();
  });
});
