import { describe, expect, it } from "vitest";

import {
  backdropFor,
  exportNameOf,
  exportSizeOf,
  MAX_EXPORT_PIXELS,
  MAX_EXPORT_SIDE,
  nameStemOf,
  renderPlanOf,
  resizeOf,
  showsBackdrop,
  WATERMARK_ID,
} from "@/features/easel/easel.plan";
import type { OutputFormat } from "@/features/easel/easel.plan";
import { CROP_PRESETS } from "@/features/easel/easel.presets";
import { BLACK, ORIGINAL, reduce, WHITE } from "@/features/easel/easel.stack";
import type { Change, EditState } from "@/features/easel/easel.stack";

const SOURCE = { height: 600, width: 800 };

const after = (...changes: readonly Change[]): EditState => {
  let state = ORIGINAL;
  for (const change of changes) {
    state = reduce(state, change);
  }
  return state;
};

const planOf = (state: EditState, format: OutputFormat = "png") =>
  renderPlanOf({ format, name: "holiday photo.JPG", source: SOURCE, state });

const layer = (id: string, hidden = false) => ({
  _tag: "AddLayer" as const,
  layer: {
    fill: WHITE,
    height: 10,
    hidden,
    id,
    kind: "rect" as const,
    locked: false,
    opacity: 1,
    radius: 0,
    rotation: 0,
    stroke: null,
    strokeWidth: 0,
    width: 10,
    x: 0,
    y: 0,
  },
});

describe("renderPlanOf", () => {
  it("draws the whole source for the original state", () => {
    const plan = planOf(ORIGINAL);
    expect(plan.frame).toEqual(SOURCE);
    expect(plan.crop).toEqual({ height: 600, width: 800, x: 0, y: 0 });
    expect(plan.natural).toEqual(SOURCE);
    expect(plan.exportSize).toEqual(SOURCE);
    expect(plan.form).toBe("rectangle");
    expect(plan.upscaled).toBe(false);
    expect(plan.bands).toEqual([]);
    expect(plan.blurRadius).toBe(0);
    expect(plan.fileName).toBe("holiday photo-easel.png");
  });

  it("gives the crop rectangle and the export size of each Crop Preset", () => {
    for (const preset of CROP_PRESETS) {
      const plan = planOf(
        after({ _tag: "SetCropPreset", preset: preset.id, source: SOURCE })
      );
      expect(plan.form).toBe(preset.form);
      if (preset.ratio !== null) {
        expect(plan.crop.width / plan.crop.height).toBeCloseTo(preset.ratio);
      }
      // A social network format sets the export size.
      expect(plan.exportSize).toEqual(preset.size ?? plan.natural);
    }
    const story = planOf(
      after({
        _tag: "SetCropPreset",
        preset: "instagram-story",
        source: SOURCE,
      })
    );
    expect(story.exportSize).toEqual({ height: 1920, width: 1080 });
    expect(story.upscaled).toBe(true);
  });

  it("keeps the ratio of a preset when the frame changes", () => {
    const plan = planOf(
      after(
        { _tag: "SetCropPreset", preset: "classic", source: SOURCE },
        { _tag: "SetStraighten", angle: 12 },
        { _tag: "SetKeepWhole", value: true }
      )
    );
    expect(plan.crop.width / plan.crop.height).toBeCloseTo(4 / 3);
    expect(plan.frame.width).toBeGreaterThan(800);
  });

  it("puts the layers in fixed bands, in the user's order", () => {
    const state = after(
      {
        _tag: "SetWatermark",
        watermark: {
          anchor: "center",
          assetId: null,
          color: WHITE,
          font: "Lato",
          kind: "text",
          opacity: 1,
          scale: 0.2,
          text: "mine",
          tiled: true,
        },
      },
      {
        _tag: "AddRedaction",
        redaction: {
          color: BLACK,
          height: 10,
          id: "r1",
          kind: "cover",
          points: [],
          rotation: 0,
          form: "rect",
          size: 0,
          width: 10,
          x: 0,
          y: 0,
        },
      },
      layer("a"),
      layer("b"),
      layer("hidden", true),
      { _tag: "MoveLayer", id: "a", to: "top" }
    );
    expect(planOf(state).bands).toEqual([
      { band: "annotation", id: "b" },
      { band: "annotation", id: "a" },
      { band: "redaction", id: "r1" },
      { band: "watermark", id: WATERMARK_ID },
    ]);
  });

  it("sets the Blur radius from the frame size", () => {
    const plan = planOf(after({ _tag: "SetFinetune", key: "blur", value: 50 }));
    expect(plan.blurRadius).toBeCloseTo(10);
  });

  it("uses white for a Transparent Backdrop in JPEG only", () => {
    const jpeg = planOf(ORIGINAL, "jpeg");
    expect(jpeg.backdrop).toEqual({ _tag: "Solid", color: WHITE });
    expect(jpeg.backdropFallback).toBe(true);
    expect(jpeg.fileName).toBe("holiday photo-easel.jpg");
    const webp = planOf(ORIGINAL, "webp");
    expect(webp.backdrop).toEqual({ _tag: "Transparent" });
    expect(webp.backdropFallback).toBe(false);
    const solid = { _tag: "Solid", color: BLACK } as const;
    expect(backdropFor(solid, "jpeg")).toEqual({
      backdrop: solid,
      fallback: false,
    });
  });
});

