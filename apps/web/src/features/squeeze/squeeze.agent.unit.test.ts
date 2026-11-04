/* oxlint-disable anti-slop/no-unknown-parameters -- An Agent Action takes JSON arguments; the tests send them as an agent does. */
import { Option } from "effect";
import { describe, expect, it } from "vitest";

import type {
  BatchItem,
  ItemResult,
  OutputFile,
  SqueezeOutcome,
  SqueezeSettings,
} from "@/features/squeeze/squeeze";
import { DEFAULT_SETTINGS } from "@/features/squeeze/squeeze";
import { SQUEEZE_AGENT_ACTIONS } from "@/features/squeeze/squeeze.agent";
import type { SqueezeAgentController } from "@/features/squeeze/squeeze.agent";

const itemOf = (id: string, size = 100_000): BatchItem => ({
  folderPath: null,
  format: Option.some("png"),
  id,
  lastModified: 1,
  name: `${id}.png`,
  size,
  source: new Blob([new ArrayBuffer(8)]),
  targetBytes: null,
});

const fileOf = (format: OutputFile["format"], size: number): OutputFile => ({
  bytes: new Uint8Array(size).fill(7).buffer,
  format,
  height: 10,
  levels: null,
  quality: 80,
  size,
  width: 10,
});

const outcomeOf = (
  kind: SqueezeOutcome["kind"],
  overrides: Partial<SqueezeOutcome> = {}
): SqueezeOutcome => ({
  files: kind === "done" ? [fileOf("jpeg", 40_000)] : [],
  inputBytes: 100_000,
  kind,
  notes: [],
  outputBytes: kind === "done" ? 40_000 : 100_000,
  parts: [],
  problem: kind === "rejected" ? "too-large" : null,
  raisedTargetBytes: null,
  smallestStep: null,
  underTargetCount: 0,
  writtenCount: 0,
  ...overrides,
});

const resultOf = (id: string, outcome: SqueezeOutcome): ItemResult => ({
  id,
  key: "key",
  outcome,
});

interface Fake {
  controller: SqueezeAgentController;
  calls: string[];
}

const fakeOf = (
  options: {
    readonly items?: readonly BatchItem[];
    readonly results?: readonly ItemResult[];
    readonly settings?: Partial<SqueezeSettings>;
    readonly running?: boolean;
    readonly confirm?: boolean;
    readonly zipFailed?: boolean;
    readonly stale?: readonly string[];
    readonly onRun?: (fake: Fake, ids: readonly string[]) => void;
  } = {}
): Fake => {
  const calls: string[] = [];
  // SAFETY: the controller is set on the next statements, before any call reads it.
  const fake: Fake = { calls, controller: undefined as never };
  const batch = new Map((options.items ?? []).map((item) => [item.id, item]));
  const results = new Map(
    (options.results ?? []).map((result) => [result.id, result])
  );
  fake.controller = {
    batch,
    confirmClear: () => {
      calls.push("confirmClear");
      return Promise.resolve(options.confirm ?? false);
    },
    downloadAll: () => {
      calls.push("downloadAll");
      return Promise.resolve({
        failed: options.zipFailed ?? false,
        leftOut: 0,
      });
    },
    downloadOne: (id) => {
      calls.push(`downloadOne:${id}`);
    },
    downloadPart: (id, format) => {
      calls.push(`downloadPart:${id}:${format}`);
    },
    pendingIds: new Set([...batch.keys()].filter((id) => !results.has(id))),
    remove: (id) => {
      calls.push(`remove:${id}`);
    },
    results,
    runRows: (ids) => {
      calls.push(`run:${ids.join(",")}`);
      options.onRun?.(fake, ids);
      return Promise.resolve();
    },
    running: options.running ?? false,
    setSettings: (settings) => {
      calls.push(`settings:${JSON.stringify(settings)}`);
    },
    settings: { ...DEFAULT_SETTINGS, ...options.settings },
    staleIds: new Set(options.stale),
    stop: () => {
      calls.push("stop");
    },
    working: new Set(),
  };
  return fake;
};

const actionNamed = (name: string) => {
  const action = SQUEEZE_AGENT_ACTIONS.find((entry) => entry.name === name);
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

describe("Squeeze Agent Actions", () => {
  it("offers the shared shape with snake_case names", () => {
    expect(SQUEEZE_AGENT_ACTIONS.map((action) => action.name)).toEqual([
      "squeeze_get_state",
      "squeeze_set_settings",
      "squeeze_run",
      "squeeze_stop",
      "squeeze_remove",
      "squeeze_download",
    ]);
    expect(actionNamed("squeeze_get_state").annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: true,
    });
    expect(actionNamed("squeeze_run").annotations).toEqual({
      untrustedContentHint: true,
    });
  });
});

