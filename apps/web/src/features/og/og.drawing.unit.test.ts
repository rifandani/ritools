import { describe, expect, it } from "vitest";

import {
  buildSiteDrawing,
  buildToolDrawing,
  cardDrawing,
  ORIGIN,
} from "./og.drawing";

const pathed = (svg: string) => svg.match(/<path/gu) ?? [];

describe("buildSiteDrawing", () => {
  it("draws a 1200 by 630 sheet on the poster red", () => {
    const drawing = buildSiteDrawing();

    expect(drawing.width).toBe(1200);
    expect(drawing.height).toBe(630);
    expect(drawing.svg).toContain('width="1200" height="630"');
    expect(drawing.svg).toContain("#D7001A");
  });

  it("draws the wordmark, the rules, and the promises", () => {
    const drawing = buildSiteDrawing();

    expect(pathed(drawing.svg).length).toBeGreaterThan(20);
    expect(drawing.svg).toContain("<rect");
  });

  it("is the same drawing every time", () => {
    expect(buildSiteDrawing().svg).toBe(buildSiteDrawing().svg);
  });

  it("says where it came from", () => {
    expect(buildSiteDrawing().origin).toBe(ORIGIN.site);
    expect(ORIGIN.site).toContain("GET /api/og");
  });
});

describe("buildToolDrawing", () => {
  it("draws a sheet of the same size", () => {
    const drawing = buildToolDrawing(
      "Squeeze",
      "Compress images, on your device."
    );

    expect(drawing.width).toBe(1200);
    expect(drawing.height).toBe(630);
  });

  it("puts the tool name in ransom letters over its promise", () => {
    const long = buildToolDrawing("Squeeze", "Compress images.");
    const short = buildToolDrawing("Sq", "Compress images.");

    expect(long.svg).not.toBe(short.svg);
    expect(pathed(long.svg).length).toBeGreaterThan(pathed(short.svg).length);
  });

  it("wraps a long promise instead of running it past the sheet", () => {
    const short = buildToolDrawing("Squeeze", "Compress images.");
    const long = buildToolDrawing(
      "Squeeze",
      "Compress JPEG, PNG, WebP, AVIF, GIF and BMP images to a target file size, in bulk, entirely in your browser."
    );

    expect(long.svg.length).toBeGreaterThan(short.svg.length);
  });

  it("says which card it is", () => {
    expect(buildToolDrawing("Squeeze", "x").origin).toBe(ORIGIN.tool);
    expect(ORIGIN.tool).toContain("?tool=");
  });
});

describe("cardDrawing", () => {
  it("draws the card of a Tool the catalog knows", () => {
    const drawing = cardDrawing({ kind: "tool", path: "/squeeze" });

    expect(drawing.origin).toBe(ORIGIN.tool);
  });

  it("draws the site card when no Tool is named", () => {
    expect(cardDrawing({ kind: "site" }).origin).toBe(ORIGIN.site);
  });

  it("draws the site card for a path the catalog does not know", () => {
    // SAFETY: The parse refuses an unknown path; this is the guard behind it.
    const drawing = cardDrawing({ kind: "tool", path: "/gone" } as never);

    expect(drawing.origin).toBe(ORIGIN.site);
  });
});
