import type { JSONContent } from "@tiptap/core";
import { Effect } from "effect";

import type { QuillError } from "./quill";
import { renderFigure } from "./quill.figures";
import type { Figure } from "./quill.figures";

export interface RenderedDocument {
  readonly model: JSONContent;
  readonly figures: ReadonlyMap<string, Figure>;
}
export const figureKey = (kind: Figure["kind"], source: string) =>
  `${kind}:${source}`;
export const prepareRender = (model: JSONContent, figure = renderFigure) =>
  Effect.gen(function* () {
    const figures = new Map<string, Figure>();
    const visit = Effect.fn("Quill.renderNode")(function* (
      node: JSONContent
    ): Effect.fn.Return<void, QuillError> {
      const kind =
        node.type === "inlineMath" || node.type === "blockMath"
          ? "math"
          : node.type === "codeBlock" && node.attrs?.language === "mermaid"
            ? "mermaid"
            : null;
      if (kind) {
        const source =
          kind === "math"
            ? String(node.attrs?.latex ?? "")
            : (node.content ?? []).map((child) => child.text ?? "").join("");
        const key = figureKey(kind, source);
        if (!figures.has(key)) {
          figures.set(
            key,
            yield* figure(kind, source, node.type !== "inlineMath")
          );
        }
      }
      for (const child of node.content ?? []) {
        yield* visit(child);
      }
    });
    yield* visit(model);
    return { model, figures };
  });
