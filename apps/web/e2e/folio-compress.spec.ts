import { readFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";

import { expect, test } from "./_base";
import type { Page } from "./_base";

test.setTimeout(120_000);

const fixtures = path.resolve(
  import.meta.dirname,
  "../src/features/folio/fixtures"
);
const viewer = (page: Page) => page.locator("embedpdf-viewer");

const ready = async (page: Page) => {
  await page.goto("/folio");
  await page.waitForFunction(() => {
    const input = document.querySelector("input[type=file]");
    return (
      input &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });
};

const openPdf = async (page: Page, bytes: Uint8Array, name: string) => {
  await ready(page);
  await page.locator("input[type=file]").setInputFiles({
    buffer: Buffer.from(bytes),
    mimeType: "application/pdf",
    name,
  });
  await expect(viewer(page)).toBeVisible({ timeout: 20_000 });
  await expect(viewer(page).locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
};

const openCompress = async (page: Page) => {
  await viewer(page).getByRole("button", { name: "Menu", exact: true }).click();
  await viewer(page)
    .getByRole("menuitem", { name: "Compress", exact: true })
    .click();
  const panel = page.getByRole("complementary", { name: "Compress PDFs" });
  await expect(panel).toBeVisible({ timeout: 20_000 });
  return panel;
};

/** One page with one large JPEG, the shape a phone scan has. */
const photoPdf = async (): Promise<Uint8Array> => {
  const jpeg = await readFile(
    path.resolve(
      import.meta.dirname,
      "../public/expose/camera-nikon-z9-c2pa.jpg"
    )
  );
  const document = await PDFDocument.create();
  const image = await document.embedJpg(jpeg);
  const page = document.addPage([595.28, 841.89]);
  page.drawImage(image, {
    height: 841.89,
    width: 595.28,
    x: 0,
    y: 0,
  });
  return document.save();
};

test("compresses a JPEG PDF and downloads a smaller copy", async ({ page }) => {
  const source = await photoPdf();
  await openPdf(page, source, "photo.pdf");
  const panel = await openCompress(page);

  await panel
    .getByRole("button", { name: "Compress all", exact: true })
    .click();
  await expect(panel.getByText("Compressed", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await expect(panel.getByText(/−\d+%/u).first()).toBeVisible();

  const saving = page.waitForEvent("download");
  await panel
    .getByRole("button", { name: "Download photo", exact: true })
    .click();
  const download = await saving;
  await expect(download.suggestedFilename()).toBe("photo-compressed.pdf");
  const saved = await readFile((await download.path()) ?? "");
  expect(saved.byteLength).toBeLessThan(source.byteLength);

  const reopened = await PDFDocument.load(saved);
  expect(reopened.getPageCount()).toBe(1);
});

test("skips a signed PDF", async ({ page }) => {
  const source = await readFile(path.join(fixtures, "signed.pdf"));
  await openPdf(page, source, "signed.pdf");
  const panel = await openCompress(page);

  await panel
    .getByRole("button", { name: "Compress all", exact: true })
    .click();
  await expect(panel.getByText("Skipped", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await expect(panel.getByText(/^Signed\./u)).toBeVisible();
  await expect(
    panel.getByRole("button", { name: /^Download (?!all as ZIP)/u })
  ).toHaveCount(0);
});
