/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-shape-in-symbol-names, eslint/no-await-in-loop, eslint/no-unused-vars, typescript/array-type, typescript/no-non-null-assertion, unicorn/consistent-function-scoping, unicorn/no-useless-undefined -- tests build typed fixtures and replay steps in order. */
/* oxlint-disable eslint/no-bitwise -- the test builds header bytes. */
import { describe, expect, it } from "vitest";

import {
  formatDimensions,
  buildZipEntries,
  claimedFormatOf,
  clampBlurRadius,
  clampBrushSize,
  clampFeather,
  clampOffset,
  clampQuality,
  clampScale,
  clampTolerance,
  countRows,
  cutoutName,
  DEFAULT_SETTINGS,
  detectFormat,
  errorCopyOf,
  exceedsPreflight,
  fitScaleOf,
  formatBytes,
  formatLabelKey,
  isDownloadable,
  isImageFile,
  isImageFormat,
  isOutputFormat,
  jpegBlocked,
  mimeOfFormat,
  nextOpenId,
  outputLabelKey,
  outputMimeOf,
  outputNoteKey,
  progressPercent,
  progressQuarterOf,
  ROW_STATE_KEY,
  runSetOf,
  sanitizeStem,
  settingsKey,
  stateAfterSettingsChange,
  zipEntryName,
  zoomAt,
} from "@/features/unmask/unmask";

describe("format facts", () => {
  it("names formats, MIME types, and labels", () => {
    expect(mimeOfFormat("jpeg")).toBe("image/jpeg");
    expect(outputMimeOf("webp")).toBe("image/webp");
    expect(isImageFormat("gif")).toBe(true);
    expect(isImageFormat("heic")).toBe(false);
    expect(isOutputFormat("avif")).toBe(true);
    expect(isOutputFormat("gif")).toBe(false);
    expect(formatLabelKey("bmp")).toBe("unmaskFormatBmp");
    expect(formatLabelKey("webp")).toBe("unmaskFormatWebp");
    expect(outputLabelKey("jpeg")).toBe("unmaskFormatJpeg");
    expect(outputNoteKey("avif")).toBe("unmaskFormatAvifNote");
    expect(outputNoteKey("png")).toBe("unmaskFormatPngNote");
  });

  it("sniffs the six formats from bytes", () => {
    expect(detectFormat(Uint8Array.from([0xff, 0xd8, 0xff]))).toBe("jpeg");
    expect(
      detectFormat(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      )
    ).toBe("png");
    expect(detectFormat(new TextEncoder().encode("RIFF0000WEBP"))).toBe("webp");
    expect(detectFormat(new TextEncoder().encode("GIF89a"))).toBe("gif");
    expect(detectFormat(Uint8Array.from([0x42, 0x4d]))).toBe("bmp");
    expect(
      detectFormat(Uint8Array.from([0, 0, 0, 20, ...Buffer.from("ftypavif")]))
    ).toBe("avif");
    expect(detectFormat(Uint8Array.from([1, 2, 3]))).toBeNull();
  });

  it("reads the claimed format and the picker filter", () => {
    expect(claimedFormatOf({ name: "a.JPG", type: "" })).toBe("jpeg");
    expect(claimedFormatOf({ name: "a", type: "image/webp" })).toBe("webp");
    expect(claimedFormatOf({ name: "a.txt", type: "text/plain" })).toBeNull();
    expect(isImageFile({ name: "a.png", type: "" })).toBe(true);
    expect(isImageFile({ name: "a.txt", type: "text/plain" })).toBe(false);
  });
});

describe("names and sizes", () => {
  it("formats bytes with the locale", () => {
    expect(formatBytes(999, "en-US")).toBe("999 B");
    expect(formatBytes(1500, "en-US")).toBe("1.50 KB");
    expect(formatBytes(12_500_000, "en-US")).toBe("12.5 MB");
    expect(formatBytes(-1, "en-US")).toBe("—");
  });

  it("sanitizes a stem and builds a cutout name", () => {
    expect(sanitizeStem("../a/b.jpg")).toBe("b");
    expect(sanitizeStem("...a..b.png")).toBe("a..b");
    expect(sanitizeStem("   ")).toBe("image");
    expect(cutoutName("sunset.jpg", "jpeg")).toBe("sunset-cutout.jpg");
  });

  it("keeps folder paths and avoids duplicate ZIP names", () => {
    expect(
      buildZipEntries([
        { folderPath: "a", format: "webp", name: "x.jpg" },
        { folderPath: "a", format: "webp", name: "x.png" },
        { folderPath: null, format: "png", name: "x" },
      ])
    ).toEqual(["a/x-cutout.webp", "a/x-cutout-2.webp", "x-cutout.png"]);
    expect(
      zipEntryName({
        folderPath: "../etc",
        format: "png",
        name: "../a",
        used: new Set(),
      })
    ).toBe("etc/a-cutout.png");
  });
});

