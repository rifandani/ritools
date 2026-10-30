import { expect, test } from "./_base";
import type { Page } from "./_base";

/**
 * The shell owns the way between Tools. The Tool catalog is a disclosure in
 * the rail; the wordmark is the way back to the Catalog.
 */

const catalog = (page: Page) =>
  page.getByRole("navigation", { name: "Tool catalog" });

const toolLink = (page: Page, name: string) =>
  catalog(page).getByRole("link", { name, exact: true });

/** A press before hydration is lost, so retry until the rail reports its new state. */
const collapseRail = async (page: Page) => {
  await expect(async () => {
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(page.locator("#app-sidebar")).toHaveAttribute(
      "data-state",
      "collapsed",
      { timeout: 1000 }
    );
  }).toPass();
};

test("switches from the Catalog to a Tool", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("button", { name: "Tool catalog" })
  ).toBeVisible();
  await toolLink(page, "Squeeze").click();

  await expect(page).toHaveURL(/\/squeeze$/u);
});

test("folds and unfolds the Tool catalog", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const trigger = page.getByRole("button", { name: "Tool catalog" });
  await expect(toolLink(page, "Squeeze")).toBeVisible();
  await trigger.click();
  await expect(toolLink(page, "Squeeze")).toBeHidden();
  await trigger.click();
  await expect(toolLink(page, "Squeeze")).toBeVisible();
});

test("marks the open Tool and the wordmark returns to the Catalog", async ({
  page,
}) => {
  await page.goto("/squeeze");
  await page.waitForLoadState("networkidle");

  const squeeze = toolLink(page, "Squeeze");
  await expect(squeeze).toHaveAttribute("aria-current", "page");
  await expect(page.getByLabel("Breadcrumb")).toContainText("Squeeze");

  await page.getByRole("link", { name: "Ritools", exact: true }).click();

  await expect(page).toHaveURL(/\/$/u);
});

test("collapses to the dock and keeps the Tools menu", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await collapseRail(page);
  const toolsMark = page.getByRole("button", { name: "Tools", exact: true });
  await expect(toolsMark).toBeVisible();
  await expect(toolLink(page, "Squeeze")).toBeHidden();

  await toolsMark.click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByRole("menuitem", { name: "Squeeze" }).click();

  await expect(page).toHaveURL(/\/squeeze$/u);

  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect(toolLink(page, "Squeeze")).toBeVisible();
});

test("keeps both preferences in the rail, open or docked", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const theme = page.getByRole("button", { name: "Toggle theme" });
  await expect(theme).toBeVisible();
  await expect(
    page.getByRole("button", { name: "English", exact: true })
  ).toBeVisible();

  await collapseRail(page);
  await expect(theme).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Language: English" })
  ).toBeVisible();
});

test("opens the menu from the keyboard alone", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await collapseRail(page);
  await page.getByRole("button", { name: "Tools", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  // The menu hands focus to its first item, so the second press follows it.
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/squeeze$/u);
});

// The Component Catalog is a development-only route: a CI build answers 404.
test("opens the Component Catalog from the wordmark", async ({ page }) => {
  test.skip(
    !!process.env.CI,
    "The Component Catalog exists in development only"
  );

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page
    .getByRole("link", { name: "Ritools", exact: true })
    .click({ button: "right" });
  await page.getByRole("menuitem", { name: "Master Design" }).click();

  await expect(page).toHaveURL(/\/master-design$/u);
});

test("opens the rail as a sheet on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/squeeze");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Open sidebar" }).click();
  const sheet = page.getByRole("dialog", { name: "Tool catalog" });
  await expect(sheet).toBeVisible();
  await expect(
    sheet.getByRole("button", { name: "Toggle theme" })
  ).toBeVisible();

  await sheet.getByRole("link", { name: "Tabular", exact: true }).click();

  await expect(page).toHaveURL(/\/tabular$/u);
  await expect(sheet).toBeHidden();
});

test("keeps the bar clear at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const trigger = page.getByRole("button", { name: "Open sidebar" });
  await expect(trigger).toBeVisible();
  await expect(page.getByLabel("Breadcrumb")).toBeVisible();

  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(320);
});
