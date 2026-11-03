import { expect, it } from "@effect/vitest";
import { Effect } from "effect";

import { prepareRender } from "./quill.render";

it.effect(
  "shares repeated figures and keeps empty figure source available",
  () =>
    Effect.gen(function* () {
      const rendered = yield* prepareRender(
        {
          type: "doc",
          content: [
            { type: "inlineMath" },
            { type: "inlineMath", attrs: { latex: "" } },
            { type: "codeBlock", attrs: { language: "mermaid" } },
            {
              type: "codeBlock",
              attrs: { language: "mermaid" },
              content: [{}],
            },
          ],
        },
        (kind, source) =>
          Effect.succeed({
            kind,
            source,
            png: null,
            url: null,
            width: 0,
            height: 0,
            error: true,
          })
      );
      expect(rendered.figures.size).toBe(2);
      expect(
        [...rendered.figures.values()].map((figure) => figure.source)
      ).toEqual(["", ""]);
    })
);