describe("squeeze_get_state", () => {
  it("reads settings, issues, totals, and rows in the Tool's words", async () => {
    const fake = fakeOf({
      items: [itemOf("a"), itemOf("b"), itemOf("c")],
      results: [
        resultOf("a", outcomeOf("done", { notes: [{ kind: "exif-kept" }] })),
        resultOf("b", outcomeOf("rejected")),
      ],
      stale: ["a"],
    });
    const state = await call(fake, "squeeze_get_state");
    expect(state).toMatchObject({
      inputBytes: 300_000,
      issues: [],
      note: null,
      ok: true,
      running: false,
      settings: DEFAULT_SETTINGS,
      totals: { done: 1, pending: 1, rejected: 1 },
    });
    expect(state).toMatchObject({
      items: {
        rows: [
          {
            id: "a",
            name: "a.png",
            notes: ["EXIF kept", "Out of date"],
            outputBytes: 40_000,
            savedPercent: 60,
            stale: true,
            state: "done",
          },
          {
            problem: "Too large for this device. Try Resize.",
            state: "rejected",
          },
          { outputBytes: null, state: "pending" },
        ],
        total: 3,
      },
    });
  });

  it("carries no pixels and no file bytes", async () => {
    const fake = fakeOf({
      items: [itemOf("a")],
      results: [resultOf("a", outcomeOf("done"))],
    });
    const text = JSON.stringify(await call(fake, "squeeze_get_state"));
    expect(text).not.toContain('bytes":{');
    expect(text).not.toContain("source");
    expect(text.length).toBeLessThan(2000);
  });

  it("shows queued and working rows while a run is active", async () => {
    const fake = fakeOf({
      items: [itemOf("a"), itemOf("b")],
      running: true,
    });
    fake.controller = { ...fake.controller, working: new Set(["a"]) };
    const state = await call(fake, "squeeze_get_state");
    expect(state).toMatchObject({
      running: true,
      totals: { queued: 1, working: 1 },
    });
  });

  it("tells the agent to ask for files when the Batch is empty", async () => {
    const state = await call(fakeOf(), "squeeze_get_state");
    expect(state).toMatchObject({ items: { total: 0 }, ok: true });
    expect(JSON.stringify(state)).toContain("Ask the user to drop images");
  });

  it("pages the rows", async () => {
    const items = Array.from({ length: 60 }, (_, index) => itemOf(`i${index}`));
    const state = await call(fakeOf({ items }), "squeeze_get_state", {
      limit: 5,
      offset: 55,
    });
    expect(state).toMatchObject({
      items: { limit: 5, offset: 55, total: 60 },
      totals: { pending: 60 },
    });
  });

  it("writes every note kind as the Tool shows it", async () => {
    const fake = fakeOf({
      items: [itemOf("a")],
      results: [
        resultOf(
          "a",
          outcomeOf("miss", {
            notes: [
              { from: "4000×3000", kind: "resized", to: "2000×1500" },
              { kind: "colors-reduced" },
              { kind: "flattened" },
              { kind: "first-frame" },
              { kind: "bigger-than-input", percent: 12 },
              { kind: "original-used" },
              { bytes: 50_000, kind: "raised" },
              { bytes: 60_000, kind: "still-over" },
              { kind: "no-smaller" },
            ],
            parts: [
              {
                file: null,
                format: "avif",
                saved: 0,
                size: null,
                state: "failed",
              },
            ],
          })
        ),
      ],
    });
    const state = await call(fake, "squeeze_get_state");
    expect(state).toMatchObject({
      items: {
        rows: [
          {
            notes: [
              "Resized 4000×3000 → 2000×1500",
              "Colors reduced",
              "Flattened on white",
              "First frame",
              "Bigger than input +12%",
              "Original used",
              "Budget raised to 50 KB",
              "Budget raised to 60 KB · still over",
              "No smaller file; original kept.",
            ],
            parts: [{ format: "avif", outputBytes: null, state: "failed" }],
            state: "miss",
          },
        ],
      },
    });
  });
});

