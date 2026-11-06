import { preloadHighlighter } from "@pierre/diffs";
import { themes } from "@pierre/highlights/themes/loader";
import { describe, expect, it } from "vitest";

import { themesForMode } from "./cleave.themes";

const catalog = [...themesForMode("light"), ...themesForMode("dark")];

describe("Cleave theme catalog", () => {
  it("covers every bundled theme with the correct name and mode", async () => {
    expect(catalog.map(({ id }) => id).toSorted()).toEqual(
      Object.keys(themes).toSorted()
    );
    expect(new Set(catalog.map(({ id }) => id)).size).toBe(catalog.length);
    await Promise.all(
      catalog.map(async ({ id, name, mode }) => {
        const load = themes[id];
        if (!load) {
          throw new Error(`Missing bundled theme: ${id}`);
        }
        const { default: theme } = await load();
        expect({ name, mode }).toEqual({
          name: theme.name,
          mode: theme.appearance,
        });
      })
    );
    for (const mode of ["light", "dark"] as const) {
      expect(themesForMode(mode).length).toBeGreaterThan(0);
      expect(themesForMode(mode).every((theme) => theme.mode === mode)).toBe(
        true
      );
    }
  });

  it("loads the full catalog with the JavaScript fallback", async () => {
    await expect(
      preloadHighlighter({
        themes: catalog.map(({ id }) => id),
        langs: ["text"],
        preferredHighlighter: "shiki-js",
      })
    ).resolves.toBeUndefined();
  }, 15_000);
});
