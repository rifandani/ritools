import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  FolioRepairReply,
  FolioRepairRequest,
} from "./folio.repair.types";
import { repairFolioPdf, stopFolioRepair } from "./folio.repair.worker-client";

interface WorkerErrorEvent {
  readonly message?: string;
}

type WorkerEvent = MessageEvent<FolioRepairReply> | WorkerErrorEvent;

type Listener = (event: WorkerEvent) => void;

/** A Worker that records its messages and lets a test answer for it. */
class FakeWorker {
  static instances: FakeWorker[] = [];

  readonly listeners = new Map<string, Listener[]>();
  readonly messages: FolioRepairRequest[] = [];
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  postMessage(message: FolioRepairRequest): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(type: string, event: WorkerEvent): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

const bytes = Uint8Array.of(1, 2, 3);

const start = () => repairFolioPdf({ bytes });

const lastWorker = () => {
  const worker = FakeWorker.instances.at(-1);
  if (!worker) {
    throw new Error("the repair run started no Worker");
  }
  return worker;
};

describe("the repair worker client", () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal("Worker", FakeWorker);
  });

  afterEach(() => {
    stopFolioRepair();
    vi.unstubAllGlobals();
  });

  it("stops the run and releases the worker when the user cancels", async () => {
    const run = start();
    const worker = lastWorker();
    const stopped = expect(run).rejects.toMatchObject({ reason: "stopped" });

    stopFolioRepair();

    await stopped;
    expect(worker.terminated).toBe(true);
  });

  it("names a worker failure and starts a new worker for the next run", async () => {
    const run = start();
    const first = lastWorker();
    const failed = expect(run).rejects.toMatchObject({
      message: "the worker crashed",
      reason: "engine",
    });

    first.emit("error", { message: "the worker crashed" });

    await failed;
    expect(first.terminated).toBe(true);

    const next = start();
    expect(FakeWorker.instances).toHaveLength(2);

    stopFolioRepair();
    await expect(next).rejects.toMatchObject({ reason: "stopped" });
  });
});
