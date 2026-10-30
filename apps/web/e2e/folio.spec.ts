/* oxlint-disable unicorn/no-await-expression-member, eslint/no-await-in-loop, react-doctor/async-await-in-loop -- Independent viewer reads and ordered tab actions need these browser-test boundaries. */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "./_base";
import type { Page } from "./_base";

const fixtures = path.resolve(
  import.meta.dirname,
  "../src/features/folio/fixtures"
);

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

const viewer = (page: Page) => page.locator("embedpdf-viewer");

const openSample = async (page: Page) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Open a sample", exact: true })
    .click();
  await expect(viewer(page)).toBeVisible({ timeout: 20_000 });
  await expect(viewer(page).locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
};

const upload = async (page: Page, name: string) => {
  await ready(page);
  await page
    .locator("input[type=file]")
    .setInputFiles(path.join(fixtures, `${name}.pdf`));
  await expect(viewer(page)).toBeVisible({ timeout: 20_000 });
  await expect(viewer(page).locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
};

const save = async (page: Page) => {
  const current = viewer(page);
  await current.getByRole("button", { name: "Menu", exact: true }).click();
  const waiting = page.waitForEvent("download", { timeout: 20_000 });
  await current.getByRole("menuitem", { name: /Download/u }).click();
  const download = await waiting;
  const file = await download.path();
  if (file === null) {
    throw new Error("No downloaded file");
  }
  return {
    bytes: await readFile(file),
    name: download.suggestedFilename(),
  };
};

test("opens the offline sample with the local viewer only", async ({
  page,
}) => {
  const origins = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol === "http:" || url.protocol === "https:") {
      origins.add(url.origin);
    }
  });
  await openSample(page);
  const current = viewer(page);
  await expect(
    current.getByRole("button", { name: "Close folio-sample", exact: true })
  ).toBeVisible();
  for (const mode of [
    "View",
    "Annotate",
    "Shapes",
    "Insert",
    "Form",
    "Redact",
  ]) {
    await expect(
      current.getByRole("button", { name: mode, exact: true })
    ).toBeVisible();
  }
  await expect(
    current.getByText("Page 1 of 2", { exact: true }).first()
  ).toBeVisible();
  await current.getByRole("button", { name: "Annotate", exact: true }).click();
  await expect(
    current.getByRole("button", { name: "Highlight", exact: true })
  ).toBeVisible();
  await expect(
    current.getByRole("button", { name: "Comment", exact: true })
  ).toBeVisible();
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});

test("opens several local files in tabs and closes back to the picker", async ({
  page,
}) => {
  await ready(page);
  await page
    .locator("input[type=file]")
    .setInputFiles([
      path.join(fixtures, "sample.pdf"),
      path.join(fixtures, "text-10.pdf"),
    ]);
  const current = viewer(page);
  await expect(current.getByRole("tab", { name: /sample/u })).toBeVisible({
    timeout: 20_000,
  });
  await expect(current.getByRole("tab", { name: /text-10/u })).toBeVisible();
  await current
    .getByRole("button", { name: "Close sample", exact: true })
    .click();
  await expect(current.getByRole("tab", { name: /text-10/u })).toBeVisible();
  await current
    .getByRole("button", { name: "Close text-10", exact: true })
    .click();
  await expect(page.getByText("Drop file here", { exact: true })).toBeVisible();
  await expect(viewer(page)).toHaveCount(0);
});

test("saves a filled form under its original name and reopens it", async ({
  page,
}) => {
  await upload(page, "sample");
  const current = viewer(page);
  await current
    .getByRole("textbox", { name: "Your name", exact: true })
    .fill("Local reader");
  const output = await save(page);
  expect(output.name).toBe("sample.pdf");
  expect(output.bytes.subarray(0, 5).toString()).toBe("%PDF-");
  await current
    .getByRole("button", { name: "Close sample", exact: true })
    .click();
  await expect(page.getByText("Drop file here", { exact: true })).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    buffer: output.bytes,
    mimeType: "application/pdf",
    name: "saved.pdf",
  });
  await expect(
    viewer(page).getByRole("textbox", { name: "Your name", exact: true })
  ).toHaveValue("Local reader", { timeout: 20_000 });
});

test("unlocks an encrypted local file", async ({ page }) => {
  await ready(page);
  await page
    .locator("input[type=file]")
    .setInputFiles(path.join(fixtures, "encrypted.pdf"));
  const current = viewer(page);
  await expect(
    current.getByPlaceholder("Enter password", { exact: true })
  ).toBeVisible({ timeout: 20_000 });
  await current
    .getByPlaceholder("Enter password", { exact: true })
    .fill("wrong");
  await current.getByRole("button", { name: "Open", exact: true }).click();
  await current
    .getByPlaceholder("Enter password", { exact: true })
    .fill("folio-test");
  await current.getByRole("button", { name: "Open", exact: true }).click();
  await expect(current.locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
});

test("opens another file from the tab strip", async ({ page }) => {
  await upload(page, "sample");
  const current = viewer(page);
  const choosing = page.waitForEvent("filechooser");
  await current
    .getByRole("button", { name: "Open a file in a new tab", exact: true })
    .click();
  await (await choosing).setFiles(path.join(fixtures, "text-10.pdf"));
  await expect(current.getByRole("tab", { name: /text-10/u })).toBeVisible({
    timeout: 20_000,
  });
  await expect(current.getByRole("tab", { name: /sample/u })).toBeVisible();
});

test("protects a file with a password and reopens it", async ({ page }) => {
  await upload(page, "sample");
  const current = viewer(page);
  await current.getByRole("button", { name: "Menu", exact: true }).click();
  await current
    .getByRole("menuitem", { name: "Security", exact: true })
    .click();
  await page.getByText("Require password to open", { exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Document password", { exact: true }).fill("secret");
  await dialog
    .getByLabel("Confirm document password", { exact: true })
    .fill("secret");
  await dialog.getByRole("button", { name: "Apply protection" }).click();
  await expect(dialog).toHaveCount(0, { timeout: 20_000 });

  const output = await save(page);
  expect(output.name).toBe("sample.pdf");
  await current
    .getByRole("button", { name: "Close sample", exact: true })
    .click();
  await expect(page.getByText("Drop file here", { exact: true })).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    buffer: output.bytes,
    mimeType: "application/pdf",
    name: "protected.pdf",
  });
  await expect(
    current.getByPlaceholder("Enter password", { exact: true })
  ).toBeVisible({ timeout: 20_000 });
  await current
    .getByPlaceholder("Enter password", { exact: true })
    .fill("secret");
  await current.getByRole("button", { name: "Open", exact: true }).click();
  await expect(current.locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
});

test("keeps the narrow layout inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSample(page);
  await expect(
    viewer(page).getByRole("button", {
      name: "Close folio-sample",
      exact: true,
    })
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});
