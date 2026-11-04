import type { BaseDiffOptions } from "@pierre/diffs";
import { Schema } from "effect";

export const Controls = Schema.Struct({
  layout: Schema.Literals(["split", "stacked"]),
  indicators: Schema.Literals(["bars", "classic", "none"]),
  highlight: Schema.Literals(["word-alt", "word", "word-line", "char", "none"]),
  backgrounds: Schema.Boolean,
  wrapping: Schema.Boolean,
  numbers: Schema.Boolean,
});
export type Controls = typeof Controls.Type;
export const readControls = (
  stored: string | null,
  narrow: boolean
): Controls => {
  const defaults: Controls = {
    layout: narrow ? "stacked" : "split",
    indicators: "bars",
    highlight: "word-alt",
    backgrounds: true,
    wrapping: false,
    numbers: true,
  };
  try {
    const value = Schema.decodeUnknownSync(
      Schema.Record(Schema.String, Schema.Unknown)
    )(JSON.parse(stored ?? "null"));
    return {
      layout: Schema.is(Controls.fields.layout)(value.layout)
        ? value.layout
        : defaults.layout,
      indicators: Schema.is(Controls.fields.indicators)(value.indicators)
        ? value.indicators
        : defaults.indicators,
      highlight: Schema.is(Controls.fields.highlight)(value.highlight)
        ? value.highlight
        : defaults.highlight,
      backgrounds: Schema.is(Controls.fields.backgrounds)(value.backgrounds)
        ? value.backgrounds
        : defaults.backgrounds,
      wrapping: Schema.is(Controls.fields.wrapping)(value.wrapping)
        ? value.wrapping
        : defaults.wrapping,
      numbers: Schema.is(Controls.fields.numbers)(value.numbers)
        ? value.numbers
        : defaults.numbers,
    };
  } catch {
    return defaults;
  }
};
export const toOptions = (controls: Controls) =>
  ({
    diffStyle: controls.layout === "stacked" ? "unified" : "split",
    diffIndicators: controls.indicators,
    lineDiffType: controls.highlight,
    disableBackground: !controls.backgrounds,
    overflow: controls.wrapping ? "wrap" : "scroll",
    disableLineNumbers: !controls.numbers,
    disableFileHeader: true,
    expandUnchanged: true,
    preferredHighlighter: "shiki-js",
  }) satisfies BaseDiffOptions;
