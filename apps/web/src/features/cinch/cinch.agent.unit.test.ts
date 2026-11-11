import { describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "@/features/cinch/cinch";
import type { BatchItem, ItemResult } from "@/features/cinch/cinch";
import { CINCH_AGENT_ACTIONS } from "@/features/cinch/cinch.agent";
import type { CinchAgentController } from "@/features/cinch/cinch.agent";

const [
  getStateAction,
  setSettingsAction,
  runAction,
  stopAction,
  clearAction,
  downloadAction,
] = CINCH_AGENT_ACTIONS;

const item = (id: string): BatchItem => ({
  folderPath: null,
  id,
  lastModified: 0,
  name: `${id}.mp4`,
  size: 1000,
  source: new File([], `${id}.mp4`),
});

const doneResult = (id: string): ItemResult => ({
  id,
  info: null,
  outcome: {
    kind: "done",
    file: {
      blob: new Blob([]),
      bytes: 400,
      fitScale: null,
      format: "mp4",
      height: 720,
      retried: false,
      width: 1280,
    },
  },
  settingsKey: "key",
});

const contextOf = (controller: Partial<CinchAgentController>) => ({
  controller: (): CinchAgentController => ({
    batch: new Map(),
    confirmClear: () => Promise.resolve(true),
    downloadAll: () => Promise.resolve({ count: 1, failed: false }),
    downloadOne: vi.fn(),
    pendingIds: new Set(),
    results: new Map(),
    runRows: () => Promise.resolve({ ran: 0, stopped: false }),
    running: false,
    setSettings: vi.fn(),
    settings: DEFAULT_SETTINGS,
    staleIds: new Set(),
    stop: vi.fn(),
    writable: { mp4: true, webm: true },
    ...controller,
  }),
  settled: () => Promise.resolve(),
});

const { signal } = new AbortController();

describe("cinch_get_state", () => {
  it("returns an empty note and no rows for an empty Batch", async () => {
    const result = await getStateAction?.execute(
      contextOf({}),
      { limit: 10, offset: 0 },
      signal
    );
    expect(result).toMatchObject({
      note: expect.any(String),
      ok: true,
      running: false,
      totals: {},
      writable: { mp4: true, webm: true },
    });
  });

  it("counts each row by its state and reports a finished row's output", async () => {
    const result = await getStateAction?.execute(
      contextOf({
        batch: new Map([
          ["a", item("a")],
          ["b", item("b")],
        ]),
        results: new Map([["a", doneResult("a")]]),
      }),
      { limit: 10, offset: 0 },
      signal
    );
    expect(result).toMatchObject({
      note: null,
      totals: { done: 1, queued: 1 },
    });
  });
});

describe("cinch_set_settings", () => {
  it("applies a valid change and waits for the page to settle", async () => {
    const setSettings = vi.fn();
    const result = await setSettingsAction?.execute(
      contextOf({ setSettings }),
      { preset: "strong" },
      signal
    );
    expect(setSettings).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      preset: "strong",
    });
    expect(result).toMatchObject({ ok: true, settings: { preset: "strong" } });
  });

  it("refuses a Target of zero bytes and changes nothing", async () => {
    const setSettings = vi.fn();
    const result = await setSettingsAction?.execute(
      contextOf({ setSettings }),
      { targetBytes: 0 },
      signal
    );
    expect(setSettings).not.toHaveBeenCalled();
    expect(result).toMatchObject({ code: "invalid-settings", ok: false });
  });

  it("refuses an Output Format this browser cannot write", async () => {
    const setSettings = vi.fn();
    const result = await setSettingsAction?.execute(
      contextOf({ setSettings, writable: { mp4: true, webm: false } }),
      { outputFormat: "webm" },
      signal
    );
    expect(setSettings).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      code: "invalid-settings",
      message: "This browser cannot write webm.",
      ok: false,
    });
  });

  it("accepts any Output Format while the browser is still checking", async () => {
    const result = await setSettingsAction?.execute(
      contextOf({ writable: null }),
      { outputFormat: "webm" },
      signal
    );
    expect(result).toMatchObject({
      ok: true,
      settings: { outputFormat: "webm" },
    });
  });
});

