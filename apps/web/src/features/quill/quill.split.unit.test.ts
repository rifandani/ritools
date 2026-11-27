import { describe, expect, it } from "vitest";

import {
  clampSplit,
  dragSplit,
  SPLIT_LARGE_STEPS,
  SPLIT_MAX,
  SPLIT_MIN,
  splitTracks,
  stepSplit,
} from "./quill.split";

describe("clampSplit", () => {
  it("keeps the border between the minimum and maximum share", () => {
    expect(clampSplit(35)).toBe(35);
    expect(clampSplit(5)).toBe(SPLIT_MIN);
    expect(clampSplit(95)).toBe(SPLIT_MAX);
  });
});

describe("dragSplit", () => {
  it("converts a pointer distance to a share of the panes width", () => {
    expect(dragSplit(50, 100, 1000)).toBe(60);
    expect(dragSplit(50, -250, 1000)).toBe(25);
  });

  it("stops at the bounds", () => {
    expect(dragSplit(50, 900, 1000)).toBe(SPLIT_MAX);
    expect(dragSplit(50, -900, 1000)).toBe(SPLIT_MIN);
  });

  it("keeps the share when the panes have no width", () => {
    expect(dragSplit(42, 100, 0)).toBe(42);
  });
});

describe("stepSplit", () => {
  it("moves a small step for each press, and a large step with Shift", () => {
    expect(stepSplit(50, 1)).toBe(52);
    expect(stepSplit(50, -1)).toBe(48);
    expect(stepSplit(50, SPLIT_LARGE_STEPS)).toBe(60);
    expect(stepSplit(50, -SPLIT_LARGE_STEPS)).toBe(40);
  });

  it("stops at the bounds", () => {
    expect(stepSplit(SPLIT_MAX, SPLIT_LARGE_STEPS)).toBe(SPLIT_MAX);
    expect(stepSplit(SPLIT_MIN, -SPLIT_LARGE_STEPS)).toBe(SPLIT_MIN);
  });
});

describe("splitTracks", () => {
  it("gives the source and reader tracks that add up to the full width", () => {
    expect(splitTracks(30)).toEqual({ start: "30fr", end: "70fr" });
    expect(splitTracks(0)).toEqual({
      start: `${SPLIT_MIN}fr`,
      end: `${100 - SPLIT_MIN}fr`,
    });
  });
});
