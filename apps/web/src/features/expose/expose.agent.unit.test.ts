/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unknown-parameters, unicorn/consistent-function-scoping -- Fixture builders sit beside the test that uses them. Fixtures build controller state by hand, and an Agent Action takes JSON arguments as an agent sends them. */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type {
  CleanPreset,
  CleanResult,
  MetadataGroup,
  ReadReport,
} from "@/features/expose/expose";
import { EXPOSE_AGENT_ACTIONS } from "@/features/expose/expose.agent";
import type { ExposeAgentController } from "@/features/expose/expose.agent";
import { storeCleanResult } from "@/features/expose/expose.batch";
import type { ExposeItem } from "@/features/expose/expose.batch";
import { readFile } from "@/features/expose/expose.reader";
import type { PresetReason } from "@/features/expose/expose.view";

const bytes = new Uint8Array(
  readFileSync(new URL("fixtures/metadata.jpg", import.meta.url))
);
const baseReport = await readFile({
  bytes,
  name: "photo.jpg",
  type: "image/jpeg",
});

/** A report with every part an agent reads: GPS, C2PA, a thumbnail, notes. */
const report: ReadReport = {
  ...baseReport,
  ai: {
    c2pa: {
      bytes: 900,
      claimGenerator: "Adobe Firefly",
      claimedSigner: "Adobe Inc.",
      hasThumbnail: true,
      manifests: 2,
    },
    digitalSourceTypes: ["trainedAlgorithmicMedia"],
    generationParameters: [{ label: "Prompt", value: "a cat" }],
    signals: [{ container: "xmp", label: "Source", value: "AI" }],
  },
  gps: { altitudeMeters: 12, latitude: -6.2, longitude: 106.8 },
  groups: [
    ...baseReport.groups.filter((entry) => entry.group !== "location"),
    {
      containers: ["gps"],
      count: 1,
      group: "location",
      removability: "format",
    },
  ],
  notes: [{ code: "maker-note", detail: "developer text" }],
  thumbnail: {
    bytes: 3,
    data: new Blob([new Uint8Array([1, 2, 3])]),
    height: 8,
    mime: "image/jpeg",
    source: "exif",
    width: 8,
  },
};

const clean: CleanResult = {
  engine: { name: "test", version: "1" },
  file: { bytes, name: "photo-clean.jpg", type: "image/jpeg" },
  kept: [],
  removed: [{ after: 0, before: 3, group: "authorship" }],
  verification: {
    c2pa: { afterBytes: 0, beforeBytes: 0 },
    content: {
      afterHash: "a",
      beforeHash: "a",
      kind: "image-payload",
      parts: null,
      unchanged: true,
    },
    display: { after: 1, before: 1, group: "display" },
    kept: [],
    read: baseReport,
    selected: [{ after: 0, before: 3, group: "authorship" }],
  },
  warnings: [],
};

const itemOf = (
  id: string,
  overrides: Partial<ExposeItem> = {}
): ExposeItem => ({
  error: null,
  folderPath: null,
  id,
  reading: false,
  report,
  result: null,
  resultKey: null,
  source: {
    bytes: new Blob([bytes]),
    lastModified: 1,
    name: `${id}.jpg`,
    type: "image/jpeg",
  },
  state: "ready",
  ...overrides,
});

const NO_REASONS: Record<CleanPreset, PresetReason> = {
  "ai-only": null,
  custom: null,
  everything: null,
  personal: null,
};

interface Fake {
  controller: ExposeAgentController;
  calls: string[];
}

