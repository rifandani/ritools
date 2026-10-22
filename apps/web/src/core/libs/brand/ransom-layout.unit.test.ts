import { describe, expect, it } from "vitest";

import type { Face, Ground } from "@/core/libs/ransom-cut";

import type { FaceMetrics } from "./ransom-layout";
import {
  chipPose,
  placeWordmark,
  tiltedBox,
  WORD_EM,
  wordmarkBox,
} from "./ransom-layout";

const metrics = (advance: number): FaceMetrics => ({
  ascent: 0.8,
  descent: -0.2,
  advanceOf: () => advance,
  inkOf: () => ({ maxX: advance, maxY: 0, minX: 0, minY: -0.7 }),
});

/** Every face of the cut, measured the same way. */
const faces = (advance = 0.6): Record<Face, FaceMetrics> => ({
  abril: metrics(advance),
  anton: metrics(advance),
  grot: metrics(advance),
  slab: metrics(advance),
});

const ground: Ground = "red";

/** The wordmark is 100 units per em, so a chip is about that tall. */
const EM = WORD_EM;

describe("tiltedBox", () => {
  it("is the rectangle itself at no tilt", () => {
    expect(tiltedBox(5, 6, 10, 20, 0)).toEqual({
      height: 20,
      width: 10,
      x: 5,
      y: 6,
    });
  });

  it("grows the box a turned square needs", () => {
    const box = tiltedBox(0, 0, 10, 10, 45);

    expect(box.width).toBeCloseTo(14.14, 1);
    expect(box.height).toBeCloseTo(14.14, 1);
    expect(box.x).toBeCloseTo(-2.07, 1);
  });
});

describe("placeWordmark", () => {
  it("places one chip per letter", () => {
    expect(placeWordmark("Ritools", ground, faces())).toHaveLength(7);
  });

  it("advances the pen from left to right", () => {
    const [first, second, third] = placeWordmark("abc", ground, faces());

    expect(first?.x).toBeLessThan(second?.x ?? 0);
    expect(second?.x).toBeLessThan(third?.x ?? 0);
  });

  it("gives every chip an outline and a box", () => {
    for (const chip of placeWordmark("Ritools", ground, faces())) {
      expect(chip.outline.length).toBeGreaterThan(0);
      expect(chip.width).toBeGreaterThan(0);
      expect(chip.height).toBeGreaterThan(chip.size);
      expect(chip.size).toBeGreaterThan(EM / 2);
    }
  });

  it("sits the chips above the baseline", () => {
    const chips = placeWordmark("abc", ground, faces());

    expect(chips.every((chip) => chip.y < 0)).toBe(true);
  });

  it("widens the word when the face is wider", () => {
    const narrow = wordmarkBox(placeWordmark("abc", ground, faces(0.4)));
    const wide = wordmarkBox(placeWordmark("abc", ground, faces(0.8)));

    expect(wide.maxX - wide.minX).toBeGreaterThan(narrow.maxX - narrow.minX);
  });

  it("puts a word gap between two words", () => {
    const one = placeWordmark("ab", ground, faces());
    const two = placeWordmark("ab ab", ground, faces());

    expect(two).toHaveLength(4);
    expect(two[2]?.penX).toBeGreaterThan(one[1]?.penX ?? 0);
  });

  it("has nothing to place for an empty name", () => {
    expect(placeWordmark("", ground, faces())).toEqual([]);
  });

  it("cuts a chip on the left, on the right, or not at all", () => {
    // The cut is deterministic, so these words always lean the same way:
    // "Pool" snips its first and last chip on the left, and "Squeeze" one on
    // the right. "Ritools" has a chip with no snip.
    const snips = ["Pool", "Squeeze", "Ritools"].flatMap((word) =>
      placeWordmark(word, ground, faces()).map((chip) => chip.cut.snip)
    );

    expect(snips).toContain("l");
    expect(snips).toContain("r");
    expect(snips).toContain(undefined);
  });

  it("narrows a chip that is snipped on one side", () => {
    const plain = placeWordmark("Poster", ground, faces()).find(
      (chip) => chip.cut.snip === undefined
    );
    const snipped = placeWordmark("Squeeze", ground, faces()).find(
      (chip) => chip.cut.snip === "r"
    );

    expect(snipped?.outline).not.toBe(plain?.outline);
  });
});

describe("wordmarkBox", () => {
  it("covers the chips and the ink of the letters", () => {
    const box = wordmarkBox(placeWordmark("Ritools", ground, faces()));

    expect(box.maxX).toBeGreaterThan(box.minX);
    expect(box.maxY).toBeGreaterThan(box.minY);
  });
});

describe("chipPose", () => {
  it("anchors the chip, lifts it, and turns it about its centre", () => {
    const [chip] = placeWordmark("R", ground, faces());
    if (!chip) {
      throw new Error("The cut placed no chip.");
    }
    const pose = chipPose(chip, (value) => Math.round(value));

    expect(pose).toMatch(
      /^translate\(-?\d+ -?\d+\) translate\(0 -?\d+\) rotate\(-?\d+ [\d-]+ [\d-]+\)$/u
    );
  });
});
