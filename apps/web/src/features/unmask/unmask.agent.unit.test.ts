/* oxlint-disable anti-slop/no-unknown-parameters, eslint/no-await-in-loop -- An Agent Action takes JSON arguments; the tests send them one at a time, as an agent does. */
import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "@/features/unmask/unmask";
import type { RowState, UnmaskSettings } from "@/features/unmask/unmask";
import { UNMASK_AGENT_ACTIONS } from "@/features/unmask/unmask.agent";
import type { UnmaskAgentController } from "@/features/unmask/unmask.agent";
import type {
  MatteOperation,
  RemoveNote,
  UnmaskError,
} from "@/features/unmask/unmask.engine";

type Row = UnmaskAgentController["batch"][number];

const CANCELLED: RowState = "cancelled";

const PIXELS = new Uint8Array(64).fill(9);

const rowOf = (id: string, overrides: Partial<Row> = {}): Row => ({
  byteSize: 1000,
  error: null,
  facts: { format: "png", height: 80, width: 100 },
  folderPath: null,
  // The Matte holds pixels; no result may carry them.
  full: { alpha: PIXELS },
  id,
  model: null,
  name: `${id}.png`,
  notes: [],
  operations: [],
  redo: [],
  result: null,
  state: "queued",
  ...overrides,
});

const readyRow = (id: string, overrides: Partial<Row> = {}): Row =>
  rowOf(id, {
    model: { backend: "wasm", name: "ISNet int8", version: "1" },
    result: { bytesLength: 500, format: "webp", height: 80, width: 100 },
    state: "ready",
    ...overrides,
  });

// SAFETY: a non-empty string is an OperationId.
const wand: MatteOperation = {
  _tag: "Wand",
  connectivity: 8,
  mode: "erase",
  operationId: "op" as MatteOperation["operationId"],
  seed: { x: 1, y: 1 },
  tolerance: 20,
};

interface Fake {
  controller: UnmaskAgentController;
  calls: string[];
  applied: MatteOperation[];
}

const fakeOf = (
  options: {
    readonly rows?: readonly Row[];
    readonly settings?: Partial<UnmaskSettings>;
    readonly running?: boolean;
    readonly confirm?: boolean;
    readonly zipFailed?: boolean;
    readonly sampleFailed?: boolean;
    readonly onRun?: (fake: Fake, ids: readonly string[]) => void;
  } = {}
): Fake => {
  const calls: string[] = [];
  const applied: MatteOperation[] = [];
  // SAFETY: the controller is set on the next statements, before any call reads it.
  const fake: Fake = { applied, calls, controller: undefined as never };
  const update = (id: string, change: (row: Row) => Row) => {
    fake.controller = {
      ...fake.controller,
      batch: fake.controller.batch.map((row) =>
        row.id === id ? change(row) : row
      ),
    };
  };
  fake.controller = {
    applyOperation: (operation) => {
      applied.push(operation);
      calls.push(`apply:${operation.operationId}`);
      const id = fake.controller.openId ?? "";
      update(id, (row) => ({
        ...row,
        operations: [...row.operations, operation],
        state: "edited",
      }));
    },
    batch: options.rows ?? [],
    cancel: () => {
      calls.push("cancel");
    },
    changeSettings: (settings) => {
      calls.push(`settings:${JSON.stringify(settings)}`);
    },
    confirmClear: () => {
      calls.push("confirmClear");
      return Promise.resolve(options.confirm ?? false);
    },
    downloadAll: () => {
      calls.push("downloadAll");
      return Promise.resolve({
        failed: options.zipFailed ?? false,
        leftOut: 1,
      });
    },
    downloadOne: (id) => {
      calls.push(`downloadOne:${id}`);
      return Promise.resolve();
    },
    loadSample: () => {
      calls.push("loadSample");
      if (!(options.sampleFailed ?? false)) {
        fake.controller = {
          ...fake.controller,
          batch: [...fake.controller.batch, readyRow("sample")],
        };
      }
      return Promise.resolve();
    },
    openForEdit: (id) => {
      calls.push(`open:${id}`);
      fake.controller = { ...fake.controller, openId: id };
      return Promise.resolve();
    },
    openId: null,
    redo: () => {
      calls.push("redo");
    },
    remove: (id) => {
      calls.push(`remove:${id}`);
    },
    resetMatte: () => {
      calls.push("reset");
    },
    runRows: (ids) => {
      calls.push(`run:${ids.join(",")}`);
      options.onRun?.(fake, ids);
      return Promise.resolve();
    },
    running: options.running ?? false,
    sampleFailed: options.sampleFailed ?? false,
    settings: { ...DEFAULT_SETTINGS, ...options.settings },
    undo: () => {
      calls.push("undo");
    },
  };
  return fake;
};