const fakeOf = (
  options: {
    readonly items?: readonly ExposeItem[];
    readonly cleaning?: boolean;
    readonly confirm?: boolean;
    readonly preset?: CleanPreset;
    readonly custom?: readonly MetadataGroup[];
    readonly reasons?: Partial<Record<CleanPreset, PresetReason>>;
    readonly pendingLarge?: ExposeAgentController["pendingLarge"];
    readonly zipBuilding?: boolean;
    readonly onRun?: (fake: Fake, ids?: readonly string[]) => void;
    readonly onSample?: (fake: Fake) => void;
    readonly onOpen?: (fake: Fake, id: string) => void;
  } = {}
): Fake => {
  const calls: string[] = [];
  const fake: Fake = { calls, controller: undefined as never };
  const set = (next: Partial<ExposeAgentController>) => {
    fake.controller = { ...fake.controller, ...next };
  };
  fake.controller = {
    cancelClean: () => {
      calls.push("cancel");
    },
    cleaning: options.cleaning ?? false,
    confirmClear: () => {
      calls.push("confirmClear");
      return Promise.resolve(options.confirm ?? false);
    },
    custom: options.custom ?? [],
    downloadAll: () => {
      calls.push("downloadAll");
    },
    downloadOne: (id) => {
      calls.push(`downloadOne:${id}`);
    },
    downloadOriginalOf: (id) => {
      calls.push(`original:${id}`);
    },
    items: options.items ?? [],
    openItem: (id) => {
      calls.push(`open:${id}`);
      options.onOpen?.(fake, id);
    },
    openSample: (sample) => {
      calls.push(`sample:${sample}`);
      options.onSample?.(fake);
    },
    pendingLarge: options.pendingLarge ?? null,
    preset: options.preset ?? "ai-only",
    presetReasons: { ...NO_REASONS, ...options.reasons },
    remove: (id) => {
      calls.push(`remove:${id}`);
    },
    runItems: (ids) => {
      calls.push(`run:${ids === undefined ? "all" : ids.join(",")}`);
      options.onRun?.(fake, ids);
      return Promise.resolve();
    },
    setCustom: (groups) => {
      calls.push(`custom:${groups.join(",")}`);
      set({ custom: groups });
    },
    setPreset: (preset) => {
      calls.push(`preset:${preset}`);
      set({ preset });
    },
    zipBuilding: options.zipBuilding ?? false,
  };
  return fake;
};

const actionNamed = (name: string) => {
  const action = EXPOSE_AGENT_ACTIONS.find((entry) => entry.name === name);
  if (action === undefined) {
    throw new Error(`no action ${name}`);
  }
  return action;
};

const call = (
  fake: Fake,
  name: string,
  args: unknown = {},
  options: {
    readonly signal?: AbortSignal;
    readonly settled?: () => Promise<void>;
  } = {}
) =>
  actionNamed(name).execute(
    {
      controller: () => fake.controller,
      settled: options.settled ?? (() => Promise.resolve()),
    },
    args,
    options.signal ?? new AbortController().signal
  );

describe("Expose Agent Actions", () => {
  it("offers the shared shape with snake_case names and hints", () => {
    expect(EXPOSE_AGENT_ACTIONS.map((action) => action.name)).toEqual([
      "expose_get_state",
      "expose_get_report",
      "expose_open_sample",
      "expose_set_preset",
      "expose_run",
      "expose_stop",
      "expose_remove",
      "expose_download",
    ]);
    for (const name of ["expose_get_state", "expose_get_report"]) {
      expect(actionNamed(name).annotations).toEqual({
        readOnlyHint: true,
        untrustedContentHint: true,
      });
    }
    for (const name of ["expose_run", "expose_open_sample"]) {
      expect(actionNamed(name).annotations).toEqual({
        untrustedContentHint: true,
      });
    }
  });
});

