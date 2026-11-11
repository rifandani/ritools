import { describe, expect, it } from "vitest";

import {
  alreadyFitsInput,
  asksForChange,
  BYTES_PER_MB,
  classifyOutput,
  DEFAULT_SETTINGS,
  encodeSlots,
  formatDuration,
  incomingOf,
  isStale,
  looksLikeVideo,
  MIN_VIDEO_BITRATE,
  outputNameOf,
  planEncode,
  retryBitrate,
  runSlots,
  savedPercentOf,
  scaledFrame,
  settingsIssues,
  settingsKeyOf,
  summarize,
} from "@/features/cinch/cinch";
import type {
  BatchItem,
  CinchSettings,
  ItemResult,
  VideoInfo,
} from "@/features/cinch/cinch";

const INFO: VideoInfo = {
  container: "mp4",
  durationSeconds: 60,
  frameRate: 30,
  hasAudio: true,
  height: 1080,
  width: 1920,
};

const settingsWith = (patch: Partial<CinchSettings>): CinchSettings => ({
  ...DEFAULT_SETTINGS,
  ...patch,
});

const itemOf = (id: string, size: number, name = `${id}.mp4`): BatchItem => ({
  folderPath: null,
  id,
  lastModified: 1,
  name,
  size,
  source: new File([new Uint8Array(1)], name, { type: "video/mp4" }),
});

const blob = new Blob([new Uint8Array(4)]);

const resultOf = (
  id: string,
  outcome: ItemResult["outcome"],
  settings = DEFAULT_SETTINGS
): ItemResult => ({
  id,
  info: INFO,
  outcome,
  settingsKey: settingsKeyOf(settings),
});

const fileOf = (bytes: number) => ({
  blob,
  bytes,
  fitScale: null,
  format: "mp4" as const,
  height: 720,
  retried: false,
  width: 1280,
});

describe("settingsIssues", () => {
  it("accepts the default settings", () => {
    expect(settingsIssues(DEFAULT_SETTINGS)).toEqual([]);
  });

  it("refuses a Target that is not above 0 in Target mode only", () => {
    expect(settingsIssues(settingsWith({ targetBytes: 0 }))).toEqual([
      { kind: "target-range" },
    ]);
    expect(
      settingsIssues(settingsWith({ sizeMode: "preset", targetBytes: 0 }))
    ).toEqual([]);
  });

  it("accepts any granular Target, with no preset steps or upper cap", () => {
    for (const mb of [0.5, 17, 19, 123, 4001, 50_000]) {
      expect(
        settingsIssues(
          settingsWith({ targetBytes: Math.round(mb * BYTES_PER_MB) })
        )
      ).toEqual([]);
    }
  });
});

describe("settingsKeyOf and isStale", () => {
  it("ignores the Target in Video Preset mode", () => {
    const preset = settingsWith({ sizeMode: "preset" });
    expect(settingsKeyOf(preset)).toBe(
      settingsKeyOf({ ...preset, targetBytes: 99 * BYTES_PER_MB })
    );
  });

  it("marks a result Stale when a setting that changes output changes", () => {
    const result = resultOf("a", { kind: "already-fits" });
    expect(isStale(result, DEFAULT_SETTINGS)).toBe(false);
    expect(isStale(result, settingsWith({ removeAudio: true }))).toBe(true);
    expect(isStale(result, settingsWith({ outputFormat: "webm" }))).toBe(true);
  });
});

describe("scaledFrame", () => {
  it("scales the short side and keeps even sides", () => {
    expect(scaledFrame(1920, 1080, 720)).toEqual({ height: 720, width: 1280 });
    expect(scaledFrame(1080, 1920, 720)).toEqual({ height: 1280, width: 720 });
    expect(scaledFrame(1001, 563, 480)).toEqual({ height: 480, width: 854 });
  });

  it("never scales up", () => {
    expect(scaledFrame(640, 360, 1080)).toEqual({ height: 360, width: 640 });
  });
});

