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

/* -------------------------------------------------------------------------- */
/* Hardening: the error states, the limits, and the keyboard                    */
/* -------------------------------------------------------------------------- */

/** Adds in-memory files through the picker's input, as a real pick would. */
const pickFiles = async (
  page: Page,
  files: readonly { name: string; mimeType: string; buffer: Buffer }[]
) => {
  await page.setInputFiles("#squeeze-files", files);
  await page.locator("#squeeze-files").dispatchEvent("change");
};

/** The ledger's rows only: the page has other lists. */
const ledgerRows = (page: Page) => page.locator("ul.px-3 > li");

test("rejects a file type Squeeze cannot read", async ({ page }) => {
  await pickFiles(page, [
    { buffer: Buffer.from("hello"), mimeType: "text/plain", name: "notes.txt" },
  ]);
  await compress(page);

  const row = page.locator("li").filter({ hasText: "notes.txt" }).first();
  await expect(row).toContainText("Rejected", { timeout: 15_000 });
  await expect(row).toContainText("Squeeze does not read this file type.");
});

test("rejects a zero-byte image as unreadable", async ({ page }) => {
  test.setTimeout(SETTLE * 2);
  await pickFiles(page, [
    { buffer: Buffer.alloc(0), mimeType: "image/jpeg", name: "empty.jpg" },
  ]);
  await compress(page);

  const row = page.locator("li").filter({ hasText: "empty.jpg" }).first();
  await expect(row).toContainText("Rejected", { timeout: SETTLE });
  await expect(row).toContainText("Squeeze cannot read this image.");
});

test("rejects an image over the device budget before it decodes", async ({
  page,
}) => {
  // A real PNG signature and IHDR that declares 100000 × 100000 pixels. The
  // file is 24 bytes: only the header guard can refuse it, and it must not try
  // to allocate 40 GB to find out.
  const huge = Buffer.alloc(24);
  huge.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  huge.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  huge.writeUInt32BE(100_000, 16);
  huge.writeUInt32BE(100_000, 20);

  await pickFiles(page, [
    { buffer: huge, mimeType: "image/png", name: "billboard.png" },
  ]);
  await compress(page);

  const row = page.locator("li").filter({ hasText: "billboard.png" }).first();
  await expect(row).toContainText("Rejected", { timeout: SETTLE });
  await expect(row).toContainText("Too large for this device. Try Resize.");
  await expect(row.getByRole("button", { name: "Resize" })).toBeVisible();
});

test("marks a Target under 10 KB invalid and keeps the run disabled", async ({
  page,
}) => {
  await typeInto(page, "#squeeze-target", "1");
  await expect(page.locator("#squeeze-target")).toHaveAttribute(
    "aria-invalid",
    "true"
  );
  await expect(page.locator("#squeeze-target-error")).toContainText(
    "The Target must be between 10 KB and 10 MB."
  );

  await pickSample(page);
  await expect(
    page.getByRole("button", { name: /Compress all/u })
  ).toBeDisabled();

  // The clamp happens on blur, never per keystroke.
  await page.locator("#squeeze-target").blur();
  await expect(page.locator("#squeeze-target")).toHaveValue("10");
  await expect(page.locator("#squeeze-target")).not.toHaveAttribute(
    "aria-invalid",
    "true"
  );
});

test("falls back to the codec the format names when it is offline", async ({
  page,
  context,
}) => {
  test.setTimeout(SETTLE * 4);
  await typeInto(page, "#squeeze-target", SMALLEST);
  await pickSample(page);
  await context.setOffline(true);
  await compress(page);

  const row = batchRow(page);
  await expect(row).toContainText("Rejected", { timeout: SETTLE });
  await expect(row).toContainText(
    "JPEG is not cached yet. Connect once, then it works offline."
  );
  await expect(row.getByRole("button", { name: "Try again" })).toBeDisabled();

  await context.setOffline(false);
  const retry = row.getByRole("button", { name: "Try again" });
  await expect(retry).toBeEnabled();
  await retry.click();
  await expect(row).toContainText(/Done|Miss/u, { timeout: SETTLE });
});

test("says so when the ZIP cannot be built, and keeps the results", async ({
  page,
}) => {
  await choose(page, "Keep");
  await pickSample(page);
  await compress(page);
  await expect(batchRow(page)).toContainText("Already fits", {
    timeout: SETTLE,
  });

  // The results exist, so Download all is enabled; the object URL is what a
  // browser needs to hand the file over.
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error("the browser refused the blob");
    };
  });
  await page.getByRole("button", { name: "Download all as ZIP" }).click();

  await expect(
    page.getByText("The ZIP could not be built. Your results are still here.")
  ).toBeVisible();
  await expect(batchRow(page)).toContainText("Already fits");
});

test("returns focus to the way in after Clear all", async ({ page }) => {
  await pickFiles(page, [
    { buffer: Buffer.from("hello"), mimeType: "text/plain", name: "notes.txt" },
  ]);
  await compress(page);
  await expect(
    page.locator("li").filter({ hasText: "notes.txt" }).first()
  ).toContainText("Rejected", { timeout: 15_000 });

  await page.getByRole("button", { name: "Clear all" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Clear all" })
    .click();

  await expect(page.locator("#squeeze-choose-files")).toBeFocused();
  await expect(ledgerRows(page)).toHaveCount(0);
});

test("a dismissed folder picker is not a refusal", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: () =>
        Promise.reject(
          Object.assign(new Error("dismissed"), { name: "AbortError" })
        ),
    });
  });
  await page.reload();
  await ready(page);

  await page.getByRole("button", { name: "Watch folder" }).click();
  await expect(page.getByText(/permission denied|access stopped/u)).toHaveCount(
    0,
    { timeout: 1500 }
  );
  await expect(
    page.getByRole("button", { name: "Watch folder" })
  ).toBeEnabled();
});

test("names a refused watch folder once", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: () =>
        Promise.reject(
          Object.assign(new Error("denied"), { name: "NotAllowedError" })
        ),
    });
  });
  await page.reload();
  await ready(page);

  await page.getByRole("button", { name: "Watch folder" }).click();
  await expect(
    page.getByText("Watch folder permission denied. Drop files instead.")
  ).toBeVisible();
});

test("runs a Batch of more than a hundred files", async ({ page }) => {
  test.setTimeout(SETTLE * 2);
  const files = Array.from({ length: 120 }, (_, index) => ({
    buffer: Buffer.from("x"),
    mimeType: "text/plain",
    name: `note-${index}.txt`,
  }));
  await pickFiles(page, files);
  await expect(ledgerRows(page)).toHaveCount(120);

  await compress(page);
  await expect(page.getByRole("region", { name: "Actions" })).toContainText(
    "120 over",
    { timeout: 20_000 }
  );
  await expect(ledgerRows(page).first()).toContainText("Rejected");
});
