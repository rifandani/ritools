import path from "node:path";

import type { Page } from "@playwright/test";

import { expect, test } from "./_base";

const fixture = (extension: string) =>
  path.resolve(
    import.meta.dirname,
    `../src/features/expose/fixtures/metadata.${extension}`
  );
const open = async (page: Page, extension: string) => {
  await page.goto("/expose");
  await page.waitForFunction(() => {
    const input = document.querySelector("#expose-file");
    return (
      input !== null &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });
  await page.locator("#expose-file").setInputFiles(fixture(extension));
  await expect(
    page.getByRole("heading", { name: "Metadata Report" })
  ).toBeVisible({ timeout: 60_000 });
};
test.beforeEach(() => test.setTimeout(90_000));
for (const extension of [
  "pdf",
  "mp4",
  "mov",
  "m4v",
  "webm",
  "mkv",
  "avi",
  "m4a",
  "mp3",
  "wav",
  "flac",
  "ogg",
  "docx",
  "xlsx",
  "pptx",
]) {
  test(`reads ${extension} and names its clean limit`, async ({ page }) => {
    await open(page, extension);
    if (["pdf", "docx", "xlsx", "pptx"].includes(extension)) {
      const evidence = page.getByRole("region", {
        name: "AI Provenance",
        exact: true,
      });
      await expect(
        evidence.getByText("C2PA is not scanned in this format.")
      ).toBeVisible();
      await expect(
        evidence.getByText("Not present", { exact: true })
      ).toHaveCount(0);
    }
    if (
      ["pdf", "webm", "mkv", "avi", "mp3", "wav", "flac", "ogg"].includes(
        extension
      )
    ) {
      await expect(
        page.getByRole("button", { name: /^Clean$/u }).first()
      ).toBeDisabled();
      await expect(
        page
          .getByText(
            extension === "pdf"
              ? "PDF cleaning is not available in this build. The metadata report is available."
              : "This format can be read, but the engine cannot remove its metadata. No Cleaned File is offered."
          )
          .first()
      ).toBeVisible();
    } else {
      await page.getByText("Everything", { exact: true }).click();
      await page
        .getByRole("button", { name: /^Clean$/u })
        .first()
        .click();
      await expect(
        page.getByRole("heading", { name: "Verification" })
      ).toBeVisible({ timeout: 60_000 });
      await expect(
        page.getByRole("link", {
          name: "Download the Cleaned File",
          exact: true,
        })
      ).toBeEnabled();
      await expect(
        page.getByText("The file content is unchanged.", { exact: true })
      ).toBeVisible();
    }
  });
}
test("names the PDF and audio viewers and has no overflow at 390 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "pdf");
  const pdfSupported = await page.evaluate(() => navigator.pdfViewerEnabled);
  // oxlint-disable-next-line unicorn/prefer-ternary -- this branch verifies the browser capability and its required fallback
  if (pdfSupported) {
    await expect(page.getByTitle("PDF preview")).toBeVisible();
  } else {
    await expect(
      page
        .getByText(
          "Preview is not available in this browser. The metadata report is available.",
          { exact: true }
        )
        .first()
    ).toBeVisible();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/ritools-16-pdf-mobile.png",
    fullPage: true,
  });
  await open(page, "m4a");
  await expect(page.getByLabel("Audio preview", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/ritools-16-audio-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page, "docx");
  await page.screenshot({
    path: "/tmp/ritools-16-office-desktop.png",
    fullPage: true,
  });
});
