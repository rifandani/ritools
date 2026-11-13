import { describe, expect, it } from "vitest";

import {
  applyMatrix,
  boxBetween,
  clampRect,
  clampStraighten,
  cropRectOf,
  defaultCropOf,
  expandedRect,
  flipRect,
  frameSizeOf,
  frameToSourceOf,
  FULL_RECT,
  largestInnerRect,
  MIN_CROP,
  moveCrop,
  multiply,
  orientedSizeOf,
  resizeCrop,
  rotatePoint,
  rotateRect,
  segmentBetween,
  pivotPoint,
} from "@/features/easel/easel.geometry";
import type { Geometry, Rect } from "@/features/easel/easel.geometry";
import { CROP_PRESETS, cropPresetOf } from "@/features/easel/easel.presets";

const SOURCE = { height: 600, width: 800 };

const geometry = (patch: Partial<Geometry> = {}): Geometry => ({
  flipH: false,
  flipV: false,
  keepWhole: false,
  rotate: 0,
  straighten: 0,
  ...patch,
});

/** The source pixel that shows at a frame corner. */
const sourceAt = (
  patch: Partial<Geometry>,
  corner: "bottom-right" | "top-left"
) => {
  const state = geometry(patch);
  const frame = frameSizeOf(SOURCE, state);
  const sign = corner === "top-left" ? -1 : 1;
  const point = applyMatrix(frameToSourceOf(SOURCE, state), {
    x: (sign * frame.width) / 2,
    y: (sign * frame.height) / 2,
  });
  return { x: Math.round(point.x), y: Math.round(point.y) };
};

