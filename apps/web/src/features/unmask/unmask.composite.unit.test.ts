/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-shape-in-symbol-names, eslint/no-await-in-loop, eslint/no-unused-vars, typescript/array-type, typescript/no-non-null-assertion, unicorn/consistent-function-scoping, unicorn/no-useless-undefined -- tests build typed fixtures and replay steps in order. */
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  blurPlane,
  boxWidthsFor,
  compositeEffect,
  compositeRaster,
  featherAlpha,
} from "@/features/unmask/unmask.composite";
import { TooLarge } from "@/features/unmask/unmask.engine";
import type {
  Matte,
  MatteId,
  RasterImage,
  RgbaColor,
} from "@/features/unmask/unmask.engine";

const matteId = (value: string): MatteId => value as MatteId;

const rasterOf = (
  width: number,
  height: number,
  rgba: readonly number[]
): RasterImage => ({
  height,
  rgba: Uint8Array.from(rgba),
  width,
});

const matteOf = (
  width: number,
  height: number,
  alpha: readonly number[]
): Matte => ({
  alpha: Uint8Array.from(alpha),
  height,
  matteId: matteId("matte-test"),
  width,
});

const pixelAt = (image: RasterImage, index: number): readonly number[] => [
  image.rgba[index * 4] ?? 0,
  image.rgba[index * 4 + 1] ?? 0,
  image.rgba[index * 4 + 2] ?? 0,
  image.rgba[index * 4 + 3] ?? 0,
];

const white: RgbaColor = { a: 255, b: 255, g: 255, r: 255 };
const red: RgbaColor = { a: 255, b: 0, g: 0, r: 255 };

describe("the blur plane", () => {
  it("returns a copy at sigma 0", () => {
    const source = Float32Array.from([1, 2, 3, 4]);
    const result = blurPlane({ height: 2, sigma: 0, source, width: 2 });
    expect([...result]).toEqual([1, 2, 3, 4]);
    expect(result).not.toBe(source);
  });

  it("keeps the total for a flat plane", () => {
    const source = new Float32Array(64).fill(10);
    const result = blurPlane({ height: 8, sigma: 3, source, width: 8 });
    for (const value of result) {
      expect(value).toBeCloseTo(10, 4);
    }
  });

  it("uses three box passes with odd widths", () => {
    for (const sigma of [0.5, 2, 10, 20]) {
      const widths = boxWidthsFor(sigma);
      expect(widths).toHaveLength(3);
      for (const width of widths) {
        expect(width % 2).toBe(1);
      }
    }
  });

  it("uses a unit width for a zero or negative sigma", () => {
    expect(boxWidthsFor(0)).toEqual([1, 1, 1]);
    expect(boxWidthsFor(-1)).toEqual([1, 1, 1]);
  });

  it("stops when the signal is aborted", () => {
    const controller = new AbortController();
    controller.abort();
    expect(() =>
      blurPlane({
        height: 4,
        sigma: 2,
        signal: controller.signal,
        source: new Float32Array(16),
        width: 4,
      })
    ).toThrow();
  });
});

describe("Feather", () => {
  it("is byte-identical at 0 px", () => {
    const alpha = Uint8Array.from([0, 128, 255]);
    expect(featherAlpha({ alpha, feather: 0, height: 1, width: 3 })).toBe(
      alpha
    );
  });

  it("softens the edge at 50 px", () => {
    const width = 100;
    const alpha = new Uint8Array(width);
    alpha.fill(255, 50);
    const soft = featherAlpha({ alpha, feather: 50, height: 1, width });
    expect(soft[0]).toBeLessThan(255);
    expect(soft[99]).toBeGreaterThan(0);
    expect(soft[50]).toBeGreaterThan(0);
    expect(soft[50]).toBeLessThan(255);
  });

  it("treats a non-finite Feather as zero", () => {
    const alpha = Uint8Array.from([0, 128, 255]);
    expect(
      featherAlpha({ alpha, feather: Number.NaN, height: 1, width: 3 })
    ).toBe(alpha);
  });

  it("stops before a blurred pass when the signal is aborted", () => {
    const controller = new AbortController();
    controller.abort();
    expect(() =>
      featherAlpha({
        alpha: new Uint8Array(16).fill(255),
        feather: 20,
        height: 4,
        signal: controller.signal,
        width: 4,
      })
    ).toThrow();
  });
});

