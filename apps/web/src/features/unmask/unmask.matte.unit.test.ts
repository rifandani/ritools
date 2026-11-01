import { describe, expect, it } from "vitest";

import type {
  BrushOperation,
  Matte,
  RasterImage,
  WandOperation,
} from "@/features/unmask/unmask.engine";
import {
  anyTransparent,
  createMatte,
  fakeMatte,
  fakeMatteBytes,
  featherMatte,
  makeMatteId,
  meaningfulAlpha,
  refineMatte,
  scaleMatte,
} from "@/features/unmask/unmask.matte";

const ID = makeMatteId(1);

const matteOf = (width: number, height: number, alpha: number): Matte =>
  createMatte(ID, width, height, new Uint8Array(width * height).fill(alpha));

/** An RGBA raster from one colour function. */
const rasterOf = (
  width: number,
  height: number,
  colour: (x: number, y: number) => readonly [number, number, number, number]
): RasterImage => {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = colour(x, y);
      const index = (y * width + x) * 4;
      rgba[index] = r;
      rgba[index + 1] = g;
      rgba[index + 2] = b;
      rgba[index + 3] = a;
    }
  }
  return { height, rgba, width };
};

const wand = (
  over: Partial<Omit<WandOperation, "_tag">> = {}
): WandOperation => ({
  _tag: "Wand",
  connectivity: 8,
  mode: "erase",
  // SAFETY: The fixture id is opaque test data; no file text is part of it.
  operationId: "op-wand" as WandOperation["operationId"],
  seed: { x: 0, y: 0 },
  tolerance: 0,
  ...over,
});

const brush = (
  over: Partial<Omit<BrushOperation, "_tag">> = {}
): BrushOperation => ({
  _tag: "Brush",
  mode: "restore",
  // SAFETY: The fixture id is opaque test data; no file text is part of it.
  operationId: "op-brush" as BrushOperation["operationId"],
  points: [{ x: 2, y: 2 }],
  size: 4,
  ...over,
});

describe("the Matte", () => {
  it("checks its length against its size", () => {
    expect(() => createMatte(ID, 2, 2, new Uint8Array(3))).toThrow();
    expect(() => createMatte(ID, 0, 2, new Uint8Array(0))).toThrow();
    expect(createMatte(ID, 2, 2, new Uint8Array(4)).alpha).toHaveLength(4);
  });

  it("builds a stable fake Matte from the size", () => {
    const first = fakeMatteBytes(10, 10);
    const second = fakeMatteBytes(10, 10);
    expect(first).toEqual(second);
    expect(first).toHaveLength(100);
    expect(first[5 * 10 + 5]).toBe(255);
    expect(first[0]).toBe(0);
    expect(fakeMatte(ID, 10, 10).width).toBe(10);
  });

  it("finds meaningful alpha and any transparency", () => {
    expect(meaningfulAlpha(new Uint8Array(1000))).toBe(true);
    expect(meaningfulAlpha(new Uint8Array(1000).fill(255))).toBe(false);
    expect(meaningfulAlpha(new Uint8Array(0))).toBe(false);
    const mostlyOpaque = new Uint8Array(1000).fill(255);
    mostlyOpaque[0] = 0;
    expect(meaningfulAlpha(mostlyOpaque)).toBe(true);
    const stray = new Uint8Array(10_000).fill(255);
    stray[0] = 0;
    expect(meaningfulAlpha(stray)).toBe(false);
    expect(anyTransparent(mostlyOpaque)).toBe(true);
    expect(anyTransparent(new Uint8Array(5).fill(255))).toBe(false);
  });
});

describe("the Wand", () => {
  const split = rasterOf(4, 4, (x) =>
    x < 2 ? [255, 0, 0, 255] : [0, 0, 255, 255]
  );

  it("erases the contiguous seed region only", () => {
    const matte = matteOf(4, 4, 255);
    const next = refineMatte({
      matte,
      operations: [wand({ seed: { x: 0, y: 0 } })],
      source: split,
    });
    expect([...next.alpha]).toEqual([
      0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255,
    ]);
  });

  it("restores a region and clamps a seed outside the source", () => {
    const matte = matteOf(4, 4, 0);
    const next = refineMatte({
      matte,
      operations: [wand({ mode: "restore", seed: { x: 99, y: 99 } })],
      source: split,
    });
    expect(next.alpha[3]).toBe(255);
    expect(next.alpha[0]).toBe(0);
  });

  it("uses 4- and 8-connectivity for a diagonal", () => {
    const diagonal = rasterOf(3, 3, (x, y) =>
      x === y ? [255, 255, 255, 255] : [0, 0, 0, 255]
    );
    const four = refineMatte({
      matte: matteOf(3, 3, 0),
      operations: [
        wand({
          connectivity: 4,
          mode: "restore",
          seed: { x: 0, y: 0 },
          tolerance: 0,
        }),
      ],
      source: diagonal,
    });
    const eight = refineMatte({
      matte: matteOf(3, 3, 0),
      operations: [
        wand({
          connectivity: 8,
          mode: "restore",
          seed: { x: 0, y: 0 },
          tolerance: 0,
        }),
      ],
      source: diagonal,
    });
    expect(four.alpha[4]).toBe(0);
    expect(eight.alpha[4]).toBe(255);
  });

  it("includes every colour at tolerance 100", () => {
    const next = refineMatte({
      matte: matteOf(4, 4, 0),
      operations: [
        wand({ mode: "restore", seed: { x: 0, y: 0 }, tolerance: 100 }),
      ],
      source: split,
    });
    expect(new Set(next.alpha)).toEqual(new Set([255]));
  });

  it("honours a tolerance between the two colours", () => {
    const near = rasterOf(2, 1, (x) =>
      x === 0 ? [255, 0, 0, 255] : [250, 0, 0, 255]
    );
    const next = refineMatte({
      matte: matteOf(2, 1, 0),
      operations: [
        wand({ mode: "restore", seed: { x: 0, y: 0 }, tolerance: 5 }),
      ],
      source: near,
    });
    expect([...next.alpha]).toEqual([255, 255]);
  });
});

