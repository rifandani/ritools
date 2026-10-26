/* oxlint-disable eslint/no-await-in-loop -- the viewport matrix uses one page, so each interaction must finish before the next state */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import type { Page } from "@playwright/test";

import { expect, test } from "./_base";

const fixture = (name: string) =>
  path.resolve("src/features/expose/fixtures", name);
const jxlWithC2pa = (): Promise<Buffer> => readFile(fixture("metadata.jxl"));

const ready = async (page: Page) => {
  await page.goto("/expose");
  await page.waitForFunction(() => {
    const input = document.querySelector("#expose-file");
    return (
      input !== null &&
      document
        .querySelector("#expose-folder")
        ?.hasAttribute("webkitdirectory") === true &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });
};
const readsFinished = (page: Page) =>
  expect(page.getByText("Reading the metadata…", { exact: true })).toHaveCount(
    0,
    { timeout: 60_000 }
  );
const listOf = (page: Page) =>
  page.getByRole("list", { name: "Files in the Batch" });
const addBatch = async (page: Page) => {
  await page
    .locator("#expose-file")
    .setInputFiles([fixture("metadata.jpg"), fixture("metadata.png")]);
  await expect(listOf(page)).toBeVisible();
  await readsFinished(page);
};
const cleanBatch = async (page: Page) => {
  await page.getByText("Everything", { exact: true }).click();
  await page.getByRole("button", { name: "Clean all", exact: true }).click();
  await expect(page.locator("#expose-batch-summary")).toHaveText(
    "2 of 2 files Cleaned.",
    { timeout: 90_000 }
  );
};

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  await ready(page);
});

