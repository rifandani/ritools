import type { Page } from "@playwright/test";

import { expect, test } from "./_base";

/**
 * Waits until React has hydrated the page. A press before hydration is
 * recorded by the DOM and then dropped by the first render.
 */
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

/**
 * Waits until the report is on the page. The Sample Image read runs in a
 * Worker with the real ExifReader, so it arrives after hydration.
 */
const readReport = async (page: Page) => {
  await expect(
    page.getByRole("heading", { name: "Metadata Report" })
  ).toBeVisible({ timeout: 20_000 });
};

/**
 * Opens one Sample Image and waits for the desk.
 *
 * The block retries because the first read is also the first time Vite sees
 * the engine's dependencies; a dev reload can drop the state once. In a built
 * bundle the first attempt succeeds.
 */
const openSample = async (page: Page, name: "ai" | "camera") => {
  await expect(async () => {
    const button = page.getByRole("button", {
      name: name === "camera" ? "Open the camera sample" : "Open the AI sample",
    });
    if (await button.isVisible()) {
      await button.click();
    }
    await readReport(page);
  }).toPass({ timeout: 90_000 });
};

test.beforeEach(async ({ page }) => {
  // The sample read and the clean run in Workers, so a case may outlast the
  // default 20s while it waits for the engine.
  test.setTimeout(120_000);
  await page.goto("/expose");
  await ready(page);
});

test("carries the promise, the samples, and the explainer in the HTML", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Expose");
  await expect(
    page.getByText(
      "Read the metadata in an image, then remove the groups you choose."
    )
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open the camera sample" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open the AI sample" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What metadata is, and why it matters" })
  ).toBeVisible();
});

test("opens the camera sample and reads camera, time, authorship, GPS, and AI", async ({
  page,
}) => {
  await openSample(page, "camera");

  await expect(page.getByText("Sample Image")).toBeVisible();
  // The facts line carries the real dimensions and size.
  await expect(page.getByText("4128 × 2752")).toBeVisible();
  await expect(
    page.getByRole("definition").filter({ hasText: "40.736435" }).first()
  ).toBeVisible();
  await expect(
    page.getByRole("definition").filter({ hasText: "-73.993160" }).first()
  ).toBeVisible();
  await expect(
    page.getByRole("definition").filter({ hasText: "174 m" }).first()
  ).toBeVisible();
  // The offine locator ships one world outline and no tile request.
  await expect(
    page.getByRole("img", { name: /A world outline with one pin/u })
  ).toBeVisible();
  // The C2PA evidence names what the manifest claims, never a validity claim.
  await expect(page.getByText(/Present ·/u).first()).toBeVisible();
  await expect(page.getByText(/Nikon_Z_9_Sample/u).first()).toBeVisible();
  await expect(
    page.getByText(/It shows what the manifest claims/u)
  ).toBeVisible();
});

test("reads a group and filters the Raw view", async ({ page }) => {
  await openSample(page, "camera");
  await page.getByRole("tab", { name: "Raw" }).click();
  const filter = page.getByRole("searchbox", { name: "Filter fields" });
  await filter.fill("andy");
  await expect(page.getByRole("cell", { name: "Andy Parsons" })).toBeVisible();
  await filter.fill("no such field value");
  await expect(page.getByText("No field matches this filter.")).toBeVisible();
});

test("cleans the AI sample with AI only and verifies the result", async ({
  page,
}) => {
  // The first Clean downloads the ExifTool WebAssembly and reads the file
  // again for Verification.
  test.setTimeout(180_000);
  await openSample(page, "ai");

  await page.getByRole("button", { name: "Clean", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Verification" })).toBeVisible(
    { timeout: 150_000 }
  );

  const receipt = page.getByRole("region", { name: "Verification" });
  await expect(
    receipt.getByText("0 fields remain in the selected groups.")
  ).toBeVisible();
  await expect(
    receipt.getByText("The image payload is unchanged.")
  ).toBeVisible();
  await expect(receipt.getByText("The C2PA Manifest is gone.")).toBeVisible();
  const download = receipt.getByRole("link", {
    name: "Download the Cleaned File",
  });
  await expect(download).toHaveAttribute(
    "download",
    "ai-firefly-c2pa-clean.jpg"
  );
});

test("AI only on the camera sample keeps the camera groups", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openSample(page, "camera");
  await page.getByRole("button", { name: "Clean", exact: true }).click();

  const receipt = page.getByRole("region", { name: "Verification" });
  await expect(receipt.getByText("The C2PA Manifest is gone.")).toBeVisible({
    timeout: 150_000,
  });
  await expect(
    receipt.getByText("0 fields remain in the selected groups.")
  ).toBeVisible();
  const kept = receipt.getByText(/Kept groups still read/u);
  await expect(kept).toContainText("Location");
  await expect(kept).toContainText("Camera settings");
  await expect(kept).toContainText("Authorship");
});

test("Personal removes Location and keeps Camera settings", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await openSample(page, "camera");
  await page.getByText("Personal", { exact: true }).click();
  await page.getByRole("button", { name: "Clean", exact: true }).click();

  const receipt = page.getByRole("region", { name: "Verification" });
  await expect(
    receipt.getByText("The image payload is unchanged.")
  ).toBeVisible({
    timeout: 150_000,
  });
  const kept = receipt.getByText(/Kept groups still read/u);
  await expect(kept).toContainText("Camera settings");
  await expect(kept).not.toContainText("Location");
});

test("is keyboard operable to the Sample Image and the clean order", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Open the camera sample" }).focus();
  await page.keyboard.press("Enter");
  await readReport(page);

  // The report heading takes focus after the read.
  await expect(
    page.getByRole("heading", { name: "Metadata Report" })
  ).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("tab", { name: "Raw" })).toBeVisible();
});
