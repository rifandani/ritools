import { describe, expect, it } from "vitest";

import {
  differsInside,
  differsOutside,
  FOLIO_TEXT_PIXEL_TOLERANCE,
  fitsFreeWidth,
  freeWidth,
  refusalOf,
} from "./folio.text.verify";
import type { FolioBitmapView, FolioTextBounds } from "./folio.text.verify";

const box = (
  left: number,
  bottom: number,
  right: number,
  top: number
): FolioTextBounds => ({ bottom, left, right, top });

const bitmap = (
  width: number,
  height: number,
  fill = 255
): FolioBitmapView => ({
  bytes: new Uint8Array(width * 4 * height).fill(fill),
  height,
  stride: width * 4,
  width,
});

const put = (
  view: FolioBitmapView,
  x: number,
  y: number,
  color: readonly [number, number, number]
) => {
  view.bytes.set(color, y * view.stride + x * 4);
};

describe("free width", () => {
  const target = box(10, 20, 50, 30);

  it("reaches the page's right edge when no object shares the line", () => {
    expect(freeWidth(target, [], 300)).toBe(250);
  });

  it("stops at the nearest object that overlaps the line and starts to the right", () => {
    expect(
      freeWidth(
        target,
        [box(100, 22, 140, 28), box(80, 20.5, 90, 29.5), box(120, 21, 135, 29)],
        300
      )
    ).toBe(30);
  });

  it("ignores objects on another line or to the left of the target", () => {
    expect(
      freeWidth(
        target,
        [
          box(90, 40, 120, 50),
          box(90, 5, 120, 15),
          box(20, 22, 40, 28),
          box(50, 21, 70, 29),
        ],
        300
      )
    ).toBe(250);
  });

  it("never reports less than zero", () => {
    expect(freeWidth(target, [], 40)).toBe(0);
  });
});

describe("bounds fit", () => {
  const target = box(10, 20, 50, 30);

  it("accepts a narrower or equal box", () => {
    expect(fitsFreeWidth(target, box(10, 20, 50, 30), 100)).toBe(true);
    expect(fitsFreeWidth(target, box(11, 20, 40, 30), 100)).toBe(true);
  });

  it("refuses a box wider than the free gap", () => {
    expect(fitsFreeWidth(target, box(10, 20, 151, 30), 100)).toBe(false);
  });

  it("allows rounding at the free edge", () => {
    expect(fitsFreeWidth(target, box(10, 20, 150.4, 30), 100)).toBe(true);
    expect(fitsFreeWidth(target, box(10, 20, 150.6, 30), 100)).toBe(false);
  });
});

describe("refusal precedence", () => {
  it("returns null when every checked gate passes", () => {
    expect(
      refusalOf({
        artwork: false,
        expected: true,
        fits: true,
        glyphs: true,
        object: true,
        permitted: true,
        signed: false,
        verified: true,
        visible: true,
        xfa: false,
      })
    ).toBeNull();
  });

  it("puts a signature before a permission, XFA, or object failure", () => {
    expect(
      refusalOf({
        object: false,
        permitted: false,
        signed: true,
        xfa: true,
      })
    ).toBe("signed");
  });

  it("puts a permission before XFA and the object checks", () => {
    expect(refusalOf({ object: false, permitted: false, xfa: true })).toBe(
      "permission"
    );
  });

  it("puts XFA before a missing object or overflow", () => {
    expect(refusalOf({ fits: false, object: false, xfa: true })).toBe("xfa");
  });

  it("puts a missing object before a stale listing or overflow", () => {
    expect(refusalOf({ expected: false, fits: false, object: false })).toBe(
      "no-text-object"
    );
  });

  it("puts a stale listing before an overflow", () => {
    expect(refusalOf({ expected: false, fits: false })).toBe("verify-failed");
  });

  it("puts an invisible object before an overflow", () => {
    expect(refusalOf({ fits: false, visible: false })).toBe("invisible");
  });

  it("puts a stale listing before an invisible object", () => {
    expect(refusalOf({ expected: false, visible: false })).toBe(
      "verify-failed"
    );
  });

  it("puts an overflow before a glyph miss or artwork", () => {
    expect(refusalOf({ artwork: true, fits: false, glyphs: false })).toBe(
      "overflow"
    );
  });

  it("puts a glyph miss before artwork and the broad verify", () => {
    expect(refusalOf({ artwork: true, glyphs: false, verified: false })).toBe(
      "glyph-coverage"
    );
  });

  it("reports artwork before the remaining verify failure", () => {
    expect(refusalOf({ artwork: true, verified: false })).toBe("artwork");
  });

  it("reports a broad verify failure last", () => {
    expect(refusalOf({ verified: false })).toBe("verify-failed");
  });
});

