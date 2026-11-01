/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-shape-in-symbol-names, eslint/no-await-in-loop, eslint/no-unused-vars, typescript/array-type, typescript/no-non-null-assertion, unicorn/consistent-function-scoping, unicorn/no-useless-undefined -- tests build typed fixtures and replay steps in order. */
import { describe, expect, it } from "vitest";

import type {
  Matte,
  MatteId,
  MatteOperation,
  OperationId,
  Pixel,
  RasterImage,
} from "@/features/unmask/unmask.engine";
import {
  featherMatte,
  matteLengthOf,
  refineMatte,
  scaleMatte,
} from "@/features/unmask/unmask.matte";

const matteId = (value: string): MatteId => value as MatteId;
const operationId = (value: string): OperationId => value as OperationId;

const createMatte = (
  id: MatteId,
  width: number,
  height: number,
  alpha: Uint8Array
): Matte => {
  if (!Number.isSafeInteger(width) || width <= 0) {
    throw new Error("Matte width must be a positive integer");
  }
  if (!Number.isSafeInteger(height) || height <= 0) {
    throw new Error("Matte height must be a positive integer");
  }
  if (alpha.length !== width * height) {
    throw new Error("Matte length does not match its size");
  }
  return { alpha, height, matteId: id, width };
};

const makeMatteId = (seed: number): MatteId => `matte-${seed}` as MatteId;

const fakeMatteBytes = (width: number, height: number): Uint8Array => {
  const alpha = new Uint8Array(width * height);
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const radiusX = Math.max(1, width * 0.38);
  const radiusY = Math.max(1, height * 0.42);
  const edge = Math.max(1, Math.min(width, height) * 0.02);
  for (let y = 0; y < height; y += 1) {
    const dy = (y - centerY) / radiusY;
    for (let x = 0; x < width; x += 1) {
      const dx = (x - centerX) / radiusX;
      const distance = Math.hypot(dx, dy);
      const normalized = (1 - distance) * Math.min(radiusX, radiusY);
      alpha[y * width + x] = Math.round(
        Math.max(0, Math.min(1, normalized / edge + 0.5)) * 255
      );
    }
  }
  return alpha;
};

const fakeMatte = (id: MatteId, width: number, height: number): Matte =>
  createMatte(id, width, height, fakeMatteBytes(width, height));

const meaningfulAlpha = (alpha: Uint8Array): boolean => {
  if (alpha.length === 0) {
    return false;
  }
  let transparent = 0;
  for (const value of alpha) {
    if (value < 255) {
      transparent += 1;
    }
  }
  return transparent / alpha.length >= 0.001;
};

const anyTransparent = (alpha: Uint8Array): boolean => {
  for (const value of alpha) {
    if (value < 255) {
      return true;
    }
  }
  return false;
};

const sourceOf = (
  width: number,
  height: number,
  paint: (x: number, y: number) => readonly [number, number, number]
): RasterImage => {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = paint(x, y);
      const offset = (y * width + x) * 4;
      rgba[offset] = r;
      rgba[offset + 1] = g;
      rgba[offset + 2] = b;
      rgba[offset + 3] = 255;
    }
  }
  return { height, rgba, width };
};

const matteOf = (
  width: number,
  height: number,
  fill: (x: number, y: number) => number
): Matte => {
  const alpha = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      alpha[y * width + x] = fill(x, y);
    }
  }
  return createMatte(matteId("matte-test"), width, height, alpha);
};

const alphaAt = (matte: Matte, x: number, y: number): number =>
  matte.alpha[y * matte.width + x] ?? 0;

const countIntermediate = (matte: Matte): number => {
  let count = 0;
  for (const value of matte.alpha) {
    if (value > 0 && value < 255) {
      count += 1;
    }
  }
  return count;
};

const centroidX = (matte: Matte): number => {
  let total = 0;
  let weighted = 0;
  for (let y = 0; y < matte.height; y += 1) {
    for (let x = 0; x < matte.width; x += 1) {
      const value = alphaAt(matte, x, y);
      total += value;
      weighted += value * x;
    }
  }
  return total === 0 ? 0 : weighted / total;
};

describe("the Matte invariants", () => {
  it("creates a Matte only when the buffer matches its size", () => {
    expect(() => createMatte(matteId("m"), 2, 2, new Uint8Array(3))).toThrow();
    expect(() => createMatte(matteId("m"), 0, 2, new Uint8Array(0))).toThrow();
    expect(() => createMatte(matteId("m"), 2, 0, new Uint8Array(0))).toThrow();
    expect(matteLengthOf(3, 4)).toBe(12);
  });

  it("makes stable, opaque IDs without file text", () => {
    expect(makeMatteId(7)).toBe("matte-7");
    expect(String(makeMatteId(7))).not.toContain("/");
  });

  it("builds a soft fake Matte inside the frame", () => {
    const matte = fakeMatte(matteId("fake"), 40, 30);
    expect(matte.alpha).toHaveLength(1200);
    expect(alphaAt(matte, 20, 15)).toBe(255);
    expect(alphaAt(matte, 0, 0)).toBe(0);
    expect(fakeMatteBytes(40, 30)).toHaveLength(1200);
  });
});

