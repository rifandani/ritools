import { describe, expect, it } from "vitest";

import {
  bakeCover,
  bakeMosaic,
  bucketFillArea,
  fillOverlayOf,
  MIN_MOSAIC_BLOCK,
  mosaicBlockSizeOf,
} from "@/features/easel/easel.pixels";
import type { Raster } from "@/features/easel/easel.pixels";
import { ORIGINAL, reduce } from "@/features/easel/easel.stack";
import type { BucketFill } from "@/features/easel/easel.stack";

/** A raster from rows of one-letter colors. */
const PALETTE = new Map<string, readonly [number, number, number, number]>([
  ["w", [255, 255, 255, 255]],
  ["k", [0, 0, 0, 255]],
  ["g", [240, 240, 240, 255]],
  ["r", [255, 0, 0, 255]],
  [".", [0, 0, 0, 0]],
]);

const raster = (rows: readonly string[]): Raster => {
  const width = rows[0]?.length ?? 0;
  const rgba = new Uint8ClampedArray(width * rows.length * 4);
  for (const [y, row] of rows.entries()) {
    for (const [x, letter] of [...row].entries()) {
      rgba.set(PALETTE.get(letter) ?? [0, 0, 0, 0], (y * width + x) * 4);
    }
  }
  return { height: rows.length, rgba, width };
};

/** An area as rows of `#` (inside) and `.` (outside). */
const picture = (area: Uint8Array, width: number): string[] => {
  const rows: string[] = [];
  for (let start = 0; start < area.length; start += width) {
    rows.push(
      [...area.subarray(start, start + width)]
        .map((value) => (value === 0 ? "." : "#"))
        .join("")
    );
  }
  return rows;
};

const pixelAt = (image: Raster, x: number, y: number): number[] => [
  ...image.rgba.subarray(
    (y * image.width + x) * 4,
    (y * image.width + x) * 4 + 4
  ),
];

describe("bucketFillArea", () => {
  const source = raster(["wwwkw", "wgwkw", "kkkkw", "wwwww"]);

  it("fills the connected pixels of the same color", () => {
    expect(picture(bucketFillArea(source, { x: 0, y: 0 }, 0), 5)).toEqual([
      "###..",
      "#.#..",
      ".....",
      ".....",
    ]);
  });

  it("does not connect by a corner", () => {
    const diagonal = raster(["wk", "kw"]);
    expect(picture(bucketFillArea(diagonal, { x: 0, y: 0 }, 0), 2)).toEqual([
      "#.",
      "..",
    ]);
  });

  it("fills more pixels at a higher tolerance", () => {
    expect(picture(bucketFillArea(source, { x: 0, y: 0 }, 10), 5)).toEqual([
      "###..",
      "###..",
      ".....",
      ".....",
    ]);
    expect(picture(bucketFillArea(source, { x: 0, y: 0 }, 100), 5)).toEqual([
      "#####",
      "#####",
      "#####",
      "#####",
    ]);
    expect(
      picture(bucketFillArea(source, { x: 0, y: 0 }, Number.NaN), 5)[1]
    ).toBe("#.#..");
  });

  it("goes around an obstacle in both directions", () => {
    const ring = raster(["wwwww", "wkkkw", "wkwkw", "wkkkw", "wwwww"]);
    expect(picture(bucketFillArea(ring, { x: 4.7, y: 4.2 }, 0), 5)).toEqual([
      "#####",
      "#...#",
      "#...#",
      "#...#",
      "#####",
    ]);
  });

  it("gives an empty area for a point outside the image", () => {
    for (const point of [
      { x: -1, y: 0 },
      { x: 0, y: -1 },
      { x: 5, y: 0 },
      { x: 0, y: 4 },
    ]) {
      expect(bucketFillArea(source, point, 50).every((v) => v === 0)).toBe(
        true
      );
    }
  });

  it("separates clear pixels from opaque pixels of the same color", () => {
    const mixed = raster(["k.", "k."]);
    expect(picture(bucketFillArea(mixed, { x: 0, y: 0 }, 0), 2)).toEqual([
      "#.",
      "#.",
    ]);
  });
});

