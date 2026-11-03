/* oxlint-disable unicorn/require-post-message-target-origin -- Dedicated Worker messages have no targetOrigin argument. */
/// <reference lib="webworker" />
import { renderMermaidSVG } from "beautiful-mermaid";
import { Schema } from "effect";

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
    if (
      source.length > 30_000 ||
      source.split("\n").length > 200 ||
      (source.match(/--!?>|---|==>|-\.->/gu) ?? []).length > 200 ||
      /%%\{|^---|\b(?:click|href|image|icon|style|classDef|linkStyle)\b|<|url\(|(?:https?:|data:|javascript:)/imu.test(
        source
      )
    ) {
      throw new Error("Diagram refused");
    }
    const svg = renderMermaidSVG(source, {
      bg: "#ffffff",
      fg: "#171717",
      font: "sans-serif",
    }).replaceAll(/@import\s+url\([^)]*\);?/gu, "");
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
