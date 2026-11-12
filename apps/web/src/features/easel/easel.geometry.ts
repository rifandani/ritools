import type { Size } from "@/features/easel/easel.presets";

/**
 * The geometry of an Edit Stack: how a source image becomes the frame the
 * user crops.
 *
 * A source point goes through three steps, in this order: flip, Rotate (90°
 * steps), then Straighten. The result is the **frame**. All frame coordinates
 * in this module have their origin at the frame center unless a name says
 * otherwise, in source pixels, with y down and angles clockwise.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

/** A 2×3 affine matrix: `x' = a·x + c·y + e`, `y' = b·x + d·y + f`. */
export type Matrix = readonly [
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
];

export type QuarterSteps = 0 | 1 | 2 | 3;

export interface Geometry {
  readonly flipH: boolean;
  readonly flipV: boolean;
  readonly keepWhole: boolean;
  readonly rotate: QuarterSteps;
  /** Degrees, from −45 to +45. */
  readonly straighten: number;
}

export const FULL_RECT: Rect = { height: 1, width: 1, x: 0, y: 0 };

export const MIN_STRAIGHTEN = -45;
export const MAX_STRAIGHTEN = 45;
/** The smallest side of a crop, as a part of the frame. */
export const MIN_CROP = 0.02;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const radians = (degrees: number): number => (degrees * Math.PI) / 180;

/** The Straighten angle in 0.1° steps inside its limits. */
export const clampStraighten = (angle: number): number => {
  if (!Number.isFinite(angle)) {
    return 0;
  }
  const rounded = Math.round(angle * 10) / 10;
  return clamp(rounded === 0 ? 0 : rounded, MIN_STRAIGHTEN, MAX_STRAIGHTEN);
};

export const multiply = (left: Matrix, right: Matrix): Matrix => [
  left[0] * right[0] + left[2] * right[1],
  left[1] * right[0] + left[3] * right[1],
  left[0] * right[2] + left[2] * right[3],
  left[1] * right[2] + left[3] * right[3],
  left[0] * right[4] + left[2] * right[5] + left[4],
  left[1] * right[4] + left[3] * right[5] + left[5],
];

export const applyMatrix = (matrix: Matrix, point: Point): Point => ({
  x: matrix[0] * point.x + matrix[2] * point.y + matrix[4],
  y: matrix[1] * point.x + matrix[3] * point.y + matrix[5],
});

const translation = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];

/** A clockwise rotation, for a y-down plane. */
const rotation = (degrees: number): Matrix => {
  const angle = radians(degrees);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [cos, sin, -sin, cos, 0, 0];
};

const QUARTERS: readonly Matrix[] = [
  [1, 0, 0, 1, 0, 0],
  [0, 1, -1, 0, 0, 0],
  [-1, 0, 0, -1, 0, 0],
  [0, -1, 1, 0, 0, 0],
];

const quarter = (turns: QuarterSteps): Matrix =>
  /* v8 ignore next -- @preserve the index is always 0 to 3. */
  QUARTERS[turns] ?? [1, 0, 0, 1, 0, 0];

/** The image size after Rotate, before Straighten. */
export const orientedSizeOf = (source: Size, rotate: QuarterSteps): Size =>
  rotate % 2 === 0 ? source : { height: source.width, width: source.height };

/**
 * The largest axis-aligned rectangle inside a `width`×`height` rectangle that
 * is rotated by `degrees`.
 */
export const largestInnerRect = (size: Size, degrees: number): Size => {
  const angle = Math.abs(radians(degrees));
  const sin = Math.abs(Math.sin(angle));
  const cos = Math.abs(Math.cos(angle));
  if (sin < 1e-9) {
    return size;
  }
  const { height, width } = size;
  const widthIsLonger = width >= height;
  const long = widthIsLonger ? width : height;
  const short = widthIsLonger ? height : width;
  if (short <= 2 * sin * cos * long || Math.abs(sin - cos) < 1e-9) {
    // Two corners touch the long sides: the rectangle is half-constrained.
    const half = short / 2;
    return widthIsLonger
      ? { height: half / cos, width: half / sin }
      : { height: half / sin, width: half / cos };
  }
  const cos2 = cos * cos - sin * sin;
  return {
    height: (height * cos - width * sin) / cos2,
    width: (width * cos - height * sin) / cos2,
  };
};

