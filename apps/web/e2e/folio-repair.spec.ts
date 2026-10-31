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

const choose = async (page: Page, name: string) => {
  await ready(page);
  await page
    .locator("input[type=file]")
    .setInputFiles(path.join(fixtures, `${name}.pdf`));
  await expect(viewer(page)).toBeVisible({ timeout: 20_000 });
};

const upload = async (page: Page, name: string) => {
  await choose(page, name);
  await expect(viewer(page).locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
};

const openRepair = async (page: Page) => {
  await viewer(page).getByRole("button", { name: "Menu", exact: true }).click();
  await viewer(page)
    .getByRole("menuitem", { name: "Repair copy", exact: true })
    .click();
  const panel = page.getByRole("complementary", { name: "Repair copy" });
  await expect(panel).toBeVisible({ timeout: 20_000 });
  return panel;
};

const start = async (page: Page) => {
  const panel = await openRepair(page);
  await panel
    .getByRole("button", { name: "Start repair", exact: true })
    .click();
  return panel;
};

test("writes a verified repaired copy of a damaged PDF", async ({ page }) => {
  const source = new Uint8Array(
    await readFile(path.join(fixtures, "broken-xref.pdf"))
  );
  const leaks: string[] = [];
  page.on("request", (request) => {
    const carried = `${request.url()} ${request.postData() ?? ""}`;
    if (carried.includes("broken-xref") || carried.includes("Folio fixture")) {
      leaks.push(carried);
    }
  });
  await upload(page, "broken-xref");
  const panel = await start(page);

  await expect(
    panel.getByText("Repaired copy verified", { exact: true })
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    panel.getByText("10 pages recovered", { exact: true })
  ).toBeVisible();
  await expect(panel.getByText("Path: Rewrite", { exact: true })).toBeVisible();
  await expect(
    panel.getByText(
      "The cross-reference table was damaged. The copy has a new table.",
      { exact: true }
    )
  ).toBeVisible();
  await expect(
    panel.getByText("No structure was lost.", { exact: true })
  ).toBeVisible();

  const saving = page.waitForEvent("download");
  await panel
    .getByRole("button", { name: "Download repaired copy", exact: true })
    .click();
  const download = await saving;
  expect(download.suggestedFilename()).toBe("broken-xref-repaired.pdf");
  const saved = await readFile((await download.path()) ?? "");

  // A second parser reads the copy with a strict cross-reference table.
  const reopened = await PDFDocument.load(saved, {
    throwOnInvalidObject: true,
  });
  expect(reopened.getPageCount()).toBe(10);
  expect(new TextDecoder("latin1").decode(saved)).not.toContain("junk after");
  expect(
    new Uint8Array(await readFile(path.join(fixtures, "broken-xref.pdf")))
  ).toEqual(source);
  expect(leaks).toEqual([]);
});

test("names the error for a file the engine cannot open", async ({ page }) => {
  // The viewer hides its menu for a tab that did not open, so the panel is
  // opened from a good tab and the failed tab is picked in it.
  await upload(page, "sample");
  const current = viewer(page);
  const choosing = page.waitForEvent("filechooser");
  await current
    .getByRole("button", { name: "Open a file in a new tab", exact: true })
    .click();
  const chooser = await choosing;
  await chooser.setFiles(path.join(fixtures, "corrupt.pdf"));
  await expect(current.getByRole("alert")).toBeVisible({ timeout: 20_000 });
  await current.getByRole("tab", { name: /sample/u }).click();
  await expect(current.locator("img").first()).toBeVisible({
    timeout: 20_000,
  });

  const panel = await openRepair(page);
  await panel.getByRole("combobox", { name: "File" }).selectOption("corrupt");
  await panel
    .getByRole("button", { name: "Start repair", exact: true })
    .click();
  await expect(
    panel.getByText("No repaired copy", { exact: true })
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    panel.getByText(
      "The engine cannot open this file. Repair copy cannot recover it.",
      { exact: true }
    )
  ).toBeVisible();
  await expect(panel.getByRole("button", { name: /^Download/u })).toHaveCount(
    0
  );
});

test("refuses a signed PDF", async ({ page }) => {
  await upload(page, "signed");
  const panel = await start(page);
  await expect(
    panel.getByText("Repair copy refused", { exact: true })
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    panel.getByText("Signed. A rewrite would break the signature.", {
      exact: true,
    })
  ).toBeVisible();
  await expect(panel.getByRole("button", { name: /^Download/u })).toHaveCount(
    0
  );
});

test("refuses an encrypted PDF after it is unlocked", async ({ page }) => {
  await choose(page, "encrypted");
  const current = viewer(page);
  await current
    .getByPlaceholder("Enter password", { exact: true })
    .fill("folio-test");
  await current.getByRole("button", { name: "Open", exact: true }).click();
  await expect(current.locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
  const panel = await start(page);
  await expect(
    panel.getByText("Repair copy refused", { exact: true })
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    panel.getByText(
      "Encrypted. Repair copy does not write a copy of an encrypted file.",
      { exact: true }
    )
  ).toBeVisible();
  await expect(panel.getByRole("button", { name: /^Download/u })).toHaveCount(
    0
  );
});
