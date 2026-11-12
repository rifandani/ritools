import { describe, expect, it, vi } from "vitest";

import { EASEL_AGENT_ACTIONS } from "@/features/easel/easel.agent";
import type {
  EaselAgentController,
  EaselAgentExport,
  EaselAgentImage,
} from "@/features/easel/easel.agent";
import { ORIGINAL, reduce } from "@/features/easel/easel.stack";
import type { Change } from "@/features/easel/easel.stack";

const [
  getState,
  openSample,
  applyCropPreset,
  rotate,
  flip,
  setFinetune,
  applyFilter,
  exportAction,
] = EASEL_AGENT_ACTIONS;

const { signal } = new AbortController();

const IMAGE: EaselAgentImage = {
  format: "png",
  name: "cat.png",
  source: { height: 600, width: 800 },
  state: ORIGINAL,
};

/** A controller that keeps one image and applies changes as the page does. */
const pageOf = (options: {
  readonly exported?: EaselAgentExport;
  readonly image?: EaselAgentImage | null;
  readonly sample?: boolean;
}) => {
  let image = options.image === undefined ? IMAGE : options.image;
  const changes: Change[] = [];
  const exportImage = vi.fn(() =>
    Promise.resolve(
      options.exported ?? {
        bytes: 1234,
        format: "webp" as const,
        height: 600,
        name: "cat-easel.webp",
        ok: true as const,
        width: 800,
      }
    )
  );
  const controller = (): EaselAgentController => ({
    apply: (change) => {
      changes.push(change);
      if (image !== null) {
        image = { ...image, state: reduce(image.state, change) };
      }
    },
    exportImage,
    image,
    loadSample: () => {
      if (options.sample === true) {
        image = { ...IMAGE, name: "easel-sample.png" };
      }
      return Promise.resolve(options.sample === true);
    },
  });
  return {
    changes,
    context: { controller, settled: () => Promise.resolve() },
    exportImage,
  };
};

describe("the Agent Actions of Easel", () => {
  it("has one name for each action", () => {
    expect(EASEL_AGENT_ACTIONS.map((action) => action.name)).toEqual([
      "easel_get_state",
      "easel_open_sample",
      "easel_apply_crop_preset",
      "easel_rotate",
      "easel_flip",
      "easel_set_finetune",
      "easel_apply_filter",
      "easel_export",
    ]);
  });

  it("returns not-applicable when no image is open", async () => {
    for (const [action, args] of [
      [applyCropPreset, { preset: "landscape" }],
      [rotate, { direction: "left" }],
      [flip, { axis: "vertical" }],
      [setFinetune, { key: "hue", value: 3 }],
      [applyFilter, { filter: "mono" }],
    ] as const) {
      const page = pageOf({ image: null });
      // oxlint-disable-next-line eslint/no-await-in-loop -- each action runs on its own page.
      const result = await action?.execute(page.context, args, signal);
      expect(result).toMatchObject({ code: "not-applicable", ok: false });
      expect(page.changes).toHaveLength(0);
    }
  });
});

describe("easel_get_state", () => {
  it("reads the open image", async () => {
    const result = await getState?.execute(pageOf({}).context, {}, signal);
    expect(result).toMatchObject({
      image: {
        cropPreset: "custom",
        exportHeight: 600,
        exportWidth: 800,
        filter: null,
        finetune: { blur: 0, brightness: 0 },
        format: "png",
        name: "cat.png",
        rotate: 0,
      },
      note: null,
      ok: true,
    });
  });

  it("gives a note when no image is open", async () => {
    const result = await getState?.execute(
      pageOf({ image: null }).context,
      {},
      signal
    );
    expect(result).toMatchObject({ image: null, ok: true });
    expect(result).toHaveProperty(
      "note",
      expect.stringContaining("easel_open_sample")
    );
  });
});

describe("easel_open_sample", () => {
  it("opens the Sample Image", async () => {
    const page = pageOf({ image: null, sample: true });
    const result = await openSample?.execute(page.context, {}, signal);
    expect(result).toMatchObject({
      image: { name: "easel-sample.png" },
      ok: true,
    });
  });

  it("returns not-applicable when the Sample Image does not open", async () => {
    const result = await openSample?.execute(
      pageOf({ image: null, sample: false }).context,
      {},
      signal
    );
    expect(result).toMatchObject({ code: "not-applicable", ok: false });
  });
});

