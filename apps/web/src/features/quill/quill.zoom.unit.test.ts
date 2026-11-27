import { describe, expect, it } from "vitest";

import {
  clampPan,
  clampZoom,
  fitSize,
  panBy,
  stepScale,
  wheelScale,
  ZOOM_FIT,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomAt,
  zoomPercent,
} from "./quill.zoom";

const box = { width: 800, height: 600 };

describe("fitSize", () => {
  it("shrinks a large figure to show all of it and keeps its aspect ratio", () => {
    expect(fitSize({ width: 1600, height: 600 }, box)).toEqual({
      width: 800,
      height: 300,
    });
    expect(fitSize({ width: 400, height: 1200 }, box)).toEqual({
      width: 200,
      height: 600,
    });
  });

  it("does not enlarge a small figure above its natural size", () => {
    expect(fitSize({ width: 200, height: 100 }, box)).toEqual({
      width: 200,
      height: 100,
    });
  });

  it("gives no size for an empty figure or an empty stage", () => {
    expect(fitSize({ width: 0, height: 100 }, box)).toEqual({
      width: 0,
      height: 0,
    });
    expect(
      fitSize({ width: 200, height: 100 }, { width: 0, height: 0 })
    ).toEqual({
      width: 0,
      height: 0,
    });
  });
});

describe("clampZoom", () => {
  it("keeps the level between the bounds", () => {
    expect(clampZoom(2)).toBe(2);
    expect(clampZoom(0.01)).toBe(ZOOM_MIN);
    expect(clampZoom(100)).toBe(ZOOM_MAX);
  });
});

describe("clampPan", () => {
  const fitted = { width: 400, height: 300 };

  it("centers a figure that is smaller than the stage", () => {
    expect(clampPan({ scale: 1, x: 120, y: -80 }, fitted, box)).toEqual(
      ZOOM_FIT
    );
  });

  it("lets a zoomed figure move until its edge meets the stage edge", () => {
    // At 4x the figure is 1600 x 1200: 400 px and 300 px past each side.
    expect(clampPan({ scale: 4, x: 1000, y: -1000 }, fitted, box)).toEqual({
      scale: 4,
      x: 400,
      y: -300,
    });
    expect(clampPan({ scale: 4, x: -100, y: 50 }, fitted, box)).toEqual({
      scale: 4,
      x: -100,
      y: 50,
    });
  });
});

describe("zoomAt", () => {
  const fitted = { width: 800, height: 600 };

  it("zooms about the stage center by default", () => {
    expect(zoomAt(ZOOM_FIT, 2, fitted, box)).toEqual({ scale: 2, x: 0, y: 0 });
  });

  it("keeps the figure point under the pointer in place", () => {
    const next = zoomAt(ZOOM_FIT, 2, fitted, box, { x: 200, y: 100 });
    expect(next).toEqual({ scale: 2, x: -200, y: -100 });
    // The anchor maps to the same figure point before and after the zoom.
    expect((200 - next.x) / next.scale).toBe(200 / 1);
  });

  it("stops at the zoom bounds", () => {
    expect(zoomAt(ZOOM_FIT, 50, fitted, box).scale).toBe(ZOOM_MAX);
    expect(zoomAt(ZOOM_FIT, 0, fitted, box).scale).toBe(ZOOM_MIN);
  });
});

describe("wheelScale", () => {
  it("zooms in for an upward scroll and out for a downward scroll", () => {
    expect(wheelScale(1, -480)).toBe(2);
    expect(wheelScale(2, 480)).toBe(1);
    expect(wheelScale(1, 0)).toBe(1);
  });

  it("stops at the zoom bounds", () => {
    expect(wheelScale(1, -100_000)).toBe(ZOOM_MAX);
    expect(wheelScale(1, 100_000)).toBe(ZOOM_MIN);
  });
});

describe("stepScale", () => {
  it("multiplies or divides the level by one step", () => {
    expect(stepScale(1, 1)).toBe(1.25);
    expect(stepScale(1.25, -1)).toBe(1);
    expect(stepScale(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(stepScale(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
  });
});

describe("panBy", () => {
  it("moves a zoomed figure and keeps it on the stage", () => {
    const fitted = { width: 800, height: 600 };
    const view = { scale: 2, x: 0, y: 0 };
    expect(panBy(view, { x: 50, y: -30 }, fitted, box)).toEqual({
      scale: 2,
      x: 50,
      y: -30,
    });
    expect(panBy(view, { x: 5000, y: 5000 }, fitted, box)).toEqual({
      scale: 2,
      x: 400,
      y: 300,
    });
  });
});

describe("zoomPercent", () => {
  it("shows the level as a whole percent", () => {
    expect(zoomPercent(1)).toBe(100);
    expect(zoomPercent(1.234)).toBe(123);
  });
});