describe("expose_get_state", () => {
  it("reads the preset, why a preset is not available, totals, and rows", async () => {
    const fake = fakeOf({
      items: [
        itemOf("a"),
        itemOf("b", {
          result: storeCleanResult(clean),
          resultKey: "k",
          state: "cleaned",
        }),
        itemOf("c", { reading: true, report: null }),
        itemOf("d", {
          error: {
            code: "unsupported-format",
            detail: "",
            format: null,
            group: null,
          },
          report: null,
          state: "rejected",
        }),
      ],
      preset: "personal",
      reasons: { "ai-only": "format-limit", everything: "format-limit" },
    });
    const state = await call(fake, "expose_get_state");
    expect(state).toMatchObject({
      cleaning: false,
      largeFileConfirm: null,
      note: null,
      ok: true,
      preset: "personal",
      presets: [
        {
          available: false,
          preset: "ai-only",
          reason: expect.any(String),
        },
        { available: true, preset: "personal", reason: null },
        { available: false, preset: "everything" },
        { available: true, preset: "custom" },
      ],
      selectedGroups: [
        "location",
        "time",
        "device-identity",
        "authorship",
        "thumbnails",
      ],
      totals: { cleaned: 1, reading: 1, ready: 1, rejected: 1 },
    });
    expect(state).toMatchObject({
      items: {
        rows: [
          { fileFamily: "image", format: "jpeg", id: "a", state: "ready" },
          {
            state: "cleaned",
            verification: {
              contentUnchanged: true,
              passed: true,
              remainingFields: 0,
              removedFields: 3,
            },
          },
          { fileFamily: null, fields: null, state: "reading" },
          { error: "Unsupported format.", state: "rejected" },
        ],
        total: 4,
      },
    });
  });

  it("gives each preset reason in the Tool's words", async () => {
    const state = await call(
      fakeOf({
        reasons: {
          "ai-only": "format-limit",
          custom: "format-limit",
          everything: "format-limit",
          personal: "empty",
        },
      }),
      "expose_get_state"
    );
    const reasons = (state as { presets: { reason: string }[] }).presets.map(
      (entry) => entry.reason
    );
    expect(new Set(reasons).size).toBe(4);
    expect(reasons[1]).toBe("No removable metadata.");
    expect(reasons[3]).toBe("Clean not supported.");
  });

  it("reports a large-file confirm as pending, for the user only", async () => {
    const state = await call(
      fakeOf({
        pendingLarge: { batchTotal: false, bytes: 300, names: ["big.tif"] },
      }),
      "expose_get_state"
    );
    expect(state).toMatchObject({
      largeFileConfirm: { batchTotal: false, bytes: 300, names: ["big.tif"] },
    });
    expect(JSON.stringify(state)).toContain("an Agent Action cannot");
  });

  it("tells the agent to ask for files when the Batch is empty", async () => {
    const state = await call(fakeOf(), "expose_get_state");
    expect(state).toMatchObject({ items: { total: 0 }, ok: true });
    expect(JSON.stringify(state)).toContain("expose_open_sample");
  });

  it("pages the rows", async () => {
    const items = Array.from({ length: 7 }, (_, index) => itemOf(`i${index}`));
    expect(
      await call(fakeOf({ items }), "expose_get_state", { limit: 2, offset: 6 })
    ).toMatchObject({ items: { limit: 2, offset: 6, total: 7 } });
  });
});