describe("squeeze_set_settings", () => {
  it("changes only the fields it gets", async () => {
    const fake = fakeOf({ items: [itemOf("a")] });
    const result = await call(fake, "squeeze_set_settings", {
      outputFormat: "webp",
      targetBytes: 50_000,
    });
    expect(result).toMatchObject({
      ok: true,
      settings: {
        ...DEFAULT_SETTINGS,
        outputFormat: "webp",
        targetBytes: 50_000,
      },
    });
    expect(fake.calls).toEqual([
      `settings:${JSON.stringify({ ...DEFAULT_SETTINGS, outputFormat: "webp", targetBytes: 50_000 })}`,
    ]);
  });

  it("refuses Multi with Batch total, says why, and changes nothing", async () => {
    const fake = fakeOf({ items: [itemOf("a")] });
    const result = await call(fake, "squeeze_set_settings", {
      outputFormat: "multi",
      sizeMode: "batch-total",
    });
    expect(result).toMatchObject({ code: "invalid-settings", ok: false });
    expect(JSON.stringify(result)).toContain("Multi writes three files");
    expect(JSON.stringify(result)).toContain("per-image");
    expect(fake.calls).toEqual([]);
  });

  it("refuses a value out of range with the Tool's words", async () => {
    const fake = fakeOf();
    const result = await call(fake, "squeeze_set_settings", {
      targetBytes: 5,
    });
    expect(result).toMatchObject({
      code: "invalid-settings",
      message: "The Target must be between 10 KB and 10 MB.",
      ok: false,
    });
  });

  it("does not block a change on an issue that was already there", async () => {
    const fake = fakeOf({ settings: { quality: 5 } });
    const result = await call(fake, "squeeze_set_settings", {
      preserveExif: true,
    });
    expect(result).toMatchObject({
      issues: [{ kind: "quality-range" }],
      ok: true,
    });
  });

  it("refuses a field that does not exist", async () => {
    const result = await call(fakeOf(), "squeeze_set_settings", {
      format: "webp",
    });
    expect(result).toMatchObject({ code: "invalid-input", ok: false });
  });
});

describe("squeeze_run", () => {
  it("runs the pending rows, waits, and returns the rows it ran", async () => {
    const fake = fakeOf({
      items: [itemOf("a"), itemOf("b")],
      onRun: (current, ids) => {
        const results = new Map(current.controller.results);
        for (const id of ids) {
          results.set(id, resultOf(id, outcomeOf("done")));
        }
        current.controller = { ...current.controller, results };
      },
      results: [],
    });
    const result = await call(fake, "squeeze_run");
    expect(fake.calls).toEqual(["run:a,b"]);
    expect(result).toMatchObject({
      items: { total: 2 },
      ok: true,
      ran: 2,
      stopped: false,
      totals: { done: 2 },
    });
  });

  it("runs the named rows again", async () => {
    const fake = fakeOf({
      items: [itemOf("a"), itemOf("b")],
      results: [
        resultOf("a", outcomeOf("miss")),
        resultOf("b", outcomeOf("done")),
      ],
    });
    const result = await call(fake, "squeeze_run", { ids: ["a"] });
    expect(fake.calls).toEqual(["run:a"]);
    expect(result).toMatchObject({ ran: 1, stopped: false });
  });

  it("runs the whole Batch in batch-total mode", async () => {
    const fake = fakeOf({
      items: [itemOf("a"), itemOf("b")],
      results: [resultOf("a", outcomeOf("done"))],
      settings: { sizeMode: "batch-total" },
    });
    await call(fake, "squeeze_run", { ids: ["b"] });
    expect(fake.calls).toEqual(["run:a,b"]);
  });

  it("returns ran 0 when every row already has a result", async () => {
    const fake = fakeOf({
      items: [itemOf("a")],
      results: [resultOf("a", outcomeOf("done"))],
    });
    expect(await call(fake, "squeeze_run")).toMatchObject({
      ok: true,
      ran: 0,
    });
    expect(fake.calls).toEqual([]);
  });

  it("returns busy, empty-batch, unknown-id, and invalid-settings", async () => {
    expect(
      await call(fakeOf({ items: [itemOf("a")], running: true }), "squeeze_run")
    ).toMatchObject({ code: "busy" });
    expect(await call(fakeOf(), "squeeze_run")).toMatchObject({
      code: "empty-batch",
    });
    expect(
      await call(fakeOf({ items: [itemOf("a")] }), "squeeze_run", {
        ids: ["gone"],
      })
    ).toMatchObject({
      code: "unknown-id",
      hint: "Call squeeze_get_state to read the current item ids, then try again.",
    });
    expect(
      await call(
        fakeOf({ items: [itemOf("a")], settings: { quality: 1 } }),
        "squeeze_run"
      )
    ).toMatchObject({ code: "invalid-settings" });
  });

  it("stops the run when the call is cancelled", async () => {
    const abort = new AbortController();
    const fake = fakeOf({
      items: [itemOf("a")],
      onRun: () => {
        abort.abort();
      },
    });
    const result = await call(fake, "squeeze_run", {}, abort.signal);
    expect(fake.calls).toEqual(["run:a", "stop"]);
    expect(result).toMatchObject({ stopped: true });
  });
});

describe("squeeze_stop", () => {
  it("stops an active run and says whether one was active", async () => {
    const running = fakeOf({ running: true });
    expect(await call(running, "squeeze_stop")).toEqual({
      ok: true,
      wasRunning: true,
    });
    expect(running.calls).toEqual(["stop"]);
    const idle = fakeOf();
    expect(await call(idle, "squeeze_stop")).toEqual({
      ok: true,
      wasRunning: false,
    });
    expect(idle.calls).toEqual([]);
  });
});

