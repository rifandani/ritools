import { describe, expect, it } from "vitest";

import {
  backdropLabelKey,
  brushLabelKey,
  buildZipEntries,
  clampBlurRadius,
  clampFeather,
  clampQuality,
  clampScale,
  countRows,
  cutoutName,
  DEFAULT_SETTINGS,
  detectFormat,
  exceedsPreflight,
  errorCopyOf,
  formatBytes,
  formatLabelKey,
  isImageFile,
  isImageFormat,
  isOutputFormat,
  isReadyState,
  jpegBlocked,
  mimeOfFormat,
  modeLabelKey,
  nextOpenId,
  outputExtensionOf,
  outputLabelKey,
  outputMimeOf,
  outputNoteKey,
  progressPercent,
  progressQuarterOf,
  claimedFormatOf,
  runSetOf,
  sanitizeStem,
  settingsKey,
  editedAfterOperations,
  stateAfterOperations,
  stateAfterSettingsChange,
  withBackdrop,
  zipEntryName,
} from "@/features/unmask/unmask";
import type { RowState } from "@/features/unmask/unmask";
import type { OperationId } from "@/features/unmask/unmask.engine";

const bytesOf = (...values: number[]) => Uint8Array.from(values);

const ascii = (text: string, extra: readonly number[] = []) =>
  Uint8Array.from([
    ...text.split("").map((character) => character.codePointAt(0) ?? 0),
    ...extra,
  ]);

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = bytesOf(0xff, 0xd8, 0xff, 0xe0);
const WEBP = Uint8Array.from([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")]);
const GIF = ascii("GIF89a");
const BMP = ascii("BM");
const AVIF = Uint8Array.from([0, 0, 0, 0x18, ...ascii("ftypavif")]);

describe("format detection", () => {
  it("reads all six input formats from the bytes", () => {
    expect(detectFormat(JPEG)).toBe("jpeg");
    expect(detectFormat(PNG)).toBe("png");
    expect(detectFormat(WEBP)).toBe("webp");
    expect(detectFormat(GIF)).toBe("gif");
    expect(detectFormat(BMP)).toBe("bmp");
    expect(detectFormat(AVIF)).toBe("avif");
  });

  it("returns null for an unknown container", () => {
    expect(detectFormat(ascii("%PDF-1.7"))).toBeNull();
    expect(detectFormat(new Uint8Array())).toBeNull();
  });

  it("reads the claimed format from the MIME type, then the extension", () => {
    expect(claimedFormatOf({ name: "photo.bin", type: "image/jpeg" })).toBe(
      "jpeg"
    );
    expect(claimedFormatOf({ name: "photo.JPG", type: "" })).toBe("jpeg");
    expect(claimedFormatOf({ name: "clip.webp", type: "" })).toBe("webp");
    expect(
      claimedFormatOf({ name: "notes.txt", type: "text/plain" })
    ).toBeNull();
  });

  it("knows the four output formats and the six input formats", () => {
    expect(isOutputFormat("webp")).toBe(true);
    expect(isOutputFormat("gif")).toBe(false);
    expect(isImageFormat("bmp")).toBe(true);
    expect(isImageFormat("tiff")).toBe(false);
  });

  it("gives the output extension and the JPEG rule", () => {
    expect(outputExtensionOf("jpeg")).toBe("jpg");
    expect(outputExtensionOf("avif")).toBe("avif");
    expect(jpegBlocked(DEFAULT_SETTINGS)).toBe(false);
    expect(jpegBlocked({ ...DEFAULT_SETTINGS, format: "jpeg" })).toBe(true);
    expect(
      jpegBlocked({
        ...DEFAULT_SETTINGS,
        format: "jpeg",
        backdrop: { _tag: "Solid", color: { a: 255, b: 255, g: 255, r: 255 } },
      })
    ).toBe(false);
  });
});

describe("names and the ZIP", () => {
  it("sanitises a display name into a stem", () => {
    expect(sanitizeStem("/photos/holiday photo.jpg")).toBe("holiday photo");
    expect(sanitizeStem("..hidden.png")).toBe("hidden");
    expect(sanitizeStem("a\u0000b\u007F.png")).toBe("ab");
    expect(sanitizeStem("   .png")).toBe("image");
    expect(sanitizeStem(`${"a".repeat(200)}.png`)).toHaveLength(120);
  });

  it("writes the Cutout name and never keeps the input extension", () => {
    expect(cutoutName("portrait.jpeg", "webp")).toBe("portrait-cutout.webp");
    expect(cutoutName("no-extension", "png")).toBe("no-extension-cutout.png");
  });

  it("keeps the folder path and adds a suffix on a collision", () => {
    const used = new Set<string>();
    const first = zipEntryName({
      folderPath: "holiday/day one",
      format: "webp",
      name: "photo.jpg",
      used,
    });
    used.add(first.toLowerCase());
    const second = zipEntryName({
      folderPath: "holiday/day one",
      format: "webp",
      name: "photo.jpg",
      used,
    });
    expect(first).toBe("holiday/day one/photo-cutout.webp");
    expect(second).toBe("holiday/day one/photo-cutout-2.webp");
  });

  it("removes a parent segment from a folder path", () => {
    expect(
      zipEntryName({
        folderPath: "../../etc",
        format: "png",
        name: "photo.jpg",
        used: new Set(),
      })
    ).toBe("etc/photo-cutout.png");
  });

  it("de-duplicates a whole Batch case-insensitively", () => {
    expect(
      buildZipEntries([
        { folderPath: null, format: "png", name: "A.jpg" },
        { folderPath: null, format: "png", name: "a.jpg" },
      ])
    ).toEqual(["A-cutout.png", "a-cutout-2.png"]);
  });
});

describe("settings", () => {
  it("changes the key when any shared setting changes", () => {
    const base = settingsKey(DEFAULT_SETTINGS);
    expect(settingsKey({ ...DEFAULT_SETTINGS, feather: 10 })).not.toBe(base);
    expect(
      settingsKey({
        ...DEFAULT_SETTINGS,
        backdrop: {
          _tag: "Solid",
          color: { a: 255, b: 0, g: 0, r: 0 },
        },
      })
    ).not.toBe(base);
    expect(
      settingsKey({
        ...DEFAULT_SETTINGS,
        backdrop: { _tag: "Blur", radius: 20 },
      })
    ).not.toBe(base);
    expect(
      settingsKey({ ...DEFAULT_SETTINGS, format: "png", quality: 20 })
    ).not.toBe(base);
  });

  it("applies a Backdrop without changing the other settings", () => {
    const next = withBackdrop(DEFAULT_SETTINGS, {
      _tag: "Blur",
      radius: 20,
    });
    expect(next.backdrop).toEqual({ _tag: "Blur", radius: 20 });
    expect(next.format).toBe("webp");
  });

  it("formats bytes in the Locale", () => {
    expect(formatBytes(999, "en-US")).toBe("999 B");
    expect(formatBytes(1000, "en-US")).toBe("1 KB");
    expect(formatBytes(1_500_000, "en-US")).toBe("1.5 MB");
    expect(formatBytes(-1, "en-US")).toBe("0 B");
  });
});

describe("rows and states", () => {
  const ROWS: readonly { readonly id: string; readonly state: RowState }[] = [
    { id: "a", state: "ready" },
    { id: "b", state: "stale" },
    { id: "c", state: "failed" },
    { id: "d", state: "queued" },
    { id: "e", state: "reading" },
    { id: "f", state: "downloaded" },
  ];

  it("counts the Batch and picks the run set", () => {
    expect(countRows(ROWS)).toEqual({
      failed: 1,
      queued: 2,
      ready: 2,
      stale: 1,
    });
    expect(runSetOf(ROWS)).toEqual(["b", "c", "d"]);
  });

  it("keeps one remaining image open and sends two or more back to the list", () => {
    expect(nextOpenId(["only"])).toBe("only");
    expect(nextOpenId(["a", "b"])).toBeNull();
    expect(nextOpenId([])).toBeNull();
  });

  it("keeps a Stale row Stale after a stroke, and returns to Ready after undo", () => {
    expect(stateAfterOperations("stale", true, 2)).toBe("stale");
    expect(stateAfterOperations("ready", true, 0)).toBe("ready");
    expect(stateAfterOperations("ready", true, 2)).toBe("edited");
    expect(stateAfterOperations("downloaded", true, 0)).toBe("downloaded");
    expect(stateAfterOperations("queued", false, 0)).toBe("queued");
    expect(editedAfterOperations(true, 2)).toBe(true);
    expect(editedAfterOperations(true, 0)).toBe(false);
  });

  it("marks a finished row Stale after a settings change", () => {
    expect(stateAfterSettingsChange("ready")).toBe("stale");
    expect(stateAfterSettingsChange("edited")).toBe("stale");
    expect(stateAfterSettingsChange("queued")).toBe("queued");
    expect(isReadyState("edited")).toBe(true);
    expect(isReadyState("stale")).toBe(false);
  });

  it("maps every named error to its title and body", () => {
    expect(errorCopyOf({ _tag: "Cancelled" }).title).toBe(
      "unmaskCancelledTitle"
    );
    expect(
      errorCopyOf({ _tag: "ModelUnavailable", reason: "offline" }).title
    ).toBe("unmaskModelOfflineTitle");
    expect(
      errorCopyOf({ _tag: "ModelUnavailable", reason: "fetch" }).title
    ).toBe("unmaskModelUnavailableTitle");
    expect(errorCopyOf({ _tag: "EncodeFailed", reason: "codec" }).title).toBe(
      "unmaskEncodeFailedTitle"
    );
  });

  it("computes progress only when the total is known", () => {
    expect(progressPercent(null)).toBeNull();
    expect(
      progressPercent({ _tag: "ModelDownload", loaded: 25, total: 100 })
    ).toBe(25);
    expect(
      progressPercent({ _tag: "ModelDownload", loaded: 25, total: null })
    ).toBeNull();
    expect(progressQuarterOf(0.1)).toBe(0);
    expect(progressQuarterOf(0.5)).toBe(2);
    expect(progressQuarterOf(1)).toBe(4);
  });

  it("preflights the pixel count", () => {
    expect(exceedsPreflight(6000, 4344)).toBe(false);
    expect(exceedsPreflight(9000, 8000)).toBe(true);
  });
});

describe("the small helpers", () => {
  it("reads the MIME of an input and an output", () => {
    expect(mimeOfFormat("jpeg")).toBe("image/jpeg");
    expect(mimeOfFormat("bmp")).toBe("image/bmp");
    expect(outputMimeOf("webp")).toBe("image/webp");
    expect(outputMimeOf("avif")).toBe("image/avif");
    expect(outputExtensionOf("png")).toBe("png");
  });

  it("recognises an image claim and a pending or downloadable row", () => {
    expect(isImageFile({ name: "photo.jpg", type: "" })).toBe(true);
    expect(isImageFile({ name: "notes.txt", type: "text/plain" })).toBe(false);
  });

  it("prints dimensions and clamps every control value", () => {
    expect(clampFeather(-1)).toBe(0);
    expect(clampFeather(51)).toBe(50);
    expect(clampBlurRadius(-1)).toBe(0);
    expect(clampBlurRadius(51)).toBe(50);
    expect(clampQuality(0)).toBe(1);
    expect(clampQuality(101)).toBe(100);
  });

  it("clamps the view scale", () => {
    expect(clampScale(0.01)).toBe(0.1);
    expect(clampScale(99)).toBe(8);
  });

  it("handles every Backdrop label and Brush mode", () => {
    expect(errorCopyOf({ _tag: "ModelFailed", reason: "memory" }).title).toBe(
      "unmaskModelFailedTitle"
    );
    expect(
      errorCopyOf({
        _tag: "TooLarge",
        height: 1,
        neededBytes: 1,
        pixels: 1,
        width: 1,
      }).body
    ).toBe("unmaskTooLargeBody");
    expect(errorCopyOf({ _tag: "UnreadableFile", reason: "empty" }).body).toBe(
      "unmaskUnreadableBody"
    );
  });
});

describe("the format and label branches", () => {
  it("reads a file with no extension and prints every label", () => {
    expect(claimedFormatOf({ name: "README", type: "" })).toBeNull();
    expect(formatLabelKey("jpeg")).toBe("unmaskFormatJpeg");
    expect(formatLabelKey("png")).toBe("unmaskFormatPng");
    expect(formatLabelKey("webp")).toBe("unmaskFormatWebp");
    expect(formatLabelKey("avif")).toBe("unmaskFormatAvif");
    expect(formatLabelKey("gif")).toBe("unmaskFormatGif");
    expect(formatLabelKey("bmp")).toBe("unmaskFormatBmp");
    expect(outputLabelKey("png")).toBe("unmaskFormatPng");
    expect(outputLabelKey("webp")).toBe("unmaskFormatWebp");
    expect(outputLabelKey("avif")).toBe("unmaskFormatAvif");
    expect(outputLabelKey("jpeg")).toBe("unmaskFormatJpeg");
    expect(outputNoteKey("png")).toBe("unmaskFormatPngNote");
    expect(outputNoteKey("webp")).toBe("unmaskFormatWebpNote");
    expect(outputNoteKey("avif")).toBe("unmaskFormatAvifNote");
    expect(outputNoteKey("jpeg")).toBe("unmaskFormatJpegNote");
    expect(backdropLabelKey({ _tag: "Transparent" })).toBe(
      "unmaskBackdropTransparent"
    );
    expect(
      backdropLabelKey({ _tag: "Solid", color: { a: 255, b: 0, g: 0, r: 0 } })
    ).toBe("unmaskBackdropSolid");
    expect(backdropLabelKey({ _tag: "Blur", radius: 20 })).toBe(
      "unmaskBackdropBlur"
    );
    expect(
      brushLabelKey({
        _tag: "Wand",
        connectivity: 8,
        mode: "erase",
        // SAFETY: The fixture id is opaque test data; no file text is part of it.
        operationId: "op" as OperationId,
        seed: { x: 0, y: 0 },
        tolerance: 20,
      })
    ).toBe("unmaskWand");
    expect(
      brushLabelKey({
        _tag: "Brush",
        mode: "restore",
        // SAFETY: The fixture id is opaque test data; no file text is part of it.
        operationId: "op" as OperationId,
        points: [{ x: 0, y: 0 }],
        size: 4,
      })
    ).toBe("unmaskBrush");
    expect(modeLabelKey("restore")).toBe("unmaskRestore");
    expect(modeLabelKey("erase")).toBe("unmaskErase");
  });

  it("covers the large and small byte figures", () => {
    expect(formatBytes(123_456, "en-US")).toBe("123.5 KB");
    expect(formatBytes(1_000_000_000_000, "en-US")).toBe("1,000 GB");
    expect(formatBytes(0, "en-US")).toBe("0 B");
    expect(formatBytes(10_000, "en-US")).toBe("10 KB");
  });

  it("keeps a name with no extension and an empty name", () => {
    expect(sanitizeStem("")).toBe("image");
    expect(sanitizeStem("photo")).toBe("photo");
  });
});