const actionNamed = (name: string) => {
  const action = UNMASK_AGENT_ACTIONS.find((entry) => entry.name === name);
  if (action === undefined) {
    throw new Error(`no action ${name}`);
  }
  return action;
};

const call = (
  fake: Fake,
  name: string,
  args: unknown = {},
  signal = new AbortController().signal
) =>
  actionNamed(name).execute(
    { controller: () => fake.controller, settled: () => Promise.resolve() },
    args,
    signal
  );

describe("Unmask Agent Actions", () => {
  it("offers the shared shape and the Matte extras", () => {
    expect(UNMASK_AGENT_ACTIONS.map((action) => action.name)).toEqual([
      "unmask_get_state",
      "unmask_load_sample",
      "unmask_set_settings",
      "unmask_run",
      "unmask_stop",
      "unmask_remove",
      "unmask_edit_matte",
      "unmask_undo",
      "unmask_redo",
      "unmask_reset_matte",
      "unmask_download",
    ]);
    expect(actionNamed("unmask_get_state").annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: true,
    });
  });
});

describe("unmask_get_state", () => {
  it("reads settings, the model, totals, and rows", async () => {
    const notes: RemoveNote[] = [
      { _tag: "ModelDownloaded" },
      { _tag: "WebGpuFallback", reason: "no adapter" },
    ];
    const fake = fakeOf({
      rows: [
        readyRow("a", { notes, operations: [wand], redo: [wand] }),
        rowOf("b", { facts: null, full: null }),
      ],
    });
    fake.controller = { ...fake.controller, openId: "a" };
    const state = await call(fake, "unmask_get_state");
    expect(state).toMatchObject({
      issues: [],
      model: { backend: "wasm", name: "ISNet int8", version: "1" },
      note: null,
      ok: true,
      openId: "a",
      running: false,
      settings: DEFAULT_SETTINGS,
      totals: { queued: 1, ready: 1 },
    });
    expect(state).toMatchObject({
      items: {
        rows: [
          {
            cutout: {
              format: "webp",
              height: 80,
              outputBytes: 500,
              width: 100,
            },
            id: "a",
            matteEdits: 1,
            name: "a.png",
            notes: [
              "The model was downloaded on this run. Next runs use the cache.",
              "WebGPU was not available (no adapter). The model ran on WebAssembly, which is slower.",
            ],
            open: true,
            redoCount: 1,
            sourceHeight: 80,
            sourceWidth: 100,
            state: "ready",
          },
          { open: false, sourceHeight: null, sourceWidth: null },
        ],
        total: 2,
      },
    });
  });

  it("carries no pixels and no Matte", async () => {
    const fake = fakeOf({ rows: [readyRow("a")] });
    const text = JSON.stringify(await call(fake, "unmask_get_state"));
    expect(text).not.toContain("alpha");
    expect(text).not.toContain("9,9,9");
  });

  it("writes every note and an error in the Tool's words", async () => {
    const error: UnmaskError = {
      _tag: "TooLarge",
      height: 1,
      neededBytes: 1,
      pixels: 1,
      width: 1,
    };
    const fake = fakeOf({
      rows: [
        rowOf("a", {
          error,
          notes: [
            { _tag: "InputAlpha" },
            { _tag: "FirstFrame", format: "gif" },
            { _tag: "ModelCached" },
            { _tag: "PreviewDownscaled", height: 512, width: 1024 },
          ],
          state: "failed",
        }),
      ],
    });
    expect(await call(fake, "unmask_get_state")).toMatchObject({
      items: {
        rows: [
          {
            error: {
              code: "too-large",
              message: "This image is too large for this device.",
            },
            notes: [
              "The input already has transparency.",
              "Unmask used the first frame of the GIF.",
              "The model is cached.",
              "The preview is 1024×512. The Cutout is full resolution.",
            ],
            state: "failed",
          },
        ],
      },
    });
  });

  it("tells the agent to ask for files, reports the JPEG issue, and pages", async () => {
    const empty = await call(
      fakeOf({ settings: { format: "jpeg" } }),
      "unmask_get_state"
    );
    expect(JSON.stringify(empty)).toContain("Ask the user to drop images");
    expect(empty).toMatchObject({
      issues: [{ kind: "jpeg-transparent" }],
      model: null,
    });
    const rows = Array.from({ length: 70 }, (_, index) => rowOf(`r${index}`));
    expect(
      await call(fakeOf({ rows }), "unmask_get_state", {
        limit: 10,
        offset: 65,
      })
    ).toMatchObject({ items: { limit: 10, offset: 65, total: 70 } });
  });
});

