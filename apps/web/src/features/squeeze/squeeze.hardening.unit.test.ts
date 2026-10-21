import { describe, expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";

import type {
  BatchItem,
  CodecSession,
  CompressInput,
  ImageFormat,
  ItemResult,
  OpenedImage,
  OutputFile,
  SqueezeOutcome,
  SqueezeSettings,
} from "@/features/squeeze/squeeze";
import {
  classifyReadFailure,
  classifyWatchFailure,
  clampFileName,
  compressImage,
  DEFAULT_SETTINGS,
  decodeLimitPixels,
  exceedsDecodeBudget,
  imageSizeOf,
  isOfflineRejection,
  isWatchPermissionError,
  landResult,
  safeZipSegments,
  SqueezeError,
  zipPlanOf,
} from "@/features/squeeze/squeeze";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

const lowerByte = (value: number): number => value % 256;

const upperByte = (value: number): number => Math.floor(value / 256) % 256;

const setBe16 = (bytes: Uint8Array, offset: number, value: number) => {
  bytes[offset] = upperByte(value);
  bytes[offset + 1] = lowerByte(value);
};

const setLe16 = (bytes: Uint8Array, offset: number, value: number) => {
  bytes[offset] = lowerByte(value);
  bytes[offset + 1] = upperByte(value);
};

const setBe32 = (bytes: Uint8Array, offset: number, value: number) => {
  setBe16(bytes, offset, Math.floor(value / 65_536) % 65_536);
  setBe16(bytes, offset + 2, value % 65_536);
};

/** A PNG signature and IHDR, with no pixel data. */
const pngHeader = (width: number, height: number): ArrayBuffer => {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  setBe32(bytes, 16, width);
  setBe32(bytes, 20, height);
  return bytes.buffer;
};

/** A JPEG SOI, an APP0 segment, and one SOF0 frame header. */
const jpegHeader = (width: number, height: number): ArrayBuffer => {
  const bytes = new Uint8Array(32);
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x06, 0x00, 0x00, 0x00, 0x00], 0);
  bytes.set([0xff, 0xc0, 0x00, 0x0b, 0x08], 10);
  setBe16(bytes, 15, height);
  setBe16(bytes, 17, width);
  return bytes.buffer;
};

const gifHeader = (width: number, height: number): ArrayBuffer => {
  const bytes = new Uint8Array(13);
  bytes.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  setLe16(bytes, 6, width);
  setLe16(bytes, 8, height);
  return bytes.buffer;
};

const bmpHeader = (width: number, height: number): ArrayBuffer => {
  const bytes = new Uint8Array(54);
  bytes.set([0x42, 0x4d]);
  setLe16(bytes, 14, 40);
  setLe16(bytes, 18, width);
  setLe16(bytes, 22, height);
  return bytes.buffer;
};

/** A WebP with a VP8X chunk, which carries the canvas size. */
const webpHeader = (width: number, height: number): ArrayBuffer => {
  const bytes = new Uint8Array(30);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  bytes.set([0x56, 0x50, 0x38, 0x58], 12);
  const w = width - 1;
  const h = height - 1;
  bytes.set([lowerByte(w), upperByte(w), Math.floor(w / 65_536) % 256], 24);
  bytes.set([lowerByte(h), upperByte(h), Math.floor(h / 65_536) % 256], 27);
  return bytes.buffer;
};

/** An AVIF `ispe` box, which is what the guard reads. */
const avifHeader = (width: number, height: number): ArrayBuffer => {
  const bytes = new Uint8Array(20);
  setBe32(bytes, 0, 20);
  bytes.set([0x69, 0x73, 0x70, 0x65], 4);
  setBe32(bytes, 8, 0);
  setBe32(bytes, 12, width);
  setBe32(bytes, 16, height);
  return bytes.buffer;
};

const openedAt = (width: number, height: number): OpenedImage => ({
  animated: false,
  hasAlpha: false,
  height,
  sourceHeight: height,
  sourceWidth: width,
  width,
});

