import type { Page } from "@playwright/test";

import { themesForMode } from "../src/features/cleave/cleave.themes";
import { expect, test } from "./_base";

test.use({ serviceWorkers: "block" });

const compare = async (page: Page, marked = false) => {
  await page.goto("/cleave");
  await expect(
    page.getByRole("button", { name: "Add comparison", exact: true })
  ).toBeVisible();
  const clear = page.getByRole("button", { name: "Clear", exact: true });
  if (await clear.isVisible()) {
    await clear.click();
  }
  await page.waitForFunction(() => {
    const input = document.querySelector("textarea");
    return (
      input &&
      Object.keys(input).some((key) => key.startsWith("__reactEvents$"))
    );
  });
  await page
    .getByRole("textbox", { name: "Before Text", exact: true })
    .fill(
      marked
        ? "<<<<<<< HEAD\nconst before = 1;\n=======\nconst after = 2;\n>>>>>>> branch\n"
        : "const before = 1;\n"
    );
  await page
    .getByRole("textbox", { name: "After Text", exact: true })
    .fill(marked ? "" : "const after = 2;\n");
  await page
    .getByRole("button", {
      name: marked ? "Resolve Conflicts" : "Find difference",
      exact: true,
    })
    .click();
  await expect(page.locator("diffs-container code").first()).toBeVisible();
};

const themeButton = (page: Page) =>
  page.getByRole("button", { name: /Theme$/u });
const toggleMode = async (page: Page) => {
  const toggle = page.getByRole("button", {
    name: "Toggle theme",
    exact: true,
  });
  const mobile = !(await toggle.isVisible());
  if (mobile) {
    await page
      .getByRole("button", { name: "Open sidebar", exact: true })
      .click();
  }
  await toggle.click();
  if (mobile) {
    await page.keyboard.press("Escape");
  }
};
const selectTheme = async (page: Page, name: string) => {
  await themeButton(page).click();
  await page.getByRole("searchbox", { name: "Search themes" }).fill(name);
  await page.getByRole("option", { name, exact: true }).click();
};
const background = (page: Page) =>
  page
    .locator("diffs-container pre")
    .first()
    .evaluate((node) => getComputedStyle(node).backgroundColor);
const capture = async (page: Page, path: string) => {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo(0, 0);
  });
  await page.screenshot({ path, fullPage: true });
};

for (const width of [1440, 390]) {
  test(`filters themes by mode and saves both choices at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ colorScheme: "dark" });
    await compare(page);
    await expect(themeButton(page)).toContainText("Pierre Dark");
    await themeButton(page).click();
    await expect(page.getByRole("option")).toHaveCount(
      themesForMode("dark").length
    );
    await expect(
      page.getByRole("option", { name: "GitHub Light", exact: true })
    ).toHaveCount(0);
    const search = page.getByRole("searchbox", { name: "Search themes" });
    await search.fill("no-such-theme");
    await expect(
      page.getByText("No matching themes.", { exact: true })
    ).toBeVisible();
    await search.fill("dracula soft");
    await expect(page.getByRole("option")).toHaveCount(1);
    await expect(page.getByRole("option").first()).toHaveAccessibleName(
      "Dracula Theme Soft"
    );
    await search.press("ArrowDown");
    await search.press("Enter");
    await expect(themeButton(page)).toContainText("Dracula Theme Soft");
    await expect.poll(() => background(page)).toBe("rgb(40, 42, 54)");
    await page.getByRole("button", { name: "Resolve", exact: true }).click();
    await expect.poll(() => background(page)).toBe("rgb(40, 42, 54)");
    await capture(page, testInfo.outputPath("dark.png"));
    await toggleMode(page);
    await expect(themeButton(page)).toContainText("Pierre Light");
    await themeButton(page).click();
    await expect(page.getByRole("option")).toHaveCount(
      themesForMode("light").length
    );
    await expect(
      page.getByRole("option", { name: "Dracula Theme Soft", exact: true })
    ).toHaveCount(0);
    await page
      .getByRole("searchbox", { name: "Search themes" })
      .fill("github light");
    await page
      .getByRole("option", { name: "GitHub Light", exact: true })
      .click();
    await expect.poll(() => background(page)).toBe("rgb(255, 255, 255)");
    await expect(
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    ).resolves.toBe(true);
    await capture(page, testInfo.outputPath("light.png"));
    await toggleMode(page);
    await expect(themeButton(page)).toContainText("Dracula Theme Soft");
    await expect.poll(() => background(page)).toBe("rgb(40, 42, 54)");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await compare(page);
    await expect(themeButton(page)).toContainText("Dracula Theme Soft");
    await expect.poll(() => background(page)).toBe("rgb(40, 42, 54)");
    await toggleMode(page);
    await expect(themeButton(page)).toContainText("GitHub Light");
  });
}

for (const fallback of [false, true]) {
  test(`loads theme palettes on demand with JavaScript fallback ${fallback}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    if (fallback) {
      await page.addInitScript(() => {
        Object.defineProperty(globalThis, "WebAssembly", { value: undefined });
      });
    }
    const requested: string[] = [];
    const catalog = [
      ...themesForMode("light"),
      ...themesForMode("dark"),
    ].toSorted((left, right) => right.id.length - left.id.length);
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (request.resourceType() === "script") {
        const theme = catalog.find(
          ({ id }) =>
            path.endsWith(`/${id}.js`) ||
            path.includes(`/${id}-`) ||
            path.endsWith(`_themes_${id}.js`)
        );
        if (theme) {
          requested.push(theme.id);
        }
      }
    });
    await page.goto("/cleave");
    await expect(
      page.getByRole("textbox", { name: "Before Text", exact: true })
    ).toBeVisible();
    expect(requested).toEqual([]);
    await compare(page);
    await expect.poll(() => background(page)).toBe("rgb(10, 10, 10)");
    expect(requested.length).toBeGreaterThan(0);
    expect(
      requested.every(
        (theme) => theme === "pierre-dark" || theme === "pierre-light"
      )
    ).toBe(true);
    const beforeMenu = [...requested];
    await themeButton(page).click();
    await page
      .getByRole("searchbox", { name: "Search themes" })
      .fill("dracula soft");
    await expect(
      page.getByRole("option", { name: "Dracula Theme Soft", exact: true })
    ).toBeVisible();
    expect(requested).toEqual(beforeMenu);
    await page
      .getByRole("option", { name: "Dracula Theme Soft", exact: true })
      .click();
    await expect.poll(() => background(page)).toBe("rgb(40, 42, 54)");
    expect(requested.slice(beforeMenu.length)).toEqual(["dracula-soft"]);
    const afterSelection = [...requested];
    await selectTheme(page, "Pierre Dark");
    await expect.poll(() => background(page)).toBe("rgb(10, 10, 10)");
    await selectTheme(page, "Dracula Theme Soft");
    await expect.poll(() => background(page)).toBe("rgb(40, 42, 54)");
    expect(requested).toEqual(afterSelection);
  });

  test(`changes the theme in Marked Text with JavaScript fallback ${fallback}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    if (fallback) {
      await page.addInitScript(() => {
        Object.defineProperty(globalThis, "WebAssembly", { value: undefined });
      });
    }
    await compare(page, true);
    await selectTheme(page, "GitHub Dark");
    await expect.poll(() => background(page)).toBe("rgb(36, 41, 46)");
    await page
      .getByRole("button", { name: "Accept incoming", exact: true })
      .click();
    await expect(page.locator("diffs-container code").first()).toContainText(
      "const after = 2;"
    );
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
  });
}
