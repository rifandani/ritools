import { describe, expect, it } from "vitest";

import { isFolioAsset } from "./folio.assets";

const origin = "https://ritools.test";
describe("PDF renderer asset requests", () => {
  it("accepts the pinned, same-origin font and CMap assets", () => {
    expect(
      isFolioAsset(
        new URL("/folio/standard_fonts/LiberationSans-Regular.ttf", origin),
        origin
      )
    ).toBe(true);
    expect(
      isFolioAsset(new URL("/folio/cmaps/UniJIS-UTF16-H.bcmap", origin), origin)
    ).toBe(true);
  });
  it("blocks external URLs, document strings, and disguised asset paths before fetch", () => {
    for (const path of [
      "https://other.test/folio/standard_fonts/LiberationSans-Regular.ttf",
      "/folio/standard_fonts/LiberationSans-Regular.ttf?private-value",
      "/folio/standard_fonts/LiberationSans-Regular.ttf#private-value",
      "/folio/standard_fonts/private-value.pfb",
      "/folio/cmaps/../private-value",
      "/folio/cmaps/..%2Fprivate-value",
    ]) {
      expect(isFolioAsset(new URL(path, origin), origin)).toBe(false);
    }
  });
});
