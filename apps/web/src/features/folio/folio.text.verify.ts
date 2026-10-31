import type { FolioTextRefusal } from "./folio.text.types";

/** A box in PDF points, origin at the page's lower left. */
export interface FolioTextBounds {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

/** A box in rendered pixels, origin at the bitmap's top left. */
export interface FolioPixelRect {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

/** One rendered page: BGRA pixels and the geometry that indexes them. */
export interface FolioBitmapView {
  readonly bytes: Uint8Array;
  readonly height: number;
  readonly stride: number;
  readonly width: number;
}

/** The free width that rounding may add, in PDF points. */
const FOLIO_TEXT_FIT_TOLERANCE = 0.5;

/** The band around the edited object that the pixel check ignores, in points. */
export const FOLIO_TEXT_ARTWORK_MARGIN = 2;

/** The channel delta that counts as no change, out of 255. */
export const FOLIO_TEXT_PIXEL_TOLERANCE = 8;

/** The bounds drift that a save may introduce, in PDF points. */
export const FOLIO_TEXT_BOUNDS_TOLERANCE = 1;

/**
 * The width from the target's right edge to the nearest text object that starts
 * to its right on the same line, or to the page's right edge.
 */
export const freeWidth = (
  target: FolioTextBounds,
  neighbors: readonly FolioTextBounds[],
  pageRight: number
): number => {
  let edge = pageRight;
  for (const neighbor of neighbors) {
    const center = (neighbor.bottom + neighbor.top) / 2;
    if (center <= target.bottom || center >= target.top) {
      continue;
    }
    if (neighbor.left <= target.right) {
      continue;
    }
    if (neighbor.left < edge) {
      edge = neighbor.left;
    }
  }
  return Math.max(0, edge - target.right);
};

/** Does the rewritten box stay inside the line's free width? */
export const fitsFreeWidth = (
  target: FolioTextBounds,
  next: FolioTextBounds,
  width: number
): boolean => next.right <= target.right + width + FOLIO_TEXT_FIT_TOLERANCE;

/**
 * The early and post-save checks, in one shape. `undefined` means that check
 * has not run yet; the Worker asks once after the early gates and once after
 * the saved bytes are reopened.
 */
export interface FolioTextGates {
  readonly artwork: boolean;
  readonly expected: boolean;
  readonly fits: boolean;
  readonly glyphs: boolean;
  readonly object: boolean;
  readonly permitted: boolean;
  readonly signed: boolean;
  readonly verified: boolean;
  readonly visible: boolean;
  readonly xfa: boolean;
}

/**
 * The first refusal in precedence order, or `null` when every checked gate
 * passes. Document-level gates come before the object, and a wrong glyph comes
 * before a broad verification miss, so the user gets the most specific reason.
 */
export const refusalOf = (
  gates: Partial<FolioTextGates>
): FolioTextRefusal | null => {
  if (gates.signed === true) {
    return "signed";
  }
  if (gates.permitted === false) {
    return "permission";
  }
  if (gates.xfa === true) {
    return "xfa";
  }
  if (gates.object === false) {
    return "no-text-object";
  }
  if (gates.expected === false) {
    return "verify-failed";
  }
  if (gates.visible === false) {
    return "invisible";
  }
  if (gates.fits === false) {
    return "overflow";
  }
  if (gates.glyphs === false) {
    return "glyph-coverage";
  }
  if (gates.artwork === true) {
    return "artwork";
  }
  if (gates.verified === false) {
    return "verify-failed";
  }
  return null;
};

const changed = (before: number, after: number, tolerance: number) =>
  Math.abs(before - after) > tolerance;

/**
 * Does any pixel differ by more than `tolerance`, inside or outside `region`?
 * Dimensions or byte lengths that disagree are a change, so the caller
 * refuses. The caller passes `inside: false` for the artwork keep-out and
 * `inside: true` for the edited object's own box.
 */
const differsInRegion = (
  before: FolioBitmapView,
  after: FolioBitmapView,
  region: FolioPixelRect,
  inside: boolean,
  tolerance: number
): boolean => {
  if (
    before.width !== after.width ||
    before.height !== after.height ||
    before.stride !== after.stride ||
    before.bytes.length < before.stride * before.height ||
    after.bytes.length < after.stride * after.height
  ) {
    return true;
  }

  const left = Math.max(0, Math.floor(region.left));
  const right = Math.min(before.width, Math.ceil(region.right));
  const top = Math.max(0, Math.floor(region.top));
  const bottom = Math.min(before.height, Math.ceil(region.bottom));
  const oldBytes = new DataView(
    before.bytes.buffer,
    before.bytes.byteOffset,
    before.bytes.byteLength
  );
  const nextBytes = new DataView(
    after.bytes.buffer,
    after.bytes.byteOffset,
    after.bytes.byteLength
  );
  for (let y = 0; y < before.height; y += 1) {
    for (let x = 0; x < before.width; x += 1) {
      const inRegion = x >= left && x < right && y >= top && y < bottom;
      if (inRegion !== inside) {
        continue;
      }
      const offset = y * before.stride + x * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        if (
          changed(
            oldBytes.getUint8(offset + channel),
            nextBytes.getUint8(offset + channel),
            tolerance
          )
        ) {
          return true;
        }
      }
    }
  }
  return false;
};

/**
 * Does any pixel outside `keepOut` differ by more than `tolerance`? A change
 * outside the edited object is a change to the page artwork, so the caller
 * refuses.
 */
export const differsOutside = (
  before: FolioBitmapView,
  after: FolioBitmapView,
  keepOut: FolioPixelRect,
  tolerance: number = FOLIO_TEXT_PIXEL_TOLERANCE
): boolean => differsInRegion(before, after, keepOut, false, tolerance);

/**
 * Does any pixel inside `region` differ by more than `tolerance`? A wording
 * edit that paints nothing is a no-op, even when the saved text is correct.
 */
export const differsInside = (
  before: FolioBitmapView,
  after: FolioBitmapView,
  region: FolioPixelRect,
  tolerance: number = FOLIO_TEXT_PIXEL_TOLERANCE
): boolean => differsInRegion(before, after, region, true, tolerance);
