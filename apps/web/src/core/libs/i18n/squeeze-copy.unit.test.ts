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
    expect(t("en-us")("squeezeBatchCount", { count: 1 })).toBe("1 image");
    expect(t("en-us")("squeezeBatchCount", { count: 3 })).toBe("3 images");
    expect(
      t("en-us")("squeezeUnderTargetSummary", { total: 12, under: 9 })
    ).toBe("9 of 12 under Target");
    expect(t("en-us")("squeezeOverCount", { count: 3 })).toBe("3 over");
    expect(t("en-us")("squeezeOverBudget", { amount: "480 KB" })).toBe(
      "Over budget by 480 KB"
    );
    expect(t("en-us")("squeezeCompressAllStale", { count: 1 })).toBe(
      "Compress all · 1 row out of date"
    );
    expect(t("en-us")("squeezeCompressAllStale", { count: 3 })).toBe(
      "Compress all · 3 rows out of date"
    );
    expect(t("en-us")("squeezeCodecOfflineAll", { format: "AVIF" })).toBe(
      "Connect once to load AVIF."
    );
    expect(t("en-us")("squeezeDuplicateCount", { count: 1 })).toBe(
      "1 was already in the Batch"
    );
    expect(t("en-us")("squeezeDuplicateCount", { count: 2 })).toBe(
      "2 were already in the Batch"
    );
    expect(t("en-us")("squeezeFileCount", { count: 3 })).toBe("3 files");
    expect(t("en-us")("squeezeUnderTargetCount", { count: 2 })).toBe(
      "2 of 3 under target"
    );
    expect(t("en-us")("squeezeWrittenCount", { count: 2 })).toBe(
      "2 of 3 written"
    );
    expect(t("en-us")("squeezeAnnounceProgress", { percent: 75 })).toBe(
      "Progress 75%"
    );

    expect(t("id-id")("squeezeBatchCount", { count: 3 })).toBe("3 gambar");
    expect(t("id-id")("squeezeOverCount", { count: 2 })).toBe("2 lewat");
    expect(t("id-id")("squeezeCompressAllStale", { count: 2 })).toBe(
      "Kompres semua · 2 baris usang"
    );
    expect(
      t("id-id")("squeezeUnderTargetSummary", { total: 4, under: 3 })
    ).toBe("3 dari 4 di bawah Target");
  });

  it("names no competitor and claims no cap", () => {
    const catalog = JSON.stringify(enUS) + JSON.stringify(idID);
    expect(catalog).not.toMatch(/TinyPNG|Squoosh|iLoveIMG/iu);
    expect(catalog).not.toMatch(/unlimited/iu);
    expect(catalog).not.toMatch(/the same quality/iu);
  });
});
