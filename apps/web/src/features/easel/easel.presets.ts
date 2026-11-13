/**
 * The Crop Preset catalog: the named crop shapes Easel offers.
 *
 * A preset with a `ratio` keeps that width-to-height ratio. A social network
 * preset also has a `size`, which is the export size in pixels. The Ellipse
 * Crop keeps an elliptical area and has no fixed ratio.
 */

export interface Size {
  readonly height: number;
  readonly width: number;
}

export const CROP_PRESET_IDS = [
  "custom",
  "landscape",
  "portrait",
  "classic",
  "cinema",
  "ellipse",
  "instagram-square",
  "instagram-portrait",
  "instagram-story",
  "x-post",
  "x-header",
  "linkedin-post",
  "linkedin-banner",
  "facebook-post",
  "facebook-cover",
] as const;

export type CropPresetId = (typeof CROP_PRESET_IDS)[number];

export interface CropPreset {
  readonly group: "basic" | "social";
  readonly id: CropPresetId;
  /** Width divided by height, or `null` for a free form. */
  readonly ratio: number | null;
  readonly form: "ellipse" | "rectangle";
  /** The export size of a social network format, or `null`. */
  readonly size: Size | null;
}

const basic = (
  id: CropPresetId,
  ratio: number | null,
  form: CropPreset["form"] = "rectangle"
): CropPreset => ({ group: "basic", id, ratio, form, size: null });

const social = (
  id: CropPresetId,
  width: number,
  height: number
): CropPreset => ({
  group: "social",
  id,
  ratio: width / height,
  form: "rectangle",
  size: { height, width },
});

/**
 * Each Crop Preset by its id. The ids are a closed set, so a lookup always
 * gives a preset.
 */
const PRESET_BY_ID: Readonly<Record<CropPresetId, CropPreset>> = {
  cinema: basic("cinema", 21 / 9),
  classic: basic("classic", 4 / 3),
  custom: basic("custom", null),
  ellipse: basic("ellipse", null, "ellipse"),
  "facebook-cover": social("facebook-cover", 820, 312),
  "facebook-post": social("facebook-post", 1200, 630),
  "instagram-portrait": social("instagram-portrait", 1080, 1350),
  "instagram-square": social("instagram-square", 1080, 1080),
  "instagram-story": social("instagram-story", 1080, 1920),
  landscape: basic("landscape", 16 / 9),
  "linkedin-banner": social("linkedin-banner", 1584, 396),
  "linkedin-post": social("linkedin-post", 1200, 628),
  portrait: basic("portrait", 9 / 16),
  "x-header": social("x-header", 1500, 500),
  "x-post": social("x-post", 1600, 900),
};

/** The preset with an id. */
export const cropPresetOf = (id: CropPresetId): CropPreset => PRESET_BY_ID[id];

/** The catalog, in the order the Crop panel shows it. */
export const CROP_PRESETS: readonly CropPreset[] = CROP_PRESET_IDS.map((id) =>
  cropPresetOf(id)
);