describe("unmask_load_sample", () => {
  it("adds and runs the sample, then returns its row", async () => {
    const fake = fakeOf();
    expect(await call(fake, "unmask_load_sample")).toMatchObject({
      item: { id: "sample", state: "ready" },
      ok: true,
    });
    expect(fake.calls).toEqual(["loadSample"]);
  });

  it("says when the sample does not load, and when a run is active", async () => {
    expect(
      await call(fakeOf({ sampleFailed: true }), "unmask_load_sample")
    ).toMatchObject({ code: "sample-failed" });
    expect(
      await call(fakeOf({ running: true }), "unmask_load_sample")
    ).toMatchObject({ code: "busy" });
  });
});

describe("unmask_set_settings", () => {
  it("changes only the fields it gets", async () => {
    const fake = fakeOf();
    const backdrop = { _tag: "Solid", color: { a: 255, b: 0, g: 0, r: 255 } };
    const result = await call(fake, "unmask_set_settings", {
      backdrop,
      format: "jpeg",
    });
    expect(result).toMatchObject({
      issues: [],
      ok: true,
      settings: { ...DEFAULT_SETTINGS, backdrop, format: "jpeg" },
    });
    expect(fake.calls).toHaveLength(1);
  });

  it("refuses JPEG with a Transparent backdrop and changes nothing", async () => {
    const fake = fakeOf();
    expect(
      await call(fake, "unmask_set_settings", { format: "jpeg" })
    ).toMatchObject({
      code: "invalid-settings",
      message: "JPEG cannot hold transparency.",
    });
    expect(fake.calls).toEqual([]);
  });

  it("refuses values out of range", async () => {
    for (const args of [
      { feather: 51 },
      { quality: 0 },
      { backdrop: { _tag: "Blur", radius: 99 } },
    ]) {
      expect(await call(fakeOf(), "unmask_set_settings", args)).toMatchObject({
        code: "invalid-settings",
      });
    }
  });

  it("refuses a field or a backdrop shape that does not exist", async () => {
    expect(
      await call(fakeOf(), "unmask_set_settings", { tolerance: 3 })
    ).toMatchObject({ code: "invalid-input" });
    expect(
      await call(fakeOf(), "unmask_set_settings", {
        backdrop: { _tag: "Gradient" },
      })
    ).toMatchObject({ code: "invalid-input" });
  });
});

/** Marks the rows a run took as Ready, with the model-download note. */
const finish = (fake: Fake, ids: readonly string[]) => {
  fake.controller = {
    ...fake.controller,
    batch: fake.controller.batch.map((row) =>
      ids.includes(row.id)
        ? readyRow(row.id, { notes: [{ _tag: "ModelDownloaded" }] })
        : row
    ),
  };
};

describe("unmask_run", () => {
  it("runs the rows that need work, waits, and reports notes", async () => {
    const fake = fakeOf({
      onRun: finish,
      rows: [rowOf("a"), readyRow("b"), rowOf("c", { state: "stale" })],
    });
    const result = await call(fake, "unmask_run");
    expect(fake.calls).toEqual(["run:a,c"]);
    expect(result).toMatchObject({
      items: { total: 2 },
      model: { backend: "wasm" },
      notes: ["The model was downloaded on this run. Next runs use the cache."],
      ok: true,
      ran: 2,
      stopped: false,
      totals: { ready: 2 },
    });
  });

  it("runs named rows again", async () => {
    const fake = fakeOf({
      onRun: finish,
      rows: [readyRow("a"), readyRow("b")],
    });
    expect(await call(fake, "unmask_run", { ids: ["b"] })).toMatchObject({
      ran: 1,
    });
    expect(fake.calls).toEqual(["run:b"]);
  });

  it("does nothing when no row needs work", async () => {
    const fake = fakeOf({ rows: [readyRow("a")] });
    expect(await call(fake, "unmask_run")).toMatchObject({ ran: 0 });
    expect(fake.calls).toEqual([]);
  });

  it("returns busy, empty-batch, unknown-id, and invalid-settings", async () => {
    expect(
      await call(fakeOf({ rows: [rowOf("a")], running: true }), "unmask_run")
    ).toMatchObject({ code: "busy" });
    expect(await call(fakeOf(), "unmask_run")).toMatchObject({
      code: "empty-batch",
    });
    expect(
      await call(fakeOf({ rows: [rowOf("a")] }), "unmask_run", { ids: ["x"] })
    ).toMatchObject({ code: "unknown-id" });
    expect(
      await call(
        fakeOf({ rows: [rowOf("a")], settings: { format: "jpeg" } }),
        "unmask_run"
      )
    ).toMatchObject({ code: "invalid-settings" });
  });

  it("stops the run when the call is cancelled", async () => {
    const abort = new AbortController();
    const fake = fakeOf({
      onRun: (current, ids) => {
        abort.abort();
        current.controller = {
          ...current.controller,
          batch: current.controller.batch.map((row) =>
            ids.includes(row.id) ? { ...row, state: CANCELLED } : row
          ),
        };
      },
      rows: [rowOf("a")],
    });
    expect(await call(fake, "unmask_run", {}, abort.signal)).toMatchObject({
      stopped: true,
      totals: { cancelled: 1 },
    });
    expect(fake.calls).toEqual(["run:a", "cancel"]);
  });
});

