import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "./_base";

const fixture = (name: string) =>
  path.resolve(
    import.meta.dirname,
    `../src/features/expose/fixtures/${name}.dng`
  );
const copy = {
  "en-us": {
    report: "Metadata Report",
    preview: "DNG preview",
    readonly: "DNG · Read only",
    warning:
      "An embedded preview can show the original image, even after a clean.",
    unavailable:
      "Preview is not available in this browser. The metadata report is available.",
    none: "No thumbnail.",
    clean: "Clean",
    another: "Choose another file",
  },
  "id-id": {
    report: "Laporan Metadata",
    preview: "Pratinjau DNG",
    readonly: "DNG · Hanya baca",
    warning:
      "Pratinjau yang tertanam bisa menunjukkan gambar asli, bahkan setelah pembersihan.",
    unavailable:
      "Pratinjau tidak tersedia di peramban ini. Laporan metadata tersedia.",
    none: "Tidak ada thumbnail.",
    clean: "Bersihkan",
    another: "Pilih file lain",
  },
} as const;

for (const locale of ["en-us", "id-id"] as const) {
  test(`DNG preview and fallback stay local and read only in ${locale}`, async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(60_000);
    const text = copy[locale];
    await page.setViewportSize({
      width: locale === "en-us" ? 1440 : 390,
      height: 1000,
    });
    await page.goto("/expose");
    await context.addCookies([
      { name: "app-locale", value: locale, url: new URL(page.url()).origin },
    ]);
    await page.reload();
    await page.waitForFunction(() => {
      const input = document.querySelector("#expose-file");
      return (
        input !== null &&
        Object.getOwnPropertyNames(input).some((key) =>
          key.startsWith("__reactEvents$")
        )
      );
    });
    const engineRequests: string[] = [];
    const uploads: string[] = [];
    context.on("request", (request) => {
      // Vite imports a small URL-export module in dev; only the binary fetch loads WASM.
      if (
        /zeroperl.*\.wasm/u.test(request.url()) &&
        !new URL(request.url()).searchParams.has("url")
      ) {
        engineRequests.push(request.url());
      }
      if (
        ["POST", "PUT", "PATCH"].includes(request.method()) &&
        new URL(request.url()).pathname !== "/__tsd/console-pipe"
      ) {
        uploads.push(request.url());
      }
    });
    await page
      .locator("#expose-file")
      .setInputFiles(
        fixture(`linear-raw-preview-${locale === "en-us" ? "le" : "be"}`)
      );
    await expect(
      page.getByRole("heading", { name: text.report, exact: true })
    ).toBeVisible();
    const image = page.getByRole("img", { name: text.preview, exact: true });
    await expect(image).toBeVisible();
    // The stored JPEG is 24 × 16. EXIF orientation 6 makes the browser draw 16 × 24.
    await expect
      .poll(() =>
        image.evaluate((node: HTMLImageElement) => [
          node.naturalWidth,
          node.naturalHeight,
        ])
      )
      .toEqual([16, 24]);
    await expect(
      page.getByText(text.readonly, { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText(text.warning, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: text.clean, exact: true }).first()
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`dng-preview-${locale}.png`),
      fullPage: true,
    });
    const previousUrl = await image.getAttribute("src");
    await page.getByRole("button", { name: text.another, exact: true }).click();
    await page.locator("#expose-file").setInputFiles(fixture("linear-raw-le"));
    await expect(
      page.getByRole("heading", { name: text.report, exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(text.unavailable, { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText(text.none, { exact: true })).toBeVisible();
    await expect(image).toHaveCount(0);
    expect(
      await page.evaluate(async (url) => {
        try {
          await fetch(url ?? "");
          return false;
        } catch {
          return true;
        }
      }, previousUrl)
    ).toBe(true);
    expect(engineRequests).toEqual([]);
    expect(uploads).toEqual([]);
  });
}

for (const damage of ["truncated", "invalid JPEG table"]) {
  test(`${damage} DNG preview keeps the unavailable state and the report`, async ({
    page,
  }) => {
    await page.goto("/expose");
    await page.waitForFunction(() => {
      const input = document.querySelector("#expose-file");
      return (
        input !== null &&
        Object.getOwnPropertyNames(input).some((key) =>
          key.startsWith("__reactEvents$")
        )
      );
    });
    const bytes = readFileSync(fixture("linear-raw-preview-le"));
    // A bad table passes the marker walk but fails the browser decoder.
    if (damage === "invalid JPEG table") {
      const jpegOffset = bytes.indexOf(Buffer.from([0xff, 0xd8]));
      const tableOffset = bytes.indexOf(Buffer.from([0xff, 0xdb]), jpegOffset);
      expect(tableOffset).toBeGreaterThan(jpegOffset);
      bytes[tableOffset + 4] = 255;
    }
    await page.locator("#expose-file").setInputFiles({
      name: "damaged-preview.dng",
      mimeType: "image/dng",
      buffer: damage === "truncated" ? bytes.subarray(0, -2) : bytes,
    });
    await expect(
      page.getByRole("heading", { name: "Metadata Report", exact: true })
    ).toBeVisible();
    await expect(
      page
        .getByText(
          "Preview is not available in this browser. The metadata report is available.",
          { exact: true }
        )
        .first()
    ).toBeVisible();
    await expect(
      page.getByText("No thumbnail.", { exact: true })
    ).toBeVisible();
  });
}

for (const locale of ["en-us", "id-id"] as const) {
  test(`shows the embedded RGB DNG preview in ${locale}`, async ({
    page,
    context,
  }) => {
    await page.goto("/expose");
    await context.addCookies([
      { name: "app-locale", value: locale, url: new URL(page.url()).origin },
    ]);
    await page.reload();
    await page.waitForFunction(() => {
      const input = document.querySelector("#expose-file");
      return (
        input !== null &&
        Object.getOwnPropertyNames(input).some((key) =>
          key.startsWith("__reactEvents$")
        )
      );
    });
    await page
      .locator("#expose-file")
      .setInputFiles(
        fixture(`linear-raw-rgb-${locale === "en-us" ? "le" : "be"}`)
      );
    const image = page.getByRole("img", {
      name: copy[locale].preview,
      exact: true,
    });
    await expect(image).toBeVisible();
    await expect
      .poll(() =>
        image.evaluate((node: HTMLImageElement) => [
          node.naturalWidth,
          node.naturalHeight,
        ])
      )
      .toEqual([3, 2]);
    await expect(
      page.getByText(copy[locale].readonly, { exact: true }).first()
    ).toBeVisible();
    await expect(
      page.getByText(copy[locale].warning, { exact: true })
    ).toBeVisible();
  });
}
