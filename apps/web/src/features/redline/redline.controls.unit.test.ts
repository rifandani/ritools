import { describe, expect, it } from "vitest";

import { readControls, toOptions } from "./redline.controls";

describe("Redline controls", () => {
  it("defaults to Stacked on a phone and ignores bad saved values", () => {
    expect(readControls("{}", false)).toEqual({
      layout: "split",
      indicators: "bars",
      highlight: "word-alt",
      backgrounds: true,
      wrapping: false,
      numbers: true,
    });
    expect(readControls(null, true)).toMatchObject({
      layout: "stacked",
      indicators: "bars",
      highlight: "word-alt",
      backgrounds: true,
      wrapping: false,
      numbers: true,
    });
    expect(readControls("{broken", false).layout).toBe("split");
    expect(
      readControls(
        JSON.stringify({
          layout: "unknown",
          indicators: "classic",
          numbers: false,
          wrapping: 1,
        }),
        false
      )
    ).toMatchObject({
      layout: "split",
      indicators: "classic",
      numbers: false,
      wrapping: false,
    });
    expect(readControls("null", false).layout).toBe("split");
  });
  it("maps all choices to rendered options", () => {
    expect(toOptions(readControls(null, false))).toMatchObject({
      diffStyle: "split",
      diffIndicators: "bars",
      lineDiffType: "word-alt",
      disableBackground: false,
      overflow: "scroll",
      disableLineNumbers: false,
    });
    expect(
      toOptions(
        readControls(
          JSON.stringify({
            layout: "stacked",
            indicators: "none",
            highlight: "char",
            backgrounds: false,
            wrapping: true,
            numbers: false,
          }),
          false
        )
      )
    ).toMatchObject({
      diffStyle: "unified",
      diffIndicators: "none",
      lineDiffType: "char",
      disableBackground: true,
      overflow: "wrap",
      disableLineNumbers: true,
    });
  });
});
