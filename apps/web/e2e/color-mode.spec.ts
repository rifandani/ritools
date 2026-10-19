import { expect, test } from "./_base";
import type { Page } from "./_base";

/** Picks a color mode from the theme menu on the home page. */
const pickColorMode = async (page: Page, name: string) => {
  // The SSR button is visible before hydration but not yet interactive.
  await expect(async () => {
    await page.getByRole("button", { name: "Theme" }).click();
    await expect(page.getByRole("menuitemradio", { name })).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
  await page.getByRole("menuitemradio", { name }).click();
};

test("auto mode follows the system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/\bdark\b/u);

  await page.emulateMedia({ colorScheme: "light" });

  await expect(page.locator("html")).toHaveClass(/\blight\b/u);
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/u);
});

test("a picked color mode applies at once and persists across a reload", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");

  await pickColorMode(page, "Dark");

  await expect(page.locator("html")).toHaveClass(/\bdark\b/u);
  await expect(page.locator("html")).not.toHaveClass(/\blight\b/u);

  // The inline color-mode script reads the pick before React hydrates.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveClass(/\bdark\b/u);
  await expect(page.locator("html")).not.toHaveClass(/\blight\b/u);
});
