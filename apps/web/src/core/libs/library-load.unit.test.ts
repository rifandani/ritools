/* oxlint-disable eslint/require-await -- Async test loaders model rejected imports at the Promise boundary. */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isLibraryAssetFailure,
  LibraryLoadError,
  libraryWorkerReady,
  libraryWorkerLoadError,
  loadLibrary,
  reportLibraryLoadFailure,
  startLibraryWorker,
  subscribeLibraryFailures,
} from "./library-load";

const cleanups: (() => void)[] = [];
const capture = () => {
  vi.stubGlobal("window", {});
  const failures: { library: string; id: string }[] = [];
  cleanups.push(subscribeLibraryFailures((failure) => failures.push(failure)));
  return failures;
};
const workerOf = (target: EventTarget): Worker =>
  // SAFETY: these tests exercise only the Worker's EventTarget interface.
  target as Worker;
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup();
  }
  vi.unstubAllGlobals();
});

describe("library load failures", () => {
  it("reports the original library once through nested boundaries and permits a new attempt", async () => {
    const failures = capture();
    const blocked = new TypeError(
      "Failed to fetch dynamically imported module"
    );
    const importLibrary = vi
      .fn()
      .mockRejectedValueOnce(blocked)
      .mockResolvedValueOnce({ ready: true });
    const first = loadLibrary("PDF viewer", () =>
      loadLibrary("PDFium", importLibrary)
    );
    await expect(first).rejects.toMatchObject({
      _tag: "LibraryLoadError",
      library: "PDFium",
      cause: blocked,
      message: "PDFium library failed to load — check network or ad-blocker",
    });
    reportLibraryLoadFailure("Tool code", blocked);
    expect(failures.map((failure) => failure.library)).toEqual(["PDFium"]);
    await expect(loadLibrary("PDFium", importLibrary)).resolves.toEqual({
      ready: true,
    });
    expect(importLibrary).toHaveBeenCalledTimes(2);
  });

  it("keeps an early browser failure until the toaster subscribes", async () => {
    vi.stubGlobal("window", {});
    await expect(
      loadLibrary("CodeMirror", async () => {
        throw new Error("blocked");
      })
    ).rejects.toBeInstanceOf(LibraryLoadError);
    const failures = capture();
    expect(failures.map((failure) => failure.library)).toEqual(["CodeMirror"]);
  });

  it("does not report cancellation as a missing library", async () => {
    const failures = capture();
    const abort = new AbortController();
    abort.abort();
    await expect(
      loadLibrary(
        "ISNet",
        async () => {
          throw new Error("cancelled");
        },
        abort.signal
      )
    ).rejects.toThrow("cancelled");
    await expect(
      loadLibrary("ISNet", async () => {
        throw new DOMException("cancelled", "AbortError");
      })
    ).rejects.toThrow("cancelled");
    expect(failures).toEqual([]);
  });

  it("reports only public library identity across the Worker boundary", async () => {
    const send = vi.fn();
    vi.stubGlobal("self", { postMessage: send });
    await expect(
      loadLibrary("Tesseract", async () => {
        throw new Error("private input name");
      })
    ).rejects.toBeInstanceOf(LibraryLoadError);
    expect(send).toHaveBeenCalledWith({
      type: "ritools:library-load-error",
      library: "Tesseract",
      id: expect.any(String),
    });
    expect(JSON.stringify(send.mock.calls)).not.toContain("private input name");
  });

  it("does not classify file or processing errors as asset failures", () => {
    expect(
      isLibraryAssetFailure(
        new TypeError("Failed to fetch dynamically imported module")
      )
    ).toBe(true);
    expect(
      isLibraryAssetFailure(new TypeError("Importing a module script failed."))
    ).toBe(true);
    expect(
      isLibraryAssetFailure(new WebAssembly.CompileError("invalid module"))
    ).toBe(true);
    expect(
      isLibraryAssetFailure(new WebAssembly.RuntimeError("out of bounds"))
    ).toBe(false);
    expect(isLibraryAssetFailure(new Error("corrupt PDF"))).toBe(false);
    expect(isLibraryAssetFailure(null)).toBe(false);
  });
});

describe("library Worker startup", () => {
  it("announces that static Worker imports completed", () => {
    const send = vi.fn();
    vi.stubGlobal("self", { postMessage: send });
    libraryWorkerReady();
    expect(send).toHaveBeenCalledWith({ type: "ritools:library-ready" });
  });

  it("reports a blocked Worker once but preserves its normal error handler", () => {
    const failures = capture();
    const target = new EventTarget();
    const worker = startLibraryWorker("SheetJS", () => workerOf(target));
    const errors = vi.fn();
    worker.addEventListener("error", errors);
    target.dispatchEvent(new Event("error"));
    target.dispatchEvent(new Event("error"));
    expect(errors).toHaveBeenCalledTimes(2);
    expect(libraryWorkerLoadError(worker)?.library).toBe("SheetJS");
    expect(failures.map((failure) => failure.library)).toEqual(["SheetJS"]);
  });

  it("consumes startup and load diagnostics without treating them as job replies", () => {
    const failures = capture();
    const target = new EventTarget();
    const worker = startLibraryWorker("Unmask engine", () => workerOf(target));
    const replies = vi.fn();
    worker.addEventListener("message", replies);
    target.dispatchEvent(
      new MessageEvent("message", { data: { type: "ritools:library-ready" } })
    );
    target.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "ritools:library-load-error",
          library: "ONNX Runtime",
          id: "attempt",
        },
      })
    );
    target.dispatchEvent(
      new MessageEvent("message", { data: { kind: "encoded" } })
    );
    target.dispatchEvent(new Event("error"));
    expect(replies).toHaveBeenCalledTimes(1);
    expect(failures.map((failure) => failure.library)).toEqual([
      "ONNX Runtime",
    ]);
  });

  it("forwards a child Worker's library failure through its parent", () => {
    const send = vi.fn();
    vi.stubGlobal("self", { postMessage: send });
    const target = new EventTarget();
    startLibraryWorker("SheetJS", () => workerOf(target));
    const failure = {
      type: "ritools:library-load-error",
      library: "jsPDF",
      id: "child-attempt",
    };
    target.dispatchEvent(new MessageEvent("message", { data: failure }));
    expect(send).toHaveBeenCalledWith(failure);
  });

  it("reports a Worker constructor failure", () => {
    const failures = capture();
    expect(() =>
      startLibraryWorker("ExifTool", () => {
        throw new DOMException("blocked", "SecurityError");
      })
    ).toThrow(LibraryLoadError);
    expect(failures.map((failure) => failure.library)).toEqual(["ExifTool"]);
  });
});
