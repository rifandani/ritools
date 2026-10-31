import type { FolioTextRefusal } from "./folio.text.types";

/**
 * The page's visible box, in PDF points, origin at its lower left. It is what
 * `documents.getPage()` reports as `pdfCropBox`.
 */
export interface FolioTextPageBox {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

/** A box in the viewer's page space: origin at the page's top left, y down. */
export interface FolioTextPageRect {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Put a PDF Text Object's box in the viewer's page space, which is the frame
 * `StageCapability.pageRectToViewport` takes. PDF points run up from the crop
 * box's lower left; the viewer runs down from its upper left.
 */
export const pageRectOf = (
  bounds: readonly [number, number, number, number],
  crop: FolioTextPageBox
): FolioTextPageRect => {
  const [left, bottom, right, top] = bounds;
  return {
    height: top - bottom,
    width: right - left,
    x: left - crop.left,
    y: crop.top - top,
  };
};

/**
 * The Message Catalog key for each engine refusal. The engine names the reason
 * and never writes copy, so the mapping lives here and every reason has one.
 * `xfa` shares the generic line: a form that rebuilds its own pages has no
 * smaller story to tell.
 */
export const FOLIO_TEXT_REFUSAL_KEY = {
  artwork: "folioTextRefusedArtwork",
  "glyph-coverage": "folioTextRefusedGlyph",
  invisible: "folioTextRefusedInvisible",
  "no-text-object": "folioTextRefusedGeneric",
  overflow: "folioTextRefusedOverflow",
  permission: "folioTextRefusedPermission",
  signed: "folioTextRefusedSigned",
  "verify-failed": "folioTextRefusedGeneric",
  xfa: "folioTextRefusedGeneric",
} as const satisfies Record<FolioTextRefusal, string>;

/**
 * The tabs that needed a password to open. The viewer keeps the open document
 * after the unlock, and a Wording Edit would have to write a file that asks
 * for the password again, so the mode stays off for the whole tab.
 */
const encrypted = new Set<string>();

export const markFolioTextEncrypted = (documentId: string): void => {
  encrypted.add(documentId);
};

export const forgetFolioTextEncrypted = (documentId: string): void => {
  encrypted.delete(documentId);
};

export const isFolioTextEncrypted = (documentId: string): boolean =>
  encrypted.has(documentId);