/** The bounding box of a rectangle that is rotated by `degrees`. */
export const expandedRect = (size: Size, degrees: number): Size => {
  const angle = Math.abs(radians(degrees));
  const sin = Math.abs(Math.sin(angle));
  const cos = Math.abs(Math.cos(angle));
  return {
    height: size.width * sin + size.height * cos,
    width: size.width * cos + size.height * sin,
  };
};

/**
 * The frame size. With no Straighten it is the rotated image. With a
 * Straighten it is the largest rectangle inside the image, or the expanded
 * canvas when Keep whole image is set.
 */
export const frameSizeOf = (source: Size, geometry: Geometry): Size => {
  const oriented = orientedSizeOf(source, geometry.rotate);
  if (geometry.straighten === 0) {
    return oriented;
  }
  return geometry.keepWhole
    ? expandedRect(oriented, geometry.straighten)
    : largestInnerRect(oriented, geometry.straighten);
};

/**
 * The matrix from a frame point (origin at the frame center) to a source
 * pixel (origin at the top left of the source).
 */
export const frameToSourceOf = (source: Size, geometry: Geometry): Matrix => {
  // SAFETY: (4 − n) % 4 for n in 0..3 is in 0..3.
  const inverseQuarter = ((4 - geometry.rotate) % 4) as QuarterSteps;
  const flip: Matrix = [
    geometry.flipH ? -1 : 1,
    0,
    0,
    geometry.flipV ? -1 : 1,
    0,
    0,
  ];
  return multiply(
    translation(source.width / 2, source.height / 2),
    multiply(
      flip,
      multiply(quarter(inverseQuarter), rotation(-geometry.straighten))
    )
  );
};

/** A normalized rectangle inside the unit square, at least `MIN_CROP` wide. */
export const clampRect = (rect: Rect): Rect => {
  const width = clamp(rect.width, MIN_CROP, 1);
  const height = clamp(rect.height, MIN_CROP, 1);
  return {
    height,
    width,
    x: clamp(rect.x, 0, 1 - width),
    y: clamp(rect.y, 0, 1 - height),
  };
};

/**
 * The crop rectangle in frame pixels (origin at the top left of the frame).
 *
 * `rect` is the user's normalized rectangle. With a `ratio`, the result is the
 * largest rectangle of that ratio that fits inside it, on the same center.
 */
export const cropRectOf = (
  frame: Size,
  rect: Rect,
  ratio: number | null
): Rect => {
  const bounded = clampRect(rect);
  const box = {
    height: bounded.height * frame.height,
    width: bounded.width * frame.width,
    x: bounded.x * frame.width,
    y: bounded.y * frame.height,
  };
  if (ratio === null) {
    return box;
  }
  const width = Math.min(box.width, box.height * ratio);
  const height = width / ratio;
  return {
    height,
    width,
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
  };
};

/**
 * The default crop of a preset: the largest rectangle of its ratio in the
 * middle of the frame, normalized.
 */
export const defaultCropOf = (frame: Size, ratio: number | null): Rect => {
  if (ratio === null) {
    return FULL_RECT;
  }
  const fitted = cropRectOf(frame, FULL_RECT, ratio);
  return {
    height: fitted.height / frame.height,
    width: fitted.width / frame.width,
    x: fitted.x / frame.width,
    y: fitted.y / frame.height,
  };
};

/** The normalized rectangle after a Rotate of one 90° step. */
export const rotateRect = (rect: Rect, direction: "left" | "right"): Rect =>
  direction === "right"
    ? {
        height: rect.width,
        width: rect.height,
        x: 1 - rect.y - rect.height,
        y: rect.x,
      }
    : {
        height: rect.width,
        width: rect.height,
        x: rect.y,
        y: 1 - rect.x - rect.width,
      };

/** The normalized rectangle after a flip. */
export const flipRect = (rect: Rect, axis: "horizontal" | "vertical"): Rect =>
  axis === "horizontal"
    ? { ...rect, x: 1 - rect.x - rect.width }
    : { ...rect, y: 1 - rect.y - rect.height };

/** A frame point (origin at the center) after a Rotate of one 90° step. */
export const rotatePoint = (
  point: Point,
  direction: "left" | "right"
): Point =>
  direction === "right"
    ? { x: -point.y, y: point.x }
    : { x: point.y, y: -point.x };

