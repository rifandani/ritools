import type { ThemeConfig } from "@embedpdf/viewer-react";

import type { AppliedColorMode } from "@/features/color-mode/color-mode";

/**
 * The viewer chrome is colored by CSS custom properties, one family per role
 * (`--epdf-accent`, `--epdf-surface`, …). Point each role at the one in
 * `globals.css` instead of a literal color, so the chrome follows the page's
 * color mode and the palette stays in one file.
 *
 * `preference` also picks which of the viewer's two built-in shades it mixes
 * its own tints from. The tokens below win over both.
 */
const viewerTokens = {
  accent: "var(--fg)",
  background: "var(--bg)",
  /* The page ground: the viewer mixes its own tints from it and prints a
   * dialog on it. Toolbars and panels take white stock in the sheet. */
  surface: "var(--bg)",
  "surface-raised": "var(--overlay)",
  text: "var(--fg)",
  "text-muted": "var(--muted-fg)",
  border: "var(--border)",
  hover: "var(--secondary)",
  canvas: "var(--bg)",
  /* Every corner is square (DESIGN.md, Shapes). */
  radius: "0px",
  font: "var(--font-sans)",
} as const;

/**
 * The look `PDFViewer` runs with: same stock, same rules, same color mode as
 * the page around it. The rules a token cannot draw — the red foot, the ink
 * hover bar, the 2px frame — live in `folio-viewer.css`.
 */
export const folioViewerTheme = (mode: AppliedColorMode): ThemeConfig => ({
  preference: mode,
  tokens: viewerTokens,
});
