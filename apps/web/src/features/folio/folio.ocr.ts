/**
 * OCR vocabulary and pure helpers. This file holds no engine and no DOM: the
 * worker, the client, and the panel agree on these shapes, and the geometry
 * that places OCR text on a page is testable on its own.
 */

/** The render scale that gives a 300 DPI raster from PDF points. */
export const FOLIO_OCR_SCALE = 300 / 72;

/** The pixel ceiling for one page. A page above it is rendered again, smaller. */
export const FOLIO_OCR_MAX_PIXELS = 40_000_000;

/** The marker's version prefix. A parser reads only this version. */
const FOLIO_OCR_MARKER_VERSION = "folio-ocr/1";

/** The Info dictionary key that marks a copy written by this feature. */
export const FOLIO_OCR_MARKER_KEY = "FolioOCR";

/** The engine name and version that the marker records. */
export const FOLIO_OCR_ENGINE = "tesseract.js@7.0.0";

export type FolioOcrLanguage = "eng" | "ind";

export interface FolioOcrBox {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export interface FolioOcrWord {
  readonly text: string;
  /** Pixels in the rendered image, origin at the top left. */
  readonly box: FolioOcrBox;
  /** 0 to 100, as Tesseract reports it. */
  readonly confidence: number;
}

export interface FolioOcrPage {
  /** Zero-based page index. */
  readonly pageIndex: number;
  readonly width: number;
  readonly height: number;
  readonly confidence: number;
  readonly words: readonly FolioOcrWord[];
  /** Words whose characters the embedded font cannot draw. */
  readonly skipped: number;
}

export interface FolioOcrMarker {
  readonly engine: string;
  readonly languages: readonly FolioOcrLanguage[];
  /** One-based page numbers, sorted and unique. */
  readonly pages: readonly number[];
  readonly version: 1;
}

export type FolioOcrRotation = 0 | 90 | 180 | 270;

export interface FolioOcrPageBox {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

export interface FolioOcrPlacement {
  readonly height: number;
  readonly rotation: FolioOcrRotation;
  readonly width: number;
  /** Page-space bottom-left corner before the baseline offset. */
  readonly x: number;
  readonly y: number;
}

const normalizeRotation = (angle: number): FolioOcrRotation => {
  const value = (((Math.round(angle / 90) * 90) % 360) + 360) % 360;
  if (value === 90 || value === 180 || value === 270) {
    return value;
  }
  return 0;
};

/**
 * Convert a word box in rendered pixels to a box in PDF page points.
 *
 * The raster is what the viewer shows: the CropBox, turned by `/Rotate`. The
 * page space is the unrotated CropBox, origin at its lower-left corner.
 */
export const placeWordBox = (
  box: FolioOcrBox,
  image: { readonly height: number; readonly width: number },
  page: FolioOcrPageBox,
  angle: number
): FolioOcrPlacement => {
  const rotation = normalizeRotation(angle);
  const quarter = rotation === 90 || rotation === 270;
  const shownWidth = quarter ? page.height : page.width;
  const shownHeight = quarter ? page.width : page.height;
  const scaleX = image.width / shownWidth;
  const scaleY = image.height / shownHeight;

  // Display space: origin at the lower left of the page as shown.
  const dx0 = box.x0 / scaleX;
  const dx1 = box.x1 / scaleX;
  const dy0 = shownHeight - box.y1 / scaleY;
  const dy1 = shownHeight - box.y0 / scaleY;

  let left = dx0;
  let right = dx1;
  let bottom = dy0;
  let top = dy1;

  if (rotation === 90) {
    left = shownHeight - dy1;
    right = shownHeight - dy0;
    bottom = dx0;
    top = dx1;
  } else if (rotation === 180) {
    left = shownWidth - dx1;
    right = shownWidth - dx0;
    bottom = shownHeight - dy1;
    top = shownHeight - dy0;
  } else if (rotation === 270) {
    left = dy0;
    right = dy1;
    bottom = shownWidth - dx1;
    top = shownWidth - dx0;
  }

  return {
    height: Math.max(0.1, top - bottom),
    rotation,
    width: Math.max(0.1, right - left),
    x: page.x + left,
    y: page.y + bottom,
  };
};

/** The text direction in page space, as a unit vector. */
export const textDirection = (rotation: FolioOcrRotation) => {
  if (rotation === 90) {
    return { x: -1, y: 0 };
  }
  if (rotation === 180) {
    return { x: 0, y: -1 };
  }
  if (rotation === 270) {
    return { x: 1, y: 0 };
  }
  return { x: 0, y: 1 };
};

/** The text matrix, before the horizontal scale, that keeps a word upright. */
export const textMatrix = (rotation: FolioOcrRotation) => {
  if (rotation === 90) {
    return { a: 0, b: 1, c: -1, d: 0 };
  }
  if (rotation === 180) {
    return { a: -1, b: 0, c: 0, d: -1 };
  }
  if (rotation === 270) {
    return { a: 0, b: -1, c: 1, d: 0 };
  }
  return { a: 1, b: 0, c: 0, d: 1 };
};

/** A copy name that says the file carries OCR text. */
export const ocrName = (name: string | null | undefined): string => {
  const base = (name ?? "document.pdf").replace(/\.pdf$/iu, "");
  return `${base}-ocr.pdf`;
};

/** The marker value stored in the Info dictionary. */
export const formatMarker = (marker: Omit<FolioOcrMarker, "version">) => {
  const languages = marker.languages.join("+");
  const pages = marker.pages.join(",");
  return `${FOLIO_OCR_MARKER_VERSION};engine=${marker.engine};languages=${languages};pages=${pages}`;
};

const isLanguage = (value: string): value is FolioOcrLanguage =>
  value === "eng" || value === "ind";

const pageNumbers = (value: string): readonly number[] => {
  const pages = new Set<number>();
  for (const part of value.split(",")) {
    const range = /^(?<from>\d+)-(?<to>\d+)$/u.exec(part);
    if (range?.groups) {
      const from = Number(range.groups["from"]);
      const to = Number(range.groups["to"]);
      for (let page = from; page <= to; page += 1) {
        if (page > 0) {
          pages.add(page);
        }
      }
      continue;
    }
    const page = Number(part);
    if (Number.isInteger(page) && page > 0) {
      pages.add(page);
    }
  }
  return [...pages].toSorted((left, right) => left - right);
};

/** Read a marker, or `null` when the value is absent or foreign. */
export const parseMarker = (value: string | null | undefined) => {
  if (!value || !value.startsWith(`${FOLIO_OCR_MARKER_VERSION};`)) {
    return null;
  }
  const fields = new Map<string, string>();
  for (const part of value
    .slice(FOLIO_OCR_MARKER_VERSION.length + 1)
    .split(";")) {
    const index = part.indexOf("=");
    if (index > 0) {
      fields.set(part.slice(0, index), part.slice(index + 1));
    }
  }
  const engine = fields.get("engine");
  const languages = fields.get("languages");
  const pages = fields.get("pages");
  if (!engine || !languages || !pages) {
    return null;
  }
  const parsedPages = pageNumbers(pages);
  const parsedLanguages = languages.split("+").filter(isLanguage);
  if (parsedPages.length === 0 || parsedLanguages.length === 0) {
    return null;
  }
  return {
    engine,
    languages: parsedLanguages,
    pages: parsedPages,
    version: 1,
  } satisfies FolioOcrMarker;
};

/** The default page selection: everything without a usable text layer. */
export const selectPagesWithoutText = (
  pages: readonly { readonly hasText: boolean; readonly index: number }[]
) => {
  const selected = new Set<number>();
  for (const page of pages) {
    if (!page.hasText) {
      selected.add(page.index);
    }
  }
  return selected;
};
