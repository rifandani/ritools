import { readFileSync } from "node:fs";

import { codeToTokens, isSupportedLanguage } from "@pierre/highlights";
import pierreDark from "@pierre/highlights/themes/pierre-dark";
import { describe, expect, it } from "vitest";

import { languageFromName } from "./cleave";
import {
  canonicalLanguage,
  LANGUAGE_CATALOG,
  languageLabel,
} from "./cleave.languages";

describe("Cleave language catalog", () => {
  it("covers every alias in the installed Highlights package once", () => {
    // The package has no public catalog export. Read its published metadata only
    // in this upgrade check; application code uses the checked catalog.
    const source = readFileSync(
      new URL(
        "dist/languages.js",
        import.meta.resolve("@pierre/highlights/package.json")
      ),
      "utf-8"
    );
    const upstream = [
      ...source.matchAll(
        /^\s*(?:"(?<quoted>[^"]+)"|(?<bare>[\w-]+)):\s*\d+,?$/gmu
      ),
    ].map((match) => match.groups?.quoted ?? match.groups?.bare);
    const aliases = LANGUAGE_CATALOG.flatMap((item) =>
      item.id === "ansi" ? [] : [item.id, ...item.aliases]
    );
    expect(aliases.toSorted()).toEqual(upstream.toSorted());
    expect(new Set(aliases).size).toBe(aliases.length);
    expect(new Set(LANGUAGE_CATALOG.map((item) => item.id)).size).toBe(
      LANGUAGE_CATALOG.length
    );
  });

  it.each(LANGUAGE_CATALOG)(
    "tokenizes $name with the bundled lexer",
    ({ id, aliases }) => {
      const source = "const value = 42;\n";
      expect(isSupportedLanguage(id)).toBe(true);
      for (const alias of aliases) {
        expect(canonicalLanguage(alias.toUpperCase())).toBe(id);
      }
      const { tokens } = codeToTokens(source, { lang: id, theme: pierreDark });
      expect(
        tokens
          .map((line) => line.map((token) => token.content).join(""))
          .join("\n")
      ).toBe(source);
      expect(languageLabel(id)).not.toBe("");
    }
  );

  it.each([
    ["src/Main.KT", "kotlin"],
    ["src/index.php", "php"],
    ["src/main.swift", "swift"],
    ["src/lib.zig", "zig"],
    ["schema.proto", "proto"],
    ["styles.scss", "scss"],
    ["types.mts", "typescript"],
    ["component.vue", "vue"],
    ["view.blade.php", "blade"],
    ["view.component.html", "angular-html"],
    ["Dockerfile", "dockerfile"],
    ["build/CMakeLists.txt", "cmake"],
    ["Makefile", "makefile"],
    ["Justfile", "just"],
    [".env", "dotenv"],
    ["notes.txt", "text"],
    ["unknown.__proto__", "text"],
  ])("recognizes %s as %s", (filename, language) => {
    expect(languageFromName(filename)).toBe(language);
  });

  it("keeps unknown values outside the catalog", () => {
    expect(canonicalLanguage("__proto__")).toBeUndefined();
    expect(canonicalLanguage("constructor")).toBeUndefined();
    expect(languageLabel("unknown")).toBe("unknown");
  });
});
