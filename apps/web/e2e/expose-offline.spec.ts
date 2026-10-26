import { writeFile } from "node:fs/promises";
import path from "node:path";

import type { Page } from "@playwright/test";

import { expect, test } from "./_base";

const fixture = path.resolve(
  import.meta.dirname,
  "../src/features/expose/fixtures/metadata.jpg"
);
const ready = (page: Page) =>
  page.waitForFunction(() => {
    const input = document.querySelector("#expose-file");
    return (
      input !== null &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });
test.beforeEach(async ({ page }) => {
  test.skip(
    !process.env.CI && process.env.PW_OFFLINE !== "1",
    "Uses the production service worker"
  );
  test.setTimeout(120_000);
  await page.goto("/expose");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await ready(page);
});
test("the first read fills the runtime engine cache; reload, read, and clean work offline", async ({
  page,
  context,
}) => {
  await page.locator("#expose-file").setInputFiles(fixture);
  await expect(
    page.getByRole("heading", { name: "Metadata Report" })
  ).toBeVisible({ timeout: 60_000 });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cache = await caches.open("web-codecs-v1");
        const keys = await cache.keys();
        return keys.some(
          (request) =>
            request.url.includes("zeroperl") && request.url.endsWith(".wasm")
        );
      })
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await ready(page);
  await page.locator("#expose-file").setInputFiles(fixture);
  await expect(
    page.getByRole("heading", { name: "Metadata Report" })
  ).toBeVisible({ timeout: 60_000 });
  await page.getByText("Everything", { exact: true }).click();
  await page
    .getByRole("button", { name: /^Clean$/u })
    .first()
    .click();
  await expect(
    page.getByRole("link", { name: "Download the Cleaned File", exact: true })
  ).toBeEnabled({ timeout: 60_000 });
});
test("offline before the engine is cached shows the named error", async ({
  page,
  context,
}) => {
  await page.evaluate(async () => {
    await caches.delete("web-codecs-v1");
  });
  await context.setOffline(true);
  await page.locator("#expose-file").setInputFiles(fixture);
  await expect(
    page.getByRole("heading", { name: "The metadata engine is not cached." })
  ).toBeVisible({ timeout: 60_000 });
});

test("records a throttled first engine read", async ({ page }, testInfo) => {
  test.skip(
    process.env.PW_THROTTLE_BYTES === undefined,
    "Run through the fixture throttle proxy"
  );
  const response = page.waitForResponse(
    (value) => value.url().includes("zeroperl") && value.url().endsWith(".wasm")
  );
  const start = Date.now();
  await page.locator("#expose-file").setInputFiles(fixture);
  await expect(
    page.getByRole("heading", { name: "Metadata Report" })
  ).toBeVisible({ timeout: 90_000 });
  const engine = await response;
  const evidence = {
    elapsedMs: Date.now() - start,
    latencyMs: 0,
    downloadBytesPerSecond: 2_000_000,
    contentLength: await engine.headerValue("content-length"),
    contentEncoding: await engine.headerValue("content-encoding"),
  };
  const body = JSON.stringify(evidence, null, 2);
  const evidenceFile = testInfo.outputPath("engine-first-read.json");
  await writeFile(evidenceFile, body);
  await testInfo.attach("engine-first-read.json", {
    body,
    contentType: "application/json",
  });
});
