import { Effect } from "effect";

import { QuillError } from "./quill";
import type { ExportAssets } from "./quill.export";

const loadFont = (file: string) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(`/quill/fonts/${file}`, {
        cache: "force-cache",
      });
      if (!response.ok) {
        throw new Error("Font unavailable");
      }
      return new Uint8Array(await response.arrayBuffer());
    },
    catch: () => new QuillError({ reason: "offline" }),
  });
export const browserAssets: ExportAssets = {
  font: () => loadFont("Roboto-Regular.ttf"),
  fonts: () =>
    Effect.all(
      {
        normal: loadFont("Roboto-Regular.ttf"),
        bold: loadFont("Roboto-Medium.ttf"),
        italics: loadFont("Roboto-Italic.ttf"),
        bolditalics: loadFont("Roboto-MediumItalic.ttf"),
      },
      { concurrency: "unbounded" }
    ),
  figure: (kind, source, display) =>
    Effect.gen(function* () {
      const renderer = yield* Effect.tryPromise({
        try: () => import("./quill.figures"),
        catch: () => new QuillError({ reason: "offline" }),
      });
      return yield* renderer.renderFigure(kind, source, display);
    }),
};
