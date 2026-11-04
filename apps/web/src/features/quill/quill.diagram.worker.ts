import { Schema } from "effect";
import { render } from "pele";

/* oxlint-disable unicorn/require-post-message-target-origin -- Dedicated Worker messages have no targetOrigin argument. */
/// <reference lib="webworker" />
import { libraryWorkerReady } from "@/core/libs/library-load";

libraryWorkerReady();

const Request = Schema.Struct({
  version: Schema.Literal(1),
  operation: Schema.Literal("render"),
  id: Schema.String,
  source: Schema.String,
});
self.addEventListener("message", (event: MessageEvent<unknown>) => {
  const decoded = Schema.decodeUnknownExit(Request)(event.data);
  if (decoded._tag === "Failure") {
    return;
  }
  const { id, source } = decoded.value;
  try {
    // Pele escapes labels and filters links, images, and styles. Document
    // configuration stays refused so that all figures keep one theme.
    if (source.split("\n").length > 200 || /%%\{|^---/mu.test(source)) {
      throw new Error("Diagram refused");
    }
    const { svg } = render(source, {
      links: false,
      images: false,
      limit: 30_000,
      maxEdges: 200,
    });
    if (
      /<(?:script|foreignObject|image|a)\b|(?:href|xlink:href)\s*=\s*["'](?!#)|url\(\s*["']?(?!#)/iu.test(
        svg
      )
    ) {
      throw new Error("Active SVG refused");
    }
    self.postMessage({ id, svg });
  } catch {
    self.postMessage({ id, error: true });
  }
});

self.postMessage({ ready: true });