describe("the geometry actions", () => {
  it("applies a Crop Preset and reports the export size", async () => {
    const page = pageOf({});
    const result = await applyCropPreset?.execute(
      page.context,
      { preset: "instagram-square" },
      signal
    );
    expect(result).toMatchObject({
      image: {
        cropPreset: "instagram-square",
        exportHeight: 1080,
        exportWidth: 1080,
      },
      ok: true,
    });
    expect(page.changes[0]).toMatchObject({
      _tag: "SetCropPreset",
      source: IMAGE.source,
    });
  });

  it("refuses an unknown Crop Preset", async () => {
    const page = pageOf({});
    const result = await applyCropPreset?.execute(
      page.context,
      { preset: "__proto__" },
      signal
    );
    expect(result).toMatchObject({ code: "invalid-input", ok: false });
    expect(page.changes).toHaveLength(0);
  });

  it("rotates and flips", async () => {
    const page = pageOf({});
    const turned = await rotate?.execute(
      page.context,
      { direction: "right" },
      signal
    );
    expect(turned).toMatchObject({ image: { rotate: 90 }, ok: true });
    const mirrored = await flip?.execute(
      page.context,
      { axis: "horizontal" },
      signal
    );
    expect(mirrored).toMatchObject({
      image: { flipHorizontal: true, rotate: 270 },
      ok: true,
    });
  });
});

describe("easel_set_finetune", () => {
  it("sets one value", async () => {
    const result = await setFinetune?.execute(
      pageOf({}).context,
      { key: "brightness", value: 40 },
      signal
    );
    expect(result).toMatchObject({
      image: { finetune: { brightness: 40, contrast: 0 } },
      ok: true,
    });
  });

  it("refuses a value out of range and changes nothing", async () => {
    for (const args of [
      { key: "blur", value: -1 },
      { key: "hue", value: 101 },
    ]) {
      const page = pageOf({});
      // oxlint-disable-next-line eslint/no-await-in-loop -- each call runs on its own page.
      const result = await setFinetune?.execute(page.context, args, signal);
      expect(result).toMatchObject({ code: "invalid-settings", ok: false });
      expect(page.changes).toHaveLength(0);
    }
  });
});

describe("easel_apply_filter", () => {
  it("applies a Filter at full strength by default", async () => {
    const result = await applyFilter?.execute(
      pageOf({}).context,
      { filter: "noir" },
      signal
    );
    expect(result).toMatchObject({
      image: { filter: "noir", filterStrength: 100 },
      ok: true,
    });
  });

  it("applies a strength and removes a Filter with null", async () => {
    const page = pageOf({});
    await applyFilter?.execute(
      page.context,
      { filter: "sepia", strength: 30 },
      signal
    );
    const removed = await applyFilter?.execute(
      page.context,
      { filter: null },
      signal
    );
    // The Filter and its strength are one change: one undo step.
    expect(page.changes[0]).toEqual({
      _tag: "SetFilter",
      name: "sepia",
      strength: 30,
    });
    expect(removed).toMatchObject({ image: { filter: null }, ok: true });
  });

  it("refuses a strength out of range", async () => {
    const page = pageOf({});
    const result = await applyFilter?.execute(
      page.context,
      { filter: "mono", strength: 101 },
      signal
    );
    expect(result).toMatchObject({ code: "invalid-settings", ok: false });
    expect(page.changes).toHaveLength(0);
  });
});

describe("easel_export", () => {
  it("exports and reports the file", async () => {
    const page = pageOf({});
    const result = await exportAction?.execute(
      page.context,
      { format: "webp", quality: 80 },
      signal
    );
    expect(result).toEqual({
      bytes: 1234,
      format: "webp",
      height: 600,
      name: "cat-easel.webp",
      ok: true,
      width: 800,
    });
    expect(page.exportImage).toHaveBeenCalledWith({
      format: "webp",
      quality: 80,
    });
  });

  it("refuses a quality out of range", async () => {
    const page = pageOf({});
    const result = await exportAction?.execute(
      page.context,
      { quality: 0 },
      signal
    );
    expect(result).toMatchObject({ code: "invalid-settings", ok: false });
    expect(page.exportImage).not.toHaveBeenCalled();
  });

  it("maps each export failure to a code", async () => {
    for (const [reason, code] of [
      ["busy", "busy"],
      ["failed", "not-applicable"],
      ["no-image", "not-applicable"],
      ["unsupported", "not-applicable"],
    ] as const) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- each call runs on its own page.
      const result = await exportAction?.execute(
        pageOf({ exported: { ok: false, reason } }).context,
        {},
        signal
      );
      expect(result).toMatchObject({ code, ok: false });
    }
  });
});
