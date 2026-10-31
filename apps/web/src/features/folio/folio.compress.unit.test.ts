import { describe, expect, it } from "vitest";

import {
  compressedNameOf,
  FOLIO_COMPRESS_MAX_PIXELS,
  formatSize,
  outcomeOf,
  percentSaved,
  planForImage,
  uniqueCompressedNames,
} from "./folio.compress";

const facts = {
  bitsPerPixel: 24,
  colorspace: 2,
  height: 2000,
  horizontalDpi: 600,
  verticalDpi: 600,
  width: 3000,
};

describe("the image plan", () => {
  it("downscales a scan to each preset's resolution", () => {
    expect(planForImage(facts, "balanced")).toEqual({
      height: 500,
      quality: 78,
      width: 750,
    });
    expect(planForImage(facts, "light")).toEqual({
      height: 1000,
      quality: 90,
      width: 1500,
    });
    expect(planForImage(facts, "strong")).toEqual({
      height: 333,
      quality: 60,
      width: 500,
    });
  });

  it("keeps the pixels when the image is already smaller", () => {
    expect(
      planForImage({ ...facts, horizontalDpi: 96, verticalDpi: 96 }, "balanced")
    ).toEqual({ height: 2000, quality: 78, width: 3000 });
  });

  it("keeps the pixels when the DPI is unknown", () => {
    expect(
      planForImage({ ...facts, horizontalDpi: 0, verticalDpi: 0 }, "balanced")
    ).toEqual({ height: 2000, quality: 78, width: 3000 });
  });

  it("keeps the axis whose DPI is unknown", () => {
    expect(
      planForImage({ ...facts, horizontalDpi: 600, verticalDpi: 0 }, "balanced")
    ).toEqual({ height: 2000, quality: 78, width: 750 });
    expect(
      planForImage({ ...facts, horizontalDpi: 0, verticalDpi: 300 }, "balanced")
    ).toEqual({ height: 1000, quality: 78, width: 3000 });
  });

  it("uses the tighter of the two axes", () => {
    expect(
      planForImage(
        { ...facts, horizontalDpi: 600, verticalDpi: 300 },
        "balanced"
      )
    ).toEqual({ height: 1000, quality: 78, width: 750 });
  });

  it("accepts the smallest edge the plan allows", () => {
    expect(
      planForImage({ ...facts, height: 256, width: 256 }, "balanced")
    ).toEqual({ height: 64, quality: 78, width: 64 });
  });

  it("refuses an image that a preset would shrink under the edge", () => {
    expect(
      planForImage({ ...facts, height: 100, width: 100 }, "balanced")
    ).toBeNull();
  });

  it("refuses a mask, a CMYK image, and an indexed image", () => {
    expect(planForImage({ ...facts, bitsPerPixel: 1 }, "balanced")).toBeNull();
    expect(planForImage({ ...facts, bitsPerPixel: 32 }, "balanced")).toBeNull();
    expect(planForImage({ ...facts, colorspace: 3 }, "balanced")).toBeNull();
    expect(planForImage({ ...facts, colorspace: 10 }, "balanced")).toBeNull();
  });

  it("refuses an empty or oversized image", () => {
    expect(planForImage({ ...facts, width: 0 }, "balanced")).toBeNull();
    expect(
      planForImage(
        {
          ...facts,
          height: 20_000,
          horizontalDpi: 0,
          verticalDpi: 0,
          width: 20_000,
        },
        "balanced"
      )
    ).toBeNull();
  });

  it("keeps the pixel cap as a real bound", () => {
    expect(FOLIO_COMPRESS_MAX_PIXELS).toBe(32_000_000);
  });
});

describe("the compressed name", () => {
  it("replaces a PDF extension and keeps the stem", () => {
    expect(compressedNameOf("Report.PDF")).toBe("Report-compressed.pdf");
    expect(compressedNameOf("a.b.pdf")).toBe("a.b-compressed.pdf");
  });

  it("adds the extension to a name without one", () => {
    expect(compressedNameOf("report")).toBe("report-compressed.pdf");
  });

  it("falls back to a document name", () => {
    expect(compressedNameOf("   ")).toBe("document-compressed.pdf");
  });

  it("keeps the extension when the name is long", () => {
    const name = compressedNameOf(`${"a".repeat(200)}.pdf`);
    expect(name.length).toBeLessThanOrEqual(100);
    expect(name.endsWith(".pdf")).toBe(true);
  });
});

describe("the ZIP names", () => {
  it("numbers a repeated name", () => {
    expect(uniqueCompressedNames(["a.pdf", "a.pdf", "a.pdf", "b.pdf"])).toEqual(
      [
        "a-compressed.pdf",
        "a-compressed-2.pdf",
        "a-compressed-3.pdf",
        "b-compressed.pdf",
      ]
    );
  });

  it("does not collide with a name that already carries the suffix", () => {
    expect(uniqueCompressedNames(["a.pdf", "a-compressed.pdf"])).toEqual([
      "a-compressed.pdf",
      "a-compressed-compressed.pdf",
    ]);
  });
});

describe("the size figures", () => {
  it("reports the saved percentage", () => {
    expect(percentSaved(1000, 250)).toBe(75);
    expect(percentSaved(1000, 1000)).toBe(0);
    expect(percentSaved(0, 0)).toBe(0);
    expect(percentSaved(100, 150)).toBe(0);
  });

  it("names the outcome of a smaller copy", () => {
    expect(outcomeOf(100, 99)).toBe("compressed");
    expect(outcomeOf(100, 100)).toBe("unchanged");
    expect(outcomeOf(100, 101)).toBe("unchanged");
  });

  it("prints bytes in the Locale", () => {
    expect(formatSize(999, "en-US")).toBe("999 B");
    expect(formatSize(1000, "en-US")).toBe("1 KB");
    expect(formatSize(1_500_000, "en-US")).toBe("1.5 MB");
    expect(formatSize(1_500_000, "id-ID")).toBe("1,5 MB");
    expect(formatSize(1_500_000_000, "en-US")).toBe("1.5 GB");
  });
});