describe("expose_get_report", () => {
  it("opens the file and returns the report grouped, without the thumbnail", async () => {
    const fake = fakeOf({ items: [itemOf("a")] });
    const result = await call(fake, "expose_get_report", { id: "a" });
    expect(fake.calls).toEqual(["open:a"]);
    expect(result).toMatchObject({
      aiProvenance: {
        c2pa: {
          bytes: 900,
          claimGenerator: "Adobe Firefly",
          claimedSigner: "Adobe Inc.",
          manifests: 2,
        },
        digitalSourceTypes: ["trainedAlgorithmicMedia"],
        generationParameters: [{ label: "Prompt", value: "a cat" }],
        signals: [{ container: "xmp", label: "Source", value: "AI" }],
      },
      fileFamily: "image",
      format: "jpeg",
      gps: { altitudeMeters: 12, latitude: -6.2, longitude: 106.8 },
      id: "a",
      name: "a.jpg",
      notes: [
        "A Maker Note is present. It can repeat camera, time, and settings fields.",
      ],
      ok: true,
      readOnly: false,
    });
    const text = JSON.stringify(result);
    expect(text).not.toContain('thumbnail"');
    expect(text).not.toContain("hasThumbnail");
    expect(text).not.toContain("developer text");
    const { groups } = result as {
      groups: { group: string; removability: string; name: string }[];
    };
    expect(groups.length).toBeGreaterThan(0);
    const byGroup = new Map(groups.map((entry) => [entry.group, entry]));
    if (byGroup.has("display")) {
      expect(byGroup.get("display")?.removability).toBe("display");
    }
    if (byGroup.has("location")) {
      expect(byGroup.get("location")?.removability).toBe("format-limit");
    }
    expect(groups.some((entry) => entry.removability === "removable")).toBe(
      true
    );
  });

  it("marks Display Metadata and leaves out a report with no C2PA or GPS", async () => {
    const plain: ReadReport = {
      ...report,
      ai: {
        c2pa: null,
        digitalSourceTypes: [],
        generationParameters: [],
        signals: [],
      },
      fields: [
        ...report.fields,
        {
          container: "exif",
          group: "display",
          id: "orientation",
          label: "Orientation",
          value: "1",
        },
      ],
      gps: null,
      groups: report.groups.filter((entry) => entry.group !== "display"),
    };
    const result = await call(
      fakeOf({ items: [itemOf("a", { report: plain })] }),
      "expose_get_report",
      { id: "a" }
    );
    expect(result).toMatchObject({ aiProvenance: { c2pa: null }, gps: null });
    expect(JSON.stringify(result)).toContain('"removability":"display"');
  });

  it("waits for a read, then returns the report", async () => {
    const fake = fakeOf({
      items: [itemOf("a", { reading: true, report: null })],
    });
    const result = await call(
      fake,
      "expose_get_report",
      { id: "a" },
      {
        settled: () => {
          fake.controller = { ...fake.controller, items: [itemOf("a")] };
          return Promise.resolve();
        },
      }
    );
    expect(result).toMatchObject({ id: "a", ok: true });
  });

  it("refuses an unknown id, a row that left, and a Rejected row", async () => {
    expect(
      await call(fakeOf(), "expose_get_report", { id: "x" })
    ).toMatchObject({ code: "unknown-id" });
    const leaving = fakeOf({ items: [itemOf("a", { reading: true })] });
    expect(
      await call(
        leaving,
        "expose_get_report",
        { id: "a" },
        {
          settled: () => {
            leaving.controller = { ...leaving.controller, items: [] };
            return Promise.resolve();
          },
        }
      )
    ).toMatchObject({ code: "unknown-id" });
    expect(
      await call(
        fakeOf({ items: [itemOf("a", { report: null, state: "rejected" })] }),
        "expose_get_report",
        { id: "a" }
      )
    ).toMatchObject({
      code: "rejected",
      message: expect.stringContaining("cannot read"),
    });
    expect(
      await call(
        fakeOf({
          items: [
            itemOf("a", {
              error: {
                code: "too-large",
                detail: "",
                format: null,
                group: null,
              },
              report: null,
              state: "too-large",
            }),
          ],
        }),
        "expose_get_report",
        { id: "a" }
      )
    ).toMatchObject({ message: expect.stringContaining("too large") });
  });

  it("gives up on a read that does not end", async () => {
    const { now } = Date;
    let time = 0;
    Date.now = () => time;
    try {
      const result = await call(
        fakeOf({ items: [itemOf("a", { reading: true })] }),
        "expose_get_report",
        { id: "a" },
        {
          settled: () => {
            time += 40_000;
            return Promise.resolve();
          },
        }
      );
      expect(result).toMatchObject({ code: "not-applicable" });
    } finally {
      Date.now = now;
    }
  });
});

describe("expose_open_sample", () => {
  const sampleItem = (reading: boolean) =>
    itemOf("s", {
      reading,
      source: {
        bytes: new Blob([bytes]),
        lastModified: 0,
        name: "ai-firefly-c2pa.jpg",
        type: "image/jpeg",
      },
    });

  it("adds the sample, waits for the read, and returns its id", async () => {
    const fake = fakeOf({
      onSample: (current) => {
        current.controller = {
          ...current.controller,
          items: [sampleItem(false)],
        };
      },
    });
    expect(await call(fake, "expose_open_sample", { sample: "ai" })).toEqual({
      added: true,
      id: "s",
      name: "ai-firefly-c2pa.jpg",
      ok: true,
      state: "ready",
    });
    expect(fake.calls).toEqual(["sample:ai"]);
  });

  it("returns the sample that is already in the Batch", async () => {
    const fake = fakeOf({ items: [sampleItem(false)] });
    expect(
      await call(fake, "expose_open_sample", { sample: "ai" })
    ).toMatchObject({ added: false, id: "s" });
    expect(fake.calls).toEqual([]);
  });

  it("says when the sample does not arrive", async () => {
    const { now } = Date;
    let time = 0;
    Date.now = () => time;
    try {
      const result = await call(
        fakeOf(),
        "expose_open_sample",
        { sample: "camera" },
        {
          settled: () => {
            time += 40_000;
            return Promise.resolve();
          },
        }
      );
      expect(result).toMatchObject({ code: "not-applicable" });
    } finally {
      Date.now = now;
    }
  });

  it("refuses an unknown sample", async () => {
    expect(
      await call(fakeOf(), "expose_open_sample", { sample: "dog" })
    ).toMatchObject({ code: "invalid-input" });
  });
});

