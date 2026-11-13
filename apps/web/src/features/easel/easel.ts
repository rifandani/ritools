import type enUS from "@/core/libs/i18n/locales/en-US";
import type { Matrix, Point, Rect } from "@/features/easel/easel.geometry";
import type { Size } from "@/features/easel/easel.presets";

/**
 * The page rules of Easel that are not edit rules: the files it takes, the
 * File Tab limit, and the view (zoom, pan, and Fit). The view never changes
 * the Edit Stack.
 */

/** A Translation Key of the Message Catalog. */
export type EaselKey = keyof typeof enUS;

export const ACCEPTED_MIME =
  "image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.avif,.gif,.bmp,.heic,.heif";

/** The Sample Image is the CC0 picture that Unmask also ships. */
export const SAMPLE_URL = "/unmask/sample.png";
export const SAMPLE_NAME = "easel-sample.png";

export const MAX_TABS = 10;

/**
 * How many of `incoming` files can open, and whether the File Tab limit left
 * some out.
 */
export const tabRoomOf = (open: number, incoming: number) => {
  const accepted = Math.max(0, Math.min(incoming, MAX_TABS - open));
  return { accepted, limited: accepted < incoming };
};

/** The File Tab that becomes active when `closed` closes, or `null`. */
export const tabAfterClose = (
  ids: readonly string[],
  closed: string,
  active: string | null
): string | null => {
  if (active !== closed) {
    return active;
  }
  const index = ids.indexOf(closed);
  return ids[index + 1] ?? ids[index - 1] ?? null;
};

/** A byte count for a person: `1.4 MB`. */
export const formatBytes = (bytes: number, locale: string): string => {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: unit === 0 ? 0 : 1,
    style: "unit",
    unit: units[unit],
    unitDisplay: "short",
  }).format(value);
};

/* -------------------------------------------------------------------------- */
/* View                                                                        */
/* -------------------------------------------------------------------------- */

export interface View {
  /** The pan, in CSS pixels from the centered position. */
  readonly panX: number;
  readonly panY: number;
  /** The zoom, as a multiple of the Fit size. */
  readonly zoom: number;
}

export const FIT_VIEW: View = { panX: 0, panY: 0, zoom: 1 };
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 16;
export const ZOOM_STEP = 1.25;
/** The empty margin around the image at Fit, in CSS pixels. */
export const STAGE_PADDING = 24;

/** The scale that shows all of `content` inside `stage`. */
export const fitScaleOf = (content: Size, stage: Size): number => {
  const room = {
    height: Math.max(1, stage.height - STAGE_PADDING * 2),
    width: Math.max(1, stage.width - STAGE_PADDING * 2),
  };
  return Math.min(room.width / content.width, room.height / content.height);
};

/**
 * The matrix from a frame point (origin at the frame center) to a CSS pixel
 * of the stage. `content` is the area the view shows, in frame points.
 */
export const frameToCssOf = (
  content: Rect,
  stage: Size,
  view: View
): Matrix => {
  const scale = fitScaleOf(content, stage) * view.zoom;
  const centerX = content.x + content.width / 2;
  const centerY = content.y + content.height / 2;
  return [
    scale,
    0,
    0,
    scale,
    stage.width / 2 + view.panX - centerX * scale,
    stage.height / 2 + view.panY - centerY * scale,
  ];
};

/** The inverse of a matrix that only scales and moves. */
export const invertView = (matrix: Matrix): Matrix => [
  1 / matrix[0],
  0,
  0,
  1 / matrix[3],
  -matrix[4] / matrix[0],
  -matrix[5] / matrix[3],
];

/** The middle of the stage, as a zoom anchor. */
const STAGE_CENTER: Point = { x: 0, y: 0 };

const clampZoom = (zoom: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/**
 * The view after a zoom by `factor` that keeps the stage point `anchor`
 * (CSS pixels from the stage center) on the same image point.
 */
export const zoomView = (
  view: View,
  factor: number,
  anchor: Point = STAGE_CENTER
): View => {
  const zoom = clampZoom(view.zoom * factor);
  const ratio = zoom / view.zoom;
  // At or below Fit there is nothing to pan.
  if (zoom <= 1) {
    return { panX: 0, panY: 0, zoom };
  }
  return {
    panX: anchor.x - (anchor.x - view.panX) * ratio,
    panY: anchor.y - (anchor.y - view.panY) * ratio,
    zoom,
  };
};

/** The view after a pan. A view at Fit does not pan. */
export const panView = (view: View, dx: number, dy: number): View =>
  view.zoom <= 1
    ? view
    : { ...view, panX: view.panX + dx, panY: view.panY + dy };
