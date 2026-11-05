import { expect, test } from "./_base";
import type { Page } from "./_base";

/**
 * The shell owns the way between Tools. The Tool and Editor groups are
 * disclosures in the rail; the wordmark is the way back to the Catalog.
 */

const catalog = (page: Page) =>
  page.getByRole("navigation", { name: "Tool", exact: true });

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
    page.getByRole("button", { name: "Tool", exact: true })
  ).toBeVisible();
  await toolLink(page, "Squeeze").click();

  await expect(page).toHaveURL(/\/squeeze$/u);
});

test("folds and unfolds the Tool group", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const trigger = page.getByRole("button", { name: "Tool", exact: true });
  await expect(toolLink(page, "Squeeze")).toBeVisible();
  await trigger.click();
  await expect(toolLink(page, "Squeeze")).toBeHidden();
  await trigger.click();
  await expect(toolLink(page, "Squeeze")).toBeVisible();
});

test("folds the Editor group without folding the Tool group", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expect(toolLink(page, "Quill")).toBeVisible();
  await page.getByRole("button", { name: "Editor", exact: true }).click();
  await expect(toolLink(page, "Quill")).toBeHidden();
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

test("collapses to separate Tool and Editor menus with matching icons", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const toolsMark = page.getByRole("button", { name: "Tool", exact: true });
  const editorsMark = page.getByRole("button", { name: "Editor", exact: true });
  const toolIcon = await toolsMark.locator("svg").first().innerHTML();
  const editorIcon = await editorsMark.locator("svg").first().innerHTML();

  await collapseRail(page);
  await expect(toolsMark).toBeVisible();
  await expect(editorsMark).toBeVisible();
  expect(await toolsMark.locator("svg").innerHTML()).toBe(toolIcon);
  expect(await editorsMark.locator("svg").innerHTML()).toBe(editorIcon);
  await expect(toolLink(page, "Squeeze")).toBeHidden();

  await toolsMark.click();
  const toolsMenu = page.getByRole("menu", { name: "Tool", exact: true });
  await expect(toolsMenu).toBeVisible();
  await expect(toolsMenu.getByRole("menuitem")).toHaveText([
    "Squeeze",
    "Expose",
    "Qraft",
    "Unmask",
  ]);
  await page.getByRole("menuitem", { name: "Squeeze" }).click();
  await expect(page).toHaveURL(/\/squeeze$/u);

  await editorsMark.click();
  const editorsMenu = page.getByRole("menu", { name: "Editor", exact: true });
  await expect(editorsMenu).toBeVisible();
  await expect(editorsMenu.getByRole("menuitem")).toHaveText([
    "Tabular",
    "Folio",
    "Quill",
    "Cleave",
  ]);
  await page.getByRole("menuitem", { name: "Tabular" }).click();
  await expect(page).toHaveURL(/\/tabular$/u);

  await editorsMark.click();
  await expect(page.getByRole("menuitem", { name: "Tabular" })).toHaveAttribute(
    "aria-current",
    "page"
  );
  await page.keyboard.press("Escape");
  await expect(editorsMark).toBeFocused();

  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect(toolLink(page, "Squeeze")).toBeVisible();
  await expect(toolLink(page, "Tabular")).toBeVisible();
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

for (const entry of [
  { group: "Tool", path: /\/squeeze$/u },
  { group: "Editor", path: /\/tabular$/u },
]) {
  test(`opens the ${entry.group} menu from the keyboard alone`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await collapseRail(page);
    await page.getByRole("button", { name: entry.group, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("menu", { name: entry.group, exact: true })
    ).toBeVisible();
    // The menu hands focus to its first item, so the second press follows it.
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(entry.path);
  });
}

// The Component Catalog is a development-only route: a CI build answers 404.
test("opens the Component Catalog from the wordmark", async ({ page }) => {
  test.skip(
    !!process.env.CI || process.env.PW_PRODUCTION === "true",
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
  const sheet = page.getByRole("dialog", { name: "Tool", exact: true });
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
