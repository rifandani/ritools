import { beforeEach, describe, expect, it, vi } from "vitest";

const { createPdfRuntime, initLibrary } = vi.hoisted(() => ({
  createPdfRuntime: vi.fn(),
  initLibrary: vi.fn(),
}));

vi.mock("@embedpdf/engine-runtime", () => ({ createPdfRuntime }));

describe("loadFolioRuntime", () => {
  beforeEach(() => {
    vi.resetModules();
    createPdfRuntime.mockReset();
    initLibrary.mockReset();
  });

  it("loads and initializes one runtime, then reuses it", async () => {
    const module = { fn: { FPDF_InitLibrary: initLibrary } };
    createPdfRuntime.mockResolvedValue(module);
    const { loadFolioRuntime } = await import("./folio.worker-runtime");

    await expect(loadFolioRuntime()).resolves.toBe(module);
    await expect(loadFolioRuntime()).resolves.toBe(module);
    expect(createPdfRuntime).toHaveBeenCalledTimes(1);
    expect(createPdfRuntime).toHaveBeenCalledWith({
      prefer: "wasm",
      wasmUrl: expect.any(String),
    });
    expect(initLibrary).toHaveBeenCalledTimes(1);
  });

  it("retries after a failed load", async () => {
    const module = { fn: { FPDF_InitLibrary: initLibrary } };
    createPdfRuntime
      .mockRejectedValueOnce(new Error("the engine is offline"))
      .mockResolvedValue(module);
    const { loadFolioRuntime } = await import("./folio.worker-runtime");

    await expect(loadFolioRuntime()).rejects.toThrow("the engine is offline");
    await expect(loadFolioRuntime()).resolves.toBe(module);
    expect(createPdfRuntime).toHaveBeenCalledTimes(2);
  });
});
