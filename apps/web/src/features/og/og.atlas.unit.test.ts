import { describe, expect, it } from "vitest";

import { FACE_NAMES } from "@/core/libs/brand/faces";
import { EMPTY_INK } from "@/core/libs/brand/glyphs";
import type { EmFace } from "@/core/libs/brand/glyphs";

import { FACE_OF, fitText, layoutText, wrapText } from "./og.atlas";

/** A face where every character is a square block of one em. */
const blockFace = (advance = 1): EmFace => ({
  ascent: 0.8,
  capHeight: 0.7,
  descent: -0.2,
  advanceOf: () => advance,
  inkOf: () => ({ maxX: 1, maxY: 0, minX: 0, minY: -1 }),
  pathOf: (char: string) => `M0 0L1 0L1 1Z${char.length}`,
});

/** A face with no outlines at all. */
const emptyFace: EmFace = {
  ascent: 0.8,
  capHeight: 0.7,
  descent: -0.2,
  advanceOf: () => 0,
  inkOf: () => EMPTY_INK,
  pathOf: () => "",
};

describe("FACE_OF", () => {
  it("sets a line in every face the brand prints in", () => {
    for (const name of FACE_NAMES) {
      const face = FACE_OF[name];

      expect(face.advanceOf("A")).toBeGreaterThan(0);
      expect(face.pathOf("A").length).toBeGreaterThan(0);
    }
  });

  it("falls back to the blank for a character the atlas does not hold", () => {
    const face = FACE_OF.anton;

    expect(face.advanceOf("\u{1F600}")).toBe(face.advanceOf(" "));
    expect(face.pathOf("\u{1F600}")).toBe("");
    expect(face.inkOf("\u{1F600}")).toEqual(EMPTY_INK);
  });
});

describe("layoutText", () => {
  it("sets one path per character that has ink", () => {
    const run = layoutText("AB", blockFace(), 10);

    expect(run.content.match(/<path/gu)).toHaveLength(2);
  });

  it("leaves a gap for a space and draws nothing there", () => {
    const run = layoutText("A B", blockFace(), 10);

    expect(run.content.match(/<path/gu)).toHaveLength(2);
    expect(run.width).toBe(30);
  });

  it("measures the line by the advance and the tracking", () => {
    expect(layoutText("AB", blockFace(), 10).width).toBe(20);
    // Two letters and one gap of tracking between them.
    expect(layoutText("AB", blockFace(), 10, 0.1).width).toBe(21);
  });

  it("measures the height by the ink, not the line box", () => {
    expect(layoutText("A", blockFace(), 10).height).toBe(10);
  });

  it("draws nothing for a face without outlines", () => {
    expect(layoutText("AB", emptyFace, 10).content).toBe("");
  });
});

describe("fitText", () => {
  it("keeps the size when the line already fits", () => {
    const run = fitText("AB", blockFace(), 10, 0, 100);

    expect(run.width).toBe(20);
  });

  it("shrinks the line until it fits the measure", () => {
    const run = fitText("AAAA", blockFace(), 10, 0, 35);

    expect(run.width).toBeLessThanOrEqual(35);
    expect(run.width).toBeLessThan(40);
  });

  it("stops at eight units, so a long line does not vanish", () => {
    const run = fitText("AAAA", blockFace(), 10, 0, 1);

    expect(run.width).toBe(32);
  });
});

describe("wrapText", () => {
  it("keeps every word on the line it fits", () => {
    const lines = wrapText("AA BB CC", blockFace(), 10, 0, 30);

    expect(lines).toHaveLength(3);
  });

  it("holds a line while the words still fit", () => {
    const lines = wrapText("AA BB", blockFace(), 10, 0, 100);

    expect(lines).toHaveLength(1);
  });

  it("returns nothing for a blank line", () => {
    expect(wrapText("   ", blockFace(), 10, 0, 100)).toEqual([]);
  });
});