const itemOf = (overrides: Partial<BatchItem> = {}): BatchItem => ({
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

const outcomeOf = (
  overrides: Partial<SqueezeOutcome> = {}
): SqueezeOutcome => ({
  files: [],
  inputBytes: 1000,
  kind: "done",
  notes: [],
  outputBytes: 1000,
  parts: [],
  problem: null,
  raisedTargetBytes: null,
  smallestStep: null,
  underTargetCount: 1,
  writtenCount: 1,
  ...overrides,
});

const fileOf = (size: number, format: ImageFormat): OutputFile => ({
  bytes: new ArrayBuffer(size),
  format,
  height: 1,
  levels: null,
  quality: 80,
  size,
  width: 1,
});

const resultOf = (outcome: SqueezeOutcome, id = "a"): ItemResult => ({
  id,
  key: "key",
  outcome,
});

const settingsFor = (
  overrides: Partial<SqueezeSettings> = {}
): SqueezeSettings => ({
  ...DEFAULT_SETTINGS,
  outputFormat: "multi",
  sizeMode: "per-image",
  ...overrides,
});

const inputFor = (overrides: Partial<CompressInput> = {}): CompressInput => ({
  bytes: new ArrayBuffer(1000),
  inputBytes: 1000,
  inputFormat: "jpeg",
  settings: settingsFor(),
  targetBytes: 500,
  ...overrides,
});

/* -------------------------------------------------------------------------- */
/* Image headers                                                               */
/* -------------------------------------------------------------------------- */

describe("imageSizeOf", () => {
  it("reads the six input formats from their headers", () => {
    expect(imageSizeOf(pngHeader(1600, 1200), "png")).toEqual({
      height: 1200,
      width: 1600,
    });
    expect(imageSizeOf(jpegHeader(4032, 3024), "jpeg")).toEqual({
      height: 3024,
      width: 4032,
    });
    expect(imageSizeOf(gifHeader(320, 240), "gif")).toEqual({
      height: 240,
      width: 320,
    });
    expect(imageSizeOf(bmpHeader(64, 48), "bmp")).toEqual({
      height: 48,
      width: 64,
    });
    expect(imageSizeOf(webpHeader(800, 600), "webp")).toEqual({
      height: 600,
      width: 800,
    });
    expect(imageSizeOf(avifHeader(1200, 900), "avif")).toEqual({
      height: 900,
      width: 1200,
    });
  });

  it("refuses a truncated header, a wrong signature, and a zero size", () => {
    expect(imageSizeOf(new ArrayBuffer(4), "png")).toBeNull();
    expect(imageSizeOf(pngHeader(0, 100), "png")).toBeNull();
    expect(imageSizeOf(pngHeader(100, 100), "jpeg")).toBeNull();
    expect(imageSizeOf(jpegHeader(100, 100), "gif")).toBeNull();
  });

  it("reads a header with no pixel data, which is the guard's whole point", () => {
    const header = pngHeader(100_000, 100_000);
    expect(header.byteLength).toBeLessThan(100);
    expect(imageSizeOf(header, "png")).toEqual({
      height: 100_000,
      width: 100_000,
    });
  });
});

describe("the decode budget", () => {
  it("grows with the device and stays between 2 and 8 GiB", () => {
    expect(decodeLimitPixels(2)).toBe(48_000_000);
    expect(decodeLimitPixels(4)).toBe(96_000_000);
    expect(decodeLimitPixels(8)).toBe(192_000_000);
    expect(decodeLimitPixels(1)).toBe(48_000_000);
    expect(decodeLimitPixels(64)).toBe(192_000_000);
    expect(decodeLimitPixels()).toBe(96_000_000);
    expect(decodeLimitPixels(Number.NaN)).toBe(96_000_000);
  });

  it("refuses only an image over the budget", () => {
    expect(exceedsDecodeBudget({ height: 100, width: 100 }, 10_000)).toBe(
      false
    );
    expect(exceedsDecodeBudget({ height: 200, width: 100 }, 10_000)).toBe(true);
    expect(exceedsDecodeBudget({ height: 0, width: 100 }, 10_000)).toBe(false);
    expect(exceedsDecodeBudget({ height: 200, width: 100 }, 0)).toBe(true);
  });
});

describe("classifyReadFailure", () => {
  it("calls an allocation failure too large, and a bad file unreadable", () => {
    expect(classifyReadFailure(new RangeError("allocation failed"))).toBe(
      "too-large"
    );
    expect(
      classifyReadFailure(new Error("Array buffer allocation failed"))
    ).toBe("too-large");
    expect(
      classifyReadFailure(new Error("The image is too large to decode"))
    ).toBe("too-large");
    expect(
      classifyReadFailure(new DOMException("quota", "QuotaExceededError"))
    ).toBe("too-large");
    expect(classifyReadFailure(new Error("invalid PNG signature"))).toBe(
      "unreadable"
    );
    expect(classifyReadFailure("gone")).toBe("unreadable");
  });
});

/* -------------------------------------------------------------------------- */
/* Watch folder                                                                */
/* -------------------------------------------------------------------------- */

describe("watch failures", () => {
  it("treats a dismissed picker as a cancel, not a refusal", () => {
    expect(
      classifyWatchFailure(new DOMException("cancelled", "AbortError"))
    ).toBe("cancelled");
    expect(
      classifyWatchFailure(new DOMException("denied", "NotAllowedError"))
    ).toBe("denied");
    expect(classifyWatchFailure(new Error("gone"))).toBe("denied");
  });

  it("knows which errors mean the folder is no longer allowed", () => {
    expect(
      isWatchPermissionError(new DOMException("denied", "NotAllowedError"))
    ).toBe(true);
    expect(
      isWatchPermissionError(new DOMException("denied", "SecurityError"))
    ).toBe(true);
    expect(
      isWatchPermissionError(new DOMException("gone", "NotFoundError"))
    ).toBe(false);
    expect(isWatchPermissionError(new Error("gone"))).toBe(false);
    expect(isWatchPermissionError(null)).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Names and ZIP paths                                                         */
/* -------------------------------------------------------------------------- */

describe("safeZipSegments", () => {
  it("drops a path that would climb out of the ZIP root", () => {
    expect(safeZipSegments("../../etc/passwd")).toEqual(["etc", "passwd"]);
    expect(safeZipSegments("..\\..\\windows\\system.ini")).toEqual([
      "windows",
      "system.ini",
    ]);
    expect(safeZipSegments("./trip/day1")).toEqual(["trip", "day1"]);
    expect(safeZipSegments("/")).toEqual([]);
  });

  it("removes control characters and caps one segment", () => {
    expect(safeZipSegments("a\u0000b/\u001Fc")).toEqual(["ab", "c"]);
    expect(safeZipSegments("x".repeat(200))[0]).toHaveLength(64);
  });
});

describe("clampFileName", () => {
  it("keeps the extension when the name is over the cap", () => {
    const name = `${"a".repeat(400)}.jpeg`;
    const clamped = clampFileName(name, 40);
    expect(clamped).toHaveLength(40);
    expect(clamped.endsWith(".jpeg")).toBe(true);
  });

  it("leaves a short name alone", () => {
    expect(clampFileName("photo.jpg", 40)).toBe("photo.jpg");
    expect(clampFileName("no-extension", 4)).toHaveLength(4);
  });
});

describe("zipPlanOf hardening", () => {
  it("writes a hostile name as a flat, safe entry", () => {
    const item = itemOf({ folderPath: "../../tmp", name: "../../evil.jpg" });
    const results = new Map([
      ["a", resultOf(outcomeOf({ files: [fileOf(10, "jpeg")] }))],
    ]);
    const entries = zipPlanOf([item], results, { preserveFolders: true });

    expect(entries[0]?.name).toBe("tmp/evil.jpg");
    expect(entries[0]?.name).not.toContain("..");
  });

  it("caps a very long stem and keeps its extension", () => {
    const item = itemOf({ name: `${"n".repeat(400)}.jpg` });
    const results = new Map([
      ["a", resultOf(outcomeOf({ files: [fileOf(10, "webp")] }))],
    ]);
    const entries = zipPlanOf([item], results, { preserveFolders: false });

    expect(entries[0]?.name.endsWith(".webp")).toBe(true);
    expect(entries[0]?.name.length).toBeLessThanOrEqual(85);
  });
});

/* -------------------------------------------------------------------------- */
/* Results that outlive their row                                              */
/* -------------------------------------------------------------------------- */

describe("landResult", () => {
  it("adds a result for a row that is still in the Batch", () => {
    const results = new Map<string, ItemResult>();
    const result = resultOf(outcomeOf());
    const next = landResult(new Map([["a", itemOf()]]), results, result);

    expect(next).not.toBe(results);
    expect(next.get("a")).toBe(result);
  });

  it("drops a result for a row that was cleared or removed", () => {
    const results = new Map<string, ItemResult>();
    const result = resultOf(
      outcomeOf({ kind: "rejected", problem: "unreadable" }),
      "gone"
    );

    expect(landResult(new Map(), results, result)).toBe(results);
  });
});

describe("isOfflineRejection", () => {
  it("marks only the offline rejection as retryable when online", () => {
    expect(
      isOfflineRejection(
        resultOf(outcomeOf({ kind: "rejected", problem: "codec-offline" }))
      )
    ).toBe(true);
    expect(
      isOfflineRejection(
        resultOf(outcomeOf({ kind: "rejected", problem: "unreadable" }))
      )
    ).toBe(false);
    const empty = new Map<string, ItemResult>();
    expect(isOfflineRejection(empty.get("missing"))).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Multi failures                                                              */
/* -------------------------------------------------------------------------- */

describe("Multi with every codec offline", () => {
  it.effect(
    "keeps the offline cause instead of calling the encoder broken",
    () =>
      Effect.gen(function* () {
        const codec: CodecSession = {
          encode: () =>
            Effect.fail(
              new SqueezeError({
                detail: "the codec is not cached",
                problem: "codec-offline",
              })
            ),
          open: () => Effect.succeed(openedAt(100, 100)),
        };

        const outcome = yield* compressImage(codec, inputFor());

        expect(outcome.kind).toBe("rejected");
        expect(outcome.problem).toBe("codec-offline");
      })
  );
});
