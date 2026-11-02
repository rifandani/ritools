import { readFile } from "node:fs/promises";

import { expect, test } from "./_base";

const imageFile = async (name: string) => ({
  buffer: await readFile("../../artifacts/unmask/fixtures/alpha-input.png"),
  mimeType: "image/png",
  name,
});

test.beforeEach(async ({ page }) => {
  await page.goto("/unmask");
  await page.waitForLoadState("networkidle");
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

test("uses one drop zone for files and folders without mode tabs", async ({
  page,
}) => {
  await expect(
    page.getByRole("tab", { name: /^(?:Single|Batch)$/u })
  ).toHaveCount(0);
  await expect(page.locator("#unmask-files")).toHaveAttribute("multiple", "");
  await expect(
    page.getByRole("button", { name: "Choose files", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Choose folder", exact: true })
  ).toBeVisible();
  await expect(page.locator("#unmask-folder")).toHaveAttribute(
    "webkitdirectory",
    ""
  );
});

test("opens one image directly and adds files to the same Batch", async ({
  page,
}) => {
  await page.setInputFiles("#unmask-files", await imageFile("first.png"));
  await expect(page.locator("#unmask-cut-out")).toBeVisible();
  await page.getByRole("gridcell", { name: /^Solid /u }).click();
  await page.setInputFiles("#unmask-files", await imageFile("second.png"));
  const list = page.getByRole("list", { name: "Batch", exact: true });
  await expect(
    list.getByRole("button", { name: "Open first.png", exact: true })
  ).toBeVisible();
  await expect(
    list.getByRole("button", { name: "Open second.png", exact: true })
  ).toBeVisible();
  await expect(page.locator("#unmask-cut-out")).toHaveCount(0);
  await expect(
    page
      .getByRole("grid", { name: "Backdrop", exact: true })
      .getByRole("row", { selected: true })
      .getByText("Solid", { exact: true })
  ).toBeVisible();
});

test("opens an image by keyboard and returns focus to its row", async ({
  page,
}) => {
  await page.setInputFiles("#unmask-files", [
    await imageFile("first.png"),
    await imageFile("second.png"),
  ]);
  const row = page.getByRole("button", {
    name: "Open second.png",
    exact: true,
  });
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#unmask-cut-out")).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Batch", exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Choose files", exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to the batch", exact: true })
    .first()
    .click();
  await expect(row).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Open first.png", exact: true })
  ).toBeVisible();
});

test("keeps one remaining image in the list and lets users add more", async ({
  page,
}) => {
  await page.setInputFiles("#unmask-files", [
    await imageFile("first.png"),
    await imageFile("second.png"),
  ]);
  const removeFirst = page.getByRole("button", {
    name: "Remove first.png",
    exact: true,
  });
  await page.mouse.move(0, 0);
  await removeFirst.hover();
  await expect(page.getByRole("tooltip")).toHaveText("Remove first.png");
  await page.mouse.move(0, 0);
  await page.keyboard.press("Tab");
  await removeFirst.focus();
  await expect(page.getByRole("tooltip")).toHaveText("Remove first.png");
  await removeFirst.click();
  await expect(
    page.getByRole("button", { name: "Open second.png", exact: true })
  ).toBeFocused();
  await expect(page.locator("#unmask-cut-out")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Open second.png", exact: true })
    .click();
  await expect(page.locator("#unmask-cut-out")).toBeVisible();
  await page
    .getByRole("button", { name: "Back to the batch", exact: true })
    .first()
    .click();
  await expect(page.locator("#unmask-cut-out")).toHaveCount(0);
  await page.setInputFiles("#unmask-files", await imageFile("third.png"));
  await expect(
    page.getByRole("button", { name: "Open second.png", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open third.png", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove all", exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Clear all", exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove second.png", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Remove third.png", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Choose files", exact: true })
  ).toBeFocused();
  await expect(
    page.getByRole("list", { name: "Batch", exact: true })
  ).toHaveCount(0);
});

test("adds pasted images to the same Batch", async ({ page }) => {
  await page.setInputFiles("#unmask-files", await imageFile("original.png"));
  await page.evaluate(() => {
    const clipboard = new DataTransfer();
    clipboard.items.add(
      new File(["first"], "first.png", { type: "image/png" })
    );
    clipboard.items.add(
      new File(["second"], "second.png", { type: "image/png" })
    );
    window.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: clipboard })
    );
  });
  const list = page.getByRole("list", { name: "Batch", exact: true });
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(
    list.getByRole("button", { name: "Open original.png", exact: true })
  ).toBeVisible();
});

test("processes a Batch, keeps results through the editor, and downloads its ZIP", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setInputFiles("#unmask-files", [
    await imageFile("first.png"),
    await imageFile("second.png"),
  ]);
  await page.locator("#unmask-run").click();
  const list = page.getByRole("list", { name: "Batch", exact: true });
  await expect(list.getByText("Ready", { exact: true })).toHaveCount(2, {
    timeout: 30_000,
  });
  const downloadOne = list.getByRole("button", {
    name: "Download the Cutout: first.png",
    exact: true,
  });
  await downloadOne.hover();
  await expect(page.getByRole("tooltip")).toHaveText(
    "Download the Cutout: first.png"
  );
  await page.mouse.move(0, 0);
  await downloadOne.focus();
  await expect(page.getByRole("tooltip")).toHaveText(
    "Download the Cutout: first.png"
  );
  await page
    .getByRole("button", { name: "Open first.png", exact: true })
    .click();
  await expect(
    page.locator("canvas[aria-describedby='unmask-canvas-hint']")
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to the batch", exact: true })
    .first()
    .click();
  await expect(list.getByText("Ready", { exact: true })).toHaveCount(2);
  const file = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download all as ZIP", exact: true })
    .click();
  const downloaded = await file;
  expect(downloaded.suggestedFilename()).toBe("unmask-cutouts.zip");
  await expect(list.getByText("Downloaded", { exact: true })).toHaveCount(2);
  await page.getByRole("gridcell", { name: /^Solid /u }).click();
  await expect(list.getByText("Stale", { exact: true })).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Download all as ZIP", exact: true })
  ).toBeDisabled();
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(list.getByText("Queued", { exact: true })).toHaveCount(2);
});

test("can return to the list during a run and cancel it", async ({ page }) => {
  await page.goto("/unmask?slow=1");
  await page.waitForLoadState("networkidle");
  await page.setInputFiles("#unmask-files", [
    await imageFile("first.png"),
    await imageFile("second.png"),
  ]);
  await page.locator("#unmask-run").click();
  await expect(
    page.getByRole("button", { name: "Choose files", exact: true })
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Open second.png", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Back to the batch", exact: true })
    .first()
    .click();
  await page.locator("#unmask-run").click();
  await expect(
    page.getByRole("button", { name: "Choose files", exact: true })
  ).toBeEnabled();
  await expect(
    page.getByRole("list", { name: "Batch", exact: true }).getByRole("listitem")
  ).toHaveCount(2);
});

test("keeps a 50-image Batch within a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const image = {
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64"
    ),
    mimeType: "image/png",
  };
  await page.setInputFiles(
    "#unmask-files",
    Array.from({ length: 50 }, (_, index) => ({
      ...image,
      name: `image-${index}.png`,
    }))
  );
  await expect(page.getByText("50 images", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
  ).toBeLessThanOrEqual(0);
  await page
    .getByRole("button", { name: "Remove image-0.png", exact: true })
    .click();
  await expect(page.getByText("49 images", { exact: true })).toBeVisible();
});