describe("the Brush", () => {
  const plain = rasterOf(8, 8, () => [10, 20, 30, 255]);

  it("restores a soft dot and moves toward the target", () => {
    const next = refineMatte({
      matte: matteOf(8, 8, 0),
      operations: [brush({ size: 8 })],
      source: plain,
    });
    expect(next.alpha[2 * 8 + 2]).toBe(255);
    const rim = next.alpha[2 * 8 + 5] ?? 0;
    expect(rim).toBeGreaterThan(0);
    expect(rim).toBeLessThan(255);
  });

  it("erases toward zero and interpolates a path", () => {
    const next = refineMatte({
      matte: matteOf(8, 8, 255),
      operations: [
        brush({
          mode: "erase",
          points: [
            { x: 1, y: 1 },
            { x: 6, y: 1 },
          ],
          size: 2,
        }),
      ],
      source: plain,
    });
    expect(next.alpha[1 * 8 + 1]).toBeLessThan(255);
    expect(next.alpha[1 * 8 + 4]).toBeLessThan(255);
    expect(next.alpha[7 * 8 + 7]).toBe(255);
  });

  it("clamps the size to 1-200 and a point to the source", () => {
    const next = refineMatte({
      matte: matteOf(4, 4, 0),
      operations: [brush({ points: [{ x: -20, y: -20 }], size: 999 })],
      source: plain,
    });
    expect(next.alpha[0]).toBe(255);
  });

  it("is deterministic over a replay", () => {
    const operations = [
      wand({ mode: "restore", seed: { x: 0, y: 0 }, tolerance: 100 }),
      brush({
        points: [
          { x: 1, y: 1 },
          { x: 5, y: 5 },
        ],
        size: 3,
      }),
    ] as const;
    const first = refineMatte({
      matte: matteOf(8, 8, 0),
      operations,
      source: plain,
    });
    const second = refineMatte({
      matte: matteOf(8, 8, 0),
      operations,
      source: plain,
    });
    expect(first.alpha).toEqual(second.alpha);
  });

  it("throws when the source and the Matte do not share an aspect ratio", () => {
    expect(() =>
      refineMatte({
        matte: matteOf(4, 4, 0),
        operations: [],
        source: rasterOf(8, 2, () => [0, 0, 0, 255]),
      })
    ).toThrow();
  });
});

describe("Feather and scale", () => {
  it("keeps a zero Feather hard", () => {
    const matte = createMatte(ID, 4, 1, Uint8Array.from([0, 0, 255, 255]));
    expect(featherMatte(matte, 0)).toBe(matte);
  });

  it("softens the edge and clamps the Feather", () => {
    const matte = createMatte(
      ID,
      8,
      1,
      Uint8Array.from([0, 0, 0, 0, 255, 255, 255, 255])
    );
    const soft = featherMatte(matte, 50);
    expect(soft.alpha[3]).toBeGreaterThan(0);
    expect(soft.alpha[3]).toBeLessThan(255);
    expect(featherMatte(matte, -10)).toBe(matte);
  });

  it("averages cells when it downscales", () => {
    const matte = createMatte(
      ID,
      4,
      4,
      Uint8Array.from([
        0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255,
      ])
    );
    const half = scaleMatte(matte, 2, 2);
    expect([...half.alpha]).toEqual([0, 255, 0, 255]);
    expect(scaleMatte(matte, 4, 4)).toEqual(matte);
  });
});

describe("the Matte guards", () => {
  it("refuses a zero height and an empty source", () => {
    expect(() => createMatte(ID, 2, 0, new Uint8Array(0))).toThrow();
    expect(() =>
      refineMatte({
        matte: matteOf(2, 2, 0),
        operations: [],
        source: { height: 0, rgba: new Uint8Array(0), width: 0 },
      })
    ).toThrow();
  });

  it("leaves a Brush with no points alone", () => {
    const matte = matteOf(4, 4, 7);
    const next = refineMatte({
      matte,
      operations: [brush({ points: [] })],
      source: rasterOf(4, 4, () => [0, 0, 0, 255]),
    });
    expect([...next.alpha]).toEqual([...matte.alpha]);
  });

  it("clamps a Feather above 50 and keeps the input size", () => {
    const matte = matteOf(4, 4, 255);
    const soft = featherMatte(matte, 99);
    expect(soft.width).toBe(4);
    expect(soft.alpha).toHaveLength(16);
  });
});
