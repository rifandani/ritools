import { expect, test } from "./_base";

test.beforeEach(async ({ page }) => {
  await page.goto("/unmask");
});

test("shows the explainer title and the local-only note", async ({ page }) => {
  await expect(
    page.getByRole("heading", {
      name: "What Unmask is, and why it matters",
    })
  ).toBeVisible();
  await expect(page.getByText(/stay on this device/iu)).toBeVisible();
});

test("opens the sample, writes a Cutout, and downloads it", async ({
  page,
}) => {
  test.setTimeout(45_000);
  await page.waitForLoadState("networkidle");
  const sample = page.waitForResponse("**/unmask/sample.png");
  await page.getByRole("button", { name: "Open a sample" }).click();
  await sample;

  const download = page.getByRole("button", {
    name: "Download the Cutout",
  });
  await expect(download).toBeEnabled({ timeout: 30_000 });

  // The open row keeps its source pixels, so the preview stays on the canvas.
  await expect(
    page.locator("canvas[aria-describedby='unmask-canvas-hint']")
  ).toBeVisible();
  await expect(page.getByText("Reading the image…")).toHaveCount(0);

  const file = page.waitForEvent("download");
  await download.click();
  const downloadEvent = await file;
  expect(downloadEvent.suggestedFilename()).toBe("unmask-sample-cutout.webp");
});

test("runs the real model on a JPEG and enables the Cutout", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.waitForLoadState("networkidle");
  await page.setInputFiles(
    "#unmask-files",
    "../../artifacts/unmask/fixtures/product-plain.jpg"
  );
  await page.locator("#unmask-cut-out").click();
  await expect(
    page.getByRole("button", { name: "Download the Cutout" })
  ).toBeEnabled({ timeout: 90_000 });
});

test("has no horizontal overflow at 390 px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
