import { expect, test } from "./_base";
import type { Page } from "./_base";

/**
 * The shell owns the way between Tools. The switcher stays a plain list of
 * links, marks the open Tool, and offers the Catalog at any Tool count.
 */

const toolsMark = (page: Page) =>
  page.getByRole("button", { name: "Tools", exact: true });

test("switches from the Catalog to a Tool", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await toolsMark(page).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByRole("menuitem", { name: "Squeeze" }).click();

  await expect(page).toHaveURL(/\/squeeze$/u);
});

test("marks the open Tool and returns to the Catalog", async ({ page }) => {
  await page.goto("/squeeze");
  await page.waitForLoadState("networkidle");

  await toolsMark(page).click();

  const squeeze = page.getByRole("menuitem", { name: "Squeeze" });
  await expect(squeeze).toHaveAttribute("aria-current", "page");

  await page.getByRole("menuitem", { name: "All tools" }).click();

  await expect(page).toHaveURL(/\/$/u);
});

test("opens the menu from the keyboard alone", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await toolsMark(page).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  // The menu hands focus to its first item, so the second press follows it.
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/squeeze$/u);
});

test("keeps the name and the bar clear at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const mark = toolsMark(page);
  await expect(mark).toBeVisible();

  const markBox = await mark.boundingBox();
  const themeBox = await page
    .getByRole("button", { name: "Toggle theme" })
    .boundingBox();
  expect(markBox).not.toBeNull();
  expect(themeBox).not.toBeNull();
  // The two groups never overlap, however tight the bar gets.
  expect((markBox?.x ?? 0) + (markBox?.width ?? 0)).toBeLessThanOrEqual(
    themeBox?.x ?? 0
  );

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(320);
});
