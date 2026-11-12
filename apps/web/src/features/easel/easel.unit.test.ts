import { describe, expect, it } from "vitest";

import {
  FIT_VIEW,
  fitScaleOf,
  formatBytes,
  frameToCssOf,
  invertView,
  MAX_TABS,
  MAX_ZOOM,
  MIN_ZOOM,
  panView,
  STAGE_PADDING,
  tabAfterClose,
  tabRoomOf,
  zoomView,
} from "@/features/easel/easel";
import {
  BUNDLED_FONTS,
  bundledFontIdOf,
  DEFAULT_FONT,
  deviceFontChoicesOf,
  fontChoicesOf,
  isFontFileName,
  safeFamilyOf,
} from "@/features/easel/easel.fonts";
import { applyMatrix } from "@/features/easel/easel.geometry";
import {
  DEFAULT_QUALITY,
  isEncodeRequest,
  qualityOf,
} from "@/features/easel/easel.protocol";

describe("File Tabs", () => {
  it("opens files up to the File Tab limit", () => {
    expect(tabRoomOf(0, 3)).toEqual({ accepted: 3, limited: false });
    expect(tabRoomOf(MAX_TABS - 1, 3)).toEqual({ accepted: 1, limited: true });
    expect(tabRoomOf(MAX_TABS, 1)).toEqual({ accepted: 0, limited: true });
  });

  it("makes the next File Tab active after a close, then the earlier one", () => {
    const ids = ["a", "b", "c"];
    expect(tabAfterClose(ids, "b", "b")).toBe("c");
    expect(tabAfterClose(ids, "c", "c")).toBe("b");
    expect(tabAfterClose(ids, "a", "c")).toBe("c");
    expect(tabAfterClose(["a"], "a", "a")).toBeNull();
  });
});

describe("formatBytes", () => {
  it("writes a size with a short unit", () => {
    expect(formatBytes(512, "en-US")).toBe("512 byte");
    expect(formatBytes(1536, "en-US")).toBe("1.5 kB");
    expect(formatBytes(5 * 1024 * 1024, "en-US")).toBe("5 MB");
    expect(formatBytes(-4, "en-US")).toBe("0 byte");
    expect(formatBytes(5 * 1024 ** 4, "en-US")).toBe("5,120 GB");
  });
});

describe("the view", () => {
  const stage = {
    height: 400 + STAGE_PADDING * 2,
    width: 800 + STAGE_PADDING * 2,
  };
  const content = { height: 200, width: 200, x: -100, y: -100 };

  it("fits the whole image inside the stage", () => {
    expect(fitScaleOf(content, stage)).toBe(2);
    const matrix = frameToCssOf(content, stage, FIT_VIEW);
    expect(applyMatrix(matrix, { x: 0, y: 0 })).toEqual({
      x: stage.width / 2,
      y: stage.height / 2,
    });
    expect(applyMatrix(matrix, { x: -100, y: -100 }).y).toBe(STAGE_PADDING);
    expect(fitScaleOf(content, { height: 0, width: 0 })).toBeCloseTo(1 / 200);
  });

  it("maps a CSS pixel back to the frame", () => {
    const matrix = frameToCssOf(content, stage, {
      panX: 30,
      panY: -10,
      zoom: 3,
    });
    const back = applyMatrix(
      invertView(matrix),
      applyMatrix(matrix, { x: 12, y: -40 })
    );
    expect(back.x).toBeCloseTo(12);
    expect(back.y).toBeCloseTo(-40);
  });

  it("zooms around an anchor and keeps the image point under it", () => {
    const anchor = { x: 100, y: 50 };
    const before = frameToCssOf(content, stage, FIT_VIEW);
    const framePoint = applyMatrix(invertView(before), {
      x: stage.width / 2 + anchor.x,
      y: stage.height / 2 + anchor.y,
    });
    const view = zoomView(FIT_VIEW, 2, anchor);
    expect(view.zoom).toBe(2);
    const after = applyMatrix(frameToCssOf(content, stage, view), framePoint);
    expect(after.x).toBeCloseTo(stage.width / 2 + anchor.x);
    expect(after.y).toBeCloseTo(stage.height / 2 + anchor.y);
  });

  it("stays inside the zoom limits and centers at or below Fit", () => {
    expect(zoomView(FIT_VIEW, 1000).zoom).toBe(MAX_ZOOM);
    expect(zoomView(FIT_VIEW, 0.0001).zoom).toBe(MIN_ZOOM);
    const zoomed = zoomView(FIT_VIEW, 4, { x: 50, y: 50 });
    expect(zoomView(zoomed, 0.25)).toEqual(FIT_VIEW);
  });

  it("pans only when zoomed in", () => {
    expect(panView(FIT_VIEW, 10, 10)).toBe(FIT_VIEW);
    expect(panView({ panX: 0, panY: 0, zoom: 2 }, 10, -5)).toEqual({
      panX: 10,
      panY: -5,
      zoom: 2,
    });
  });
});

