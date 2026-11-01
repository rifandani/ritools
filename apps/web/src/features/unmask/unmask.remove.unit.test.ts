/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-shape-in-symbol-names, eslint/no-await-in-loop, eslint/no-unused-vars, typescript/array-type, typescript/no-non-null-assertion, unicorn/consistent-function-scoping, unicorn/no-useless-undefined -- tests build typed fixtures and replay steps in order. */
/* oxlint-disable promise/prefer-await-to-then -- the fixture decoders are promise-based. */
import { readFile } from "node:fs/promises";
import path from "node:path";

import jpegDecode, { init as initJpeg } from "@jsquash/jpeg/decode";
import pngDecode, { init as initPng } from "@jsquash/png/decode";
import { Effect } from "effect";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type {
  MatteId,
  ModelInfo,
  RasterImage,
  SourceFile,
  SourceId,
} from "@/features/unmask/unmask.engine";
import {
  Cancelled,
  ModelUnavailable,
  TooLarge,
  UnreadableFile,
  UnsupportedFormat,
} from "@/features/unmask/unmask.engine";
import {
  decodeFailure,
  hasMeaningfulAlpha,
  matteFromInference,
  modelInputOf,
  previewMatteOf,
  previewSizeOf,
  removeWith,
} from "@/features/unmask/unmask.remove";
import type { Inference } from "@/features/unmask/unmask.remove";

const ROOT = path.resolve(import.meta.dirname, "../../../../..");
const APP = path.resolve(import.meta.dirname, "../../..");
const FIXTURES = path.join(ROOT, "artifacts/unmask/fixtures");

interface FixtureRecord {
  readonly bytes: number;
  readonly file: string;
  readonly height: number;
  readonly width: number;
}

const manifest = JSON.parse(
  await readFile(path.join(FIXTURES, "manifest.json"), "utf-8")
) as { readonly fixtures: readonly FixtureRecord[] };

const model: ModelInfo = {
  backend: "wasm",
  bytes: 44_229_662,
  id: "isnet-int8",
  licence: "MIT",
  licenceUrl: "https://huggingface.co/xrds/isnet-general-onnx-int8",
  name: "ISNet int8",
  sha256: "3b21a6706dc8d6e4ba9f5b31ebc6940f6c785b58862e27bb25daa9dd4424b87f",
  version: "test",
};

const readFixture = async (name: string): Promise<Uint8Array> =>
  new Uint8Array(await readFile(path.join(FIXTURES, name)));

const decodeWithJsquash = async (
  name: string,
  format: "jpeg" | "png"
): Promise<RasterImage> => {
  const bytes = await readFixture(name);
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const image =
    format === "jpeg"
      ? await jpegDecode(copy.buffer)
      : await pngDecode(copy.buffer);
  return {
    height: image.height,
    rgba: new Uint8Array(
      image.data.buffer,
      image.data.byteOffset,
      image.data.byteLength
    ),
    width: image.width,
  };
};

beforeAll(async () => {
  const jpegWasm = await readFile(
    path.join(APP, "node_modules/@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm")
  );
  await initJpeg(await WebAssembly.compile(jpegWasm));
  const pngWasm = await readFile(
    path.join(APP, "node_modules/@jsquash/png/codec/pkg/squoosh_png_bg.wasm")
  );
  await initPng(await WebAssembly.compile(pngWasm));
});

const sourceFileOf = async (
  name: string,
  mime: string
): Promise<SourceFile> => ({
  bytes: await readFixture(name),
  mime,
  name,
});

const ovalInference = (options: {
  readonly width: number;
  readonly height: number;
}): Inference => {
  const alpha = new Float32Array(options.width * options.height);
  for (let y = 0; y < options.height; y += 1) {
    for (let x = 0; x < options.width; x += 1) {
      const dx = (x - options.width / 2) / (options.width * 0.4);
      const dy = (y - options.height / 2) / (options.height * 0.4);
      alpha[y * options.width + x] = Math.max(
        0,
        Math.min(1, 1 - Math.hypot(dx, dy))
      );
    }
  }
  return {
    alpha,
    height: options.height,
    model,
    notes: [{ _tag: "ModelDownloaded" }],
    width: options.width,
  };
};

const context = (deviceMemoryGb = 4) => ({
  deviceMemoryGb,
  sourceId: "source-test" as SourceId,
});

