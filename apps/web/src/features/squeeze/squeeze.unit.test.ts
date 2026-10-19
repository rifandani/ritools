import { describe, expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";

import type {
  BatchItem,
  CompressInput,
  EncodeStep,
  ItemResult,
} from "@/features/squeeze/squeeze";
import {
  canSkipEncoding,
  compressImage,
  DEFAULT_SETTINGS,
  formatBytes,
  formatOf,
  ItemOutcome,
  ladderFor,
  outputBytesOf,
  problemKey,
  quantizeLevels,
  rowStateKey,
  rowViewOf,
  savingsPercent,
  scaleToFit,
  searchBestStep,
  settingsKeyOf,
  stepsFor,
  summarize,
  uniqueNames,
  workerCount,
} from "@/features/squeeze/squeeze";

const openedAt = (width: number, height: number) => ({
  height,
  sourceHeight: height,
  sourceWidth: width,
  width,
});

/** A codec that encodes `sizeOf(step)` bytes, and records every rung it saw. */
const codecFor = (
  sizeOf: (step: EncodeStep) => number,
  opened: {
    readonly height: number;
    readonly sourceHeight: number;
    readonly sourceWidth: number;
    readonly width: number;
  } = openedAt(100, 100)
) => {
  const steps: EncodeStep[] = [];
  return {
    codec: {
      encode: (step: EncodeStep) =>
        Effect.sync(() => {
          steps.push(step);
          return new ArrayBuffer(sizeOf(step));
        }),
      open: () => Effect.succeed(opened),
    },
    steps,
  };
};

const inputFor = (overrides: Partial<CompressInput> = {}): CompressInput => ({
  bytes: new ArrayBuffer(1000),
  format: "jpeg",
  inputBytes: 1000,
  settings: DEFAULT_SETTINGS,
  targetBytes: 500,
  ...overrides,
});

const imageOf = (outcome: ItemOutcome) =>
  ItemOutcome.$match(outcome, {
    Compressed: (image) => image,
    Miss: (image) => image,
    Rejected: () => null,
    UnderTarget: () => null,
  });

const itemFor = (overrides: Partial<BatchItem> = {}): BatchItem => ({
  format: Option.some("jpeg"),
  id: "a",
  name: "photo.jpg",
  size: 1000,
  source: new Blob([new ArrayBuffer(1000)]),
  targetBytes: null,
  ...overrides,
});

const resultFor = (id: string, outcome: ItemOutcome): ItemResult => ({
  id,
  key: "key",
  outcome,
});

describe("formatOf", () => {
  it("reads the format from the MIME type", () => {
    expect(Option.getOrNull(formatOf({ name: "a", type: "image/jpeg" }))).toBe(
      "jpeg"
    );
    expect(Option.getOrNull(formatOf({ name: "a", type: "image/avif" }))).toBe(
      "avif"
    );
  });

  it("falls back to the extension, in any case", () => {
    expect(Option.getOrNull(formatOf({ name: "a.JPG", type: "" }))).toBe(
      "jpeg"
    );
    expect(Option.getOrNull(formatOf({ name: "b.WEBP", type: "" }))).toBe(
      "webp"
    );
    expect(Option.getOrNull(formatOf({ name: "c.avif", type: "" }))).toBe(
      "avif"
    );
  });

  it("is empty for a format Squeeze does not read", () => {
    expect(Option.isNone(formatOf({ name: "a.bmp", type: "image/bmp" }))).toBe(
      true
    );
    expect(Option.isNone(formatOf({ name: "noext", type: "" }))).toBe(true);
  });
});

describe("ladderFor", () => {
  it("starts PNG at every colour and steps down the palette", () => {
    const ladder = ladderFor("png");
    expect(ladder[0]?.levels).toBeNull();
    expect(ladder[1]?.levels).toBe(8);
    expect(ladder.at(-1)?.levels).toBe(2);
  });

  it("starts AVIF below the lossy formats, because its scale differs", () => {
    expect(ladderFor("avif")[0]?.quality).toBe(70);
    expect(ladderFor("jpeg")[0]?.quality).toBe(95);
    expect(ladderFor("webp")[0]?.quality).toBe(95);
  });
});

describe("stepsFor", () => {
  it("uses the whole ladder to reach a Target", () => {
    expect(stepsFor("jpeg", DEFAULT_SETTINGS).length).toBeGreaterThan(5);
  });

  it("uses one rung in quality mode, and keeps PNG exact", () => {
    const steps = stepsFor("png", {
      ...DEFAULT_SETTINGS,
      mode: "quality",
      quality: 62,
    });
    expect(steps).toEqual([{ levels: null, quality: 62 }]);
  });
});

describe("quantizeLevels", () => {
  it("cuts the low bits of each channel and keeps alpha exact", () => {
    const reduced = quantizeLevels(
      {
        data: new Uint8ClampedArray([10, 200, 250, 128, 0, 0, 0, 255]),
        height: 1,
        width: 2,
      },
      2
    );
    expect([...reduced.data]).toEqual([0, 255, 255, 128, 0, 0, 0, 255]);
  });

  it("leaves an image alone at 256 levels", () => {
    const reduced = quantizeLevels(
      { data: new Uint8ClampedArray([1, 2, 3, 4]), height: 1, width: 1 },
      256
    );
    expect([...reduced.data]).toEqual([1, 2, 3, 4]);
  });
});

describe("scaleToFit", () => {
  it("leaves an image that already fits", () => {
    expect(scaleToFit({ height: 200, width: 100 }, 400)).toEqual({
      height: 200,
      width: 100,
    });
  });

  it("scales the longest edge to the limit", () => {
    expect(scaleToFit({ height: 200, width: 100 }, 50)).toEqual({
      height: 50,
      width: 25,
    });
    expect(scaleToFit({ height: 100, width: 400 }, 200)).toEqual({
      height: 50,
      width: 200,
    });
  });
});

describe("formatBytes", () => {
  it("reads a size in the Locale's units", () => {
    expect(formatBytes(512, "en-US")).toBe("512 B");
    expect(formatBytes(1500, "en-US")).toBe("1.5 KB");
    expect(formatBytes(200_000, "en-US")).toBe("200 KB");
    expect(formatBytes(2_500_000, "en-US")).toBe("2.5 MB");
    expect(formatBytes(3_000_000_000, "en-US")).toBe("3 GB");
    expect(formatBytes(-5, "en-US")).toBe("0 B");
  });
});

describe("savingsPercent", () => {
  it("reports a saving, a loss, and an input of nothing", () => {
    expect(savingsPercent(1000, 250)).toBe(75);
    expect(savingsPercent(1000, 1500)).toBe(-50);
    expect(savingsPercent(0, 100)).toBe(0);
  });
});

const ladder = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const measure = (step: number) => Effect.succeed({ size: step * 100 });

describe("searchBestStep", () => {
  it.effect("bisects to the best rung that fits", () =>
    Effect.gen(function* () {
      const outcome = yield* searchBestStep({
        fits: (result) => result.size <= 500,
        ladder,
        measure,
      });
      expect(outcome.best.step).toBe(5);
      expect(outcome.within).toBe(true);
      expect(outcome.probes).toBeLessThan(ladder.length);
    })
  );

  it.effect("reports the worst rung when nothing fits", () =>
    Effect.gen(function* () {
      const outcome = yield* searchBestStep({
        fits: () => false,
        ladder,
        measure,
      });
      expect(outcome.best.step).toBe(1);
      expect(outcome.within).toBe(false);
    })
  );

  it.effect("stops at the best rung when everything fits", () =>
    Effect.gen(function* () {
      const outcome = yield* searchBestStep({
        fits: () => true,
        ladder,
        measure,
      });
      expect(outcome.best.step).toBe(10);
      expect(outcome.within).toBe(true);
    })
  );

  it.effect("measures one rung of a one-rung ladder once", () =>
    Effect.gen(function* () {
      let probes = 0;
      const outcome = yield* searchBestStep({
        fits: () => false,
        ladder: [7],
        measure: (step: number) =>
          Effect.sync(() => {
            probes += 1;
            return { size: step * 100 };
          }),
      });
      expect(outcome.best.step).toBe(7);
      expect(outcome.within).toBe(false);
      expect(probes).toBe(1);
    })
  );
});

describe("canSkipEncoding", () => {
  const plan = {
    inputBytes: 100,
    settings: DEFAULT_SETTINGS,
    targetBytes: 200,
  };

  it("skips an input that already fits, and nothing else", () => {
    expect(canSkipEncoding(plan)).toBe(true);
    expect(canSkipEncoding({ ...plan, inputBytes: 300 })).toBe(false);
    expect(
      canSkipEncoding({
        ...plan,
        settings: { ...DEFAULT_SETTINGS, mode: "quality" },
      })
    ).toBe(false);
    expect(
      canSkipEncoding({
        ...plan,
        settings: { ...DEFAULT_SETTINGS, maxDimension: 800 },
      })
    ).toBe(false);
  });
});

describe("compressImage", () => {
  it.effect("keeps the best rung that fits the Target", () =>
    Effect.gen(function* () {
      const { codec, steps } = codecFor((step) => step.quality * 10);
      const outcome = yield* compressImage(codec, inputFor());
      expect(outcome._tag).toBe("Compressed");
      expect(imageOf(outcome)?.size).toBe(480);
      expect(steps.length).toBeLessThan(ladderFor("jpeg").length);
    })
  );

  it.effect("reports a Miss with the smallest output it made", () =>
    Effect.gen(function* () {
      const { codec } = codecFor((step) => step.quality * 10);
      const outcome = yield* compressImage(
        codec,
        inputFor({ targetBytes: 50 })
      );
      expect(outcome._tag).toBe("Miss");
      expect(imageOf(outcome)?.size).toBe(200);
    })
  );

  it.effect("hands back the input when no rung beats it", () =>
    Effect.gen(function* () {
      const { codec } = codecFor((step) => step.quality * 10);
      const outcome = yield* compressImage(
        codec,
        inputFor({
          bytes: new ArrayBuffer(100),
          inputBytes: 100,
          targetBytes: 50,
        })
      );
      const image = imageOf(outcome);
      expect(outcome._tag).toBe("Miss");
      expect(image?.size).toBe(100);
      expect(image?.resized).toBe(false);
      expect(image?.reducedColors).toBe(false);
    })
  );

  it.effect("treats the input size as the bar in quality mode", () =>
    Effect.gen(function* () {
      const settings = { ...DEFAULT_SETTINGS, mode: "quality" as const };
      const smaller = codecFor(() => 400);
      const bigger = codecFor(() => 4000);
      expect(
        (yield* compressImage(smaller.codec, inputFor({ settings })))._tag
      ).toBe("Compressed");
      expect(
        (yield* compressImage(bigger.codec, inputFor({ settings })))._tag
      ).toBe("Miss");
    })
  );

  it.effect("marks a resized and a colour-reduced output", () =>
    Effect.gen(function* () {
      const resized = codecFor(() => 100, {
        height: 50,
        sourceHeight: 100,
        sourceWidth: 100,
        width: 50,
      });
      const outcome = yield* compressImage(resized.codec, inputFor());
      expect(imageOf(outcome)?.resized).toBe(true);

      const png = codecFor((step) => (step.levels === null ? 900 : 100));
      const reduced = yield* compressImage(
        png.codec,
        inputFor({ format: "png" })
      );
      expect(imageOf(reduced)?.reducedColors).toBe(true);
    })
  );
});

describe("settingsKeyOf", () => {
  it("changes with the settings that decide an output", () => {
    expect(settingsKeyOf(DEFAULT_SETTINGS, 200_000)).toBe(
      "target:80:none:200000"
    );
    expect(
      settingsKeyOf({ ...DEFAULT_SETTINGS, maxDimension: 1024 }, 200_000)
    ).toBe("target:80:1024:200000");
  });
});

describe("outputBytesOf", () => {
  it("gives the output for a Compressed or Miss row, and nothing otherwise", () => {
    const image = {
      attempts: 1,
      bytes: new ArrayBuffer(10),
      height: 1,
      reducedColors: false,
      resized: false,
      size: 10,
      width: 1,
    };
    expect(
      outputBytesOf(itemFor(), resultFor("a", ItemOutcome.Compressed(image)))
        ?.byteLength
    ).toBe(10);
    expect(
      outputBytesOf(itemFor(), resultFor("a", ItemOutcome.Miss(image)))
        ?.byteLength
    ).toBe(10);
    expect(
      outputBytesOf(
        itemFor(),
        resultFor("a", ItemOutcome.UnderTarget({ size: 1 }))
      )
    ).toBeNull();
    expect(
      outputBytesOf(
        itemFor(),
        resultFor("a", ItemOutcome.Rejected({ problem: "unsupported" }))
      )
    ).toBeNull();
    const results = new Map<string, ItemResult>();
    expect(outputBytesOf(itemFor(), results.get("missing"))).toBeNull();
  });
});

describe("uniqueNames", () => {
  it("renames a repeat before its extension", () => {
    expect([...uniqueNames([])]).toEqual([]);
    expect([...uniqueNames(["a.jpg"])]).toEqual(["a.jpg"]);
    expect([...uniqueNames(["a.jpg", "a.jpg", "a.jpg"])]).toEqual([
      "a.jpg",
      "a-2.jpg",
      "a-3.jpg",
    ]);
  });

  it("handles a name with no extension, and a dot file", () => {
    expect([...uniqueNames(["noext", "noext"])]).toEqual(["noext", "noext-2"]);
    expect([...uniqueNames([".env", ".env"])]).toEqual([".env", ".env-2"]);
  });
});

describe("summarize", () => {
  const image = {
    attempts: 1,
    bytes: new ArrayBuffer(10),
    height: 1,
    reducedColors: false,
    resized: false,
    size: 100,
    width: 1,
  };

  it("adds an empty Batch to nothing", () => {
    expect(summarize(new Map(), new Map())).toEqual({
      done: 0,
      inputBytes: 0,
      misses: 0,
      outputBytes: 0,
      rejected: 0,
      total: 0,
    });
  });

  it("counts a row without a result at its input size", () => {
    const items = new Map([["a", itemFor({ size: 500 })]]);
    expect(summarize(items, new Map())).toEqual({
      done: 0,
      inputBytes: 500,
      misses: 0,
      outputBytes: 500,
      rejected: 0,
      total: 1,
    });
  });

  it("counts a state per outcome", () => {
    const items = new Map([
      ["a", itemFor({ size: 1000 })],
      ["b", itemFor({ size: 1000 })],
      ["c", itemFor({ size: 1000 })],
      ["d", itemFor({ size: 1000 })],
    ]);
    const results = new Map([
      ["a", resultFor("a", ItemOutcome.Compressed(image))],
      ["b", resultFor("b", ItemOutcome.Miss(image))],
      ["c", resultFor("c", ItemOutcome.UnderTarget({ size: 1000 }))],
      ["d", resultFor("d", ItemOutcome.Rejected({ problem: "unreadable" }))],
    ]);
    expect(summarize(items, results)).toEqual({
      done: 4,
      inputBytes: 4000,
      misses: 1,
      outputBytes: 100 + 100 + 1000 + 1000,
      rejected: 1,
      total: 4,
    });
  });
});

describe("rowViewOf", () => {
  const image = {
    attempts: 2,
    bytes: new ArrayBuffer(250),
    height: 60,
    reducedColors: true,
    resized: true,
    size: 250,
    width: 80,
  };

  it("is working before there is a result", () => {
    const results = new Map<string, ItemResult>();
    expect(rowViewOf(itemFor(), results.get("missing"))).toEqual({
      dimension: null,
      problem: null,
      reducedColors: false,
      resized: false,
      saved: 0,
      size: null,
      state: "working",
    });
  });

  it("reads a Compressed row down to its notes", () => {
    expect(
      rowViewOf(itemFor(), resultFor("a", ItemOutcome.Compressed(image)))
    ).toEqual({
      dimension: "80×60",
      problem: null,
      reducedColors: true,
      resized: true,
      saved: 75,
      size: 250,
      state: "compressed",
    });
  });

  it("reads a Miss, a row that already fits, and a rejected one", () => {
    expect(
      rowViewOf(itemFor(), resultFor("a", ItemOutcome.Miss(image))).state
    ).toBe("miss");
    expect(
      rowViewOf(itemFor(), resultFor("a", ItemOutcome.UnderTarget({ size: 1 })))
    ).toMatchObject({ saved: 0, size: 1000, state: "under-target" });
    expect(
      rowViewOf(
        itemFor(),
        resultFor("a", ItemOutcome.Rejected({ problem: "unreadable" }))
      )
    ).toMatchObject({ problem: "unreadable", size: 1000, state: "rejected" });
  });

  it("maps every state and reason to a Translation Key", () => {
    expect(rowStateKey("compressed")).toBe("squeezeStateCompressed");
    expect(rowStateKey("miss")).toBe("squeezeStateMiss");
    expect(rowStateKey("rejected")).toBe("squeezeStateRejected");
    expect(rowStateKey("under-target")).toBe("squeezeStateUnderTarget");
    expect(rowStateKey("working")).toBe("squeezeWorking");
    expect(problemKey("codec-failed")).toBe("squeezeProblemCodecFailed");
    expect(problemKey("unreadable")).toBe("squeezeProblemUnreadable");
    expect(problemKey("unsupported")).toBe("squeezeProblemUnsupported");
  });
});

describe("workerCount", () => {
  it("keeps the pool between two and four", () => {
    expect(workerCount()).toBe(2);
    expect(workerCount(2)).toBe(2);
    expect(workerCount(6)).toBe(3);
    expect(workerCount(16)).toBe(4);
    expect(workerCount(64)).toBe(4);
  });
});