describe("unmask_stop", () => {
  it("cancels an active run and says whether one was active", async () => {
    const running = fakeOf({ running: true });
    expect(await call(running, "unmask_stop")).toEqual({
      ok: true,
      wasRunning: true,
    });
    expect(running.calls).toEqual(["cancel"]);
    expect(await call(fakeOf(), "unmask_stop")).toEqual({
      ok: true,
      wasRunning: false,
    });
  });
});

describe("unmask_remove", () => {
  it("removes named rows once each, and refuses unknown ids", async () => {
    const fake = fakeOf({ rows: [rowOf("a"), rowOf("b")] });
    expect(await call(fake, "unmask_remove", { ids: ["a", "a"] })).toEqual({
      cleared: 0,
      ok: true,
      removed: 1,
    });
    expect(await call(fake, "unmask_remove", { ids: ["gone"] })).toMatchObject({
      code: "unknown-id",
    });
    expect(fake.calls).toEqual(["remove:a"]);
  });

  it("asks the user before it removes all, and reports a no", async () => {
    const declined = fakeOf({ rows: [rowOf("a")] });
    expect(await call(declined, "unmask_remove", { all: true })).toMatchObject({
      code: "declined",
    });
    expect(declined.calls).toEqual(["confirmClear"]);
    const confirmed = fakeOf({ confirm: true, rows: [rowOf("a")] });
    expect(await call(confirmed, "unmask_remove", { all: true })).toEqual({
      cleared: 1,
      ok: true,
      removed: 0,
    });
    expect(confirmed.calls).toEqual(["confirmClear"]);
    expect(await call(fakeOf(), "unmask_remove", { all: true })).toEqual({
      cleared: 0,
      ok: true,
      removed: 0,
    });
  });
});

describe("unmask_edit_matte", () => {
  it("opens the row, assigns operation ids, and applies the operations in order", async () => {
    const fake = fakeOf({ rows: [readyRow("a")] });
    const result = await call(fake, "unmask_edit_matte", {
      id: "a",
      operations: [
        { _tag: "Wand", mode: "erase", seed: { x: 5, y: 5 } },
        {
          _tag: "Brush",
          mode: "restore",
          points: [
            { x: 0, y: 0 },
            { x: 99, y: 79 },
          ],
          size: 10,
        },
      ],
    });
    expect(result).toEqual({
      id: "a",
      matteEdits: 2,
      ok: true,
      redoCount: 0,
      state: "edited",
    });
    expect(fake.calls[0]).toBe("open:a");
    expect(fake.applied).toMatchObject([
      { _tag: "Wand", connectivity: 8, mode: "erase", tolerance: 20 },
      { _tag: "Brush", mode: "restore", size: 10 },
    ]);
    const [first, second] = fake.applied;
    expect(first?.operationId).toMatch(/^unmask-agent-op-\d+$/u);
    expect(second?.operationId).not.toBe(first?.operationId);
    expect(JSON.stringify(result)).not.toContain("alpha");
  });

  it("refuses points outside the source and values out of range", async () => {
    const fake = fakeOf({ rows: [readyRow("a")] });
    for (const operation of [
      { _tag: "Wand", mode: "erase", seed: { x: 100, y: 0 } },
      { _tag: "Wand", mode: "erase", seed: { x: 0, y: 0 }, tolerance: 101 },
      { _tag: "Brush", mode: "erase", points: [{ x: -1, y: 0 }] },
      { _tag: "Brush", mode: "erase", points: [{ x: 0, y: 0 }], size: 0 },
    ]) {
      expect(
        await call(fake, "unmask_edit_matte", {
          id: "a",
          operations: [operation],
        })
      ).toMatchObject({ code: "invalid-input", ok: false });
    }
    expect(
      await call(fake, "unmask_edit_matte", {
        id: "a",
        operations: [{ _tag: "Lasso", mode: "erase" }],
      })
    ).toMatchObject({ code: "invalid-input" });
    expect(fake.calls).toEqual([]);
  });

  it("refuses a row without a Matte, an unknown row, and a busy run", async () => {
    const operations = [{ _tag: "Wand", mode: "erase", seed: { x: 0, y: 0 } }];
    expect(
      await call(
        fakeOf({ rows: [rowOf("a", { full: null })] }),
        "unmask_edit_matte",
        { id: "a", operations }
      )
    ).toMatchObject({ code: "not-applicable" });
    expect(
      await call(fakeOf({ rows: [readyRow("a")] }), "unmask_edit_matte", {
        id: "x",
        operations,
      })
    ).toMatchObject({ code: "unknown-id" });
    expect(
      await call(
        fakeOf({ rows: [readyRow("a")], running: true }),
        "unmask_edit_matte",
        { id: "a", operations }
      )
    ).toMatchObject({ code: "busy" });
  });
});

