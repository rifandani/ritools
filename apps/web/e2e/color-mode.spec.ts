import { expect, test } from "./_base";
import type { Page } from "./_base";

/** Clicks the theme toggle and waits for the palette to flip to dark. */
const toggleToDark = async (page: Page) => {
  // The SSR button is visible before hydration but not yet interactive.
  await expect(async () => {
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/u, {
      timeout: 1000,
    });
  }).toPass();
};

test("auto mode follows the system preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/\bdark\b/u);

  await page.emulateMedia({ colorScheme: "light" });

  // The media query change reaches the page asynchronously, and hydration must
  // be listening; give a loaded parallel suite room to deliver it.
  await expect(page.locator("html")).toHaveClass(/\blight\b/u, {
    timeout: 10_000,
  });
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/u);
});

test("a toggled color mode applies at once and persists across a reload", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");

  await toggleToDark(page);

  await expect(page.locator("html")).toHaveClass(/\bdark\b/u);
  await expect(page.locator("html")).not.toHaveClass(/\blight\b/u);

  // The inline color-mode script reads the pick before React hydrates.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveClass(/\bdark\b/u);
  await expect(page.locator("html")).not.toHaveClass(/\blight\b/u);
});

test("a palette change sweeps through a view transition", async ({ page }) => {
  // The suite runs with reduced motion; opt back in to exercise the sweep.
  await page.emulateMedia({
    colorScheme: "light",
    reducedMotion: "no-preference",
  });
  await page.addInitScript(() => {
    const { startViewTransition: nativeStartViewTransition } =
      Document.prototype;
    Document.prototype.startViewTransition = function startViewTransition(
      ...args
    ) {
      document.documentElement.dataset.themeSweepStarted = "true";
      return nativeStartViewTransition.apply(this, args);
    };
  });
  await page.goto("/");

  await toggleToDark(page);

  await expect(page.locator("html")).toHaveClass(/\bdark\b/u);
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-sweep-started",
    "true"
  );
});