describe("remove against the fixtures", () => {
  it("decodes the hair fixture and writes a full and preview Matte", async () => {
    const raster = await decodeWithJsquash("portrait-hair.jpg", "jpeg");
    const infer = vi.fn(() =>
      Effect.succeed(ovalInference({ height: 16, width: 16 }))
    );
    const outcome = await Effect.runPromise(
      removeWith({
        decode: () => Effect.succeed({ frameCount: 1, raster }),
        infer,
      })(context(), await sourceFileOf("portrait-hair.jpg", "image/jpeg"))
    );
    expect(outcome.result.source).toMatchObject({
      format: "jpeg",
      frameCount: 1,
      height: 1521,
      width: 2400,
    });
    expect(outcome.result.matte.alpha).toHaveLength(2400 * 1521);
    expect(outcome.result.preview.width).toBe(2048);
    expect(outcome.result.preview.alpha).toHaveLength(2048 * 1298);
    expect(outcome.result.notes).toContainEqual({
      _tag: "PreviewDownscaled",
      height: 1298,
      width: 2048,
    });
    expect(infer).toHaveBeenCalledOnce();
    expect(outcome.result.model).toEqual(model);
  });

  it("keeps the input alpha and does not run the model", async () => {
    const raster = await decodeWithJsquash("alpha-input.png", "png");
    const infer = vi.fn(() =>
      Effect.succeed(ovalInference({ height: 4, width: 4 }))
    );
    const outcome = await Effect.runPromise(
      removeWith({
        decode: () => Effect.succeed({ frameCount: 1, raster }),
        infer,
      })(context(), await sourceFileOf("alpha-input.png", "image/png"))
    );
    expect(outcome.result.source.hasAlpha).toBe(true);
    expect(outcome.result.model).toBeNull();
    expect(outcome.result.notes).toContainEqual({ _tag: "InputAlpha" });
    expect(infer).not.toHaveBeenCalled();
    expect([...outcome.result.matte.alpha]).toEqual(
      [...raster.rgba].filter((_, index) => index % 4 === 3)
    );
  });

  it("notes the first frame for GIF and BMP", async () => {
    const raster: RasterImage = {
      height: 2,
      rgba: new Uint8Array(2 * 2 * 4).fill(255),
      width: 2,
    };
    for (const format of ["gif", "bmp"] as const) {
      const bytes = new Uint8Array(16);
      if (format === "gif") {
        bytes.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      } else {
        bytes.set([0x42, 0x4d]);
      }
      const outcome = await Effect.runPromise(
        removeWith({
          decode: () =>
            Effect.succeed({ frameCount: format === "gif" ? 2 : 1, raster }),
          infer: () => Effect.succeed(ovalInference({ height: 2, width: 2 })),
        })(context(), {
          bytes,
          mime: `image/${format}`,
          name: `first.${format}`,
        })
      );
      expect(outcome.result.notes).toContainEqual({
        _tag: "FirstFrame",
        format,
      });
    }
  });

  it("refuses a file that is not one of the six formats", async () => {
    const error = await Effect.runPromise(
      Effect.flip(
        removeWith({
          decode: () =>
            Effect.succeed({
              frameCount: 1,
              raster: { height: 1, rgba: new Uint8Array(4), width: 1 },
            }),
          infer: () => Effect.succeed(ovalInference({ height: 1, width: 1 })),
        })(context(), {
          bytes: Uint8Array.from([1, 2, 3]),
          mime: "text/plain",
          name: "x.txt",
        })
      )
    );
    expect(error._tag).toBe("UnsupportedFormat");
  });

  it("refuses an empty file", async () => {
    await expect(
      Effect.runPromise(
        removeWith({
          decode: () => Effect.die("must not decode"),
          infer: () => Effect.die("must not infer"),
        })(context(), {
          bytes: new Uint8Array(0),
          mime: "image/png",
          name: "x.png",
        })
      )
    ).rejects.toBeInstanceOf(UnreadableFile);
  });

  it("refuses an oversized header before decode", async () => {
    const bytes = new Uint8Array(33);
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
    bytes.set([0x49, 0x48, 0x44, 0x52], 12);
    bytes.set([0x00, 0x00, 0x27, 0x10], 16);
    bytes.set([0x00, 0x00, 0x27, 0x10], 20);
    const decode = vi.fn(() => Effect.die("must not decode"));
    await expect(
      Effect.runPromise(
        removeWith({
          decode,
          infer: () => Effect.die("must not infer"),
        })(context(), { bytes, mime: "image/png", name: "big.png" })
      )
    ).rejects.toBeInstanceOf(TooLarge);
    expect(decode).not.toHaveBeenCalled();
  });

  it("cancels before decode when the signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const decode = vi.fn(() => Effect.die("must not decode"));
    await expect(
      Effect.runPromise(
        removeWith({
          decode,
          infer: () => Effect.die("must not infer"),
        })(context(), await sourceFileOf("portrait-hair.jpg", "image/jpeg"), {
          signal: controller.signal,
        })
      )
    ).rejects.toBeInstanceOf(Cancelled);
    expect(decode).not.toHaveBeenCalled();
  });

  it("propagates a named decode failure", async () => {
    await expect(
      Effect.runPromise(
        removeWith({
          decode: () =>
            Effect.fail(new ModelUnavailable({ reason: "offline" })),
          infer: () => Effect.die("must not infer"),
        })(context(), await sourceFileOf("portrait-hair.jpg", "image/jpeg"))
      )
    ).rejects.toBeInstanceOf(ModelUnavailable);
  });

  it("wraps a raw decoder error as unreadable", () => {
    expect(decodeFailure(new Error("bad bytes"))).toBeInstanceOf(
      UnreadableFile
    );
    expect(decodeFailure(new RangeError("too large"))).toBeInstanceOf(TooLarge);
    expect(
      decodeFailure(new UnsupportedFormat({ format: "heic" }))
    ).toBeInstanceOf(UnsupportedFormat);
  });
});

