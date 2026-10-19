import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, resolveLocale } from "./locale";

describe("resolveLocale", () => {
  it("uses the persisted cookie over Accept-Language", () => {
    expect(
      resolveLocale({ acceptLanguage: "en-US,en;q=0.9", cookie: "id-id" })
    ).toBe("id-id");
  });

  it("ignores a cookie that names no Message Catalog", () => {
    expect(resolveLocale({ acceptLanguage: "id-ID", cookie: "fr-fr" })).toBe(
      "id-id"
    );
  });

  it("matches Accept-Language tags case-insensitively", () => {
    expect(resolveLocale({ acceptLanguage: "ID-id" })).toBe("id-id");
  });

  it("honors q-values over header order", () => {
    expect(
      resolveLocale({ acceptLanguage: "en-US;q=0.5, id-ID;q=0.8, fr" })
    ).toBe("id-id");
  });

  it("falls back to a Locale with the same language", () => {
    expect(resolveLocale({ acceptLanguage: "en-GB" })).toBe("en-us");
    expect(resolveLocale({ acceptLanguage: "id" })).toBe("id-id");
  });

  it("skips tags with no Message Catalog, wildcards, and q=0", () => {
    expect(resolveLocale({ acceptLanguage: "fr-FR, *, id;q=0, en" })).toBe(
      "en-us"
    );
  });

  it("uses the default when nothing matches", () => {
    expect(resolveLocale({ acceptLanguage: "fr-FR,de" })).toBe(DEFAULT_LOCALE);
    expect(resolveLocale({})).toBe(DEFAULT_LOCALE);
  });
});
