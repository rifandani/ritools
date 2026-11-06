import { describe, expect, it } from "vitest";

import { readControls, toOptions } from "./cleave.controls";

describe("Cleave controls", () => {
  it("defaults to Stacked on a phone and ignores bad saved values", () => {
    expect(readControls("{}", false)).toEqual({
      layout: "split",
      indicators: "bars",
      highlight: "word-alt",
      backgrounds: true,
      wrapping: false,
      numbers: true,
      lightTheme: "pierre-light",
      darkTheme: "pierre-dark",
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
  it("keeps a theme for each mode and rejects unknown or wrong-mode themes", () => {
    expect(
      readControls(
        JSON.stringify({
          lightTheme: "github-light",
          darkTheme: "dracula-soft",
        }),
        false
      )
    ).toMatchObject({ lightTheme: "github-light", darkTheme: "dracula-soft" });
    for (const values of [
      { lightTheme: "dracula-soft", darkTheme: "github-light" },
      { lightTheme: "__proto__", darkTheme: "constructor" },
      { lightTheme: null, darkTheme: 1 },
    ]) {
      expect(readControls(JSON.stringify(values), false)).toMatchObject({
        lightTheme: "pierre-light",
        darkTheme: "pierre-dark",
      });
    }
  });
});