/** A frame point (origin at the center) after a turn of `degrees`. */
export const pivotPoint = (point: Point, degrees: number): Point =>
  applyMatrix(rotation(degrees), point);

export const CROP_HANDLES = [
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
  "nw",
] as const;
export type CropHandle = (typeof CROP_HANDLES)[number];

/** The normalized rectangle after a move, kept inside the frame. */
export const moveCrop = (rect: Rect, dx: number, dy: number): Rect => ({
  ...rect,
  x: clamp(rect.x + dx, 0, 1 - rect.width),
  y: clamp(rect.y + dy, 0, 1 - rect.height),
});

/**
 * The normalized rectangle after a drag of one handle by (`dx`, `dy`).
 *
 * `ratio` is the pixel ratio the rectangle must keep, or `null`. `frame` is
 * the frame size, which turns the pixel ratio into a normalized one.
 */
export const resizeCrop = (options: {
  readonly dx: number;
  readonly dy: number;
  readonly frame: Size;
  readonly handle: CropHandle;
  readonly ratio: number | null;
  readonly rect: Rect;
}): Rect => {
  const { dx, dy, frame, handle, ratio, rect } = options;
  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;
  if (handle.includes("w")) {
    left = clamp(left + dx, 0, right - MIN_CROP);
  }
  if (handle.includes("e")) {
    right = clamp(right + dx, left + MIN_CROP, 1);
  }
  if (handle.includes("n")) {
    top = clamp(top + dy, 0, bottom - MIN_CROP);
  }
  if (handle.includes("s")) {
    bottom = clamp(bottom + dy, top + MIN_CROP, 1);
  }
  if (ratio === null) {
    return { height: bottom - top, width: right - left, x: left, y: top };
  }
  // The ratio of normalized width to normalized height.
  const unit = (ratio * frame.height) / frame.width;
  const horizontalOnly = handle === "e" || handle === "w";
  const verticalOnly = handle === "n" || handle === "s";
  let width = right - left;
  let height = bottom - top;
  if (horizontalOnly) {
    height = width / unit;
  } else if (verticalOnly) {
    width = height * unit;
  } else {
    width = Math.min(width, height * unit);
    height = width / unit;
  }
  // The side opposite the handle stays where it is.
  const anchorRight = handle.includes("w");
  const anchorBottom = handle.includes("n");
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const roomX = verticalOnly
    ? Math.min(centerX, 1 - centerX) * 2
    : anchorRight
      ? right
      : 1 - left;
  const roomY = horizontalOnly
    ? Math.min(centerY, 1 - centerY) * 2
    : anchorBottom
      ? bottom
      : 1 - top;
  const scale = Math.min(1, roomX / width, roomY / height);
  width *= scale;
  height *= scale;
  return {
    height,
    width,
    x: verticalOnly ? centerX - width / 2 : anchorRight ? right - width : left,
    y: horizontalOnly
      ? centerY - height / 2
      : anchorBottom
        ? bottom - height
        : top,
  };
};

/** A box from a drag between two points. `square` gives equal sides. */
export const boxBetween = (
  from: Point,
  to: Point,
  square: boolean
): { readonly height: number; readonly width: number } & Point => {
  let width = Math.abs(to.x - from.x);
  let height = Math.abs(to.y - from.y);
  if (square) {
    width = Math.max(width, height);
    height = width;
  }
  const endX = from.x + (to.x < from.x ? -width : width);
  const endY = from.y + (to.y < from.y ? -height : height);
  return { height, width, x: (from.x + endX) / 2, y: (from.y + endY) / 2 };
};

/**
 * A line from a drag between two points: its center, length, and angle.
 * `snap` turns the angle to the nearest 45°.
 */
export const segmentBetween = (
  from: Point,
  to: Point,
  snap: boolean
): { readonly rotation: number; readonly width: number } & Point => {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  let degrees = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  if (snap) {
    degrees = Math.round(degrees / 45) * 45;
  }
  const end = applyMatrix(rotation(degrees), { x: length, y: 0 });
  return {
    rotation: degrees,
    width: length,
    x: from.x + end.x / 2,
    y: from.y + end.y / 2,
  };
};