describe("planEncode", () => {
  it("spends the Target over the duration, less a margin and the audio", () => {
    const plan = planEncode(INFO, DEFAULT_SETTINGS);
    // 25 MB × 8 × 0.95 / 60 s = 3,166,666 bit/s; less 128 kbit/s audio.
    expect(plan.videoBitrate).toBe(3_038_666);
    expect(plan.audioBitrate).toBe(128_000);
    expect(plan.fitScale).toBeNull();
    expect(plan).toMatchObject({ height: 1080, width: 1920 });
  });

  it("steps down to a Fit Scale when the Target is too small", () => {
    const plan = planEncode(
      { ...INFO, durationSeconds: 600 },
      settingsWith({ targetBytes: 10 * BYTES_PER_MB })
    );
    expect(plan.fitScale).toBe(480);
    expect(plan).toMatchObject({ height: 480, width: 854 });
    expect(plan.audioBitrate).toBe(64_000);
  });

  it("stops at the first Fit Scale that fits", () => {
    const plan = planEncode(
      INFO,
      settingsWith({ targetBytes: 12 * BYTES_PER_MB })
    );
    expect(plan.fitScale).toBe(720);
  });

  it("never goes below the lowest video bitrate", () => {
    const plan = planEncode(
      { ...INFO, durationSeconds: 36_000 },
      settingsWith({ targetBytes: BYTES_PER_MB })
    );
    expect(plan.videoBitrate).toBe(MIN_VIDEO_BITRATE);
  });

  it("writes no audio when the user removes it or the input has none", () => {
    expect(
      planEncode(INFO, settingsWith({ removeAudio: true })).audioBitrate
    ).toBeNull();
    expect(
      planEncode({ ...INFO, hasAudio: false }, DEFAULT_SETTINGS).audioBitrate
    ).toBeNull();
  });

  it("maps a Video Preset to a quality level and keeps no bitrate", () => {
    const plan = planEncode(
      INFO,
      settingsWith({ preset: "strong", sizeMode: "preset" })
    );
    expect(plan.qualityLevel).toBe("low");
    expect(plan.videoBitrate).toBeNull();
    expect(plan.audioBitrate).toBe(96_000);
  });

  it("applies Max Resolution and the frame rate cap", () => {
    const plan = planEncode(
      { ...INFO, frameRate: 60 },
      settingsWith({
        frameRateCap: "30",
        maxResolution: "720",
        sizeMode: "preset",
      })
    );
    expect(plan).toMatchObject({ frameRate: 30, height: 720, width: 1280 });
  });

  it("keeps the frame rate when it is already under the cap", () => {
    expect(
      planEncode(
        { ...INFO, frameRate: 24 },
        settingsWith({ frameRateCap: "30" })
      ).frameRate
    ).toBeNull();
  });
});

describe("retryBitrate", () => {
  it("scales the bitrate by how far over the output landed, less 10%", () => {
    const plan = planEncode(INFO, DEFAULT_SETTINGS);
    expect(retryBitrate(plan, 50 * BYTES_PER_MB, 25 * BYTES_PER_MB)).toBe(
      Math.floor(3_038_666 * 0.5 * 0.9)
    );
  });
});

describe("alreadyFitsInput", () => {
  it("uses an input that meets the Target and needs no change", () => {
    expect(alreadyFitsInput(INFO, BYTES_PER_MB, DEFAULT_SETTINGS)).toBe(true);
  });

  it("encodes when the user asks for a change, even under the Target", () => {
    expect(
      alreadyFitsInput(INFO, BYTES_PER_MB, settingsWith({ removeAudio: true }))
    ).toBe(false);
    expect(
      alreadyFitsInput(
        INFO,
        BYTES_PER_MB,
        settingsWith({ outputFormat: "webm" })
      )
    ).toBe(false);
    expect(
      alreadyFitsInput(
        INFO,
        BYTES_PER_MB,
        settingsWith({ maxResolution: "720" })
      )
    ).toBe(false);
  });

  it("is never true in Video Preset mode", () => {
    expect(
      alreadyFitsInput(INFO, BYTES_PER_MB, settingsWith({ sizeMode: "preset" }))
    ).toBe(false);
  });
});