describe("the frame", () => {
  it("is the source with no change", () => {
    expect(frameSizeOf(SOURCE, geometry())).toEqual(SOURCE);
    expect(sourceAt({}, "top-left")).toEqual({ x: 0, y: 0 });
    expect(sourceAt({}, "bottom-right")).toEqual({ x: 800, y: 600 });
  });

  it("swaps its sides after one Rotate", () => {
    expect(orientedSizeOf(SOURCE, 1)).toEqual({ height: 800, width: 600 });
    expect(orientedSizeOf(SOURCE, 2)).toEqual(SOURCE);
    expect(frameSizeOf(SOURCE, geometry({ rotate: 3 }))).toEqual({
      height: 800,
      width: 600,
    });
  });

  it("shows the bottom left of the source at the top left after a right Rotate", () => {
    expect(sourceAt({ rotate: 1 }, "top-left")).toEqual({ x: 0, y: 600 });
    expect(sourceAt({ rotate: 1 }, "bottom-right")).toEqual({ x: 800, y: 0 });
    expect(sourceAt({ rotate: 2 }, "top-left")).toEqual({ x: 800, y: 600 });
    expect(sourceAt({ rotate: 3 }, "top-left")).toEqual({ x: 800, y: 0 });
  });

  it("mirrors the source with a flip", () => {
    expect(sourceAt({ flipH: true }, "top-left")).toEqual({ x: 800, y: 0 });
    expect(sourceAt({ flipV: true }, "top-left")).toEqual({ x: 0, y: 600 });
  });

  it("composes a flip with a Rotate", () => {
    // Flip first, then turn right: the flipped bottom left is at the top left.
    expect(sourceAt({ flipH: true, rotate: 1 }, "top-left")).toEqual({
      x: 800,
      y: 600,
    });
    expect(sourceAt({ flipV: true, rotate: 1 }, "top-left")).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe("Straighten", () => {
  it("keeps the whole frame at 0°", () => {
    expect(largestInnerRect(SOURCE, 0)).toBe(SOURCE);
  });

  it("crops to the largest rectangle inside the rotated image", () => {
    for (const angle of [1, 5, 10, 20, 30, 44.9, -12]) {
      const inner = largestInnerRect(SOURCE, angle);
      // The rotated corners of the inner rectangle stay inside the source.
      const state = geometry({ straighten: angle });
      const matrix = frameToSourceOf(SOURCE, state);
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const) {
        const point = applyMatrix(matrix, {
          x: (sx * inner.width) / 2,
          y: (sy * inner.height) / 2,
        });
        expect(point.x).toBeGreaterThanOrEqual(-1e-6);
        expect(point.x).toBeLessThanOrEqual(SOURCE.width + 1e-6);
        expect(point.y).toBeGreaterThanOrEqual(-1e-6);
        expect(point.y).toBeLessThanOrEqual(SOURCE.height + 1e-6);
      }
      expect(inner.width * inner.height).toBeLessThan(800 * 600);
      expect(frameSizeOf(SOURCE, state)).toEqual(inner);
    }
  });

  it("gives a known rectangle at 10° and at 45°", () => {
    const ten = largestInnerRect(SOURCE, 10);
    expect(ten.width).toBeCloseTo(727.5, 0);
    expect(ten.height).toBeCloseTo(481, 0);
    // At 45° the rectangle is half-constrained by the short side.
    const half = largestInnerRect(SOURCE, 45);
    expect(half.width).toBeCloseTo(300 / Math.SQRT1_2);
    expect(half.height).toBeCloseTo(300 / Math.SQRT1_2);
    const tall = largestInnerRect({ height: 800, width: 600 }, 45);
    expect(tall.width).toBeCloseTo(half.width);
    const narrow = largestInnerRect({ height: 100, width: 1000 }, 30);
    expect(narrow.height).toBeCloseTo(50 / Math.cos(Math.PI / 6));
    expect(narrow.width).toBeCloseTo(100);
    const narrowTall = largestInnerRect({ height: 1000, width: 100 }, 30);
    expect(narrowTall.height).toBeCloseTo(100);
  });

  it("expands the canvas for Keep whole image", () => {
    const expanded = expandedRect(SOURCE, 90);
    expect(expanded.width).toBeCloseTo(600);
    expect(expanded.height).toBeCloseTo(800);
    const frame = frameSizeOf(
      SOURCE,
      geometry({ keepWhole: true, straighten: 10 })
    );
    expect(frame.width).toBeGreaterThan(800);
    expect(frame.height).toBeGreaterThan(600);
    expect(frame).toEqual(expandedRect(SOURCE, 10));
  });

  it("rounds the angle to 0.1° inside its limits", () => {
    expect(clampStraighten(12.34)).toBe(12.3);
    expect(clampStraighten(-0.01)).toBe(0);
    expect(Object.is(clampStraighten(-0.01), 0)).toBe(true);
    expect(clampStraighten(99)).toBe(45);
    expect(clampStraighten(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("matrices and points", () => {
  it("multiplies in the order of use", () => {
    const moved = multiply([1, 0, 0, 1, 10, 0], [2, 0, 0, 2, 0, 0]);
    expect(applyMatrix(moved, { x: 1, y: 1 })).toEqual({ x: 12, y: 2 });
  });

  it("rotates and turns a point", () => {
    expect(rotatePoint({ x: 1, y: 0 }, "right")).toEqual({ x: -0, y: 1 });
    expect(rotatePoint({ x: 1, y: 0 }, "left")).toEqual({ x: 0, y: -1 });
    const turned = pivotPoint({ x: 1, y: 0 }, 90);
    expect(turned.x).toBeCloseTo(0);
    expect(turned.y).toBeCloseTo(1);
  });
});

describe("the crop rectangle", () => {
  it("gives each Crop Preset its ratio, in the middle of the frame", () => {
    for (const preset of CROP_PRESETS) {
      const crop = cropRectOf(SOURCE, FULL_RECT, preset.ratio);
      if (preset.ratio === null) {
        expect(crop).toEqual({ height: 600, width: 800, x: 0, y: 0 });
      } else {
        expect(crop.width / crop.height).toBeCloseTo(preset.ratio);
        expect(crop.x + crop.width / 2).toBeCloseTo(400);
        expect(crop.y + crop.height / 2).toBeCloseTo(300);
        expect(crop.width).toBeLessThanOrEqual(800 + 1e-9);
        expect(crop.height).toBeLessThanOrEqual(600 + 1e-9);
      }
    }
  });

  it("gives a tall ratio the full height", () => {
    const crop = cropRectOf(SOURCE, FULL_RECT, 9 / 16);
    expect(crop.height).toBe(600);
    expect(crop.width).toBeCloseTo(337.5);
  });

  it("makes the default crop of a preset", () => {
    expect(defaultCropOf(SOURCE, null)).toBe(FULL_RECT);
    const square = defaultCropOf(SOURCE, 1);
    expect(square.width).toBeCloseTo(0.75);
    expect(square.height).toBeCloseTo(1);
    expect(square.x).toBeCloseTo(0.125);
  });

  it("has a social network size for each social preset only", () => {
    expect(cropPresetOf("facebook-cover").size).toEqual({
      height: 312,
      width: 820,
    });
    expect(cropPresetOf("ellipse").form).toBe("ellipse");
    for (const preset of CROP_PRESETS) {
      expect(preset.size === null).toBe(preset.group === "basic");
    }
  });

  it("keeps a rectangle inside the unit square", () => {
    expect(clampRect({ height: 0, width: 3, x: -1, y: 2 })).toEqual({
      height: MIN_CROP,
      width: 1,
      x: 0,
      y: 1 - MIN_CROP,
    });
  });

  it("rotates and flips a rectangle", () => {
    const rect: Rect = { height: 0.2, width: 0.4, x: 0.1, y: 0.3 };
    const right = rotateRect(rect, "right");
    expect(right.x).toBeCloseTo(0.5);
    expect(right.y).toBeCloseTo(0.1);
    expect(right.width).toBeCloseTo(0.2);
    const back = rotateRect(right, "left");
    expect(back.x).toBeCloseTo(rect.x);
    expect(back.y).toBeCloseTo(rect.y);
    expect(flipRect(rect, "horizontal").x).toBeCloseTo(0.5);
    expect(flipRect(rect, "vertical").y).toBeCloseTo(0.5);
  });
});

const pixelRatio = (crop: Rect) =>
  (crop.width * SOURCE.width) / (crop.height * SOURCE.height);

describe("crop handles", () => {
  const rect: Rect = { height: 0.5, width: 0.5, x: 0.25, y: 0.25 };
  const drag = (
    handle: Parameters<typeof resizeCrop>[0]["handle"],
    dx: number,
    dy: number,
    ratio: number | null = null
  ) => resizeCrop({ dx, dy, frame: SOURCE, handle, ratio, rect });

  it("moves the crop and stops at the frame", () => {
    expect(moveCrop(rect, 0.1, -0.1)).toMatchObject({ x: 0.35, y: 0.15 });
    expect(moveCrop(rect, 5, 5)).toMatchObject({ x: 0.5, y: 0.5 });
  });

  it("moves one side or one corner of a free crop", () => {
    const east = drag("e", 0.1, 0.3);
    expect(east.width).toBeCloseTo(0.6);
    expect(east.height).toBe(0.5);
    const northWest = drag("nw", -0.1, 0.1);
    expect(northWest.x).toBeCloseTo(0.15);
    expect(northWest.y).toBeCloseTo(0.35);
    expect(northWest.width).toBeCloseTo(0.6);
    expect(northWest.height).toBeCloseTo(0.4);
    const south = drag("s", 0, 9);
    expect(south.y + south.height).toBe(1);
  });

  it("does not let a side cross the opposite side", () => {
    const west = drag("w", 2, 0);
    expect(west.width).toBeCloseTo(MIN_CROP);
    const north = drag("n", 0, 2);
    expect(north.height).toBeCloseTo(MIN_CROP);
  });

  it("keeps the pixel ratio of a preset", () => {
    for (const handle of [
      "n",
      "ne",
      "e",
      "se",
      "s",
      "sw",
      "w",
      "nw",
    ] as const) {
      const crop = drag(handle, 0.07, -0.05, 1);
      expect(pixelRatio(crop)).toBeCloseTo(1);
      expect(crop.x).toBeGreaterThanOrEqual(-1e-9);
      expect(crop.y).toBeGreaterThanOrEqual(-1e-9);
      expect(crop.x + crop.width).toBeLessThanOrEqual(1 + 1e-9);
      expect(crop.y + crop.height).toBeLessThanOrEqual(1 + 1e-9);
    }
    // The corner opposite the handle stays.
    const southEast = drag("se", 0.1, 0.1, 1);
    expect(southEast.x).toBe(0.25);
    expect(southEast.y).toBe(0.25);
    const northWest = drag("nw", -0.1, -0.1, 1);
    expect(northWest.x + northWest.width).toBeCloseTo(0.75);
    expect(northWest.y + northWest.height).toBeCloseTo(0.75);
    // A side handle grows around the center of the other axis.
    const east = drag("e", 0.1, 0, 1);
    expect(east.y + east.height / 2).toBeCloseTo(0.5);
    const south = drag("s", 0, 0.1, 1);
    expect(south.x + south.width / 2).toBeCloseTo(0.5);
  });

  it("stops a ratio crop at the frame", () => {
    const wide = drag("e", 9, 0, 4);
    expect(wide.x + wide.width).toBeLessThanOrEqual(1 + 1e-9);
    const tall = drag("s", 0, 9, 0.2);
    expect(tall.y + tall.height).toBeLessThanOrEqual(1 + 1e-9);
    expect(tall.x).toBeGreaterThanOrEqual(-1e-9);
  });
});

describe("a drawn form", () => {
  it("makes a box from a drag in any direction", () => {
    expect(boxBetween({ x: 10, y: 10 }, { x: 30, y: 20 }, false)).toEqual({
      height: 10,
      width: 20,
      x: 20,
      y: 15,
    });
    expect(boxBetween({ x: 10, y: 10 }, { x: 0, y: 4 }, false)).toEqual({
      height: 6,
      width: 10,
      x: 5,
      y: 7,
    });
  });

  it("makes a square with Shift, from the start corner", () => {
    expect(boxBetween({ x: 0, y: 0 }, { x: 30, y: -10 }, true)).toEqual({
      height: 30,
      width: 30,
      x: 15,
      y: -15,
    });
  });

  it("makes a line with its center, length, and angle", () => {
    const line = segmentBetween({ x: 0, y: 0 }, { x: 0, y: 10 }, false);
    expect(line.rotation).toBeCloseTo(90);
    expect(line.width).toBeCloseTo(10);
    expect(line.x).toBeCloseTo(0);
    expect(line.y).toBeCloseTo(5);
  });

  it("snaps a line to 45° with Shift", () => {
    const line = segmentBetween({ x: 0, y: 0 }, { x: 10, y: 1 }, true);
    expect(line.rotation).toBe(0);
    expect(line.y).toBeCloseTo(0);
    expect(line.x).toBeCloseTo(Math.hypot(10, 1) / 2);
  });
});
