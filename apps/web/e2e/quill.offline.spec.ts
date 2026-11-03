/* oxlint-disable eslint/no-await-in-loop -- Capabilities are warmed in the order of the public workflow. */
import { expect, test } from "./_base";

test.beforeEach(async ({ page }) => {
  test.skip(
    !process.env.CI && process.env.PW_OFFLINE !== "1",
    "Uses the production service worker"
  );
  test.setTimeout(120_000);
  await page.goto("/quill");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByText("Working on this device…", { exact: true })
  ).toHaveCount(0);
});
const sample =
  "# Offline notes\n\nInline $x^2$ stays here.\n\n```mermaid\ngraph TD\n  A --> B\n```\n";

test("warm editing rendering and export capabilities work after an offline reload", async ({
  page,
  context,
}) => {
  await page
    .getByRole("treegrid", { name: "Markdown Library", exact: true })
    .click({ button: "right", position: { x: 8, y: 8 } });
  await page
    .getByRole("menuitem", { name: "New document", exact: true })
    .click();
  const offlineName = page.getByRole("textbox", { name: "Name", exact: true });
  await offlineName.fill("Offline.md");
  await offlineName.press("Enter");
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toBeVisible();
  await page.getByRole("radio", { name: "Source", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Markdown source", exact: true })
    .fill(sample);
  await expect(
    page.getByText("Saved on this device", { exact: true })
  ).toBeVisible();
  await page.getByRole("radio", { name: "Read", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "math: x^2", exact: true })
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("img", { name: /mermaid: graph TD/u })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Export document", exact: true })
    .click();
  for (const format of ["DOCX", "PDF"]) {
    await page
      .getByRole("button", { name: `Prepare ${format}`, exact: true })
      .click();
    await expect(
      page.getByText(`Offline.${format.toLowerCase()}`, { exact: true })
    ).toBeVisible({ timeout: 30_000 });
  }
  await page
    .getByRole("button", { name: "Library actions", exact: true })
    .click();
  const backup = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Download Library Backup", exact: true })
    .click();
  await backup;
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("img", { name: "math: x^2", exact: true })
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("img", { name: /mermaid: graph TD/u })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Export document", exact: true })
    .click();
  for (const format of ["DOCX", "PDF"]) {
    await page
      .getByRole("button", { name: `Prepare ${format}`, exact: true })
      .click();
    await expect(
      page.getByText(`Offline.${format.toLowerCase()}`, { exact: true })
    ).toBeVisible({ timeout: 30_000 });
  }
  await page.getByRole("radio", { name: "Source", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Markdown source", exact: true })
    .fill("# Changed offline");
  await expect(
    page.getByText("Changes awaiting save", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Saved on this device", { exact: true })
  ).toBeVisible();
});

test("a cold offline PDF writer reports the named error and retains source", async ({
  page,
  context,
}) => {
  await page
    .getByRole("treegrid", { name: "Markdown Library", exact: true })
    .click({ button: "right", position: { x: 8, y: 8 } });
  await page
    .getByRole("menuitem", { name: "New document", exact: true })
    .click();
  const keepName = page.getByRole("textbox", { name: "Name", exact: true });
  await keepName.fill("Keep.md");
  await keepName.press("Enter");
  await page
    .getByRole("textbox", { name: "Markdown source", exact: true })
    .fill("Keep my source.");
  await expect(
    page.getByText("Changes awaiting save", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Saved on this device", { exact: true })
  ).toBeVisible();
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Export document", exact: true })
    .click();
  await page.getByRole("button", { name: "Prepare PDF", exact: true }).click();
  await expect(
    page.getByText("Unavailable offline.", { exact: false })
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toContainText("Keep my source.");
});