describe("unmask_undo, unmask_redo, unmask_reset_matte", () => {
  it("opens the row and runs the editor's history step", async () => {
    const fake = fakeOf({
      rows: [readyRow("a", { operations: [wand], redo: [wand] })],
    });
    expect(await call(fake, "unmask_undo", { id: "a" })).toMatchObject({
      id: "a",
      ok: true,
    });
    await call(fake, "unmask_redo", { id: "a" });
    await call(fake, "unmask_reset_matte", { id: "a" });
    expect(fake.calls).toEqual([
      "open:a",
      "undo",
      "open:a",
      "redo",
      "open:a",
      "reset",
    ]);
  });

  it("says when there is nothing to undo or redo", async () => {
    const fake = fakeOf({ rows: [readyRow("a")] });
    expect(await call(fake, "unmask_undo", { id: "a" })).toMatchObject({
      code: "not-applicable",
    });
    expect(await call(fake, "unmask_redo", { id: "a" })).toMatchObject({
      code: "not-applicable",
    });
    expect(await call(fake, "unmask_undo", { id: "x" })).toMatchObject({
      code: "unknown-id",
    });
    expect(fake.calls).toEqual([]);
  });
});

describe("unmask_download", () => {
  it("downloads the ZIP without ids", async () => {
    const fake = fakeOf({ rows: [readyRow("a"), rowOf("b")] });
    expect(await call(fake, "unmask_download")).toEqual({
      downloaded: 1,
      kind: "zip",
      leftOut: 1,
      ok: true,
    });
    expect(fake.calls).toEqual(["downloadAll"]);
  });

  it("says when the ZIP fails, is empty, or the Batch is empty", async () => {
    expect(
      await call(
        fakeOf({ rows: [readyRow("a")], zipFailed: true }),
        "unmask_download"
      )
    ).toMatchObject({ code: "zip-failed" });
    expect(
      await call(fakeOf({ rows: [rowOf("a")] }), "unmask_download")
    ).toMatchObject({ code: "not-applicable" });
    expect(await call(fakeOf(), "unmask_download")).toMatchObject({
      code: "empty-batch",
    });
  });

  it("downloads named Cutouts in order", async () => {
    const fake = fakeOf({
      rows: [readyRow("a"), readyRow("b", { state: "edited" })],
    });
    expect(
      await call(fake, "unmask_download", { ids: ["b", "a"] })
    ).toMatchObject({ downloaded: 2, kind: "files" });
    expect(fake.calls).toEqual(["downloadOne:b", "downloadOne:a"]);
  });

  it("refuses a row that cannot download, in the Tool's words", async () => {
    const fake = fakeOf({
      rows: [
        readyRow("a", { state: "stale" }),
        rowOf("b", {
          error: { _tag: "ModelUnavailable", reason: "offline" },
          state: "failed",
        }),
        rowOf("c"),
      ],
    });
    expect(await call(fake, "unmask_download", { ids: ["a"] })).toMatchObject({
      code: "stale",
    });
    expect(await call(fake, "unmask_download", { ids: ["b"] })).toMatchObject({
      code: "model-unavailable",
      message: "Item b: The model is not cached.",
    });
    expect(await call(fake, "unmask_download", { ids: ["c"] })).toMatchObject({
      code: "not-applicable",
    });
    expect(await call(fake, "unmask_download", { ids: ["x"] })).toMatchObject({
      code: "unknown-id",
    });
    expect(fake.calls).toEqual([]);
  });
});
