import type { Page } from "@playwright/test";

import { expect, test } from "./_base";

const SAMPLE = "public/unmask/sample.png";
const WIDE = "public/screenshot-wide.png";
const PACKAGE = "package.json";

/** React has hydrated once its listener sits on the file input. */
const ready = (page: Page) =>
  page.waitForFunction(() => {
    const input = document.querySelector("#unmask-files");
    return (
      input !== null &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });

/** Puts one or more files into Unmask through the picker's input. */
const pick = async (page: Page, files: string | readonly string[]) => {
  await page.setInputFiles("#unmask-files", files);
};

const brushTray = (page: Page) =>
  page.locator('section[aria-labelledby="unmask-magic-brush-heading"]');

const cutOut = async (page: Page) => {
  await page.locator("#unmask-cut-out").click();
};

const download = async (page: Page, name: RegExp) => {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name }).first().click();
  return event;
};

test.beforeEach(async ({ page }) => {
  await page.goto("/unmask");
  await ready(page);
});

test("opens the sample and downloads a Transparent Cutout", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.getByRole("button", { name: "Try a sample" }).click();
  await expect(page.getByRole("heading", { name: "Cutout ready" })).toBeVisible(
    { timeout: 30_000 }
  );
  await expect(page.locator("canvas")).toBeVisible();
  await expect(
    page.getByText("A checkerboard in the preview. Alpha in the file.")
  ).toBeVisible();

  const file = await download(page, /Download the Cutout/u);
  expect(file.suggestedFilename()).toBe("unmask-sample-cutout.webp");
});

test("opens one image, runs, paints with both tools, undoes, and downloads", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await pick(page, WIDE);
  await expect(page.locator("#unmask-cut-out")).toBeVisible();
  await cutOut(page);
  await expect(page.getByRole("heading", { name: "Cutout ready" })).toBeVisible(
    { timeout: 30_000 }
  );

  const canvas = page.locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("The Cutout canvas has no box");
  }
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.click(center.x, center.y);
  await expect(brushTray(page).getByText("1 edit")).toBeVisible();

  await brushTray(page)
    .getByRole("button", { name: "Brush", exact: true })
    .click();
  await page.mouse.move(center.x - 20, center.y - 20);
  await page.mouse.down();
  await page.mouse.move(center.x + 20, center.y + 20, { steps: 6 });
  await page.mouse.up();
  await expect(brushTray(page).getByText("2 edits")).toBeVisible();

  await brushTray(page)
    .getByRole("button", { name: "Erase", exact: true })
    .click();
  await page.mouse.click(center.x, center.y);
  await expect(brushTray(page).getByText("3 edits")).toBeVisible();

  await brushTray(page).getByRole("button", { name: "Undo" }).click();
  await expect(brushTray(page).getByText("2 edits")).toBeVisible();

  const file = await download(page, /Download the Cutout/u);
  expect(file.suggestedFilename()).toBe("screenshot-wide-cutout.webp");
});

test("compares, and disables painting while the comparison is active", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await pick(page, WIDE);
  await cutOut(page);
  await expect(page.getByRole("heading", { name: "Cutout ready" })).toBeVisible(
    { timeout: 30_000 }
  );

  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(
    page.getByText("The comparison is active. Close it to paint.")
  ).toBeVisible();
  const slider = page.getByRole("slider", { name: "Compare" });
  await expect(slider).toHaveAttribute("aria-valuetext", "50% Cutout");
  await slider.press("ArrowLeft");
  await expect(slider).toHaveAttribute("aria-valuetext", "49% Cutout");

  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(
    page.getByText("The comparison is active. Close it to paint.")
  ).toHaveCount(0);
});

test("runs a Batch, marks Stale, and downloads one ZIP", async ({ page }) => {
  test.setTimeout(90_000);
  await pick(page, [WIDE, SAMPLE]);
  await expect(page.getByRole("heading", { name: "Batch" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "File" })).toBeVisible();
  await page.getByRole("button", { name: /^Cut out 2$/u }).click();
  await expect(page.getByText("Ready").first()).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.locator("tbody").getByText("Ready", { exact: true })
  ).toHaveCount(2, { timeout: 60_000 });

  const file = await download(page, /^Download all$/u);
  expect(file.suggestedFilename()).toBe("unmask-cutouts.zip");

  const feather = page.getByRole("slider", { name: "Feather" });
  await feather.focus();
  await feather.press("ArrowRight");
  await expect(
    page.locator("tbody").getByText("Stale", { exact: true }).first()
  ).toBeVisible();
  await expect(
    page.getByText("Settings changed. Cut out again to download.").first()
  ).toBeVisible();

  await page.getByRole("button", { name: /^Cut out 2$/u }).click();
  await expect(
    page.locator("tbody").getByText("Ready", { exact: true })
  ).toHaveCount(2, { timeout: 60_000 });
});

test("cancels a slow run and returns the row to Cancelled", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/unmask?slow=1");
  await ready(page);
  await pick(page, [WIDE, SAMPLE]);
  await page.getByRole("button", { name: /^Cut out 2$/u }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("Cancelled").first()).toBeVisible({
    timeout: 10_000,
  });
});

test("shows the unsupported format state and keeps the row", async ({
  page,
}) => {
  await pick(page, PACKAGE);
  await expect(
    page.getByRole("heading", { name: "Unsupported format." })
  ).toBeVisible();
  await expect(
    page.getByText("Unmask reads JPEG, PNG, WebP, AVIF, GIF, and BMP images.")
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choose another file" })
  ).toBeVisible();
});

test("has no horizontal overflow and keeps the Batch as cards at 390", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await pick(page, [WIDE, SAMPLE]);
  await expect(page.getByRole("heading", { name: "Batch" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole("columnheader", { name: "File" })).toBeHidden();
  await expect(page.getByText("screenshot-wide.png").last()).toBeVisible();
});

test("reaches every named state in the states gallery", async ({ page }) => {
  await page.goto("/unmask?states=1");
  await expect(
    page.getByRole("heading", { name: /Unmask states/u })
  ).toBeVisible();
  for (const word of [
    "Reading",
    "Removing",
    "Ready",
    "Edited",
    "Stale",
    "Queued",
    "Cancelled",
    "Unsupported format",
    "Unreadable file",
    "Too large",
    "Model unavailable",
    "Model failed",
    "Encode failed",
    "Downloaded",
  ]) {
    // oxlint-disable-next-line no-await-in-loop -- each state prints in reading order.
    await expect(page.getByText(word).first()).toBeVisible();
  }
});