describe("fonts", () => {
  it("has a bundled set of six to eight fonts with the default first", () => {
    expect(BUNDLED_FONTS.length).toBeGreaterThanOrEqual(6);
    expect(BUNDLED_FONTS.length).toBeLessThanOrEqual(8);
    expect(BUNDLED_FONTS[0]?.family).toBe(DEFAULT_FONT);
    expect(bundledFontIdOf("Inter Variable")).toBe("inter");
    expect(bundledFontIdOf("Comic Sans MS")).toBeNull();
    // A name from user data never reads the prototype.
    expect(bundledFontIdOf("__proto__")).toBeNull();
    expect(bundledFontIdOf("constructor")).toBeNull();
  });

  it("accepts TTF, OTF, and WOFF2 files only", () => {
    expect(isFontFileName("Brand.TTF")).toBe(true);
    expect(isFontFileName("brand.otf")).toBe(true);
    expect(isFontFileName("brand.woff2")).toBe(true);
    expect(isFontFileName("brand.woff")).toBe(false);
    expect(isFontFileName("brand.ttf.exe")).toBe(false);
  });

  it("makes a family name that cannot break a CSS string", () => {
    expect(safeFamilyOf('My "Brand"; } body { x.ttf')).toBe("My Brand body x");
    expect(safeFamilyOf("Brand-Bold.woff2")).toBe("Brand-Bold");
    expect(safeFamilyOf("\"';.otf")).toBe("Custom font");
    expect(safeFamilyOf("a".repeat(200))).toHaveLength(60);
  });

  it("lists the bundled fonts, then the user's fonts once", () => {
    const mine = { family: "Brand", label: "Brand", source: "file" } as const;
    const choices = fontChoicesOf([
      mine,
      { ...mine, label: "Brand again" },
      { family: "Archivo", label: "Fake Archivo", source: "file" },
    ]);
    expect(choices).toHaveLength(BUNDLED_FONTS.length + 1);
    expect(choices.at(-1)).toEqual(mine);
    expect(choices[0]?.source).toBe("bundled");
  });

  it("lists each device font family once, in order, with its exact name", () => {
    expect(deviceFontChoicesOf(["Zapfino", "Arial", "Arial"])).toEqual([
      { family: "Arial", label: "Arial", source: "device" },
      { family: "Zapfino", label: "Zapfino", source: "device" },
    ]);
    // A name that is not safe in a CSS string is left out, not changed.
    expect(deviceFontChoicesOf(['Bad"; } x', "Foo_Bar", "Good Font"])).toEqual([
      { family: "Good Font", label: "Good Font", source: "device" },
    ]);
  });
});

describe("the encode request", () => {
  const request = {
    format: "webp",
    height: 2,
    id: 1,
    quality: 80,
    rgba: new ArrayBuffer(16),
    type: "easel:encode",
    width: 2,
  };

  it("accepts a complete request", () => {
    expect(isEncodeRequest(request)).toBe(true);
  });

  it("refuses every other message", () => {
    const wrong: readonly unknown[] = [
      null,
      "easel:encode",
      { ...request, type: "other" },
      { ...request, id: 1.5 },
      { ...request, format: "gif" },
      { ...request, width: 0 },
      { ...request, height: -2 },
      { ...request, rgba: new ArrayBuffer(8) },
      { ...request, rgba: [0, 0, 0, 0] },
      { ...request, quality: 0 },
      { ...request, quality: 101 },
      { ...request, quality: "80" },
    ];
    for (const value of wrong) {
      expect(isEncodeRequest(value)).toBe(false);
    }
  });

  it("keeps the quality a whole number from 1 to 100", () => {
    expect(qualityOf(80.4)).toBe(80);
    expect(qualityOf(0)).toBe(1);
    expect(qualityOf(900)).toBe(100);
    expect(qualityOf(Number.NaN)).toBe(DEFAULT_QUALITY);
  });
});
