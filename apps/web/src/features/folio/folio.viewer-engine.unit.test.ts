import { afterEach, describe, expect, it, vi } from "vitest";

import { createFolioViewerEngine } from "./folio.viewer-engine";

const { localEngine, destroy, warmup, workers } = vi.hoisted(() => ({
  localEngine: vi.fn(),
  destroy: vi.fn(),
  warmup: vi.fn(),
  workers: new Array<EventTarget>(),
}));
vi.mock("@embedpdf/engine", () => ({ localEngine }));

class TestWorker extends EventTarget {
  constructor() {
    super();
    workers.push(this);
  }
}
const setup = (event: Event | null) => {
  workers.length = 0;
  destroy.mockReset().mockImplementation(() => Promise.resolve());
  warmup.mockReset().mockImplementation(() => {
    if (event) {
      workers[0]?.dispatchEvent(event);
    }
  });
  localEngine.mockReset().mockReturnValue({ destroy, warmup });
  vi.stubGlobal("Worker", TestWorker);
};
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PDF viewer engine loading", () => {
  it("waits for the engine handshake before returning it", async () => {
    setup(null);
    const pending = createFolioViewerEngine(new AbortController().signal, 1);
    expect(warmup).toHaveBeenCalledOnce();
    workers[0]?.dispatchEvent(
      new MessageEvent("message", {
        data: { kind: "resolve", jobId: "unrelated" },
      })
    );
    workers[0]?.dispatchEvent(
      new MessageEvent("message", { data: { kind: "ready" } })
    );
    await expect(pending).resolves.toMatchObject({ warmup, destroy });
    expect(destroy).not.toHaveBeenCalled();
  });

  it("destroys a failed engine and can start a new one", async () => {
    setup(
      new MessageEvent("message", {
        data: { kind: "init-error", error: "WASM blocked" },
      })
    );
    await expect(
      createFolioViewerEngine(new AbortController().signal, 1)
    ).rejects.toMatchObject({ _tag: "LibraryLoadError", library: "PDFium" });
    expect(destroy).toHaveBeenCalledOnce();
    setup(new MessageEvent("message", { data: { kind: "ready" } }));
    await expect(
      createFolioViewerEngine(new AbortController().signal, 2)
    ).resolves.toMatchObject({ warmup });
  });

  it.each(["Worker blocked", ""])(
    "handles a Worker startup error: %s",
    async (message) => {
      setup(new ErrorEvent("error", { message }));
      await expect(
        createFolioViewerEngine(new AbortController().signal, 1)
      ).rejects.toMatchObject({ library: "PDFium" });
      expect(destroy).toHaveBeenCalledOnce();
    }
  );

  it("cancels an in-flight startup and releases the engine", async () => {
    setup(null);
    const abort = new AbortController();
    const pending = createFolioViewerEngine(abort.signal, 1);
    abort.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("handles a signal that was cancelled before startup", async () => {
    setup(null);
    const abort = new AbortController();
    abort.abort();
    await expect(
      createFolioViewerEngine(abort.signal, 1)
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(destroy).toHaveBeenCalledOnce();
  });
});
