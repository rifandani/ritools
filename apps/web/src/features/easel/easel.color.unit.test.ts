import { describe, expect, it } from "vitest";

import {
  applyColorMatrix,
  colorMatrixOf,
  colorOfHex,
  compose,
  cssOf,
  filterMatrixOf,
  finetuneMatrixOf,
  hexOf,
  IDENTITY,
} from "@/features/easel/easel.color";
import { FILTER_NAMES, NO_FINETUNE } from "@/features/easel/easel.stack";
import type { Finetune, RgbaColor } from "@/features/easel/easel.stack";

const ORANGE: RgbaColor = { a: 200, b: 40, g: 120, r: 220 };
const GREY: RgbaColor = { a: 255, b: 128, g: 128, r: 128 };

const tuned = (patch: Partial<Finetune>): RgbaColor =>
  applyColorMatrix(finetuneMatrixOf({ ...NO_FINETUNE, ...patch }), ORANGE);

describe("Finetune", () => {
  it("does not change a color when each slider is 0", () => {
    const matrix = finetuneMatrixOf(NO_FINETUNE);
    for (const [index, value] of matrix.entries()) {
      expect(value).toBeCloseTo(IDENTITY[index] ?? 0);
    }
    expect(applyColorMatrix(matrix, ORANGE)).toEqual(ORANGE);
  });

  it("makes the color brighter with Brightness and Exposure", () => {
    expect(tuned({ brightness: 40 }).g).toBeGreaterThan(ORANGE.g);
    expect(tuned({ brightness: -40 }).g).toBeLessThan(ORANGE.g);
    // +100 Exposure is one stop: two times the light.
    expect(
      applyColorMatrix(finetuneMatrixOf({ ...NO_FINETUNE, exposure: 100 }), {
        a: 255,
        b: 10,
        g: 50,
        r: 100,
      })
    ).toEqual({ a: 255, b: 20, g: 100, r: 200 });
  });

  it("moves colors away from grey with Contrast and keeps middle grey", () => {
    expect(tuned({ contrast: 50 }).r).toBeGreaterThan(ORANGE.r);
    expect(tuned({ contrast: 50 }).b).toBeLessThan(ORANGE.b);
    const grey = applyColorMatrix(
      finetuneMatrixOf({ ...NO_FINETUNE, contrast: 80 }),
      GREY
    );
    expect(grey.r).toBeCloseTo(128, -1);
  });

  it("removes all color at −100 Saturation", () => {
    const mono = tuned({ saturation: -100 });
    expect(mono.r).toBe(mono.g);
    expect(mono.g).toBe(mono.b);
    expect(tuned({ saturation: 60 }).r).toBeGreaterThan(ORANGE.r);
  });

  it("turns the hue and keeps grey", () => {
    const turned = tuned({ hue: 100 });
    expect(turned.b).toBeGreaterThan(turned.r);
    const grey = applyColorMatrix(
      finetuneMatrixOf({ ...NO_FINETUNE, hue: 60 }),
      GREY
    );
    expect(Math.abs(grey.r - 128)).toBeLessThanOrEqual(1);
    expect(Math.abs(grey.b - 128)).toBeLessThanOrEqual(1);
  });

  it("adds red and removes blue with Warmth", () => {
    const warm = applyColorMatrix(
      finetuneMatrixOf({ ...NO_FINETUNE, warmth: 100 }),
      GREY
    );
    expect(warm.r).toBeGreaterThan(GREY.r);
    expect(warm.b).toBeLessThan(GREY.b);
  });

  it("does not change the alpha", () => {
    expect(tuned({ brightness: 100, contrast: 100 }).a).toBe(ORANGE.a);
  });
});

describe("Filter", () => {
  it("has a matrix for each named Filter that changes the color", () => {
    for (const name of FILTER_NAMES) {
      expect(applyColorMatrix(filterMatrixOf(name, 100), ORANGE)).not.toEqual(
        ORANGE
      );
    }
  });

  it("does nothing with no Filter or at strength 0", () => {
    expect(filterMatrixOf(null, 100)).toBe(IDENTITY);
    expect(applyColorMatrix(filterMatrixOf("noir", 0), ORANGE)).toEqual(ORANGE);
    expect(applyColorMatrix(filterMatrixOf("noir", -20), ORANGE)).toEqual(
      ORANGE
    );
  });

  it("is weaker at a lower strength", () => {
    const full = applyColorMatrix(filterMatrixOf("mono", 100), ORANGE);
    const half = applyColorMatrix(filterMatrixOf("mono", 50), ORANGE);
    expect(full.r).toBe(full.b);
    expect(half.r).toBeLessThan(ORANGE.r);
    expect(half.r).toBeGreaterThan(full.r);
    expect(applyColorMatrix(filterMatrixOf("mono", 900), ORANGE)).toEqual(full);
  });

  it("applies Finetune first, then the Filter", () => {
    const finetune = { ...NO_FINETUNE, brightness: 30 };
    const matrix = colorMatrixOf({
      filter: "sepia",
      filterStrength: 100,
      finetune,
    });
    const steps = applyColorMatrix(
      filterMatrixOf("sepia", 100),
      applyColorMatrix(finetuneMatrixOf(finetune), { ...ORANGE, r: 100 })
    );
    const once = applyColorMatrix(matrix, { ...ORANGE, r: 100 });
    expect(Math.abs(once.r - steps.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(once.g - steps.g)).toBeLessThanOrEqual(1);
    expect(compose(IDENTITY, IDENTITY)).toEqual(IDENTITY);
  });
});

describe("color text", () => {
  it("writes a color as hex and as CSS", () => {
    expect(hexOf(ORANGE)).toBe("#dc7828");
    expect(cssOf(ORANGE)).toBe("rgba(220, 120, 40, 0.784)");
  });

  it("reads a hex color", () => {
    expect(colorOfHex("#dc7828")).toEqual({ ...ORANGE, a: 255 });
    expect(colorOfHex("FFF")).toEqual({ a: 255, b: 255, g: 255, r: 255 });
    expect(colorOfHex("#12")).toBeNull();
    expect(colorOfHex("red")).toBeNull();
  });
});
