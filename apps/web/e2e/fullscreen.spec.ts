import { expect, test } from "./_base";
import type { Page } from "./_base";

test.use({ serviceWorkers: "block" });

const hydrated = (page: Page, selector: string) =>
  page.waitForFunction((target) => {
    const element = document.querySelector(target);
    return (
      element &&
      Object.getOwnPropertyNames(element).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  }, selector);

const enter = async (page: Page, id: string) => {
  const button = page.getByRole("button", { name: "Full screen", exact: true });
  await expect(button).toBeEnabled();
  await button.click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement?.id))
    .toBe(id);
  await expect(
    page.getByRole("button", { name: "Exit full screen", exact: true })
  ).toBeInViewport();
  await expect
    .poll(() =>
      page.locator(`#${id}`).evaluate((element) => {
        const box = element.getBoundingClientRect();
        return (
          box.x === 0 &&
          box.y === 0 &&
          box.width === innerWidth &&
          box.height === innerHeight &&
          element.scrollWidth <= element.clientWidth
        );
      })
    )
    .toBe(true);
};

const exit = async (page: Page) => {
  await page
    .getByRole("button", { name: "Exit full screen", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement))
    .toBeNull();
  await expect(
    page.getByRole("button", { name: "Full screen", exact: true })
  ).toBeVisible();
};

for (const width of [1440, 390]) {
  test(`Folio expands its PDF workspace at ${width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/folio");
    await hydrated(page, 'input[type="file"]');
    await page
      .getByRole("button", { name: "Open a sample", exact: true })
      .click();
    const viewer = page.locator("embedpdf-viewer");
    await expect(viewer.locator("img").first()).toBeVisible({
      timeout: 30_000,
    });
    await enter(page, "folio-frame");
    await expect(viewer.locator("img").first()).toBeVisible();
    if (width === 1440) {
      const comments = viewer.getByRole("button", {
        name: "Comments",
        exact: true,
      });
      const commentBox = await comments.boundingBox();
      const buttonBox = await page
        .getByRole("button", { name: "Exit full screen", exact: true })
        .boundingBox();
      expect(buttonBox?.x).toBeGreaterThan(commentBox?.x ?? 0);
      await comments.click();
      await expect(
        viewer.getByText("Comments", { exact: true }).last()
      ).toBeVisible();
    }
    await page.screenshot({ path: test.info().outputPath("fullscreen.png") });
    await exit(page);
    await expect(viewer.locator("img").first()).toBeVisible();
  });

  test(`Quill keeps the document and view modes at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/quill");
    await expect(async () => {
      await page.locator("#quill-actions").click();
      await expect(
        page.getByRole("menuitem", { name: "Import Markdown", exact: true })
      ).toBeVisible({ timeout: 1000 });
    }).toPass();
    await page.keyboard.press("Escape");
    await page.locator('input[aria-label="Import Markdown"]').setInputFiles({
      name: "fullscreen.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("# Full-screen document\n\nKeep this text."),
    });
    await page.getByRole("row", { name: "fullscreen.md", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "Markdown source", exact: true })
    ).toContainText("Keep this text.");
    await enter(page, "quill-frame");
    await page.getByRole("radio", { name: "Read", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Full-screen document", exact: true })
    ).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("fullscreen.png") });
    await page.locator("#quill-actions").click();
    await expect(
      page.getByRole("menuitem", { name: "Import Markdown", exact: true })
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await exit(page);
    await expect(
      page.getByRole("heading", { name: "Full-screen document", exact: true })
    ).toBeVisible();
  });

  test(`Cleave keeps comparison and Resolve available at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/cleave");
    await hydrated(page, "textarea");
    await page
      .getByRole("textbox", { name: "Before Text", exact: true })
      .fill("same\nold\n");
    await page
      .getByRole("textbox", { name: "After Text", exact: true })
      .fill("same\nnew\n");
    await page
      .getByRole("button", { name: "Find difference", exact: true })
      .click();
    const resolve = page.getByRole("button", { name: "Resolve", exact: true });
    await expect(resolve).toBeEnabled();
    await expect(
      page
        .getByRole("button", { name: "Full screen", exact: true })
        .locator("xpath=preceding-sibling::*[1]")
    ).toHaveText("Resolve");
    await enter(page, "cleave-frame");
    await page.getByRole("button", { name: /Layout$/u }).click();
    await expect(
      page.getByRole("option", { name: "Stacked", exact: true })
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await resolve.click();
    await expect(
      page.getByRole("button", { name: "Reset", exact: true })
    ).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("fullscreen.png") });
    await exit(page);
    await expect(
      page.getByRole("button", { name: "Reset", exact: true })
    ).toBeVisible();
  });
}
