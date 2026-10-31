import { describe, expect, it } from "vitest";

import {
  formatMarker,
  ocrName,
  parseMarker,
  placeWordBox,
  selectPagesWithoutText,
  textDirection,
  textMatrix,
} from "./folio.ocr";

const page = { height: 800, width: 600, x: 0, y: 0 };
const image = { height: 1600, width: 1200 };
const word = { x0: 100, x1: 300, y0: 200, y1: 280 };

describe("placeWordBox", () => {
  it("maps pixels to points on an upright page", () => {
    expect(placeWordBox(word, image, page, 0)).toEqual({
      height: 40,
      rotation: 0,
      width: 100,
      x: 50,
      y: 660,
    });
  });

  it("maps pixels to points on a page turned 90 degrees", () => {
    expect(placeWordBox(word, { height: 1200, width: 1600 }, page, 90)).toEqual(
      {
        height: 100,
        rotation: 90,
        width: 40,
        x: 100,
        y: 50,
      }
    );
  });

  it("maps pixels to points on a page turned 180 degrees", () => {
    expect(placeWordBox(word, image, page, 180)).toEqual({
      height: 40,
      rotation: 180,
      width: 100,
      x: 450,
      y: 100,
    });
  });

  it("maps pixels to points on a page turned 270 degrees", () => {
    expect(
      placeWordBox(word, { height: 1200, width: 1600 }, page, 270)
    ).toEqual({
      height: 100,
      rotation: 270,
      width: 40,
      x: 460,
      y: 650,
    });
  });

  it("keeps the CropBox origin", () => {
    const shifted = { height: 800, width: 600, x: 20, y: 30 };
    expect(placeWordBox(word, image, shifted, 0)).toMatchObject({
      x: 70,
      y: 690,
    });
  });

  it("normalizes a negative or full turn", () => {
    expect(placeWordBox(word, image, page, -90).rotation).toBe(270);
    expect(placeWordBox(word, image, page, 360).rotation).toBe(0);
  });
});

describe("text direction", () => {
  it("points along the page axis for each turn", () => {
    expect(textDirection(0)).toEqual({ x: 0, y: 1 });
    expect(textDirection(90)).toEqual({ x: -1, y: 0 });
    expect(textDirection(180)).toEqual({ x: 0, y: -1 });
    expect(textDirection(270)).toEqual({ x: 1, y: 0 });
  });

  it("turns the text matrix with the page", () => {
    expect(textMatrix(0)).toEqual({ a: 1, b: 0, c: 0, d: 1 });
    expect(textMatrix(90)).toEqual({ a: 0, b: 1, c: -1, d: 0 });
    expect(textMatrix(180)).toEqual({ a: -1, b: 0, c: 0, d: -1 });
    expect(textMatrix(270)).toEqual({ a: 0, b: -1, c: 1, d: 0 });
  });
});

describe("the OCR marker", () => {
  it("round-trips through the Info string", () => {
    const value = formatMarker({
      engine: "tesseract.js@7.0.0",
      languages: ["eng", "ind"],
      pages: [1, 3, 4],
    });
    expect(value).toBe(
      "folio-ocr/1;engine=tesseract.js@7.0.0;languages=eng+ind;pages=1,3,4"
    );
    expect(parseMarker(value)).toEqual({
      engine: "tesseract.js@7.0.0",
      languages: ["eng", "ind"],
      pages: [1, 3, 4],
      version: 1,
    });
  });

  it("expands a page range", () => {
    const parsed = parseMarker(
      "folio-ocr/1;engine=e;languages=eng;pages=2-4,7"
    );
    expect(parsed?.pages).toEqual([2, 3, 4, 7]);
  });

  it("rejects a foreign or incomplete value", () => {
    expect(parseMarker("Producer")).toBeNull();
    expect(
      parseMarker("folio-ocr/2;engine=e;languages=eng;pages=1")
    ).toBeNull();
    expect(parseMarker("folio-ocr/1;engine=e;pages=1")).toBeNull();
    expect(parseMarker("folio-ocr/1;engine=e;languages=eng;pages=")).toBeNull();
  });
});

describe("OCR names and page choice", () => {
  it("adds the OCR suffix once", () => {
    expect(ocrName("scan.pdf")).toBe("scan-ocr.pdf");
    expect(ocrName("scan")).toBe("scan-ocr.pdf");
    expect(ocrName(null)).toBe("document-ocr.pdf");
  });

  it("selects the pages without text", () => {
    expect(
      selectPagesWithoutText([
        { hasText: false, index: 0 },
        { hasText: true, index: 1 },
        { hasText: false, index: 2 },
      ])
    ).toEqual(new Set([0, 2]));
  });
});