describe("expose_set_preset", () => {
  it("chooses a preset", async () => {
    const fake = fakeOf();
    expect(
      await call(fake, "expose_set_preset", { preset: "everything" })
    ).toMatchObject({ ok: true, preset: "everything" });
    expect(fake.calls).toEqual(["preset:everything"]);
  });

  it("chooses Custom with its groups", async () => {
    const fake = fakeOf();
    expect(
      await call(fake, "expose_set_preset", {
        groups: ["location", "time"],
        preset: "custom",
      })
    ).toMatchObject({ preset: "custom", selectedGroups: ["location", "time"] });
    expect(fake.calls).toEqual(["preset:custom", "custom:location,time"]);
  });

  it("keeps the current Custom groups when none are sent", async () => {
    const fake = fakeOf({ custom: ["time"] });
    expect(
      await call(fake, "expose_set_preset", { preset: "custom" })
    ).toMatchObject({ selectedGroups: ["time"] });
  });

  it("refuses groups without Custom, an empty Custom, and Display", async () => {
    expect(
      await call(fakeOf(), "expose_set_preset", {
        groups: ["time"],
        preset: "personal",
      })
    ).toMatchObject({ code: "invalid-settings" });
    expect(
      await call(fakeOf(), "expose_set_preset", {
        groups: [],
        preset: "custom",
      })
    ).toMatchObject({
      code: "invalid-settings",
      message: "Select a group with fields.",
    });
    expect(
      await call(fakeOf(), "expose_set_preset", {
        groups: ["display"],
        preset: "custom",
      })
    ).toMatchObject({ code: "invalid-input" });
  });
});

describe("expose_run", () => {
  const cleaned = (ids: readonly string[]) => (fake: Fake) => {
    fake.controller = {
      ...fake.controller,
      items: fake.controller.items.map((item) =>
        ids.includes(item.id)
          ? {
              ...item,
              result: storeCleanResult(clean),
              resultKey: "k",
              state: "cleaned" as const,
            }
          : item
      ),
    };
  };

  it("cleans every cleanable row, waits, and returns the Verification", async () => {
    const fake = fakeOf({
      items: [
        itemOf("a"),
        itemOf("b", { state: "incomplete" }),
        itemOf("c", { reading: true }),
      ],
      onRun: cleaned(["a"]),
    });
    const result = await call(fake, "expose_run");
    expect(fake.calls).toEqual(["run:all"]);
    expect(result).toMatchObject({
      cancelled: false,
      items: { rows: [{ id: "a", state: "cleaned" }], total: 1 },
      ok: true,
      ran: 1,
      totals: { cleaned: 1 },
    });
  });

  it("cleans the named rows", async () => {
    const fake = fakeOf({
      items: [itemOf("a"), itemOf("b")],
      onRun: cleaned(["b"]),
    });
    expect(await call(fake, "expose_run", { ids: ["b"] })).toMatchObject({
      ran: 1,
      totals: { cleaned: 1 },
    });
    expect(fake.calls).toEqual(["run:b"]);
  });

  it("returns ran 0 when no row is cleanable", async () => {
    const fake = fakeOf({ items: [itemOf("a", { state: "cleaned" })] });
    expect(await call(fake, "expose_run")).toMatchObject({ ran: 0 });
    expect(fake.calls).toEqual([]);
  });

  it("returns busy, empty-batch, unknown-id, invalid-settings, and not-applicable", async () => {
    expect(
      await call(fakeOf({ cleaning: true, items: [itemOf("a")] }), "expose_run")
    ).toMatchObject({ code: "busy" });
    expect(await call(fakeOf(), "expose_run")).toMatchObject({
      code: "empty-batch",
    });
    expect(
      await call(fakeOf({ items: [itemOf("a")] }), "expose_run", {
        ids: ["gone"],
      })
    ).toMatchObject({ code: "unknown-id" });
    expect(
      await call(
        fakeOf({ custom: [], items: [itemOf("a")], preset: "custom" }),
        "expose_run"
      )
    ).toMatchObject({ code: "invalid-settings" });
    expect(
      await call(
        fakeOf({ items: [itemOf("a", { reading: true, report: null })] }),
        "expose_run",
        { ids: ["a"] }
      )
    ).toMatchObject({ code: "not-applicable" });
  });

  it("cancels the Clean when the call is cancelled", async () => {
    const abort = new AbortController();
    const fake = fakeOf({
      items: [itemOf("a")],
      onRun: () => {
        abort.abort();
      },
    });
    expect(
      await call(fake, "expose_run", {}, { signal: abort.signal })
    ).toMatchObject({ cancelled: true });
    expect(fake.calls).toEqual(["run:all", "cancel"]);
  });
});

