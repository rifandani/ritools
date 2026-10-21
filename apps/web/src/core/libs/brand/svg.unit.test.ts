import { describe, expect, it } from "vitest";

import {
  chipPath,
  escapeXml,
  PALETTE,
  rectPath,
  round,
  slashBar,
  svgDocument,
} from "./svg";

describe("rectPath", () => {
  it("closes a rectangle on its four corners", () => {
    expect(rectPath(1, 2, 3, 4)).toBe("M1 2L4 2L4 6L1 6Z");
  });
});

describe("chipPath", () => {
  it("leaves an unsnipped chip a rectangle", () => {
    expect(chipPath(10, 5, undefined, 2)).toBe("M0 0L10 0L10 5L0 5Z");
  });

  it("cuts the right edge on the slash run", () => {
    expect(chipPath(10, 5, "r", 2)).toBe("M0 0L10 0L8 5L0 5Z");
  });

  it("cuts the left edge on the slash run", () => {
    expect(chipPath(10, 5, "l", 2)).toBe("M2 0L10 0L10 5L0 5Z");
  });
});

describe("slashBar", () => {
  it("leans a rule on the slash angle", () => {
    expect(slashBar(0, 0, 100, 10, 45)).toBe("M0 0L100 0L90 10L0 10Z");
  });

  it("takes the brand angle by default", () => {
    // tan(16deg) = 0.2867, so a 4 unit tall rule leans 1.15 units.
    expect(slashBar(10, 20, 30, 4)).toMatch(
      /^M10 20L40 20L38\.853[\d]* 24L10 24Z$/u
    );
  });
});

describe("escapeXml", () => {
  it("escapes the five characters that may not sit in text raw", () => {
    expect(escapeXml(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &apos;");
  });
});

describe("round", () => {
  it("rounds to two decimals, so the path data stays small", () => {
    expect(round(1.2345)).toBe(1.23);
    expect(round(-1.2345)).toBe(-1.23);
  });
});

describe("svgDocument", () => {
  it("writes a document with a transparent ground", () => {
    const svg = svgDocument({ body: "<path/>", height: 10, width: 20 });

    expect(svg).toContain('width="20" height="10"');
    expect(svg).not.toContain("<rect");
  });

  it("writes the ground first when the sheet has one", () => {
    const svg = svgDocument({
      background: PALETTE.red,
      body: "<path/>",
      height: 10,
      width: 20,
    });

    expect(svg.indexOf("<rect")).toBeLessThan(svg.indexOf("<path"));
  });

  it("takes its own view box when the sheet is cropped", () => {
    const svg = svgDocument({
      body: "",
      height: 10,
      viewBox: "0 0 5 5",
      width: 20,
    });

    expect(svg).toContain('viewBox="0 0 5 5"');
  });
});
