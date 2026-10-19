import type { Page } from "@playwright/test";

import { expect, test } from "./_base";

/**
 * A real PNG from the build: 87 KB of real pixels, well over a 20 KB Target, so
 * the Tool has to quantise and search for a rung that fits.
 */
const SAMPLE = "public/screenshot-wide.png";
const SAMPLE_NAME = "screenshot-wide.png";

/** The Target every case starts from, in KB. */
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
    const input = document.querySelector("input[type=file]");
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
  await page.setInputFiles("input[type=file]", SAMPLE);
  await page.locator("input[type=file]").dispatchEvent("change");
};

/** The one Batch row for the sample. The page has other lists. */
const batchRow = (page: Page) =>
  page.locator("li").filter({ hasText: SAMPLE_NAME });

/**
 * Types the Target into the field.
 *
 * `fill` sets the value and dispatches an input event, which React ignores here,
 * so the test types on a real keyboard instead.
 */
const setTarget = async (page: Page, kb: string) => {
  const target = page.getByRole("spinbutton").first();
  await target.click();
  await target.press("ControlOrMeta+a");
  await target.pressSequentially(kb);
  await expect(target).toHaveValue(kb);
};

test.beforeEach(async ({ page }) => {
  await page.goto("/squeeze");
  await ready(page);
});

test("carries the promise and the drop zone in the HTML", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Squeeze");
  await expect(page.getByText("Drop images here")).toBeVisible();
  await expect(page.getByText("Runs on your device")).toBeVisible();
});

/** How long one image may take to encode, which a large PNG needs. */
const SETTLE = 30_000;

test("compresses an image to the Target it was given", async ({ page }) => {
  test.setTimeout(SETTLE * 2);
  await setTarget(page, SMALLEST);
  await pickSample(page);

  const row = batchRow(page);
  await expect(row).toHaveCount(1);
  // Out of the working state, and reporting a size it produced.
  await expect(row).toContainText(/Compressed|Target missed/u, {
    timeout: SETTLE,
  });
  await expect(row).toContainText("KB");
});

test("hands the whole Batch over as one ZIP", async ({ page }) => {
  test.setTimeout(SETTLE * 2);
  await setTarget(page, SMALLEST);
  await pickSample(page);
  await expect(batchRow(page)).toContainText(/Compressed|Target missed/u, {
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

test("leaves an image alone when it already fits", async ({ page }) => {
  await pickSample(page);

  await expect(batchRow(page)).toContainText("Already fits");
});