describe("classifyOutput", () => {
  it("gives Compressed or Miss in Target mode", () => {
    const options = {
      changed: false,
      inputBytes: 90 * BYTES_PER_MB,
      settings: DEFAULT_SETTINGS,
    };
    expect(classifyOutput({ ...options, outputBytes: 20 * BYTES_PER_MB })).toBe(
      "done"
    );
    expect(classifyOutput({ ...options, outputBytes: 30 * BYTES_PER_MB })).toBe(
      "miss"
    );
  });

  it("gives Bigger only for a change the user asked for in Preset mode", () => {
    const options = {
      inputBytes: 10,
      outputBytes: 20,
      settings: settingsWith({ sizeMode: "preset" }),
    };
    expect(classifyOutput({ ...options, changed: true })).toBe("bigger");
    expect(classifyOutput({ ...options, changed: false })).toBe("already-fits");
    expect(classifyOutput({ ...options, changed: false, outputBytes: 5 })).toBe(
      "done"
    );
  });
});

describe("asksForChange", () => {
  it("is false for the defaults on a matching input", () => {
    expect(asksForChange(INFO, DEFAULT_SETTINGS)).toBe(false);
  });

  it("is true for a container change", () => {
    expect(
      asksForChange({ ...INFO, container: "webm" }, DEFAULT_SETTINGS)
    ).toBe(true);
  });
});

describe("incomingOf", () => {
  it("skips non-video files from a folder and counts duplicates", () => {
    const video = new File([new Uint8Array(2)], "clip.mov", {
      lastModified: 5,
      type: "video/quicktime",
    });
    const text = new File(["x"], "notes.txt", { type: "text/plain" });
    let next = 0;
    const first = incomingOf(
      new Map(),
      [
        { file: video, folderPath: "trip" },
        { file: text, folderPath: "trip" },
      ],
      () => `id-${(next += 1)}`
    );
    expect(first.accepted.map((item) => item.name)).toEqual(["clip.mov"]);
    expect(first.skipped).toBe(1);

    const current = new Map(first.accepted.map((item) => [item.id, item]));
    const again = incomingOf(
      current,
      [{ file: video, folderPath: null }],
      () => "id-x"
    );
    expect(again.accepted).toEqual([]);
    expect(again.duplicates).toBe(1);
  });

  it("lets a loose file in, so a wrong file gets a named reason", () => {
    const avi = new File(["x"], "old.avi", { type: "video/x-msvideo" });
    const text = new File(["x"], "notes.txt", { type: "text/plain" });
    const result = incomingOf(
      new Map(),
      [
        { file: avi, folderPath: null },
        { file: text, folderPath: null },
      ],
      () => crypto.randomUUID()
    );
    expect(result.accepted).toHaveLength(2);
  });
});

describe("looksLikeVideo", () => {
  it("reads the type or the extension", () => {
    expect(looksLikeVideo({ name: "a.MKV", type: "" })).toBe(true);
    expect(looksLikeVideo({ name: "a.bin", type: "video/mp4" })).toBe(true);
    expect(looksLikeVideo({ name: "a.txt", type: "text/plain" })).toBe(false);
  });
});

describe("summarize", () => {
  it("counts each result and sums the bytes of rows with a file", () => {
    const batch = new Map([
      ["a", itemOf("a", 100)],
      ["b", itemOf("b", 50)],
      ["c", itemOf("c", 70)],
      ["d", itemOf("d", 10)],
    ]);
    const results = new Map([
      ["a", resultOf("a", { file: fileOf(40), kind: "done" })],
      ["b", resultOf("b", { kind: "already-fits" })],
      ["c", resultOf("c", { kind: "rejected", problem: "container" })],
    ]);
    expect(summarize(batch, results)).toEqual({
      alreadyFits: 1,
      bigger: 0,
      done: 1,
      inputBytes: 150,
      misses: 0,
      outputBytes: 90,
      rejected: 1,
      total: 4,
    });
  });
});

