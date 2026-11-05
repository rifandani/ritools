// Separate entry so retry can use a fresh graph of optional library modules.
import { canUseWASM } from "@pierre/diffs";

import type { Texts } from "./cleave";
import { detectLanguage } from "./cleave.language";

export { DEFAULT_THEMES, preloadHighlighter } from "@pierre/diffs";

export const preferredHighlighter = canUseWASM() ? "highlights" : "shiki-js";

/** Keep the standalone WASM API behind the same capability check as Diffs. */
export const loadLanguageDetector = async () => {
  if (preferredHighlighter === "shiki-js") {
    return detectLanguage;
  }
  const [{ codeToTokens }, { default: theme }] = await Promise.all([
    import("@pierre/highlights"),
    import("@pierre/highlights/themes/pierre-dark"),
  ]);
  return (texts: Texts) =>
    detectLanguage(texts, (text) =>
      codeToTokens(text, { lang: "tsx", theme })
        .tokens.map((line) =>
          line.map((token) => (token.type ? " " : token.content)).join("")
        )
        .join("\n")
    );
};
