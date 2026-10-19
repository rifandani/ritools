import { describe, expect, it } from "vitest";

import { initI18n } from "@/core/libs/i18n/init";
import enUS from "@/core/libs/i18n/locales/en-US";
import idID from "@/core/libs/i18n/locales/id-ID";

const translations = { "en-us": enUS, "id-id": idID };

const t = (locale: string) =>
  initI18n({ fallbackLocale: ["en-us"], locale, translations }).t;

/**
 * The Squeeze copy that carries a value, rendered.
 *
 * A plural key holds its whole sentence in the plural forms, so a phrase written
 * twice — once in the key and once in a form — reads as "3 images in the Batch
 * in the Batch". Nothing else would notice, so this does.
 */
describe("Squeeze copy", () => {
  it("reads as a sentence, in both Locales", () => {
    expect(t("en-us")("squeezeImageCount", { count: 1 })).toBe(
      "1 image in the Batch"
    );
    expect(t("en-us")("squeezeImageCount", { count: 3 })).toBe(
      "3 images in the Batch"
    );
    expect(t("en-us")("squeezeDoneCount", { count: 3 })).toBe("3 done");
    expect(t("en-us")("squeezeMissCount", { count: 2 })).toBe(
      "2 missed the target"
    );
    expect(t("en-us")("squeezeRejectedCount", { count: 1 })).toBe(
      "1 could not be read"
    );
    expect(t("en-us")("squeezeSaved", { percent: 75 })).toBe("Saved 75%");
    expect(t("en-us")("squeezeProgress", { done: 2, total: 5 })).toBe(
      "2 of 5 images done"
    );

    expect(t("id-id")("squeezeImageCount", { count: 3 })).toBe(
      "3 gambar di Batch"
    );
    expect(t("id-id")("squeezeMissCount", { count: 2 })).toBe(
      "2 tidak mencapai target"
    );
    expect(t("id-id")("squeezeSaved", { percent: 75 })).toBe("Hemat 75%");
  });
});