describe("meaningful input alpha", () => {
  it("accepts at least 0.1% transparent pixels", () => {
    const almost = new Uint8Array(1000).fill(255);
    almost[0] = 254;
    expect(meaningfulAlpha(almost)).toBe(true);
    const stray = new Uint8Array(2000).fill(255);
    stray[0] = 0;
    expect(meaningfulAlpha(stray)).toBe(false);
    expect(meaningfulAlpha(new Uint8Array(0))).toBe(false);
    expect(anyTransparent(stray)).toBe(true);
    expect(anyTransparent(new Uint8Array(4).fill(255))).toBe(false);
  });
});

describe("preview scaling", () => {
  it("averages each source cell", () => {
    const matte = matteOf(4, 2, (x) => (x < 2 ? 0 : 200));
    const scaled = scaleMatte(matte, 2, 1);
    expect(scaled.width).toBe(2);
    expect(scaled.height).toBe(1);
    expect([...scaled.alpha]).toEqual([0, 200]);
    expect(scaleMatte(matte, 4, 2)).not.toBe(matte);
    expect(scaleMatte(matte, 4, 2).alpha).toEqual(matte.alpha);
    expect(scaleMatte(matte, 2, 1, matteId("preview")).matteId).toBe("preview");
  });
});

describe("the Wand", () => {
  const source = sourceOf(8, 8, (x) =>
    x < 4 ? [10, 10, 10] : [240, 240, 240]
  );
  const empty = matteOf(8, 8, () => 0);

  const wand = (
    options: Partial<{
      connectivity: 4 | 8;
      mode: "restore" | "erase";
      seed: Pixel;
      tolerance: number;
    }> = {}
  ): MatteOperation => ({
    _tag: "Wand",
    connectivity: options.connectivity ?? 4,
    mode: options.mode ?? "restore",
    operationId: operationId("wand-1"),
    seed: options.seed ?? { x: 1, y: 1 },
    tolerance: options.tolerance ?? 0,
  });

  it("selects only the exact region at tolerance 0", () => {
    const result = refineMatte({ matte: empty, operations: [wand()], source });
    expect(alphaAt(result, 0, 0)).toBe(255);
    expect(alphaAt(result, 3, 7)).toBe(255);
    expect(alphaAt(result, 4, 0)).toBe(0);
  });

  it("selects every colour at tolerance 100", () => {
    const result = refineMatte({
      matte: empty,
      operations: [wand({ tolerance: 100 })],
      source,
    });
    expect([...result.alpha].every((value) => value === 255)).toBe(true);
  });

  it("restores and erases in the right direction", () => {
    const restored = refineMatte({
      matte: empty,
      operations: [wand()],
      source,
    });
    const erased = refineMatte({
      matte: restored,
      operations: [wand({ mode: "erase" })],
      source,
    });
    expect(alphaAt(restored, 1, 1)).toBe(255);
    expect(alphaAt(erased, 1, 1)).toBe(0);
  });

  it("reads four or eight neighbours", () => {
    const diagonal = sourceOf(3, 3, (x, y) =>
      x === 1 && y === 1 ? [255, 0, 0] : [0, 0, 0]
    );
    const diagonalMatte = matteOf(3, 3, () => 0);
    const four = refineMatte({
      matte: diagonalMatte,
      operations: [wand({ connectivity: 4, seed: { x: 1, y: 1 } })],
      source: diagonal,
    });
    const eight = refineMatte({
      matte: diagonalMatte,
      operations: [wand({ connectivity: 8, seed: { x: 1, y: 1 } })],
      source: diagonal,
    });
    expect(alphaAt(four, 0, 0)).toBe(0);
    expect(alphaAt(eight, 0, 0)).toBe(0);
    // The red centre is the region in both cases; a corner only joins at a
    // tolerance that accepts black.
    expect(alphaAt(four, 1, 1)).toBe(255);
    expect(alphaAt(eight, 1, 1)).toBe(255);
  });

  it("clamps a seed outside the source", () => {
    const result = refineMatte({
      matte: empty,
      operations: [wand({ seed: { x: -100, y: 900 } })],
      source,
    });
    expect(alphaAt(result, 0, 0)).toBe(255);
  });
});