describe("the model postprocess", () => {
  it("normalises the input to NCHW at 1024", () => {
    const raster: RasterImage = {
      height: 1,
      rgba: Uint8Array.from([10, 20, 30, 255]),
      width: 1,
    };
    const input = modelInputOf(raster);
    expect(input).toHaveLength(3 * 1024 * 1024);
    expect(input[0]).toBeCloseTo((10 - 128) / 256);
    expect(input[1024 * 1024]).toBeCloseTo((20 - 128) / 256);
    expect(input[2 * 1024 * 1024]).toBeCloseTo((30 - 128) / 256);
  });

  it("passes a probability output through and applies sigmoid to logits", () => {
    const probability = matteFromInference({
      height: 1,
      matteId: "m" as MatteId,
      modelHeight: 1,
      modelWidth: 2,
      values: Float32Array.from([0, 1]),
      width: 2,
    });
    expect([...probability.alpha]).toEqual([0, 255]);
    const logits = matteFromInference({
      height: 1,
      matteId: "m" as MatteId,
      modelHeight: 1,
      modelWidth: 2,
      values: Float32Array.from([-2, 2]),
      width: 2,
    });
    expect(logits.alpha[0]).toBeGreaterThan(0);
    expect(logits.alpha[0]).toBeLessThan(64);
    expect(logits.alpha[1]).toBeGreaterThan(192);
  });

  it("resizes a 2x2 output to the source", () => {
    const matte = matteFromInference({
      height: 4,
      matteId: "m" as MatteId,
      modelHeight: 2,
      modelWidth: 2,
      values: Float32Array.from([0, 1, 0, 1]),
      width: 4,
    });
    expect(matte.alpha).toHaveLength(16);
    expect(matte.alpha[0]).toBe(0);
    expect(matte.alpha[3]).toBe(255);
  });
});

describe("the preview and the input alpha", () => {
  it("caps the long edge and does not upscale", () => {
    expect(previewSizeOf(4000, 2000, 2048)).toEqual({
      height: 1024,
      width: 2048,
    });
    expect(previewSizeOf(100, 50, 2048)).toEqual({ height: 50, width: 100 });
    expect(previewSizeOf(4000, 4000, 100)).toEqual({ height: 512, width: 512 });
  });

  it("downscales the Matte by averaging cells", () => {
    const matte = previewMatteOf(
      {
        alpha: Uint8Array.from([0, 0, 255, 255]),
        height: 2,
        matteId: "matte-source-full" as MatteId,
        width: 2,
      },
      2
    );
    expect(matte.width).toBe(2);
    expect([...matte.alpha]).toEqual([0, 0, 255, 255]);
    const half = previewMatteOf(
      {
        alpha: Uint8Array.from([0, 0, 255, 255]),
        height: 2,
        matteId: "matte-source-full" as MatteId,
        width: 2,
      },
      512
    );
    expect(half.alpha).toHaveLength(4);
  });

  it("finds meaningful alpha at the 0.1% threshold", () => {
    const raster: RasterImage = {
      height: 1,
      rgba: Uint8Array.from([0, 0, 0, 254, 0, 0, 0, 255]),
      width: 2,
    };
    expect(hasMeaningfulAlpha(raster)).toBe(true);
    const opaque: RasterImage = {
      height: 1,
      rgba: Uint8Array.from([0, 0, 0, 255, 0, 0, 0, 255]),
      width: 2,
    };
    expect(hasMeaningfulAlpha(opaque)).toBe(false);
  });
});

describe("all eight fixtures", () => {
  it("returns a full-resolution soft Matte for every fixture", async () => {
    for (const record of manifest.fixtures) {
      const bytes = await readFixture(record.file);
      const raster: RasterImage = {
        height: record.height,
        rgba: new Uint8Array(record.width * record.height * 4).fill(255),
        width: record.width,
      };
      const outcome = await Effect.runPromise(
        removeWith({
          decode: () =>
            Effect.succeed({
              frameCount: record.file.endsWith(".gif") ? 2 : 1,
              raster,
            }),
          infer: () => Effect.succeed(ovalInference({ height: 16, width: 16 })),
        })(
          { deviceMemoryGb: 8, sourceId: record.file as SourceId },
          { bytes, mime: "image/jpeg", name: record.file }
        )
      );
      expect(outcome.result.matte.width).toBe(record.width);
      expect(outcome.result.matte.height).toBe(record.height);
      expect(outcome.result.matte.alpha).toHaveLength(
        record.width * record.height
      );
      expect(
        Math.max(outcome.result.preview.width, outcome.result.preview.height)
      ).toBeLessThanOrEqual(2048);
      expect(outcome.result.model).not.toBeNull();
    }
  }, 60_000);
});
