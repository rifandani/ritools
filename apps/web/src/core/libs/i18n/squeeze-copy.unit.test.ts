/* oxlint-disable anti-slop/no-unknown-parameters, anti-slop/no-runtime-typeof, anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unsafe-dictionary-type -- this test walks the untyped Message Catalog */
import { describe, expect, it } from "vitest";

import { initI18n } from "@/core/libs/i18n/init";
import enUS from "@/core/libs/i18n/locales/en-US";
import idID from "@/core/libs/i18n/locales/id-ID";
import { formatBytes } from "@/features/squeeze/squeeze";

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

  it("claims no cap and no quality it cannot show", () => {
    const catalog = JSON.stringify(enUS) + JSON.stringify(idID);
    expect(catalog).not.toMatch(/unlimited/iu);
    expect(catalog).not.toMatch(/the same quality/iu);
  });

  it("names the services the comparison table sets Squeeze against", () => {
    expect(t("en-us")("squeezeColTinyPng")).toBe("TinyPNG");
    expect(t("en-us")("squeezeColSquoosh")).toBe("Squoosh");
    expect(t("en-us")("squeezeColCompressorIo")).toBe("Compressor.io");
    expect(t("en-us")("squeezeColSqueeze")).toBe("Squeeze");
    expect(t("id-id")("squeezeColSqueeze")).toBe("Squeeze");
  });
});

/**
 * Every plural parameter each Message carries, as `path:param`, plus a marker
 * when the required `other` form is absent. Both Locales must name the same
 * parameters, but only the grammar decides which forms each one holds: `id-id`
 * has no `one` form, and `Intl.PluralRules` selects `other` correctly there.
 */
const pluralsOf = (
  value: unknown,
  path: string,
  into: string[] = []
): readonly string[] => {
  if (Array.isArray(value)) {
    const options = value[1] as
      | {
          readonly plural?: Record<string, Record<string, unknown>>;
        }
      | undefined;
    for (const [param, forms] of Object.entries(options?.plural ?? {})) {
      into.push(`${path}:${param}`);
      if (!("other" in forms)) {
        into.push(`${path}:${param}:missing-other`);
      }
    }
    return into;
  }
  if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      pluralsOf(child, path === "" ? key : `${path}.${key}`, into);
    }
  }
  return into;
};

describe("Squeeze copy, hardening", () => {
  it("names the format that is not cached yet", () => {
    expect(t("en-us")("squeezeProblemCodecOffline", { format: "JPEG" })).toBe(
      "JPEG is not cached yet. Connect once, then it works offline."
    );
    expect(t("id-id")("squeezeProblemCodecOffline", { format: "AVIF" })).toBe(
      "AVIF belum di-cache. Sambungkan sekali, lalu bekerja offline."
    );
  });

  it("prints a byte size in the Locale's decimal separator", () => {
    expect(formatBytes(1_500_000, "en-US")).toBe("1.5 MB");
    expect(formatBytes(1_500_000, "id-ID")).toBe("1,5 MB");
    expect(formatBytes(999, "id-ID")).toBe("999 B");
    expect(formatBytes(1000, "en-US")).toBe("1 KB");
  });

  it("carries the same plural parameters in both Locales", () => {
    expect(pluralsOf(idID, "").toSorted()).toEqual(
      pluralsOf(enUS, "").toSorted()
    );
  });

  it("never says unlimited, in either Locale", () => {
    const catalog = JSON.stringify(enUS) + JSON.stringify(idID);
    expect(catalog).not.toMatch(/unlimited/iu);
    expect(catalog).not.toMatch(/tanpa batas/iu);
  });

  it("carries the new hardening strings in both Locales", () => {
    expect(t("en-us")("squeezeRetry")).toBe("Try again");
    expect(t("en-us")("squeezeZipFailed")).toBe(
      "The ZIP could not be built. Your results are still here."
    );
    expect(t("en-us")("squeezeWatchRevoked")).toBe(
      "Watch folder access stopped. Drop files instead."
    );
    expect(t("en-us")("squeezeBudgetAboveInputs")).toBe(
      "The budget is larger than the total input."
    );
    expect(t("id-id")("squeezeRetry")).toBe("Coba lagi");
  });
});
