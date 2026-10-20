import { describe, expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";

import type {
  BatchItem,
  CodecSession,
  CompressInput,
  EncodeStep,
  ImageFormat,
  InputFormat,
  ItemResult,
  OpenedImage,
  OutputFormat,
  SizeMode,
  OutcomeKind,
  OutputFile,
  SqueezeOutcome,
  SqueezeSettings,
} from "@/features/squeeze/squeeze";
import {
  allCodecOffline,
  alreadyFitsOutcome,
  batchItemOf,
  batchShare,
  BYTES_PER_KB,
  canOverrideTarget,
  canSkipEncoding,
  classifyCodecFailure,
  compressImage,
  DEFAULT_SETTINGS,
  dedupeIncoming,
  exifAvailable,
  exifSegmentOf,
  flattenOnWhite,
  folderStructureAvailable,
  formatBytes,
  formatsFor,
  inputFormatOf,
  insertExifSegment,
  isOutputAvailable,
  isStale,
  keepFormatOf,
  ladderFor,
  MAX_QUALITY,
  MIME_TYPE,
  MIN_QUALITY,
  MIN_TARGET_BYTES,
  noteKey,
  outputFilesOf,
  problemKey,
  quantizeLevels,
  redistribute,
  rowStateKey,
  rowViewOf,
  savingsPercent,
  scaleToFitBox,
  searchBestStep,
  settingsIssueKey,
  settingsIssues,
  settingsKeyOf,
  SqueezeError,
  stepsFor,
  summarize,
  uniqueNames,
  watchFolderSupported,
  withBudgetNotes,
  workerCount,
  zipPlanOf,
} from "@/features/squeeze/squeeze";

const openedAt = (
  width: number,
  height: number,
  overrides: Partial<OpenedImage> = {}
): OpenedImage => ({
  animated: false,
  hasAlpha: false,
  height,
  sourceHeight: height,
  sourceWidth: width,
  width,
  ...overrides,
});

interface CodecOptions {
  readonly opened?: OpenedImage;
  readonly sizeOf?: (format: ImageFormat, step: EncodeStep) => number;
}

/** A codec whose output size is decided by the test, and which records every rung. */
const codecFor = (options: CodecOptions = {}) => {
  const steps: { readonly format: ImageFormat; readonly step: EncodeStep }[] =
    [];
  const sizeOf =
    options.sizeOf ??
    ((_format: ImageFormat, step: EncodeStep) => step.quality * 10);
  const codec: CodecSession = {
    encode: (format, step) =>
      Effect.suspend(() => {
        steps.push({ format, step });
        return Effect.succeed(new ArrayBuffer(sizeOf(format, step)));
      }),
    open: () => Effect.succeed(options.opened ?? openedAt(100, 100)),
  };
  return { codec, steps };
};

const squeezeFailure = (problem: "codec-failed" | "too-large" | "unreadable") =>
  new SqueezeError({ detail: "the codec failed", problem });

/** The same codec, but a format it cannot encode fails like the Worker does. */
const failingCodec = (failed: readonly ImageFormat[]) => {
  const steps: { readonly format: ImageFormat; readonly step: EncodeStep }[] =
    [];
  const codec: CodecSession = {
    encode: (format, step) =>
      Effect.suspend(() => {
        steps.push({ format, step });
        return failed.includes(format)
          ? Effect.fail(squeezeFailure("codec-failed"))
          : Effect.succeed(new ArrayBuffer(step.quality * 10));
      }),
    open: () => Effect.succeed(openedAt(100, 100)),
  };
  return { codec, steps };
};

const settingsFor = (
  outputFormat: OutputFormat,
  sizeMode: SizeMode,
  overrides: Partial<SqueezeSettings> = {}
): SqueezeSettings => ({
  ...DEFAULT_SETTINGS,
  outputFormat,
  sizeMode,
  ...overrides,
});

const inputFor = (overrides: Partial<CompressInput> = {}): CompressInput => ({
  bytes: new ArrayBuffer(1000),
  inputBytes: 1000,
  inputFormat: "jpeg",
  settings: DEFAULT_SETTINGS,
  targetBytes: 500,
  ...overrides,
});

const itemFor = (overrides: Partial<BatchItem> = {}): BatchItem => ({
  folderPath: null,
  format: Option.some("jpeg"),
  id: "a",
  lastModified: 1,
  name: "photo.jpg",
  size: 1000,
  source: new Blob([new ArrayBuffer(1000)]),
  targetBytes: null,
  ...overrides,
});

const resultFor = (
  id: string,
  outcome: ItemResult["outcome"],
  key = "key"
): ItemResult => ({ id, key, outcome });

/** A complete outcome, so a focused test declares only the fields it reads. */
const outcomeOf = (
  kind: OutcomeKind,
  overrides: Partial<SqueezeOutcome> = {}
): SqueezeOutcome => ({
  files: [],
  inputBytes: 1000,
  kind,
  notes: [],
  outputBytes: 1000,
  parts: [],
  problem: null,
  raisedTargetBytes: null,
  smallestStep: null,
  underTargetCount: 0,
  writtenCount: 0,
  ...overrides,
});

/** One written file, for the outcome and ZIP tests. */
const imageFile = (size: number, format: ImageFormat): OutputFile => ({
  bytes: new ArrayBuffer(size),
  format,
  height: 1,
  levels: null,
  quality: 80,
  size,
  width: 1,
});

/** A minimal JPEG: SOI, an APP1 EXIF segment, SOS, and EOI. */
const jpegWithExif = () => {
  const exif = [0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
  return new Uint8Array([
    0xff,
    0xd8,
    ...exif,
    0xff,
    0xda,
    0x00,
    0x02,
    0xff,
    0xd9,
  ]).buffer;
};

/* ------------------------------------------------------------------------- */
/* Input formats                                                             */
/* ------------------------------------------------------------------------- */

describe("inputFormatOf", () => {
  it("reads the six input formats from the MIME type", () => {
    expect(
      Option.getOrNull(inputFormatOf({ name: "a", type: "image/jpeg" }))
    ).toBe("jpeg");
    expect(
      Option.getOrNull(inputFormatOf({ name: "a", type: "image/png" }))
    ).toBe("png");
    expect(
      Option.getOrNull(inputFormatOf({ name: "a", type: "image/webp" }))
    ).toBe("webp");
    expect(
      Option.getOrNull(inputFormatOf({ name: "a", type: "image/avif" }))
    ).toBe("avif");
    expect(
      Option.getOrNull(inputFormatOf({ name: "a", type: "image/gif" }))
    ).toBe("gif");
    expect(
      Option.getOrNull(inputFormatOf({ name: "a", type: "image/bmp" }))
    ).toBe("bmp");
  });

  it("falls back to the extension, in any case", () => {
    expect(Option.getOrNull(inputFormatOf({ name: "a.JPG", type: "" }))).toBe(
      "jpeg"
    );
    expect(Option.getOrNull(inputFormatOf({ name: "b.GIF", type: "" }))).toBe(
      "gif"
    );
    expect(Option.getOrNull(inputFormatOf({ name: "c.Bmp", type: "" }))).toBe(
      "bmp"
    );
  });

  it("is empty for a file Squeeze does not read", () => {
    expect(
      Option.isNone(inputFormatOf({ name: "a.svg", type: "image/svg+xml" }))
    ).toBe(true);
    expect(Option.isNone(inputFormatOf({ name: "noext", type: "" }))).toBe(
      true
    );
  });
});

describe("keepFormatOf", () => {
  it("writes the input format, and PNG for GIF and BMP", () => {
    expect(keepFormatOf("jpeg")).toBe("jpeg");
    expect(keepFormatOf("png")).toBe("png");
    expect(keepFormatOf("webp")).toBe("webp");
    expect(keepFormatOf("avif")).toBe("avif");
    expect(keepFormatOf("gif")).toBe("png");
    expect(keepFormatOf("bmp")).toBe("png");
  });
});

describe("formatsFor", () => {
  it("writes one format, or three for Multi, and never PNG in Multi", () => {
    expect(formatsFor("jpeg", "png")).toEqual(["jpeg"]);
    expect(formatsFor("png", "jpeg")).toEqual(["png"]);
    expect(formatsFor("keep", "jpeg")).toEqual(["jpeg"]);
    expect(formatsFor("keep", "gif")).toEqual(["png"]);
    expect(formatsFor("multi", "png")).toEqual(["jpeg", "webp", "avif"]);
  });
});

/* ------------------------------------------------------------------------- */
/* Output Format is a setting                                                */
/* ------------------------------------------------------------------------- */

describe("isOutputAvailable", () => {
  it("offers every output in Per-image and Fixed quality", () => {
    for (const output of [
      "jpeg",
      "webp",
      "avif",
      "png",
      "keep",
      "multi",
    ] as const) {
      expect(isOutputAvailable(output, "per-image")).toBe(true);
      expect(isOutputAvailable(output, "fixed-quality")).toBe(true);
    }
  });

  it("disables Multi and Batch total for each other", () => {
    expect(isOutputAvailable("multi", "batch-total")).toBe(false);
    expect(isOutputAvailable("jpeg", "batch-total")).toBe(true);
  });
});

describe("exifAvailable", () => {
  const jpeg = itemFor({ format: Option.some("jpeg") });
  const png = itemFor({ format: Option.some("png"), name: "a.png" });

  it("is on for JPEG output when a JPEG input exists", () => {
    expect(exifAvailable("jpeg", [jpeg])).toBe(true);
    expect(exifAvailable("jpeg", [png])).toBe(false);
  });

  it("is off for the other single outputs", () => {
    expect(exifAvailable("webp", [jpeg])).toBe(false);
    expect(exifAvailable("avif", [jpeg])).toBe(false);
    expect(exifAvailable("png", [jpeg])).toBe(false);
  });

  it("is on for Keep and Multi only when a JPEG input exists", () => {
    expect(exifAvailable("keep", [jpeg])).toBe(true);
    expect(exifAvailable("keep", [png])).toBe(false);
    expect(exifAvailable("multi", [jpeg])).toBe(true);
    expect(exifAvailable("multi", [png])).toBe(false);
  });
});

describe("folderStructureAvailable", () => {
  it("needs at least one folder path", () => {
    expect(folderStructureAvailable([itemFor()])).toBe(false);
    expect(
      folderStructureAvailable([itemFor({ folderPath: "trip/day1" })])
    ).toBe(true);
  });
});

describe("canOverrideTarget", () => {
  it("allows an override in Per-image target only", () => {
    expect(canOverrideTarget("per-image")).toBe(true);
    expect(canOverrideTarget("batch-total")).toBe(false);
    expect(canOverrideTarget("fixed-quality")).toBe(false);
  });
});

/* ------------------------------------------------------------------------- */
/* Settings validation                                                       */
/* ------------------------------------------------------------------------- */

describe("settingsIssues", () => {
  it("accepts the defaults", () => {
    expect(settingsIssues(DEFAULT_SETTINGS, 3)).toEqual([]);
  });

  it("rejects a Target, a quality, and a resize outside their ranges", () => {
    expect(settingsIssues({ ...DEFAULT_SETTINGS, targetBytes: 1 }, 1)).toEqual([
      { kind: "target-range" },
    ]);
    expect(
      settingsIssues({ ...DEFAULT_SETTINGS, quality: MIN_QUALITY - 1 }, 1)
    ).toEqual([{ kind: "quality-range" }]);
    expect(
      settingsIssues({ ...DEFAULT_SETTINGS, quality: MAX_QUALITY + 1 }, 1)
    ).toEqual([{ kind: "quality-range" }]);
    expect(settingsIssues({ ...DEFAULT_SETTINGS, maxWidth: 0 }, 1)).toEqual([
      { kind: "resize-range" },
    ]);
    expect(
      settingsIssues({ ...DEFAULT_SETTINGS, maxHeight: 10_001 }, 1)
    ).toEqual([{ kind: "resize-range" }]);
  });

  it("rejects a Batch share under 10 KB", () => {
    const settings = settingsFor("jpeg", "batch-total", {
      batchTotalBytes: 27 * BYTES_PER_KB,
    });

    expect(settingsIssues(settings, 3)).toEqual([
      { kind: "share-too-small", share: 9 * BYTES_PER_KB },
    ]);
    expect(settingsIssueKey({ kind: "share-too-small", share: 9000 })).toBe(
      "squeezeReasonShareTooSmall"
    );
  });

  it("rejects Multi with Batch total", () => {
    expect(settingsIssues(settingsFor("multi", "batch-total"), 3)).toEqual([
      { kind: "multi-batch-total" },
    ]);
    expect(settingsIssueKey({ kind: "multi-batch-total" })).toBe(
      "squeezeReasonMultiBatchTotal"
    );
  });
});

/* ------------------------------------------------------------------------- */
/* The state matrix: 6 inputs x 6 outputs x 3 modes                          */
/* ------------------------------------------------------------------------- */

const INPUTS: readonly InputFormat[] = [
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "bmp",
];

const OUTPUTS: readonly OutputFormat[] = [
  "jpeg",
  "webp",
  "avif",
  "png",
  "keep",
  "multi",
];

const writesSameFormat = (output: OutputFormat, input: InputFormat) =>
  output === "keep" ? keepFormatOf(input) === input : output === input;

/**
 * Every cell of the state matrix in section 5 of the brief. The expected
 * outcome is the *family* the cell allows; the focused tests below pin the
 * exact branch and the notes.
 */
describe("state matrix: target modes", () => {
  for (const sizeMode of ["per-image", "batch-total"] as const) {
    for (const output of OUTPUTS) {
      for (const input of INPUTS) {
        const same = writesSameFormat(output, input);
        const available =
          isOutputAvailable(output, sizeMode) &&
          !(sizeMode === "batch-total" && output === "multi");

        it.effect(`${sizeMode} · ${output} · ${input}`, () =>
          Effect.gen(function* () {
            if (!available) {
              expect(isOutputAvailable(output, "batch-total")).toBe(
                output !== "multi"
              );
              return;
            }

            // 1. An encode that fits the Target is DONE, never BIGGER.
            const fits = yield* compressImage(
              codecFor({ sizeOf: () => 100 }).codec,
              inputFor({
                inputFormat: input,
                settings: settingsFor(output, sizeMode),
              })
            );
            expect(fits.kind).toBe("done");
            expect(fits.kind).not.toBe("bigger");

            // 2. The same format under the Target, without a resize, is ALREADY
            //    FITS; a conversion always encodes.
            const under = yield* compressImage(
              codecFor({ sizeOf: () => 100 }).codec,
              inputFor({
                inputBytes: 400,
                inputFormat: input,
                settings: settingsFor(output, sizeMode),
                targetBytes: 500,
              })
            );
            expect(under.kind).toBe(same ? "already-fits" : "done");

            // 3. An encode over the Target is a MISS, never a rejection.
            const miss = yield* compressImage(
              codecFor({ sizeOf: () => 9000 }).codec,
              inputFor({
                inputFormat: input,
                settings: settingsFor(output, sizeMode),
              })
            );
            expect(miss.kind).toBe("miss");
          })
        );
      }
    }
  }
});

describe("state matrix: fixed quality", () => {
  for (const output of OUTPUTS) {
    for (const input of INPUTS) {
      const same = writesSameFormat(output, input);

      it.effect(`fixed quality · ${output} · ${input}`, () =>
        Effect.gen(function* () {
          // 1. An output smaller than the input is DONE.
          const smaller = yield* compressImage(
            codecFor({ sizeOf: () => 100 }).codec,
            inputFor({
              inputFormat: input,
              settings: settingsFor(output, "fixed-quality"),
              targetBytes: null,
            })
          );
          expect(smaller.kind).toBe("done");

          // 2. An output larger than the input: BIGGER for a conversion or a
          //    resize, ALREADY FITS for the original format at the same size.
          const larger = yield* compressImage(
            codecFor({ sizeOf: () => 9000 }).codec,
            inputFor({
              inputFormat: input,
              settings: settingsFor(output, "fixed-quality"),
              targetBytes: null,
            })
          );
          expect(larger.kind).toBe(same ? "already-fits" : "bigger");
        })
      );
    }
  }
});

/* ------------------------------------------------------------------------- */
/* Outcome rules                                                             */
/* ------------------------------------------------------------------------- */

describe("compressImage: Target modes", () => {
  it.effect(
    "delivers a conversion that grew but still fits, and names the growth",
    () =>
      Effect.gen(function* () {
        const outcome = yield* compressImage(
          codecFor({ sizeOf: () => 1500 }).codec,
          inputFor({
            settings: settingsFor("webp", "per-image"),
            targetBytes: 200_000,
          })
        );

        expect(outcome.kind).toBe("done");
        expect(outcome.outputBytes).toBe(1500);
        expect(outcome.notes).toContainEqual({
          kind: "bigger-than-input",
          percent: 50,
        });
      })
  );

  it.effect(
    "keeps the smallest output on a Miss and names the smallest rung",
    () =>
      Effect.gen(function* () {
        const { codec } = codecFor({
          sizeOf: (_format, step) => step.quality * 10,
        });
        const outcome = yield* compressImage(
          codec,
          inputFor({ targetBytes: 50 })
        );

        expect(outcome.kind).toBe("miss");
        expect(outcome.outputBytes).toBe(200);
        expect(outcome.smallestStep).toBe("q20");
      })
  );

  it.effect("keeps the original when no attempt was smaller", () =>
    Effect.gen(function* () {
      const outcome = yield* compressImage(
        codecFor({ sizeOf: () => 1200 }).codec,
        inputFor({ targetBytes: 50 })
      );

      expect(outcome.kind).toBe("miss");
      expect(outcome.outputBytes).toBe(1000);
      expect(outcome.files).toEqual([]);
      expect(outcome.notes).toContainEqual({ kind: "no-smaller" });
    })
  );

  it.effect(
    "still delivers the smallest converted file when it is larger than the input",
    () =>
      Effect.gen(function* () {
        const outcome = yield* compressImage(
          codecFor({ sizeOf: () => 1200 }).codec,
          inputFor({
            settings: settingsFor("webp", "per-image"),
            targetBytes: 50,
          })
        );

        expect(outcome.kind).toBe("miss");
        expect(outcome.outputBytes).toBe(1200);
        expect(outcome.files[0]?.format).toBe("webp");
      })
  );

  it.effect(
    "is ALREADY FITS only for the same format at or under the Target",
    () =>
      Effect.gen(function* () {
        const outcome = yield* compressImage(
          codecFor().codec,
          inputFor({ inputBytes: 400, targetBytes: 500 })
        );

        expect(outcome.kind).toBe("already-fits");
        expect(outcome.outputBytes).toBe(400);
        expect(outcome.files).toEqual([]);
        expect(outcome.notes).toContainEqual({ kind: "original-used" });
      })
  );

  it.effect("rejects an unreadable input instead of failing the Batch", () =>
    Effect.gen(function* () {
      const codec: CodecSession = {
        encode: () => Effect.die("no"),
        open: () =>
          Effect.fail(
            new SqueezeError({ detail: "not an image", problem: "unreadable" })
          ),
      };
      const outcome = yield* compressImage(codec, inputFor());

      expect(outcome.kind).toBe("rejected");
      expect(outcome.problem).toBe("unreadable");
      expect(outcome.outputBytes).toBe(1000);
    })
  );

  it.effect("rejects an image too large for the device", () =>
    Effect.gen(function* () {
      const codec: CodecSession = {
        encode: () => Effect.die("no"),
        open: () =>
          Effect.fail(
            new SqueezeError({ detail: "out of memory", problem: "too-large" })
          ),
      };
      const outcome = yield* compressImage(codec, inputFor());

      expect(outcome).toMatchObject({
        kind: "rejected",
        problem: "too-large",
      });
    })
  );
});

describe("compressImage: Fixed quality", () => {
  it.effect(
    "keeps the original when the same format does not get smaller",
    () =>
      Effect.gen(function* () {
        const outcome = yield* compressImage(
          codecFor({ sizeOf: () => 1000 }).codec,
          inputFor({
            settings: settingsFor("jpeg", "fixed-quality"),
            targetBytes: null,
          })
        );

        expect(outcome.kind).toBe("already-fits");
        expect(outcome.outputBytes).toBe(1000);
        expect(outcome.files).toEqual([]);
      })
  );

  it.effect("delivers a converted file that grew, as BIGGER", () =>
    Effect.gen(function* () {
      const outcome = yield* compressImage(
        codecFor({ sizeOf: () => 1500 }).codec,
        inputFor({
          settings: settingsFor("avif", "fixed-quality"),
          targetBytes: null,
        })
      );

      expect(outcome.kind).toBe("bigger");
      expect(outcome.outputBytes).toBe(1500);
    })
  );

  it.effect("uses one rung, and keeps PNG lossless", () =>
    Effect.gen(function* () {
      const { codec, steps } = codecFor({ sizeOf: () => 100 });
      yield* compressImage(
        codec,
        inputFor({
          inputFormat: "png",
          settings: settingsFor("png", "fixed-quality", { quality: 62 }),
          targetBytes: null,
        })
      );

      expect(steps).toEqual([
        { format: "png", step: { levels: null, quality: 62 } },
      ]);
    })
  );
});

describe("compressImage: Multi", () => {
  it.effect("writes three files, one stem, and sums the growth", () =>
    Effect.gen(function* () {
      const { codec, steps } = codecFor({ sizeOf: () => 100 });
      const outcome = yield* compressImage(
        codec,
        inputFor({ settings: settingsFor("multi", "per-image") })
      );

      expect([...new Set(steps.map((step) => step.format))]).toEqual([
        "jpeg",
        "webp",
        "avif",
      ]);
      expect(outcome.kind).toBe("done");
      expect(outcome.files.length).toBe(3);
      expect(outcome.parts.map((part) => part.format)).toEqual([
        "jpeg",
        "webp",
        "avif",
      ]);
      expect(outcome.outputBytes).toBe(300);
      expect(outcome.writtenCount).toBe(3);
      expect(outcome.underTargetCount).toBe(3);
    })
  );

  it.effect("is MISS when any format misses, and names how many fit", () =>
    Effect.gen(function* () {
      const outcome = yield* compressImage(
        codecFor({
          sizeOf: (format) => (format === "avif" ? 9000 : 100),
        }).codec,
        inputFor({
          settings: settingsFor("multi", "per-image", { targetBytes: 500 }),
        })
      );

      expect(outcome.kind).toBe("miss");
      expect(outcome.underTargetCount).toBe(2);
      expect(outcome.parts.map((part) => part.state)).toEqual([
        "done",
        "done",
        "miss",
      ]);
    })
  );

  it.effect(
    "keeps the worst written outcome when a codec fails, and counts written",
    () =>
      Effect.gen(function* () {
        const outcome = yield* compressImage(
          failingCodec(["avif"]).codec,
          inputFor({ settings: settingsFor("multi", "per-image") })
        );

        expect(outcome.kind).toBe("done");
        expect(outcome.writtenCount).toBe(2);
        expect(outcome.parts[2]?.state).toBe("failed");
      })
  );

  it.effect("rejects the row when all three fail", () =>
    Effect.gen(function* () {
      const outcome = yield* compressImage(
        failingCodec(["jpeg", "webp", "avif"]).codec,
        inputFor({ settings: settingsFor("multi", "per-image") })
      );

      expect(outcome.kind).toBe("rejected");
      expect(outcome.writtenCount).toBe(0);
    })
  );

  it.effect(
    "is DONE when the sum is at or under the input in Fixed quality",
    () =>
      Effect.gen(function* () {
        const outcome = yield* compressImage(
          codecFor({ sizeOf: () => 300 }).codec,
          inputFor({
            settings: settingsFor("multi", "fixed-quality"),
            targetBytes: null,
          })
        );

        expect(outcome.kind).toBe("done");
      })
  );

  it.effect("is BIGGER when the sum is over the input in Fixed quality", () =>
    Effect.gen(function* () {
      const outcome = yield* compressImage(
        codecFor({ sizeOf: () => 400 }).codec,
        inputFor({
          settings: settingsFor("multi", "fixed-quality"),
          targetBytes: null,
        })
      );

      expect(outcome.kind).toBe("bigger");
      // Each of the three files is smaller than the input on its own; the
      // headline is BIGGER because their sum is over it.
      expect(outcome.outputBytes).toBe(1200);
      expect(outcome.parts.every((part) => part.state === "done")).toBe(true);
    })
  );
});

/* ------------------------------------------------------------------------- */
/* Row notes                                                                 */
/* ------------------------------------------------------------------------- */

describe("row notes", () => {
  it.effect("flattens alpha on white for JPEG output only", () =>
    Effect.gen(function* () {
      const alpha = codecFor({
        opened: openedAt(100, 100, { hasAlpha: true }),
      });
      const jpeg = yield* compressImage(
        alpha.codec,
        inputFor({
          inputFormat: "png",
          settings: settingsFor("jpeg", "per-image"),
        })
      );
      expect(jpeg.notes).toContainEqual({ kind: "flattened" });

      const kept = yield* compressImage(
        alpha.codec,
        inputFor({
          inputFormat: "png",
          settings: settingsFor("webp", "per-image"),
        })
      );
      expect(kept.notes).not.toContainEqual({ kind: "flattened" });
    })
  );

  it.effect("names the first frame for GIF", () =>
    Effect.gen(function* () {
      const outcome = yield* compressImage(
        codecFor().codec,
        inputFor({
          inputFormat: "gif",
          settings: settingsFor("jpeg", "per-image"),
        })
      );

      expect(outcome.notes).toContainEqual({ kind: "first-frame" });
    })
  );

  it.effect("names a resize with both dimensions", () =>
    Effect.gen(function* () {
      const outcome = yield* compressImage(
        codecFor({
          opened: openedAt(50, 40, { sourceWidth: 100, sourceHeight: 80 }),
        }).codec,
        inputFor({
          settings: settingsFor("jpeg", "per-image", { maxWidth: 50 }),
        })
      );

      expect(outcome.notes).toContainEqual({
        kind: "resized",
        from: "100×80",
        to: "50×40",
      });
    })
  );

  it.effect("does not name a resize when the image already fits the caps", () =>
    Effect.gen(function* () {
      const outcome = yield* compressImage(
        codecFor({ opened: openedAt(100, 80) }).codec,
        inputFor({
          inputBytes: 400,
          settings: settingsFor("jpeg", "per-image", { maxWidth: 1600 }),
        })
      );

      expect(outcome.kind).toBe("already-fits");
      expect(outcome.notes).not.toContainEqual(
        expect.objectContaining({ kind: "resized" })
      );
    })
  );

  it.effect("names reduced colours when PNG was quantised", () =>
    Effect.gen(function* () {
      const outcome = yield* compressImage(
        codecFor({
          sizeOf: (_format, step) => (step.levels === null ? 900 : 100),
        }).codec,
        inputFor({
          inputFormat: "png",
          settings: settingsFor("png", "per-image"),
        })
      );

      expect(outcome.kind).toBe("done");
      expect(outcome.notes).toContainEqual({ kind: "colors-reduced" });
    })
  );

  it.effect("names kept EXIF only for JPEG output with the option on", () =>
    Effect.gen(function* () {
      const kept = yield* compressImage(
        codecFor().codec,
        inputFor({
          settings: settingsFor("jpeg", "per-image", { preserveExif: true }),
        })
      );
      expect(kept.notes).toContainEqual({ kind: "exif-kept" });

      const dropped = yield* compressImage(
        codecFor().codec,
        inputFor({
          settings: settingsFor("webp", "per-image", { preserveExif: true }),
        })
      );
      expect(dropped.notes).not.toContainEqual({ kind: "exif-kept" });
    })
  );

  it("maps every note to a Translation Key", () => {
    expect(noteKey({ kind: "colors-reduced" })).toBe(
      "squeezeNoteColorsReduced"
    );
    expect(noteKey({ kind: "flattened" })).toBe("squeezeNoteFlattened");
    expect(noteKey({ kind: "first-frame" })).toBe("squeezeNoteFirstFrame");
    expect(noteKey({ kind: "exif-kept" })).toBe("squeezeNoteExifKept");
    expect(noteKey({ kind: "original-used" })).toBe("squeezeNoteOriginalUsed");
    expect(noteKey({ kind: "out-of-date" })).toBe("squeezeNoteOutOfDate");
    expect(noteKey({ kind: "no-smaller" })).toBe("squeezeNoteNoSmaller");
    expect(noteKey({ kind: "bigger-than-input", percent: 18 })).toBe(
      "squeezeNoteBiggerThanInput"
    );
    expect(noteKey({ kind: "resized", from: "1×1", to: "1×1" })).toBe(
      "squeezeNoteResized"
    );
    expect(noteKey({ kind: "raised", bytes: 1 })).toBe("squeezeNoteRaised");
    expect(noteKey({ kind: "still-over", bytes: 1 })).toBe(
      "squeezeNoteStillOver"
    );
  });
});

/* ------------------------------------------------------------------------- */
/* Resize                                                                    */
/* ------------------------------------------------------------------------- */

describe("scaleToFitBox", () => {
  it("never upscales", () => {
    expect(scaleToFitBox({ height: 200, width: 100 }, 400, 400)).toEqual({
      height: 200,
      width: 100,
    });
    expect(scaleToFitBox({ height: 200, width: 100 }, null, null)).toEqual({
      height: 200,
      width: 100,
    });
  });

  it("fits inside both caps", () => {
    expect(scaleToFitBox({ height: 100, width: 400 }, 200, null)).toEqual({
      height: 50,
      width: 200,
    });
    expect(scaleToFitBox({ height: 400, width: 100 }, null, 200)).toEqual({
      height: 200,
      width: 50,
    });
    expect(scaleToFitBox({ height: 400, width: 400 }, 200, 100)).toEqual({
      height: 100,
      width: 100,
    });
  });

  it("applies one cap when the other is free", () => {
    expect(scaleToFitBox({ height: 100, width: 300 }, 300, null)).toEqual({
      height: 100,
      width: 300,
    });
  });
});

/* ------------------------------------------------------------------------- */
/* Numbers                                                                   */
/* ------------------------------------------------------------------------- */

describe("formatBytes and savingsPercent", () => {
  it("reads a size in the Locale's units", () => {
    expect(formatBytes(512, "en-US")).toBe("512 B");
    expect(formatBytes(1500, "en-US")).toBe("1.5 KB");
    expect(formatBytes(200_000, "en-US")).toBe("200 KB");
    expect(formatBytes(2_500_000, "en-US")).toBe("2.5 MB");
    expect(formatBytes(-5, "en-US")).toBe("0 B");
  });

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
});

describe("ladderFor and stepsFor", () => {
  it("starts PNG at every colour and steps down", () => {
    const pngLadder = ladderFor("png");
    expect(pngLadder[0]?.levels).toBeNull();
    expect(pngLadder[1]?.levels).toBe(8);
    expect(pngLadder.at(-1)?.levels).toBe(2);
  });

  it("starts AVIF below the lossy formats", () => {
    expect(ladderFor("avif")[0]?.quality).toBe(70);
    expect(ladderFor("jpeg")[0]?.quality).toBe(95);
    expect(ladderFor("webp")[0]?.quality).toBe(95);
  });

  it("uses the whole ladder for a Target and one rung for Fixed quality", () => {
    expect(stepsFor("jpeg", DEFAULT_SETTINGS).length).toBeGreaterThan(5);
    expect(
      stepsFor("png", {
        ...DEFAULT_SETTINGS,
        sizeMode: "fixed-quality",
        quality: 62,
      })
    ).toEqual([{ levels: null, quality: 62 }]);
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
});

describe("flattenOnWhite", () => {
  it("composites a translucent pixel onto white and makes it opaque", () => {
    const flat = flattenOnWhite({
      data: new Uint8ClampedArray([0, 0, 0, 0, 255, 0, 0, 255]),
      height: 1,
      width: 2,
    });

    expect([...flat.data]).toEqual([255, 255, 255, 255, 255, 0, 0, 255]);
  });
});

describe("EXIF bytes", () => {
  it("finds the APP1 segment and inserts it after SOI", () => {
    const segment = exifSegmentOf(jpegWithExif());
    if (segment === null) {
      throw new Error("expected the APP1 segment");
    }
    expect([...new Uint8Array(segment).slice(0, 4)]).toEqual([
      0xff, 0xe1, 0x00, 0x08,
    ]);

    const encoded = new Uint8Array([
      0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9,
    ]).buffer;
    const joined = insertExifSegment(encoded, segment);
    expect([...new Uint8Array(joined).slice(0, 2)]).toEqual([0xff, 0xd8]);
    expect([...new Uint8Array(joined).slice(2, 6)]).toEqual([
      0xff, 0xe1, 0x00, 0x08,
    ]);
    expect(new Uint8Array(joined).length).toBe(8 + 10);
  });

  it("finds no EXIF in a JPEG without one, or in a non-JPEG", () => {
    const plain = new Uint8Array([
      0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9,
    ]).buffer;
    expect(exifSegmentOf(plain)).toBeNull();
    expect(exifSegmentOf(new Uint8Array([1, 2, 3, 4]).buffer)).toBeNull();
  });
});

describe("batchItemOf", () => {
  it("carries the folder path, the format, and the bytes", () => {
    const file = new File([new ArrayBuffer(10)], "a.png", {
      type: "image/png",
    });
    const item = batchItemOf({ file, folderPath: "trip/day1" }, "id");

    expect(item).toMatchObject({
      folderPath: "trip/day1",
      id: "id",
      name: "a.png",
      size: 10,
    });
    expect(item.format).toEqual(Option.some("png"));
  });
});

describe("withBudgetNotes", () => {
  const base = {
    files: [],
    inputBytes: 1000,
    notes: [],
    outputBytes: 1000,
    parts: [],
    problem: null,
    raisedTargetBytes: null,
    smallestStep: null,
    underTargetCount: 0,
    writtenCount: 0,
  } as const;

  it("names the raise, and the miss that is still over", () => {
    const done = withBudgetNotes({ ...base, kind: "done" }, 130_000);
    expect(done.raisedTargetBytes).toBe(130_000);
    expect(done.notes).toEqual([{ bytes: 130_000, kind: "raised" }]);

    const miss = withBudgetNotes({ ...base, kind: "miss" }, 130_000);
    expect(miss.notes).toEqual([
      { bytes: 130_000, kind: "raised" },
      { bytes: 130_000, kind: "still-over" },
    ]);
  });
});

/* ------------------------------------------------------------------------- */
/* Batch total                                                               */
/* ------------------------------------------------------------------------- */

describe("batchShare", () => {
  it("splits evenly and floors", () => {
    expect(batchShare(300_000, 3)).toBe(100_000);
    expect(batchShare(1000, 3)).toBe(333);
    expect(batchShare(1000, 0)).toBe(0);
  });
});

describe("redistribute", () => {
  it("shares the pool equally and caps each miss at what it needs", () => {
    const raised = redistribute(60_000, [
      { id: "b", need: 30_000 },
      { id: "c", need: 40_000 },
    ]);

    expect(raised.get("b")).toBe(30_000);
    expect(raised.get("c")).toBe(30_000);
  });

  it("returns a capped miss's leftover to the remaining misses", () => {
    const raised = redistribute(1000, [
      { id: "a", need: 100 },
      { id: "b", need: 1000 },
    ]);

    expect(raised.get("a")).toBe(100);
    expect(raised.get("b")).toBe(900);
  });

  it("gives nothing when the pool is under one byte per miss", () => {
    expect(
      redistribute(1, [
        { id: "a", need: 100 },
        { id: "b", need: 100 },
      ]).size
    ).toBe(0);
    expect(redistribute(0, [{ id: "a", need: 100 }]).size).toBe(0);
    expect(redistribute(1000, []).size).toBe(0);
  });
});

describe("batch total staleness", () => {
  it("changes the key when a file changes the share", () => {
    const settings = settingsFor("jpeg", "batch-total");
    const three = settingsKeyOf(settings, batchShare(300_000, 3));
    const four = settingsKeyOf(settings, batchShare(300_000, 4));

    expect(three).toBe("jpeg:batch-total:-:auto:auto:100000:-");
    expect(four).not.toBe(three);
  });

  it("marks a result made under another key stale", () => {
    const settings = settingsFor("jpeg", "per-image");
    const result = resultFor(
      "a",
      alreadyFitsOutcome(1000),
      settingsKeyOf(settings, 200_000)
    );

    expect(isStale(result, settings, 200_000)).toBe(false);
    expect(isStale(result, settings, 100_000)).toBe(true);
  });

  it("does not stale a result when the folder option changes", () => {
    const settings = settingsFor("jpeg", "per-image");
    const result = resultFor(
      "a",
      alreadyFitsOutcome(1000),
      settingsKeyOf(settings, 200_000)
    );

    expect(
      isStale(result, { ...settings, preserveFolders: false }, 200_000)
    ).toBe(false);
  });
});

describe("canSkipEncoding", () => {
  const plan = {
    inputBytes: 100,
    inputFormat: "jpeg" as const,
    settings: DEFAULT_SETTINGS,
    targetBytes: 200,
  };

  it("skips the same format under Target with no resize", () => {
    expect(canSkipEncoding(plan)).toBe(true);
    expect(canSkipEncoding({ ...plan, inputBytes: 300 })).toBe(false);
    expect(
      canSkipEncoding({
        ...plan,
        settings: { ...DEFAULT_SETTINGS, outputFormat: "webp" },
      })
    ).toBe(false);
    expect(
      canSkipEncoding({
        ...plan,
        settings: { ...DEFAULT_SETTINGS, maxWidth: 800 },
      })
    ).toBe(false);
  });

  it("never skips in Fixed quality", () => {
    expect(
      canSkipEncoding({
        ...plan,
        settings: { ...DEFAULT_SETTINGS, sizeMode: "fixed-quality" },
        targetBytes: null,
      })
    ).toBe(false);
  });
});

/* ------------------------------------------------------------------------- */
/* Batch bookkeeping                                                         */
/* ------------------------------------------------------------------------- */

describe("dedupeIncoming", () => {
  it("drops the same name, size, and last-modified time", () => {
    const existing = new Map([["a", itemFor({ id: "a" })]]);
    const added = itemFor({ id: "b" });
    const otherSize = itemFor({ id: "c", size: 2000 });
    const otherTime = itemFor({ id: "d", lastModified: 2 });

    const { accepted, duplicates } = dedupeIncoming(existing, [
      added,
      otherSize,
      otherTime,
    ]);

    expect(duplicates).toBe(1);
    expect(accepted.map((item) => item.id)).toEqual(["c", "d"]);
  });

  it("also drops a repeat inside the same drop", () => {
    const { accepted, duplicates } = dedupeIncoming(new Map(), [
      itemFor({ id: "a" }),
      itemFor({ id: "b" }),
    ]);

    expect(duplicates).toBe(1);
    expect(accepted.map((item) => item.id)).toEqual(["a"]);
  });
});

describe("summarize", () => {
  it("adds an empty Batch to nothing", () => {
    expect(summarize(new Map(), new Map())).toEqual({
      alreadyFits: 0,
      bigger: 0,
      done: 0,
      inputBytes: 0,
      misses: 0,
      outputBytes: 0,
      rejected: 0,
      total: 0,
      underTarget: 0,
    });
  });

  it("counts every kind in its own column", () => {
    const items = new Map([
      ["a", itemFor({ size: 1000 })],
      ["b", itemFor({ size: 1000 })],
      ["c", itemFor({ size: 1000 })],
      ["d", itemFor({ size: 1000 })],
      ["e", itemFor({ size: 1000 })],
    ]);
    const results = new Map([
      ["a", resultFor("a", outcomeOf("done", { outputBytes: 100 }))],
      ["b", resultFor("b", outcomeOf("miss", { outputBytes: 900 }))],
      ["c", resultFor("c", outcomeOf("bigger", { outputBytes: 1500 }))],
      ["d", resultFor("d", outcomeOf("already-fits"))],
      ["e", resultFor("e", outcomeOf("rejected", { problem: "unsupported" }))],
    ]);

    expect(summarize(items, results)).toEqual({
      alreadyFits: 1,
      bigger: 1,
      done: 1,
      inputBytes: 5000,
      misses: 1,
      outputBytes: 100 + 900 + 1500 + 1000 + 1000,
      rejected: 1,
      total: 5,
      underTarget: 2,
    });
  });
});

describe("rowViewOf", () => {
  const done = outcomeOf("done", {
    notes: [{ kind: "flattened" }],
    outputBytes: 250,
    underTargetCount: 1,
    writtenCount: 1,
  });

  it("is working before there is a result", () => {
    const results = new Map<string, ItemResult>();
    expect(rowViewOf(itemFor(), results.get("missing")).state).toBe("working");
  });

  it("carries the outcome and adds the stale note", () => {
    const view = rowViewOf(itemFor(), resultFor("a", done), true);

    expect(view).toMatchObject({
      saved: 75,
      stale: true,
      state: "done",
    });
    expect(view.notes).toContainEqual({ kind: "out-of-date" });
  });

  it("uses the original for an already-fits row", () => {
    const view = rowViewOf(
      itemFor(),
      resultFor("a", outcomeOf("already-fits", { underTargetCount: 1 }))
    );

    expect(view.outputBytes).toBe(1000);
    expect(view.saved).toBe(0);
  });

  it("maps every state to a Translation Key", () => {
    expect(rowStateKey("working")).toBe("squeezeWorking");
    expect(rowStateKey("done")).toBe("squeezeStateDone");
    expect(rowStateKey("already-fits")).toBe("squeezeStateAlreadyFits");
    expect(rowStateKey("miss")).toBe("squeezeStateMiss");
    expect(rowStateKey("bigger")).toBe("squeezeStateBigger");
    expect(rowStateKey("rejected")).toBe("squeezeStateRejected");
    expect(problemKey("unsupported")).toBe("squeezeProblemUnsupported");
    expect(problemKey("unreadable")).toBe("squeezeProblemUnreadable");
    expect(problemKey("too-large")).toBe("squeezeProblemTooLarge");
    expect(problemKey("codec-failed")).toBe("squeezeProblemCodecFailed");
    expect(problemKey("codec-offline")).toBe("squeezeProblemCodecOffline");
  });
});

describe("outputFilesOf", () => {
  it("gives every written file, and nothing for a row that wrote none", () => {
    const file = imageFile(10, "jpeg");
    const result = resultFor(
      "a",
      outcomeOf("done", {
        files: [file],
        outputBytes: 10,
        underTargetCount: 1,
        writtenCount: 1,
      })
    );
    const none = new Map<string, ItemResult>();

    expect(outputFilesOf(result)).toEqual([file]);
    expect(outputFilesOf(none.get("missing"))).toEqual([]);
    expect(
      outputFilesOf(
        resultFor("a", outcomeOf("rejected", { problem: "unsupported" }))
      )
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------------- */
/* ZIP                                                                       */
/* ------------------------------------------------------------------------- */

describe("uniqueNames", () => {
  it("renames a repeat before its extension", () => {
    expect([...uniqueNames([])]).toEqual([]);
    expect([...uniqueNames(["a.jpg"])]).toEqual(["a.jpg"]);
    expect([...uniqueNames(["a.jpg", "a.jpg", "a.jpg"])]).toEqual([
      "a.jpg",
      "a-2.jpg",
      "a-3.jpg",
    ]);
    expect([...uniqueNames(["noext", "noext"])]).toEqual(["noext", "noext-2"]);
    expect([...uniqueNames([".env", ".env"])]).toEqual([".env", ".env-2"]);
  });
});

const zipDone = (files: readonly OutputFile[]) =>
  outcomeOf("done", {
    files,
    outputBytes: files.reduce((total, entry) => total + entry.size, 0),
    underTargetCount: files.length,
    writtenCount: files.length,
  });

describe("zipPlanOf", () => {
  it("mirrors the dropped folder root when the option is on", () => {
    const items = [
      itemFor({ folderPath: "trip/day1", id: "a", name: "a.jpg" }),
    ];
    const results = new Map([
      ["a", resultFor("a", zipDone([imageFile(10, "jpeg")]))],
    ]);

    expect(zipPlanOf(items, results, { preserveFolders: true })).toMatchObject([
      { name: "trip/day1/a.jpg" },
    ]);
    expect(zipPlanOf(items, results, { preserveFolders: false })).toMatchObject(
      [{ name: "a.jpg" }]
    );
  });

  it("gives duplicates a unique stem per folder", () => {
    const items = [
      itemFor({ folderPath: "a", id: "1", name: "photo.png" }),
      itemFor({ folderPath: "a", id: "2", name: "photo.jpg" }),
      itemFor({ folderPath: "b", id: "3", name: "photo.png" }),
    ];
    const results = new Map([
      ["1", resultFor("1", zipDone([imageFile(10, "jpeg")]))],
      ["2", resultFor("2", zipDone([imageFile(10, "jpeg")]))],
      ["3", resultFor("3", zipDone([imageFile(10, "jpeg")]))],
    ]);
    const names = zipPlanOf(items, results, { preserveFolders: true }).map(
      (entry) => entry.name
    );

    expect(names).toEqual(["a/photo.jpg", "a/photo-2.jpg", "b/photo.jpg"]);
  });

  it("writes one stem with three extensions for Multi, numbered together", () => {
    const items = [
      itemFor({ folderPath: null, id: "1", name: "photo.png" }),
      itemFor({ folderPath: null, id: "2", name: "photo.jpg" }),
    ];
    const multi = zipDone([
      imageFile(10, "jpeg"),
      imageFile(10, "webp"),
      imageFile(10, "avif"),
    ]);
    const results = new Map([
      ["1", resultFor("1", multi)],
      ["2", resultFor("2", multi)],
    ]);
    const names = zipPlanOf(items, results, { preserveFolders: false }).map(
      (entry) => entry.name
    );

    expect(names).toEqual([
      "photo.jpg",
      "photo.webp",
      "photo.avif",
      "photo-2.jpg",
      "photo-2.webp",
      "photo-2.avif",
    ]);
  });

  it("includes an already-fits row at its own bytes and excludes a rejection", () => {
    const source = new Blob([new ArrayBuffer(1000)]);
    const items = [
      itemFor({ id: "a", source }),
      itemFor({ id: "b", name: "b.svg", source }),
    ];
    const results = new Map([
      ["a", resultFor("a", outcomeOf("already-fits"))],
      ["b", resultFor("b", outcomeOf("rejected", { problem: "unsupported" }))],
    ]);
    const plan = zipPlanOf(items, results, { preserveFolders: false });

    expect(plan.map((entry) => entry.name)).toEqual(["photo.jpg"]);
    expect(plan[0]?.input).toBe(source);
  });
});

/* ------------------------------------------------------------------------- */
/* Codec availability and the device                                         */
/* ------------------------------------------------------------------------- */

const offlineResult = (problem: "codec-offline" | "codec-failed") =>
  resultFor(
    "a",
    outcomeOf("rejected", { inputBytes: 10, outputBytes: 10, problem })
  );

describe("codec availability", () => {
  it("separates an offline codec from a broken one", () => {
    expect(classifyCodecFailure(true)).toBe("codec-offline");
    expect(classifyCodecFailure(false)).toBe("codec-failed");
  });

  it("knows when every row needs the same missing codec", () => {
    expect(
      allCodecOffline(new Map([["a", offlineResult("codec-offline")]]))
    ).toBe(true);
    expect(
      allCodecOffline(new Map([["a", offlineResult("codec-failed")]]))
    ).toBe(false);
    expect(allCodecOffline(new Map())).toBe(true);
  });
});

describe("watchFolderSupported", () => {
  it("needs the directory picker, which Chrome and Edge have", () => {
    expect(watchFolderSupported({})).toBe(false);
    expect(watchFolderSupported({ showDirectoryPicker: () => null })).toBe(
      true
    );
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

describe("MIME_TYPE", () => {
  it("names every output format", () => {
    expect(MIME_TYPE.jpeg).toBe("image/jpeg");
    expect(MIME_TYPE.png).toBe("image/png");
    expect(MIME_TYPE.webp).toBe("image/webp");
    expect(MIME_TYPE.avif).toBe("image/avif");
    expect(MIN_TARGET_BYTES).toBe(10 * BYTES_PER_KB);
  });
});
