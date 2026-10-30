import { describe, expect, it } from "vitest";

import { folioViewerTheme } from "./folio-viewer-theme";

describe("folioViewerTheme", () => {
  it("follows the applied color mode", () => {
    expect(folioViewerTheme("light").preference).toBe("light");
    expect(folioViewerTheme("dark").preference).toBe("dark");
  });

  it("points every viewer role at the design roles, not a copy of them", () => {
    expect(folioViewerTheme("light").tokens).toEqual({
      accent: "var(--fg)",
      background: "var(--bg)",
      surface: "var(--bg)",
      "surface-raised": "var(--overlay)",
      text: "var(--fg)",
      "text-muted": "var(--muted-fg)",
      border: "var(--border)",
      hover: "var(--secondary)",
      canvas: "var(--bg)",
      radius: "0px",
      font: "var(--font-sans)",
    });
  });
});