describe("showsBackdrop", () => {
  it("is true for an Ellipse Crop and for Keep whole image with a Straighten", () => {
    expect(showsBackdrop(ORIGINAL)).toBe(false);
    expect(
      showsBackdrop(
        after({ _tag: "SetCropPreset", preset: "ellipse", source: SOURCE })
      )
    ).toBe(true);
    expect(showsBackdrop(after({ _tag: "SetKeepWhole", value: true }))).toBe(
      false
    );
    expect(
      showsBackdrop(
        after(
          { _tag: "SetKeepWhole", value: true },
          { _tag: "SetStraighten", angle: 4 }
        )
      )
    ).toBe(true);
  });
});

describe("Resize", () => {
  const natural = SOURCE;

  it("keeps the ratio when the lock is on", () => {
    const current = { height: 600, width: 800 };
    expect(
      resizeOf({ current, locked: true, natural, side: "width", value: 400 })
    ).toEqual({ height: 300, locked: true, width: 400 });
    expect(
      resizeOf({ current, locked: true, natural, side: "height", value: 150 })
    ).toEqual({ height: 150, locked: true, width: 200 });
  });

  it("changes one side only when the lock is off", () => {
    expect(
      resizeOf({
        current: { height: 600, width: 800 },
        locked: false,
        natural,
        side: "width",
        value: 100,
      })
    ).toEqual({ height: 600, locked: false, width: 100 });
  });

  it("stops at two times the cropped image", () => {
    const current = { height: 600, width: 800 };
    expect(
      resizeOf({ current, locked: true, natural, side: "width", value: 9000 })
    ).toEqual({ height: 1200, locked: true, width: 1600 });
    expect(
      resizeOf({
        current,
        locked: true,
        natural,
        side: "height",
        value: Number.NaN,
      })
    ).toEqual({ height: 1, locked: true, width: 1 });

    const state = after({
      _tag: "SetResize",
      resize: { height: 5000, locked: false, width: 5000 },
    });
    expect(exportSizeOf(state, natural)).toEqual({ height: 1200, width: 1600 });
    expect(planOf(state).upscaled).toBe(true);
    const small = after({
      _tag: "SetResize",
      resize: { height: 0, locked: false, width: 400 },
    });
    expect(exportSizeOf(small, natural)).toEqual({ height: 1, width: 400 });
  });

  it("keeps the export inside the size limits", () => {
    const wide = exportSizeOf(ORIGINAL, { height: 100, width: 40_000 });
    expect(wide.width).toBe(MAX_EXPORT_SIDE);
    expect(wide.height).toBe(40);
    const large = exportSizeOf(ORIGINAL, { height: 12_000, width: 12_000 });
    expect(large.width * large.height).toBeLessThanOrEqual(MAX_EXPORT_PIXELS);
    expect(large.width).toBe(large.height);
  });
});

describe("the export file name", () => {
  it("is the stem, then -easel, then the extension", () => {
    expect(exportNameOf("cat.png", "webp")).toBe("cat-easel.webp");
    expect(exportNameOf("cat.tar.gz", "avif")).toBe("cat.tar-easel.avif");
    expect(exportNameOf("no-extension", "jpeg")).toBe("no-extension-easel.jpg");
  });

  it("removes path and control characters and never is empty", () => {
    expect(nameStemOf("../..\\evil\u0000name.png")).toBe("evil name");
    expect(nameStemOf(".png")).toBe("image");
    expect(nameStemOf("   ")).toBe("image");
    expect(nameStemOf(`${"a".repeat(300)}.png`)).toHaveLength(120);
  });
});

describe("a locked Resize after a crop change", () => {
  it("keeps the ratio of the new crop and does not stretch the image", () => {
    const state = after(
      { _tag: "SetResize", resize: { height: 600, locked: true, width: 800 } },
      { _tag: "SetCropPreset", preset: "instagram-square", source: SOURCE },
      { _tag: "SetResize", resize: { height: 600, locked: true, width: 800 } }
    );
    // The crop is now 600 × 600. The width stays, and the height follows.
    expect(exportSizeOf(state, { height: 600, width: 600 })).toEqual({
      height: 800,
      width: 800,
    });
    const free = after({
      _tag: "SetResize",
      resize: { height: 100, locked: false, width: 800 },
    });
    expect(exportSizeOf(free, { height: 600, width: 600 })).toEqual({
      height: 100,
      width: 800,
    });
  });
});