describe("fillOverlayOf", () => {
  const source = raster(["wwk", "wwk"]);
  const fills: readonly BucketFill[] = [
    {
      color: { a: 255, b: 30, g: 20, r: 10 },
      id: "f1",
      point: { x: 0, y: 0 },
      tolerance: 0,
    },
    {
      color: { a: 128, b: 1, g: 2, r: 3 },
      id: "f2",
      point: { x: 2, y: 1 },
      tolerance: 0,
    },
  ];

  it("holds each fill color on its area", () => {
    const overlay = fillOverlayOf(source, fills);
    expect([...overlay.subarray(0, 4)]).toEqual([10, 20, 30, 255]);
    expect([...overlay.subarray(8, 12)]).toEqual([3, 2, 1, 128]);
    expect(fillOverlayOf(source, []).every((value) => value === 0)).toBe(true);
  });

  it("lets a later fill paint over an earlier fill", () => {
    const [first, second] = fills;
    const overlay = fillOverlayOf(source, [
      ...fills,
      // SAFETY: the two fills exist.
      {
        ...(second as BucketFill),
        id: "f3",
        point: (first as BucketFill).point,
      },
    ]);
    expect([...overlay.subarray(0, 4)]).toEqual([3, 2, 1, 128]);
  });

  it("does not change after a Finetune or a Filter", () => {
    let state = ORIGINAL;
    for (const fill of fills) {
      state = reduce(state, { _tag: "AddFill", fill });
    }
    const before = fillOverlayOf(source, state.fills);
    state = reduce(state, {
      _tag: "SetFinetune",
      key: "brightness",
      value: 80,
    });
    state = reduce(state, { _tag: "SetFilter", name: "noir" });
    // The area comes from the original pixels, and the color is exact.
    expect(fillOverlayOf(source, state.fills)).toEqual(before);
  });
});

describe("Mosaic", () => {
  it("has a minimum block size that grows with the image", () => {
    expect(mosaicBlockSizeOf(100, 100)).toBe(MIN_MOSAIC_BLOCK);
    expect(mosaicBlockSizeOf(4800, 3000)).toBe(100);
    expect(mosaicBlockSizeOf(3000, 4801)).toBe(101);
  });

  it("replaces each masked block with its average color", () => {
    const size = MIN_MOSAIC_BLOCK * 2;
    const image: Raster = {
      height: size,
      rgba: new Uint8ClampedArray(size * size * 4),
      width: size,
    };
    // The left half is black and the right half is white, in each block.
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const value = x % MIN_MOSAIC_BLOCK < MIN_MOSAIC_BLOCK / 2 ? 0 : 255;
        image.rgba.set([value, value, value, 255], (y * size + x) * 4);
      }
    }
    const mask = new Uint8Array(size * size);
    // The mask is the top left block only, and one pixel of the next block.
    for (let y = 0; y < MIN_MOSAIC_BLOCK; y += 1) {
      mask.fill(255, y * size, y * size + MIN_MOSAIC_BLOCK);
    }
    mask[MIN_MOSAIC_BLOCK] = 255;
    // A block size below the minimum uses the minimum.
    bakeMosaic(image, mask, 2);

    expect(pixelAt(image, 0, 0)).toEqual([128, 128, 128, 255]);
    expect(pixelAt(image, MIN_MOSAIC_BLOCK - 1, MIN_MOSAIC_BLOCK - 1)).toEqual([
      128, 128, 128, 255,
    ]);
    // One masked pixel of a block gets that block's average.
    expect(pixelAt(image, MIN_MOSAIC_BLOCK, 0)).toEqual([128, 128, 128, 255]);
    // A pixel outside the mask does not change.
    expect(pixelAt(image, MIN_MOSAIC_BLOCK + 1, 0)).toEqual([0, 0, 0, 255]);
    expect(pixelAt(image, 0, MIN_MOSAIC_BLOCK)).toEqual([0, 0, 0, 255]);
  });

  it("handles a clear block and a block at the image edge", () => {
    const image: Raster = {
      height: 5,
      rgba: new Uint8ClampedArray(5 * 5 * 4),
      width: 5,
    };
    const mask = new Uint8Array(25).fill(255);
    bakeMosaic(image, mask, MIN_MOSAIC_BLOCK);
    expect(pixelAt(image, 4, 4)).toEqual([0, 0, 0, 0]);

    image.rgba.set([200, 100, 0, 255], 0);
    bakeMosaic(image, mask, MIN_MOSAIC_BLOCK);
    // A clear pixel adds no color to the average.
    expect(pixelAt(image, 3, 3)).toEqual([200, 100, 0, 10]);
  });
});

describe("Cover", () => {
  it("makes each masked pixel the opaque color and keeps the others", () => {
    const image = raster(["r.", "rw"]);
    bakeCover(image, new Uint8Array([255, 1, 0, 0]), {
      a: 40,
      b: 3,
      g: 2,
      r: 1,
    });
    expect(pixelAt(image, 0, 0)).toEqual([1, 2, 3, 255]);
    // A soft mask edge is inside the Cover, so no hidden pixel stays.
    expect(pixelAt(image, 1, 0)).toEqual([1, 2, 3, 255]);
    expect(pixelAt(image, 0, 1)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(image, 1, 1)).toEqual([255, 255, 255, 255]);
  });
});
