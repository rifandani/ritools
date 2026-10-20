import type { Page } from "@playwright/test";

import { expect, test } from "./_base";

/**
 * A real PNG from the build: 87 KB of real pixels. Its input format is PNG, so
 * a JPEG or WebP output is a conversion and a Keep output is an ALREADY FITS.
 */
const SAMPLE = "public/screenshot-wide.png";
const SAMPLE_NAME = "screenshot-wide.png";

/** The Target every target-mode case starts from, in KB. */
const SMALLEST = "20";

/**
 * Waits until React has hydrated the page.
 *
 * Anything typed or dispatched before hydration is invisible to the app: the
 * events are recorded by the DOM, and the next render puts the old value back.
 * The signal is React's own listener on the file input.
 */
const ready = (page: Page) =>
  page.waitForFunction(() => {
    const input = document.querySelector("#squeeze-files");
    return (
      input !== null &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });

/**
 * Puts the sample into the Batch through the file picker's input.
 *
 * `setInputFiles` alone is not enough: React reads a file input through a direct
 * `change` listener, and the file injection does not reach it, so the test
 * dispatches the change itself. A drag cannot be driven from a test at all
 * (React ignores dispatched, untrusted drag events), so the drop path is checked
 * by hand.
 */
const pickSample = async (page: Page) => {
  await page.setInputFiles("#squeeze-files", SAMPLE);
  await page.locator("#squeeze-files").dispatchEvent("change");
};

/** The one Batch row for the sample. The page has other lists. */
const batchRow = (page: Page) =>
  page.locator("li").filter({ hasText: SAMPLE_NAME }).first();

/** Types a number into a well. `fill` is ignored here, so a keyboard types it. */
const typeInto = async (page: Page, selector: string, value: string) => {
  const field = page.locator(selector);
  await field.click();
  await field.press("ControlOrMeta+a");
  await field.pressSequentially(value);
  await expect(field).toHaveValue(value);
};

/** Chooses an Output Format or a Size Mode by its printed name. */
const choose = async (page: Page, name: string) => {
  await page.getByText(name, { exact: true }).click();
};

/** Presses the run mark. Nothing starts on a drop or a settings change. */
const compress = async (page: Page) => {
  await page.getByRole("button", { name: /Compress all/u }).click();
};

test.beforeEach(async ({ page }) => {
  await page.goto("/squeeze");
  await ready(page);
});

test("carries the promise and the drop zone in the HTML", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Squeeze"
  );
  await expect(page.getByText("Drop images or folders here.")).toBeVisible();
  await expect(page.getByText("Runs on your device")).toBeVisible();
});

/** How long one image may take to encode, which a large PNG needs. */
const SETTLE = 60_000;

test("compresses an image to the Target it was given", async ({ page }) => {
  test.setTimeout(SETTLE * 3);
  await typeInto(page, "#squeeze-target", SMALLEST);
  await pickSample(page);
  await compress(page);

  const row = batchRow(page);
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(/Done|Miss/u, { timeout: SETTLE });
  await expect(row).toContainText("KB");
});

test("hands the whole Batch over as one ZIP", async ({ page }) => {
  test.setTimeout(SETTLE * 3);
  await typeInto(page, "#squeeze-target", SMALLEST);
  await pickSample(page);
  await compress(page);
  await expect(batchRow(page)).toContainText(/Done|Miss/u, {
    timeout: SETTLE,
  });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download all as ZIP" }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(
    /^squeeze-\d{4}-\d{2}-\d{2}\.zip$/u
  );
});

test("leaves an image alone when the Target already fits it", async ({
  page,
}) => {
  test.setTimeout(SETTLE * 3);
  await choose(page, "Keep");
  await pickSample(page);
  await compress(page);

  await expect(batchRow(page)).toContainText("Already fits", {
    timeout: SETTLE,
  });
});

test("changes the Output Format and names the file for it", async ({
  page,
}) => {
  test.setTimeout(SETTLE * 3);
  await typeInto(page, "#squeeze-target", SMALLEST);
  await pickSample(page);
  await choose(page, "WebP");
  await compress(page);

  const row = batchRow(page);
  await expect(row).toContainText(/Done|Miss/u, { timeout: SETTLE });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    row.getByRole("button", { name: "Download", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("screenshot-wide.webp");
});

test("writes three formats for a Multi row and zips them", async ({ page }) => {
  test.setTimeout(SETTLE * 4);
  await pickSample(page);
  await choose(page, "Multi");
  await compress(page);

  const row = batchRow(page);
  await expect(row).toContainText("3 files", { timeout: SETTLE });
  await expect(row).toContainText("avif");
  await expect(row).toContainText("webp");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    row.getByRole("button", { name: /Download all three as a ZIP/u }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("screenshot-wide.zip");
});

test("splits a Batch budget into a per-image budget", async ({ page }) => {
  test.setTimeout(SETTLE * 3);
  await choose(page, "Batch total");
  await typeInto(page, "#squeeze-batch-budget", "400");
  await pickSample(page);
  await expect(page.getByText("400 KB")).toBeVisible();
  await compress(page);

  await expect(batchRow(page)).toContainText(/Done|Miss/u, {
    timeout: SETTLE,
  });
  await expect(
    page
      .getByRole("region", { name: "Actions" })
      .getByText("1 of 1 under Target")
  ).toBeVisible();
});