describe("settings and rows", () => {
  it("blocks JPEG with a Transparent Backdrop", () => {
    expect(jpegBlocked({ ...DEFAULT_SETTINGS, format: "jpeg" })).toBe(true);
    expect(
      jpegBlocked({
        ...DEFAULT_SETTINGS,
        backdrop: { _tag: "Blur", radius: 20 },
        format: "jpeg",
      })
    ).toBe(false);
  });

  it("keys the shared settings", () => {
    const first = settingsKey(DEFAULT_SETTINGS);
    expect(settingsKey(DEFAULT_SETTINGS)).toBe(first);
    expect(
      settingsKey({
        ...DEFAULT_SETTINGS,
        backdrop: { _tag: "Solid", color: { a: 255, b: 1, g: 2, r: 3 } },
      })
    ).not.toBe(first);
  });

  it("clamps every numeric setting", () => {
    expect(clampFeather(-1)).toBe(0);
    expect(clampFeather(99)).toBe(50);
    expect(clampBlurRadius(99)).toBe(50);
    expect(clampQuality(0)).toBe(1);
    expect(clampTolerance(101)).toBe(100);
    expect(clampBrushSize(0)).toBe(1);
    expect(clampBrushSize(999)).toBe(200);
  });

  it("counts and selects rows", () => {
    const rows = [
      { id: "a", state: "ready" as const },
      { id: "b", state: "stale" as const },
      { id: "c", state: "failed" as const },
      { id: "d", state: "queued" as const },
      { id: "e", state: "removing" as const },
    ];
    expect(countRows(rows)).toEqual({
      failed: 1,
      queued: 2,
      ready: 1,
      stale: 1,
    });
    expect(runSetOf(rows)).toEqual(["b", "c", "d"]);
    expect(runSetOf([{ id: "a", state: "ready" }])).toEqual([]);
    expect(stateAfterSettingsChange("ready")).toBe("stale");
    expect(stateAfterSettingsChange("failed")).toBe("failed");
    expect(isDownloadable("downloaded")).toBe(true);
    expect(isDownloadable("stale")).toBe(false);
    expect(nextOpenId(["a"])).toBe("a");
    expect(nextOpenId(["a", "b"])).toBeNull();
    expect(ROW_STATE_KEY.ready).toBe("unmaskBatchReady");
  });

  it("reports progress only when a total exists", () => {
    expect(progressPercent(null)).toBeNull();
    expect(
      progressPercent({ _tag: "ModelDownload", loaded: 25, total: 100 })
    ).toBe(25);
    expect(
      progressPercent({ _tag: "ModelDownload", loaded: 25, total: null })
    ).toBeNull();
    expect(progressQuarterOf(0.6)).toBe(2);
    expect(progressQuarterOf(2)).toBe(4);
  });

  it("maps errors to copy keys", () => {
    expect(errorCopyOf({ _tag: "Cancelled" }).title).toBe(
      "unmaskCancelledTitle"
    );
    expect(
      errorCopyOf({ _tag: "ModelUnavailable", reason: "offline" }).title
    ).toBe("unmaskModelOfflineTitle");
    expect(errorCopyOf({ _tag: "EncodeFailed", reason: "codec" }).body).toBe(
      "unmaskEncodeFailedBody"
    );
  });

  it("checks the preflight and matte readiness", () => {
    expect(exceedsPreflight(80_000, 1000)).toBe(true);
    expect(exceedsPreflight(100, 100)).toBe(false);
  });
});

describe("the editor model", () => {
  it("fits and clamps the view", () => {
    expect(fitScaleOf(800, 600, 1600, 1200)).toBe(0.5);
    expect(fitScaleOf(0, 10, 10, 10)).toBe(1);
    expect(clampScale(100)).toBe(8);
    expect(clampScale(0)).toBe(0.1);
    expect(
      clampOffset({ offset: 1000, scale: 1, stage: 100, viewport: 100 })
    ).toBe(20);
    const zoomed = zoomAt({
      nextScale: 2,
      pointerX: 50,
      pointerY: 50,
      view: { compare: false, compareAt: 50, scale: 1, x: 0, y: 0 },
      viewportHeight: 100,
      viewportWidth: 100,
    });
    expect(zoomed.scale).toBe(2);
    expect(zoomed.x).toBe(-50);
  });

  it("formats dimensions", () => {
    expect(formatDimensions(20, 10)).toBe("20 × 10");
  });
});