describe("expose_stop", () => {
  it("cancels an active Clean and says whether one was active", async () => {
    const active = fakeOf({ cleaning: true });
    expect(await call(active, "expose_stop")).toEqual({
      ok: true,
      wasRunning: true,
    });
    expect(active.calls).toEqual(["cancel"]);
    expect(await call(fakeOf(), "expose_stop")).toEqual({
      ok: true,
      wasRunning: false,
    });
  });
});

describe("expose_remove", () => {
  it("removes the named rows once each", async () => {
    const fake = fakeOf({ items: [itemOf("a"), itemOf("b")] });
    expect(await call(fake, "expose_remove", { ids: ["a", "a", "b"] })).toEqual(
      { ok: true, removed: 2 }
    );
    expect(fake.calls).toEqual(["remove:a", "remove:b"]);
    expect(await call(fake, "expose_remove", { ids: ["gone"] })).toMatchObject({
      code: "unknown-id",
    });
  });

  it("asks the user before it removes all, and reports a no", async () => {
    expect(
      await call(
        fakeOf({ confirm: false, items: [itemOf("a")] }),
        "expose_remove",
        { all: true }
      )
    ).toMatchObject({ code: "declined" });
    const confirmed = fakeOf({ confirm: true, items: [itemOf("a")] });
    expect(await call(confirmed, "expose_remove", { all: true })).toEqual({
      ok: true,
      removed: 1,
    });
    expect(confirmed.calls).toEqual(["confirmClear"]);
    expect(await call(fakeOf(), "expose_remove", { all: true })).toEqual({
      ok: true,
      removed: 0,
    });
  });
});

describe("expose_download", () => {
  const cleanedItem = (id: string) =>
    itemOf(id, {
      result: storeCleanResult(clean),
      resultKey: "k",
      state: "cleaned",
    });

  it("downloads the ZIP of Cleaned rows without ids", async () => {
    const fake = fakeOf({ items: [cleanedItem("a"), itemOf("b")] });
    expect(await call(fake, "expose_download")).toEqual({
      downloaded: 1,
      kind: "zip",
      leftOut: 1,
      ok: true,
    });
    expect(fake.calls).toEqual(["downloadAll"]);
  });

  it("downloads Cleaned Files and originals by id", async () => {
    const fake = fakeOf({ items: [cleanedItem("a"), itemOf("b")] });
    expect(await call(fake, "expose_download", { ids: ["a"] })).toMatchObject({
      downloaded: 1,
      kind: "files",
    });
    expect(
      await call(fake, "expose_download", { ids: ["b"], original: true })
    ).toMatchObject({ downloaded: 1, kind: "originals" });
    expect(fake.calls).toEqual(["downloadOne:a", "original:b"]);
  });

  it("refuses what cannot download, in the Tool's words", async () => {
    const fake = fakeOf({
      items: [itemOf("a", { state: "incomplete" }), itemOf("b")],
    });
    expect(await call(fake, "expose_download", { ids: ["a"] })).toMatchObject({
      code: "incomplete",
    });
    expect(await call(fake, "expose_download", { ids: ["b"] })).toMatchObject({
      code: "not-applicable",
    });
    expect(
      await call(fake, "expose_download", { ids: ["gone"] })
    ).toMatchObject({ code: "unknown-id" });
    expect(await call(fake, "expose_download")).toMatchObject({
      code: "not-applicable",
    });
    expect(
      await call(fake, "expose_download", { original: true })
    ).toMatchObject({ code: "invalid-input" });
    expect(await call(fakeOf(), "expose_download")).toMatchObject({
      code: "empty-batch",
    });
    expect(
      await call(
        fakeOf({ items: [cleanedItem("a")], zipBuilding: true }),
        "expose_download"
      )
    ).toMatchObject({ code: "busy" });
    expect(fake.calls).toEqual([]);
  });
});