describe("the Backdrops", () => {
  const source = rasterOf(
    3,
    1,
    [200, 100, 50, 255, 10, 20, 30, 255, 40, 50, 60, 255]
  );
  const matte = matteOf(3, 1, [0, 128, 255]);

  it("keeps the alpha and the source colour for Transparent", () => {
    const result = compositeRaster({
      backdrop: { _tag: "Transparent" },
      feather: 0,
      matte,
      source,
    });
    expect(pixelAt(result, 0)).toEqual([200, 100, 50, 0]);
    expect(pixelAt(result, 1)).toEqual([10, 20, 30, 128]);
    expect(pixelAt(result, 2)).toEqual([40, 50, 60, 255]);
  });

  it("composites over a Solid colour with an opaque result", () => {
    const result = compositeRaster({
      backdrop: { _tag: "Solid", color: red },
      feather: 0,
      matte,
      source,
    });
    expect(pixelAt(result, 0)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(result, 2)).toEqual([40, 50, 60, 255]);
    const middle = pixelAt(result, 1);
    expect(middle[0]).toBeGreaterThan(120);
    expect(middle[1]).toBeGreaterThan(0);
    expect(middle[3]).toBe(255);
  });

  it("uses the original image behind a Blur Backdrop", () => {
    const plain = compositeRaster({
      backdrop: { _tag: "Blur", radius: 0 },
      feather: 0,
      matte,
      source,
    });
    expect(pixelAt(plain, 0)).toEqual([200, 100, 50, 255]);
    expect(pixelAt(plain, 1)).toEqual([10, 20, 30, 255]);
    const soft = compositeRaster({
      backdrop: { _tag: "Blur", radius: 50 },
      feather: 0,
      matte,
      source,
    });
    expect(pixelAt(soft, 1)).not.toEqual([10, 20, 30, 255]);
    expect(pixelAt(soft, 1)[3]).toBe(255);
  });

  it("uses the default radius for a non-finite Blur radius", () => {
    const soft = compositeRaster({
      backdrop: { _tag: "Blur", radius: Number.NaN },
      feather: 0,
      matte,
      source,
    });
    expect(pixelAt(soft, 1)[3]).toBe(255);
  });

  it("does not multiply the source alpha twice on a Blur", () => {
    const half = rasterOf(1, 1, [255, 0, 0, 128]);
    const cut = matteOf(1, 1, [128]);
    const result = compositeRaster({
      backdrop: { _tag: "Blur", radius: 0 },
      feather: 0,
      matte: cut,
      source: half,
    });
    const [redChannel, green, blue] = pixelAt(result, 0);
    expect(redChannel).toBe(255);
    expect(green).toBeGreaterThanOrEqual(127);
    expect(green).toBeLessThanOrEqual(129);
    expect(blue).toBeGreaterThanOrEqual(127);
    expect(blue).toBeLessThanOrEqual(129);
  });

  it("composites an alpha input over white before the Blur", () => {
    const transparent = rasterOf(1, 1, [255, 0, 0, 0]);
    const cut = matteOf(1, 1, [0]);
    const result = compositeRaster({
      backdrop: { _tag: "Blur", radius: 0 },
      feather: 0,
      matte: cut,
      source: transparent,
    });
    expect(pixelAt(result, 0)).toEqual([255, 255, 255, 255]);
  });

  it("rejects a working set over 1 GiB", () => {
    expect(() =>
      compositeRaster({
        backdrop: { _tag: "Transparent" },
        feather: 0,
        matte: { ...matte, height: 20_000, width: 20_000 },
        source: { ...source, height: 20_000, width: 20_000 },
      })
    ).toThrow(TooLarge);
  });

  it("rejects a Matte that does not match the source", () => {
    expect(() =>
      compositeRaster({
        backdrop: { _tag: "Transparent" },
        feather: 0,
        matte: matteOf(2, 1, [0, 255]),
        source,
      })
    ).toThrow();
  });

  it("runs through the Effect wrapper", async () => {
    const result = await Effect.runPromise(
      compositeEffect({
        backdrop: { _tag: "Solid", color: white },
        feather: 0,
        matte,
        source,
      })
    );
    expect(result.width).toBe(3);
    expect(pixelAt(result, 0)).toEqual([255, 255, 255, 255]);
  });

  it("rethrows a size mismatch as a defect", async () => {
    await expect(
      Effect.runPromise(
        compositeEffect({
          backdrop: { _tag: "Transparent" },
          feather: 0,
          matte: matteOf(2, 1, [0, 255]),
          source,
        })
      )
    ).rejects.toThrow();
  });

  it("fails with Cancelled when the request signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const exit = await Effect.runPromiseExit(
      compositeEffect({
        backdrop: { _tag: "Transparent" },
        feather: 10,
        matte,
        signal: controller.signal,
        source,
      })
    );
    expect(exit._tag).toBe("Failure");
  });
});