describe("squeeze_remove", () => {
  it("removes the named rows once each", async () => {
    const fake = fakeOf({ items: [itemOf("a"), itemOf("b")] });
    expect(
      await call(fake, "squeeze_remove", { ids: ["a", "a", "b"] })
    ).toEqual({ ok: true, removed: 2 });
    expect(fake.calls).toEqual(["remove:a", "remove:b"]);
  });

  it("refuses ids that left the Batch and removes nothing", async () => {
    const fake = fakeOf({ items: [itemOf("a")] });
    expect(
      await call(fake, "squeeze_remove", { ids: ["a", "gone"] })
    ).toMatchObject({
      code: "unknown-id",
      message: "No item has the id gone.",
    });
    expect(fake.calls).toEqual([]);
  });

  it("asks the user before it removes all, and reports a no", async () => {
    const declined = fakeOf({ items: [itemOf("a")], confirm: false });
    expect(await call(declined, "squeeze_remove", { all: true })).toMatchObject(
      { code: "declined", ok: false }
    );
    const confirmed = fakeOf({ items: [itemOf("a")], confirm: true });
    expect(await call(confirmed, "squeeze_remove", { all: true })).toEqual({
      ok: true,
      removed: 1,
    });
    expect(confirmed.calls).toEqual(["confirmClear"]);
  });

  it("removes nothing and asks nothing when the Batch is empty", async () => {
    const fake = fakeOf();
    expect(await call(fake, "squeeze_remove", { all: true })).toEqual({
      ok: true,
      removed: 0,
    });
    expect(fake.calls).toEqual([]);
  });
});

describe("squeeze_download", () => {
  const multi = outcomeOf("done", {
    parts: [
      {
        file: fileOf("jpeg", 10),
        format: "jpeg",
        saved: 10,
        size: 10,
        state: "done",
      },
      { file: null, format: "avif", saved: 0, size: null, state: "failed" },
    ],
  });

  it("downloads the ZIP without ids", async () => {
    const fake = fakeOf({
      items: [itemOf("a"), itemOf("b")],
      results: [
        resultOf("a", outcomeOf("done")),
        resultOf("b", outcomeOf("rejected")),
      ],
    });
    expect(await call(fake, "squeeze_download")).toEqual({
      downloaded: 1,
      kind: "zip",
      leftOut: 0,
      ok: true,
    });
    expect(fake.calls).toEqual(["downloadAll"]);
  });

  it("says when the ZIP fails or has nothing in it", async () => {
    expect(
      await call(
        fakeOf({
          items: [itemOf("a")],
          results: [resultOf("a", outcomeOf("done"))],
          zipFailed: true,
        }),
        "squeeze_download"
      )
    ).toMatchObject({ code: "zip-failed" });
    expect(
      await call(fakeOf({ items: [itemOf("a")] }), "squeeze_download")
    ).toMatchObject({ code: "not-applicable" });
    expect(await call(fakeOf(), "squeeze_download")).toMatchObject({
      code: "empty-batch",
    });
    expect(
      await call(fakeOf({ items: [itemOf("a")] }), "squeeze_download", {
        format: "jpeg",
      })
    ).toMatchObject({ code: "invalid-input" });
  });

  it("downloads named rows and one Multi part", async () => {
    const fake = fakeOf({
      items: [itemOf("a"), itemOf("b")],
      results: [resultOf("a", multi), resultOf("b", outcomeOf("done"))],
    });
    expect(
      await call(fake, "squeeze_download", { ids: ["a", "b"] })
    ).toMatchObject({ downloaded: 2, kind: "files" });
    expect(
      await call(fake, "squeeze_download", { format: "jpeg", ids: ["a"] })
    ).toMatchObject({ downloaded: 1, kind: "files" });
    expect(fake.calls).toEqual([
      "downloadOne:a",
      "downloadOne:b",
      "downloadPart:a:jpeg",
    ]);
  });

  it("refuses a row that cannot download, in the Tool's words", async () => {
    const fake = fakeOf({
      items: [itemOf("a"), itemOf("b"), itemOf("c")],
      results: [resultOf("a", multi), resultOf("b", outcomeOf("rejected"))],
    });
    expect(
      await call(fake, "squeeze_download", { format: "avif", ids: ["a"] })
    ).toMatchObject({ code: "not-applicable" });
    expect(await call(fake, "squeeze_download", { ids: ["b"] })).toMatchObject({
      code: "rejected",
    });
    expect(await call(fake, "squeeze_download", { ids: ["c"] })).toMatchObject({
      code: "not-applicable",
    });
    expect(
      await call(fake, "squeeze_download", { ids: ["gone"] })
    ).toMatchObject({ code: "unknown-id" });
    expect(fake.calls).toEqual([]);
  });
});
