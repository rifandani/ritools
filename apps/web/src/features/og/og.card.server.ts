/**
 * The answer to `GET /api/og`.
 *
 * The catalog is the only input, so a card changes when the copy changes, not
 * per request. The tag is a tag over the drawing: a feed that holds the old
 * card gets a `304` until the drawing differs, and a Tool that is added to the
 * catalog gets its card without a build step.
 *
 * The route module imports this file, not the painter, so the glyph atlas and
 * the composer stay out of the browser bundle.
 */

import { cardDrawing } from "./og.drawing";
import { OG_CACHE_CONTROL, ogEtagOf, parseOgRequest } from "./og.params";
import { renderDrawing } from "./og.render.server";

/** Draws the card a request asks for, or says the one it holds is current. */
export const answerCard = async (request: Request): Promise<Response> => {
  const drawing = cardDrawing(parseOgRequest(request.url));
  const etag = ogEtagOf(drawing.svg);
  const common = { "cache-control": OG_CACHE_CONTROL, etag };

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { headers: common, status: 304 });
  }

  const png = await renderDrawing(drawing, request.url);
  return new Response(png, {
    headers: {
      ...common,
      "content-length": String(png.byteLength),
      "content-type": "image/png",
    },
    status: 200,
  });
};