describe("cinch_run", () => {
  it("refuses to start while a run is active", async () => {
    const result = await runAction?.execute(
      contextOf({ running: true }),
      {},
      signal
    );
    expect(result).toMatchObject({ code: "busy", ok: false });
  });

  it("refuses an empty Batch", async () => {
    const result = await runAction?.execute(contextOf({}), {}, signal);
    expect(result).toMatchObject({ ok: false });
  });

  it("names the ids that are not in the Batch", async () => {
    const result = await runAction?.execute(
      contextOf({ batch: new Map([["a", item("a")]]) }),
      { ids: ["a", "ghost"] },
      signal
    );
    expect(result).toMatchObject({ code: "unknown-id", ok: false });
  });

  it("refuses to run under an invalid Target", async () => {
    const result = await runAction?.execute(
      contextOf({
        batch: new Map([["a", item("a")]]),
        settings: { ...DEFAULT_SETTINGS, targetBytes: 0 },
      }),
      {},
      signal
    );
    expect(result).toMatchObject({ code: "invalid-settings", ok: false });
  });

  it("runs the pending rows when no ids are given and reports the outcome", async () => {
    const runRows = vi.fn(() => Promise.resolve({ ran: 1, stopped: false }));
    const result = await runAction?.execute(
      contextOf({
        batch: new Map([["a", item("a")]]),
        pendingIds: new Set(["a"]),
        runRows,
      }),
      {},
      signal
    );
    expect(runRows).toHaveBeenCalledWith(["a"]);
    expect(result).toMatchObject({ ok: true, ran: 1, stopped: false });
  });

  it("stops the run when the call is cancelled", async () => {
    const stop = vi.fn();
    const controller = new AbortController();
    const result = await runAction?.execute(
      contextOf({
        batch: new Map([["a", item("a")]]),
        pendingIds: new Set(["a"]),
        runRows: () => {
          controller.abort();
          return Promise.resolve({ ran: 0, stopped: false });
        },
        stop,
      }),
      {},
      controller.signal
    );
    expect(stop).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, stopped: true });
  });
});

describe("cinch_stop", () => {
  it("does nothing when no run is active", async () => {
    const stop = vi.fn();
    const result = await stopAction?.execute(contextOf({ stop }), {}, signal);
    expect(stop).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, wasRunning: false });
  });

  it("stops an active run", async () => {
    const stop = vi.fn();
    const result = await stopAction?.execute(
      contextOf({ running: true, stop }),
      {},
      signal
    );
    expect(stop).toHaveBeenCalled();
    expect(result).toEqual({ ok: true, wasRunning: true });
  });
});

describe("cinch_clear", () => {
  it("succeeds with zero removed for an empty Batch without asking", async () => {
    const confirmClear = vi.fn(() => Promise.resolve(true));
    const result = await clearAction?.execute(
      contextOf({ confirmClear }),
      {},
      signal
    );
    expect(confirmClear).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, removed: 0 });
  });

  it("reports declined when the user says no", async () => {
    const result = await clearAction?.execute(
      contextOf({
        batch: new Map([["a", item("a")]]),
        confirmClear: () => Promise.resolve(false),
      }),
      {},
      signal
    );
    expect(result).toMatchObject({ code: "declined", ok: false });
  });

  it("removes the whole Batch when the user confirms", async () => {
    const result = await clearAction?.execute(
      contextOf({
        batch: new Map([
          ["a", item("a")],
          ["b", item("b")],
        ]),
      }),
      {},
      signal
    );
    expect(result).toEqual({ ok: true, removed: 2 });
  });
});

describe("cinch_download", () => {
  it("builds one ZIP when no ids are given", async () => {
    const result = await downloadAction?.execute(
      contextOf({
        downloadAll: () => Promise.resolve({ count: 2, failed: false }),
      }),
      {},
      signal
    );
    expect(result).toEqual({ count: 2, ok: true });
  });

  it("reports a failed ZIP", async () => {
    const result = await downloadAction?.execute(
      contextOf({
        downloadAll: () => Promise.resolve({ count: 0, failed: true }),
      }),
      {},
      signal
    );
    expect(result).toMatchObject({ code: "zip-failed", ok: false });
  });

  it("reports not-applicable when no row has a file for the ZIP", async () => {
    const result = await downloadAction?.execute(
      contextOf({
        downloadAll: () => Promise.resolve({ count: 0, failed: false }),
      }),
      {},
      signal
    );
    expect(result).toMatchObject({ code: "not-applicable", ok: false });
  });

  it("names ids that are not in the Batch", async () => {
    const result = await downloadAction?.execute(
      contextOf({}),
      { ids: ["ghost"] },
      signal
    );
    expect(result).toMatchObject({ code: "unknown-id", ok: false });
  });

  it("refuses ids whose rows have no file yet", async () => {
    const result = await downloadAction?.execute(
      contextOf({ batch: new Map([["a", item("a")]]) }),
      { ids: ["a"] },
      signal
    );
    expect(result).toMatchObject({ code: "not-applicable", ok: false });
  });

  it("downloads each finished row as its own file", async () => {
    const downloadOne = vi.fn();
    const result = await downloadAction?.execute(
      contextOf({
        batch: new Map([["a", item("a")]]),
        downloadOne,
        results: new Map([["a", doneResult("a")]]),
      }),
      { ids: ["a"] },
      signal
    );
    expect(downloadOne).toHaveBeenCalledWith("a");
    expect(result).toEqual({ count: 1, ok: true });
  });
});