test("cleans two images, opens a receipt, returns focus, and downloads both files", async ({
  page,
}) => {
  const outgoing: string[] = [];
  page.on("request", (request) => {
    // TanStack Devtools relays console messages in a development build.
    if (
      request.method() !== "GET" &&
      !new URL(request.url()).pathname.startsWith("/__tsd/")
    ) {
      outgoing.push(request.url());
    }
  });
  await addBatch(page);
  await cleanBatch(page);
  await expect(page.locator("#expose-batch-summary")).toBeFocused();
  const list = listOf(page);
  await expect(list.getByText(/fields remain/u)).toHaveCount(2);
  await list.getByRole("button", { name: "metadata.jpg", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Verification", exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to the batch", exact: true })
    .click();
  await expect(
    list.getByRole("button", { name: "metadata.jpg", exact: true })
  ).toBeFocused();
  const one = page.waitForEvent("download");
  await list
    .getByRole("button", { name: "Download metadata.jpg", exact: true })
    .click();
  const singleDownload = await one;
  expect(singleDownload.suggestedFilename()).toBe("metadata-clean.jpg");
  const zip = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download all as ZIP", exact: true })
    .click();
  const downloaded = await zip;
  const content = await readFile((await downloaded.path()) ?? "");
  expect(content.includes(Buffer.from("metadata-clean.jpg"))).toBe(true);
  expect(content.includes(Buffer.from("metadata-clean.png"))).toBe(true);
  expect(outgoing).toEqual([]);
  await page.getByText("Personal", { exact: true }).click();
  await expect(list.getByText("Stale", { exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Clean all", exact: true }).click();
  await expect(page.locator("#expose-batch-summary")).toHaveText(
    "2 of 2 files Cleaned.",
    { timeout: 90_000 }
  );
});

test("reads a chosen folder, ignores non-images and duplicates, and keeps paths in its ZIP", async ({
  page,
}, testInfo) => {
  const folder = testInfo.outputPath("photos");
  await mkdir(path.join(folder, "trip"), { recursive: true });
  await writeFile(
    path.join(folder, "first.jpg"),
    await readFile(fixture("metadata.jpg"))
  );
  await writeFile(
    path.join(folder, "trip", "second.png"),
    await readFile(fixture("metadata.png"))
  );
  await writeFile(path.join(folder, "notes.txt"), "not an image");
  await page.locator("#expose-folder").setInputFiles(folder);
  await expect(listOf(page).getByRole("listitem")).toHaveCount(2);
  await readsFinished(page);
  await page.locator("#expose-folder").setInputFiles(folder);
  await expect(listOf(page).getByRole("listitem")).toHaveCount(2);
  await readsFinished(page);
  await cleanBatch(page);
  const zip = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download all as ZIP", exact: true })
    .click();
  const downloaded = await zip;
  const downloadedPath = await downloaded.path();
  const content = await readFile(downloadedPath ?? "");
  expect(content.includes(Buffer.from("photos/first-clean.jpg"))).toBe(true);
  expect(content.includes(Buffer.from("photos/trip/second-clean.png"))).toBe(
    true
  );
});

test("keeps the other images when one input is rejected or its preset is unsupported", async ({
  page,
}) => {
  await page.locator("#expose-file").setInputFiles([
    {
      name: "metadata.jpg",
      mimeType: "image/jpeg",
      buffer: await readFile(fixture("metadata.jpg")),
    },
    {
      name: "metadata.jxl",
      mimeType: "image/jxl",
      buffer: await jxlWithC2pa(),
    },
    {
      name: "broken.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    },
  ]);
  await readsFinished(page);
  await page.getByText("Everything", { exact: true }).click();
  await page.getByRole("button", { name: "Clean all", exact: true }).click();
  await expect(page.locator("#expose-batch-summary")).toHaveText(
    "1 of 3 files Cleaned.",
    { timeout: 90_000 }
  );
  await expect(
    listOf(page).getByText("Rejected", { exact: true })
  ).toBeVisible();
  await expect(
    listOf(page).getByText("Not supported", { exact: true })
  ).toBeVisible();
  const zip = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download all as ZIP", exact: true })
    .click();
  await zip;
  await expect(page.getByText(/2 files left out/u)).toBeVisible();
});

test("remove follows the next row, one remaining image uses the desk, and Clear needs a confirm", async ({
  page,
}) => {
  await page
    .locator("#expose-file")
    .setInputFiles([
      fixture("metadata.jpg"),
      fixture("metadata.png"),
      fixture("metadata.webp"),
    ]);
  await readsFinished(page);
  await listOf(page)
    .getByRole("button", { name: "Remove metadata.jpg", exact: true })
    .click();
  await expect(
    listOf(page).getByRole("button", { name: "metadata.png", exact: true })
  ).toBeFocused();
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(
    listOf(page).getByRole("button", { name: "metadata.png", exact: true })
  ).toBeVisible();
  await listOf(page)
    .getByRole("button", { name: "Remove metadata.png", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Metadata Report", exact: true })
  ).toBeVisible();
  await page.locator("#expose-file").setInputFiles(fixture("metadata.jpg"));
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Clear all", exact: true })
    .click();
  await expect(listOf(page)).toHaveCount(0);
  await expect(page.locator("#expose-choose-files")).toBeFocused();
});

test("warns before large inputs and warns only once above 1 GB", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const size = Object.getOwnPropertyDescriptor(Blob.prototype, "size")?.get;
    Object.defineProperty(File.prototype, "size", {
      get() {
        return this.name.startsWith("large-")
          ? 600 * 1024 * 1024
          : size?.call(this);
      },
    });
  });
  await ready(page);
  await page.locator("#expose-file").setInputFiles([
    {
      name: "large-first.jpg",
      mimeType: "image/jpeg",
      buffer: await readFile(fixture("metadata.jpg")),
    },
    {
      name: "large-second.png",
      mimeType: "image/png",
      buffer: await readFile(fixture("metadata.png")),
    },
  ]);
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("This Batch is above 1 GB");
  await expect(dialog).toContainText("large-first.jpg");
  await expect(listOf(page)).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Read it anyway", exact: true })
    .click();
  await expect(listOf(page)).toBeVisible();
  await readsFinished(page);
  await page.locator("#expose-file").setInputFiles(fixture("metadata.webp"));
  await expect(
    listOf(page).getByRole("button", { name: "metadata.webp", exact: true })
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
});

test("runs offline after the engine has loaded once", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.PW_PRODUCTION,
    "Offline caching requires the production service worker."
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await addBatch(page);
  await cleanBatch(page);
  await context.setOffline(true);
  await page.getByText("Personal", { exact: true }).click();
  await page.getByRole("button", { name: "Clean all", exact: true }).click();
  await expect(page.locator("#expose-batch-summary")).toHaveText(
    "2 of 2 files Cleaned.",
    { timeout: 90_000 }
  );
  await context.setOffline(false);
});

test("supports keyboard use, both Locales and themes, from cards to the desktop list", async ({
  page,
  context,
}, testInfo) => {
  const review =
    process.env.IMPECCABLE_CAPTURE === "true"
      ? path.resolve("../../.impeccable/review")
      : testInfo.outputPath("visual-review");
  await mkdir(review, { recursive: true });
  for (const locale of ["en-us", "id-id"]) {
    await context.addCookies([
      { name: "app-locale", value: locale, url: new URL(page.url()).origin },
    ]);
    // The cookie name comes from the app; reload renders the selected Locale.
    await ready(page);
    await page
      .locator("#expose-file")
      .setInputFiles([fixture("metadata.jpg"), fixture("metadata.png")]);
    await expect(listOf(page)).toBeVisible();
    await expect(listOf(page).getByRole("listitem").nth(1)).toContainText(
      "PNG"
    );
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        const firstRadio = page.getByRole("radio").first();
        await firstRadio.focus();
        await firstRadio.press("ArrowRight");
        await expect(page.getByRole("radio").nth(1)).toBeChecked();
        await page.getByRole("radio").nth(1).press("ArrowLeft");
        const rowButton = page.getByRole("button", {
          name: "metadata.jpg",
          exact: true,
        });
        await rowButton.focus();
        await rowButton.press("Enter");
        await expect(page.locator("#expose-report-title")).toBeFocused();
        const back = page.getByRole("button", {
          name: locale === "en-us" ? "Back to the batch" : "Kembali ke Batch",
          exact: true,
        });
        await back.focus();
        await back.press("Enter");
        await expect(rowButton).toBeFocused();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
          )
        ).toBe(true);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: path.join(
            review,
            `${width === 1440 ? "desktop" : "mobile"}-${locale}-${theme}.png`
          ),
          fullPage: true,
        });
      }
    }
  }
});

test("recovery from a rejected row keeps the other files and finished results", async ({
  page,
}) => {
  await addBatch(page);
  await page.locator("#expose-file").setInputFiles({
    name: "broken.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await readsFinished(page);
  await page.getByText("Everything", { exact: true }).click();
  await page.getByRole("button", { name: "Clean all", exact: true }).click();
  await expect(page.locator("#expose-batch-summary")).toHaveText(
    "2 of 3 files Cleaned."
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole("button", { name: "broken.txt", exact: true }).click();
    await expect(page.locator("#expose-read-error")).toBeVisible();
    await page
      .getByRole("button", { name: "Back to the batch", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "broken.txt", exact: true })
    ).toBeFocused();
    await expect(page.locator("#expose-batch-summary")).toHaveText(
      "2 of 3 files Cleaned."
    );
    await expect(
      page.getByRole("button", { name: "Download metadata.jpg", exact: true })
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Download all as ZIP", exact: true })
    ).toBeEnabled();
  }
});
