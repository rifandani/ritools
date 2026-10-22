import { describe, expect, it } from "vitest";

import enUS from "@/core/libs/i18n/locales/en-US";
import idID from "@/core/libs/i18n/locales/id-ID";

/**
 * Both Locales are typed against the loose `LanguageMessages` shape, so a
 * missing Indonesian key falls back to English at runtime and the build still
 * passes. This test is what turns that silent fallback into a failure.
 */
describe("Message Catalog parity", () => {
  it("gives both Locales the same Translation Keys", () => {
    expect(Object.keys(idID).toSorted()).toEqual(Object.keys(enUS).toSorted());
  });
});