describe("the Brush", () => {
  const source = sourceOf(64, 64, () => [120, 80, 40]);
  const empty = matteOf(64, 64, () => 0);

  const brush = (
    options: Partial<{
      mode: "restore" | "erase";
      points: readonly Pixel[];
      size: number;
    }> = {}
  ): MatteOperation => ({
    _tag: "Brush",
    mode: options.mode ?? "restore",
    operationId: operationId("brush-1"),
    points: options.points ?? [{ x: 32, y: 32 }],
    size: options.size ?? 40,
  });

  it("paints a soft disc, not a hard circle", () => {
    const result = refineMatte({ matte: empty, operations: [brush()], source });
    expect(alphaAt(result, 32, 32)).toBe(255);
    const edge = alphaAt(result, 32 + 18, 32);
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(255);
  });

  it("paints one pixel at size 1", () => {
    const result = refineMatte({
      matte: empty,
      operations: [brush({ points: [{ x: 10, y: 10 }], size: 1 })],
      source,
    });
    expect(alphaAt(result, 10, 10)).toBe(255);
    expect(alphaAt(result, 12, 10)).toBe(0);
  });

  it("leaves the Matte alone for an empty stroke", () => {
    const result = refineMatte({
      matte: empty,
      operations: [brush({ points: [] })],
      source,
    });
    expect([...result.alpha]).toEqual([...empty.alpha]);
  });

  it("clamps size to 1-200", () => {
    const tiny = refineMatte({
      matte: empty,
      operations: [brush({ size: -20 })],
      source,
    });
    const huge = refineMatte({
      matte: empty,
      operations: [brush({ size: 1000 })],
      source,
    });
    expect(alphaAt(tiny, 32, 32)).toBe(255);
    expect(alphaAt(huge, 2, 2)).toBe(255);
  });

  it("stamps between two distant points without a gap", () => {
    const result = refineMatte({
      matte: empty,
      operations: [
        brush({
          points: [
            { x: 10, y: 32 },
            { x: 50, y: 32 },
          ],
          size: 4,
        }),
      ],
      source,
    });
    for (let x = 10; x <= 50; x += 1) {
      expect(alphaAt(result, x, 32)).toBeGreaterThan(0);
    }
  });

  it("erases toward transparent", () => {
    const filled = matteOf(64, 64, () => 255);
    const result = refineMatte({
      matte: filled,
      operations: [brush({ mode: "erase" })],
      source,
    });
    expect(alphaAt(result, 32, 32)).toBe(0);
    expect(alphaAt(result, 0, 0)).toBe(255);
  });
});

describe("replay and determinism", () => {
  const source = sourceOf(32, 32, (x, y) =>
    (x + y) % 2 === 0 ? [20, 20, 20] : [230, 230, 230]
  );
  const start = matteOf(32, 32, () => 0);
  const operations: readonly MatteOperation[] = Array.from(
    { length: 100 },
    (_, index) => ({
      _tag: "Brush" as const,
      mode: index % 2 === 0 ? ("restore" as const) : ("erase" as const),
      operationId: operationId(`brush-${index}`),
      points: [{ x: index % 31, y: (index * 3) % 31 }],
      size: 5,
    })
  );

  it("gives the same bytes twice", () => {
    const first = refineMatte({ matte: start, operations, source });
    const second = refineMatte({ matte: start, operations, source });
    expect([...first.alpha]).toEqual([...second.alpha]);
  });

  it("gives the same result one at a time and as a full replay", () => {
    const full = refineMatte({ matte: start, operations, source });
    let step = start;
    for (const operation of operations) {
      step = refineMatte({ matte: step, operations: [operation], source });
    }
    expect([...step.alpha]).toEqual([...full.alpha]);
  });

  it("does not change an empty log", () => {
    const result = refineMatte({ matte: start, operations: [], source });
    expect([...result.alpha]).toEqual([...start.alpha]);
    expect(result.matteId).toBe(start.matteId);
  });

  it("rejects an empty source or Matte as a defect", () => {
    expect(() =>
      refineMatte({
        matte: matteOf(1, 1, () => 0),
        operations: [],
        source: { height: 1, rgba: new Uint8Array(0), width: 0 },
      })
    ).toThrow();
  });

  it("rejects a mismatched aspect ratio as a defect", () => {
    const wide = matteOf(64, 16, () => 0);
    expect(() =>
      refineMatte({ matte: wide, operations: [], source })
    ).toThrow();
  });
});

describe("Feather", () => {
  const sharp = matteOf(64, 64, (x) => (x >= 16 && x < 48 ? 255 : 0));

  it("is byte-identical at 0 px", () => {
    const result = featherMatte(sharp, 0);
    expect(result.alpha).toBe(sharp.alpha);
    expect([...result.alpha]).toEqual([...sharp.alpha]);
  });

  it("softens the edge without moving the Subject", () => {
    const soft = featherMatte(sharp, 20);
    expect(countIntermediate(soft)).toBeGreaterThan(countIntermediate(sharp));
    expect(Math.abs(centroidX(soft) - centroidX(sharp))).toBeLessThan(0.5);
    expect(alphaAt(soft, 0, 32)).toBeLessThan(15);
    expect(alphaAt(soft, 63, 32)).toBeLessThan(15);
  });

  it("clamps a value outside 0-50", () => {
    const negative = featherMatte(sharp, -5);
    expect([...negative.alpha]).toEqual([...sharp.alpha]);
  });
});
