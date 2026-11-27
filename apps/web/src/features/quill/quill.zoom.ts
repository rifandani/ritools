/** Zoom levels are relative to the fitted size: 1 shows the whole figure. */
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 8;
const ZOOM_STEP = 1.25;
/** Wheel distance in pixels that doubles or halves the zoom level. */
const WHEEL_DOUBLING = 480;

export interface Size {
  readonly width: number;
  readonly height: number;
}
export interface Point {
  readonly x: number;
  readonly y: number;
}
/** `x` and `y` move the figure center from the stage center, in pixels. */
export interface ZoomView extends Point {
  readonly scale: number;
}

export const ZOOM_FIT: ZoomView = { scale: 1, x: 0, y: 0 };
const CENTER: Point = { x: 0, y: 0 };

export const clampZoom = (scale: number): number =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));

/** The largest size that shows all of `natural` in `box`, never above its natural size. */
export const fitSize = (natural: Size, box: Size): Size => {
  if (natural.width <= 0 || natural.height <= 0) {
    return { width: 0, height: 0 };
  }
  const ratio = Math.max(
    0,
    Math.min(1, box.width / natural.width, box.height / natural.height)
  );
  return { width: natural.width * ratio, height: natural.height * ratio };
};

const clampAxis = (offset: number, figure: number, box: number) => {
  const limit = Math.max(0, (figure - box) / 2);
  return limit === 0 ? 0 : Math.min(limit, Math.max(-limit, offset));
};

/** Keep the figure on the stage: a figure smaller than the stage stays centered. */
export const clampPan = (
  view: ZoomView,
  fitted: Size,
  box: Size
): ZoomView => ({
  scale: view.scale,
  x: clampAxis(view.x, fitted.width * view.scale, box.width),
  y: clampAxis(view.y, fitted.height * view.scale, box.height),
});

/**
 * Zoom to `scale` and keep the figure point under `anchor` in place. The anchor
 * is relative to the stage center; omit it to zoom about the center.
 */
export const zoomAt = (
  view: ZoomView,
  scale: number,
  fitted: Size,
  box: Size,
  anchor: Point = CENTER
): ZoomView => {
  const next = clampZoom(scale);
  const ratio = next / view.scale;
  return clampPan(
    {
      scale: next,
      x: anchor.x - (anchor.x - view.x) * ratio,
      y: anchor.y - (anchor.y - view.y) * ratio,
    },
    fitted,
    box
  );
};

/** The zoom level after a wheel or trackpad scroll of `deltaY` pixels. */
export const wheelScale = (scale: number, deltaY: number): number =>
  clampZoom(scale * 2 ** (-deltaY / WHEEL_DOUBLING));

/** The zoom level after one zoom-in (1) or zoom-out (-1) step. */
export const stepScale = (scale: number, direction: 1 | -1): number =>
  clampZoom(scale * ZOOM_STEP ** direction);

/** Move the figure by a pointer or arrow key distance. */
export const panBy = (
  view: ZoomView,
  delta: Point,
  fitted: Size,
  box: Size
): ZoomView =>
  clampPan({ ...view, x: view.x + delta.x, y: view.y + delta.y }, fitted, box);

export const zoomPercent = (scale: number): number => Math.round(scale * 100);