describe("pixel diff", () => {
  const keepOut = { bottom: 2, left: 1, right: 3, top: 1 };

  it("accepts identical bitmaps", () => {
    expect(differsOutside(bitmap(4, 4), bitmap(4, 4), keepOut)).toBe(false);
  });

  it("ignores changes inside the kept-out box", () => {
    const before = bitmap(4, 4);
    const after = bitmap(4, 4);
    put(after, 2, 1, [0, 0, 0]);
    expect(differsOutside(before, after, keepOut)).toBe(false);
  });

  it("ignores channel deltas at the tolerance", () => {
    const before = bitmap(4, 4);
    const after = bitmap(4, 4);
    put(after, 0, 0, [255 - FOLIO_TEXT_PIXEL_TOLERANCE, 255, 255]);
    expect(differsOutside(before, after, keepOut)).toBe(false);
  });

  it("reports a channel delta above the tolerance outside the box", () => {
    const before = bitmap(4, 4);
    const after = bitmap(4, 4);
    put(after, 0, 0, [255 - FOLIO_TEXT_PIXEL_TOLERANCE - 1, 255, 255]);
    expect(differsOutside(before, after, keepOut)).toBe(true);
  });

  it("reports a size or byte-length mismatch", () => {
    const before = bitmap(4, 4);
    expect(differsOutside(before, bitmap(3, 4), keepOut)).toBe(true);
    expect(differsOutside(before, bitmap(4, 3), keepOut)).toBe(true);
    expect(
      differsOutside(before, { ...bitmap(4, 4), stride: 8 }, keepOut)
    ).toBe(true);
    expect(
      differsOutside(
        before,
        { ...bitmap(4, 4), bytes: new Uint8Array(4) },
        keepOut
      )
    ).toBe(true);
  });

  it("clamps a kept-out box that leaves the bitmap", () => {
    const before = bitmap(4, 4);
    const after = bitmap(4, 4);
    after.bytes.fill(0);
    expect(
      differsOutside(before, after, {
        bottom: 99,
        left: 99,
        right: 199,
        top: 99,
      })
    ).toBe(true);
  });
});

describe("visible change", () => {
  const region = { bottom: 2, left: 1, right: 3, top: 1 };

  it("accepts identical bitmaps", () => {
    expect(differsInside(bitmap(4, 4), bitmap(4, 4), region)).toBe(false);
  });

  it("reports a change inside the box", () => {
    const before = bitmap(4, 4);
    const after = bitmap(4, 4);
    put(after, 2, 1, [0, 0, 0]);
    expect(differsInside(before, after, region)).toBe(true);
  });

  it("ignores a change outside the box", () => {
    const before = bitmap(4, 4);
    const after = bitmap(4, 4);
    put(after, 0, 0, [0, 0, 0]);
    expect(differsInside(before, after, region)).toBe(false);
  });

  it("ignores a delta at the tolerance inside the box", () => {
    const before = bitmap(4, 4);
    const after = bitmap(4, 4);
    put(after, 2, 1, [255 - FOLIO_TEXT_PIXEL_TOLERANCE, 255, 255]);
    expect(differsInside(before, after, region)).toBe(false);
  });

  it("reports a size mismatch", () => {
    expect(differsInside(bitmap(4, 4), bitmap(3, 4), region)).toBe(true);
  });
});