describe("files and words", () => {
  it("names an output by the input stem and the format", () => {
    expect(outputNameOf(itemOf("a", 1, "Holiday.MOV"), "mp4")).toBe(
      "Holiday.mp4"
    );
    expect(outputNameOf(itemOf("a", 1, ".mov"), "webm")).toBe(".mov.webm");
  });

  it("prints a duration as m:ss or h:mm:ss", () => {
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(125.4)).toBe("2:05");
    expect(formatDuration(3725)).toBe("1:02:05");
  });

  it("gives the saving in percent, negative for growth", () => {
    expect(savedPercentOf(100, 25)).toBe(75);
    expect(savedPercentOf(100, 150)).toBe(-50);
    expect(savedPercentOf(0, 10)).toBe(0);
  });
});

/** A promise that stays pending until `open`. */
const held = () => {
  const gate = Promise.withResolvers<null>();
  return {
    open: () => {
      gate.resolve(null);
    },
    promise: gate.promise,
  };
};

/** Resolves when `signal` aborts, or immediately if it already has. */
const untilAbort = (signal: AbortSignal): Promise<null> => {
  if (signal.aborted) {
    return Promise.resolve(null);
  }
  const gate = Promise.withResolvers<null>();
  signal.addEventListener(
    "abort",
    () => {
      gate.resolve(null);
    },
    { once: true }
  );
  return gate.promise;
};

const succeed = (): Promise<boolean> => Promise.resolve(true);

describe("encodeSlots", () => {
  it("keeps the pool between two and four", () => {
    expect(encodeSlots()).toBe(2);
    expect(encodeSlots(2)).toBe(2);
    expect(encodeSlots(6)).toBe(3);
    expect(encodeSlots(16)).toBe(4);
    expect(encodeSlots(64)).toBe(4);
  });
});

describe("runSlots", () => {
  it("encodes up to the limit at once, then pulls the next video", async () => {
    const gate = held();
    const full = held();
    let active = 0;
    let peak = 0;
    const pending = runSlots(
      ["a", "b", "c", "d"],
      async () => {
        active += 1;
        peak = Math.max(peak, active);
        if (peak === 2) {
          full.open();
        }
        await gate.promise;
        active -= 1;
        return true;
      },
      { limit: 2, signal: new AbortController().signal }
    );
    await full.promise;
    expect(active).toBe(2);
    gate.open();
    await expect(pending).resolves.toBe(4);
    expect(peak).toBe(2);
  });

  it("stops every in-flight video when the run aborts, and starts no more", async () => {
    const controller = new AbortController();
    const both = held();
    const started: string[] = [];
    const pending = runSlots(
      ["a", "b", "c", "d"],
      async (id, signal) => {
        started.push(id);
        if (started.length === 2) {
          both.open();
        }
        await untilAbort(signal);
        return false;
      },
      { limit: 2, signal: controller.signal }
    );
    await both.promise;
    controller.abort();
    await expect(pending).resolves.toBe(0);
    expect(started).toEqual(["a", "b"]);
  });

  it("stops one video and lets the other finish", async () => {
    const stops = new Map<string, () => void>();
    const both = held();
    const release = held();
    let active = 0;
    const pending = runSlots(
      ["a", "b"],
      async (_id, signal) => {
        active += 1;
        if (active === 2) {
          both.open();
        }
        await Promise.race([untilAbort(signal), release.promise]);
        return !signal.aborted;
      },
      {
        limit: 2,
        onStart: (id, stop) => {
          stops.set(id, stop);
        },
        signal: new AbortController().signal,
      }
    );
    await both.promise;
    stops.get("a")?.();
    release.open();
    await expect(pending).resolves.toBe(1);
  });

  it("rejects when a video throws and does not start the next one", async () => {
    const started: string[] = [];
    const pending = runSlots(
      ["a", "b"],
      async (id) => {
        started.push(id);
        await Promise.resolve();
        throw new Error("boom");
      },
      { limit: 1, signal: new AbortController().signal }
    );
    await expect(pending).rejects.toThrow("boom");
    expect(started).toEqual(["a"]);
  });

  it("runs nothing when the list is empty or the run is already stopped", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      runSlots([], succeed, {
        limit: 2,
        signal: new AbortController().signal,
      })
    ).resolves.toBe(0);
    await expect(
      runSlots(["a"], succeed, { limit: 2, signal: controller.signal })
    ).resolves.toBe(0);
  });
});
