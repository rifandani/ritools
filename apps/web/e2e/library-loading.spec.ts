import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });
const hydrated = (page: Page) =>
  page.waitForFunction(() => {
    const input = document.querySelector('input[type="file"]');
    return (
      input &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });
const toast = (page: Page, library: string) =>
  page.locator("[data-sonner-toast]").filter({
    hasText: `${library} library failed to load — check network or ad-blocker`,
  });

test("keeps the PDF input and retries a blocked PDFium WASM load", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const wasm = /\.wasm(?:\?|$)/u;
  await page.route(wasm, (route) => route.abort("blockedbyclient"));
  await page.goto("/folio");
  await hydrated(page);
  await page
    .getByRole("button", { name: "Open a sample", exact: true })
    .click();
  await expect(toast(page, "PDFium")).toBeVisible({ timeout: 25_000 });
  await expect(toast(page, "PDFium")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Reload", exact: true }).first()
  ).toBeVisible();
  await page.unroute(wasm);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator("embedpdf-viewer")).toBeVisible({
    timeout: 25_000,
  });
  await expect(
    page.locator("embedpdf-viewer").locator("img").first()
  ).toBeVisible({ timeout: 25_000 });
});

test("keeps the open table when the grid library cannot load", async ({
  page,
}) => {
  const gridModule =
    /\/(?:assets\/tabular-grid-[^/]+\.js|src\/features\/tabular\/components\/tabular-grid\.tsx)(?:\?|$)/u;
  await page.route(gridModule, (route) => route.abort("blockedbyclient"));
  await page.goto("/tabular");
  await hydrated(page);
  await page
    .getByRole("button", { name: "Open a sample", exact: true })
    .click();
  await expect(toast(page, "React Data Grid")).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("tab", { name: /stock-list\.csv/u })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try again", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reload", exact: true }).first()
  ).toBeVisible();
  await page.unroute(gridModule);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: /stock-list\.csv/u })
  ).toBeVisible();
});

test("loads the CSV parser only for Batch input and writes a ZIP", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/qraft");
  await expect(page.locator('img[alt^="Preview of"]')).toBeVisible();
  const batchTab = page.getByRole("tab", { name: "Batch", exact: true });
  await expect(async () => {
    await batchTab.click();
    await expect(batchTab).toHaveAttribute("aria-selected", "true", {
      timeout: 1000,
    });
  }).toPass({ timeout: 15_000 });
  await expect(
    page.getByRole("textbox", { name: "Payloads, one per line" })
  ).toBeVisible();
  expect(
    requests.filter((url) => /qraft\.batch|papaparse/iu.test(url))
  ).toEqual([]);
  await page
    .getByRole("textbox", { name: "Payloads, one per line" })
    .fill("https://a.test\nhttps://b.test");
  await expect
    .poll(() => requests.some((url) => /qraft\.batch|papaparse/iu.test(url)))
    .toBe(true);
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "ZIP (SVG)", exact: true }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("qraft-codes.zip");
});

test("opens CSV without downloading the workbook library", async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  context.on("request", (request) => requests.push(request.url()));
  await page.goto("/tabular");
  await hydrated(page);
  await page
    .getByRole("button", { name: "Open a sample", exact: true })
    .click();
  await expect(page.getByRole("grid")).toBeVisible();
  expect(requests.filter((url) => /\/xlsx[.-]/iu.test(url))).toEqual([]);
});

test.describe("first install", () => {
  test.use({ serviceWorkers: "allow" });
  test("keeps optional JavaScript and WASM out of the precache", async ({
    page,
  }) => {
    test.skip(
      process.env.PW_PRODUCTION !== "true",
      "Requires a production service worker."
    );
    await page.goto("/");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    const urls = await page.evaluate(async () => {
      const keys = await caches.keys();
      const names = keys.filter((name) => name.includes("precache"));
      const entries = await Promise.all(
        names.map(async (name) => {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          return requests.map((request) => request.url);
        })
      );
      return entries.flat();
    });
    expect(urls.length).toBeGreaterThan(0);
    expect(
      urls.filter((url) => /\.(?:js|mjs|wasm)(?:\?|$)/u.test(url))
    ).toEqual([]);
  });
  test("reloads the first visited page offline with a working app", async ({
    page,
    context,
  }) => {
    test.skip(
      process.env.PW_PRODUCTION !== "true",
      "Requires a production service worker."
    );
    await page.goto("/");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    const used = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((url) => /\/assets\/.*\.js$/u.test(url))
    );
    expect(used.length).toBeGreaterThan(0);
    await expect
      .poll(() =>
        page.evaluate(async (urls) => {
          const cache = await caches.open("web-quill-v1");
          const keys = await cache.keys();
          const saved = new Set(keys.map((request) => request.url));
          return urls.every((url) => saved.has(url));
        }, used)
      )
      .toBe(true);
    await context.setOffline(true);
    await page.reload();
    const toggle = page.getByRole("button", { name: /theme/iu });
    await expect
      .poll(() =>
        toggle.evaluate((node) =>
          Object.getOwnPropertyNames(node).some((key) =>
            key.startsWith("__reactProps$")
          )
        )
      )
      .toBe(true);
    const before = await page.locator("html").getAttribute("class");
    await toggle.click();
    await expect(page.locator("html")).not.toHaveAttribute(
      "class",
      before ?? ""
    );
  });
});
