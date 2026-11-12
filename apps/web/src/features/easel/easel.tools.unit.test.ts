import { describe, expect, it } from "vitest";

import { BLACK, WHITE } from "@/features/easel/easel.stack";
import {
  DEFAULT_DRAFT,
  DEFAULT_WATERMARK,
  framePixels,
  newImageLayer,
  newRedaction,
  newFigureLayer,
  newTextLayer,
  RED,
  textExcerptOf,
} from "@/features/easel/easel.tools";

const FRAME = { height: 1000, width: 2000 };
const AT = { x: 10, y: -20 };

describe("framePixels", () => {
  it("follows the longest side of the frame", () => {
    expect(framePixels(FRAME, 0.06)).toBe(120);
    expect(framePixels({ height: 3000, width: 100 }, 0.01)).toBe(30);
    expect(framePixels({ height: 10, width: 10 }, 0.01, 8)).toBe(8);
  });
});

describe("newTextLayer", () => {
  it("makes text at the point with the draft style", () => {
    const layer = newTextLayer({
      at: AT,
      draft: { ...DEFAULT_DRAFT, bold: true },
      frame: FRAME,
      id: "t1",
      text: "Caption",
    });
    expect(layer).toMatchObject({
      bold: true,
      color: WHITE,
      id: "t1",
      kind: "text",
      outline: null,
      size: 120,
      text: "Caption",
      width: 1200,
      x: 10,
      y: -20,
    });
  });

  it("adds an outline that follows the text size", () => {
    const layer = newTextLayer({
      at: AT,
      draft: { ...DEFAULT_DRAFT, outline: BLACK },
      frame: FRAME,
      id: "t1",
      text: "x",
    });
    expect(layer.outline).toEqual({ color: BLACK, width: 8 });
  });
});

describe("newFigureLayer", () => {
  const box = { height: 50, width: 80, x: 1, y: 2 };

  it("makes a rectangle with the draft fill, stroke, and radius", () => {
    const layer = newFigureLayer({
      box,
      draft: { ...DEFAULT_DRAFT, fill: WHITE, radius: 6 },
      frame: FRAME,
      id: "s1",
      kind: "rect",
      rotation: 0,
    });
    expect(layer).toMatchObject({
      fill: WHITE,
      height: 50,
      radius: 6,
      stroke: RED,
      strokeWidth: 12,
      width: 80,
    });
  });

  it("gives an ellipse no corner radius", () => {
    const layer = newFigureLayer({
      box,
      draft: { ...DEFAULT_DRAFT, radius: 6 },
      frame: FRAME,
      id: "s1",
      kind: "ellipse",
      rotation: 0,
    });
    expect(layer.radius).toBe(0);
  });

  it("always gives a line or an arrow a stroke and no fill", () => {
    const line = newFigureLayer({
      box,
      draft: { ...DEFAULT_DRAFT, fill: WHITE, stroke: null },
      frame: FRAME,
      id: "s1",
      kind: "line",
      rotation: 45,
    });
    expect(line).toMatchObject({ fill: null, rotation: 45, stroke: WHITE });
    const arrow = newFigureLayer({
      box,
      draft: { ...DEFAULT_DRAFT, fill: null, stroke: null },
      frame: FRAME,
      id: "s2",
      kind: "arrow",
      rotation: 0,
    });
    expect(arrow.stroke).toEqual(RED);
    expect(
      newFigureLayer({
        box,
        draft: DEFAULT_DRAFT,
        frame: FRAME,
        id: "s3",
        kind: "arrow",
        rotation: 0,
      }).stroke
    ).toEqual(RED);
  });
});

describe("newImageLayer", () => {
  it("makes a large picture at most half the frame", () => {
    const layer = newImageLayer({
      assetId: "a1",
      at: AT,
      draft: DEFAULT_DRAFT,
      frame: FRAME,
      id: "i1",
      size: { height: 4000, width: 4000 },
    });
    expect(layer).toMatchObject({ assetId: "a1", height: 500, width: 500 });
  });

  it("keeps a small picture at its own size", () => {
    const layer = newImageLayer({
      assetId: "a1",
      at: AT,
      draft: DEFAULT_DRAFT,
      frame: FRAME,
      id: "i1",
      size: { height: 20, width: 40 },
    });
    expect(layer).toMatchObject({ height: 20, width: 40 });
  });
});

describe("newRedaction", () => {
  it("makes a box Redaction", () => {
    expect(
      newRedaction({
        color: BLACK,
        id: "r1",
        kind: "cover",
        area: { box: { height: 5, width: 9, x: 1, y: 2 }, form: "ellipse" },
      })
    ).toEqual({
      color: BLACK,
      height: 5,
      id: "r1",
      kind: "cover",
      points: [],
      rotation: 0,
      form: "ellipse",
      size: 0,
      width: 9,
      x: 1,
      y: 2,
    });
  });

  it("makes a brush Redaction from its points", () => {
    const redaction = newRedaction({
      color: BLACK,
      id: "r2",
      kind: "mosaic",
      area: { points: [1, 2, 3, 4], form: "brush", size: 30 },
    });
    expect(redaction).toMatchObject({
      kind: "mosaic",
      points: [1, 2, 3, 4],
      form: "brush",
      size: 30,
    });
  });
});

describe("the layer list", () => {
  it("shows a short excerpt of a text layer", () => {
    expect(textExcerptOf("  Hello\n world ")).toBe("Hello world");
    expect(textExcerptOf("a".repeat(40))).toBe(`${"a".repeat(24)}…`);
  });

  it("starts the Watermark Layer as half-clear text", () => {
    expect(DEFAULT_WATERMARK).toMatchObject({
      kind: "text",
      opacity: 0.5,
      tiled: false,
    });
  });
});
