/* oxlint-disable eslint/no-await-in-loop -- Opening files is an ordered browser interaction. */
import { expect, test } from "./_base";
import type { Page } from "./_base";

const openFiles = async (
  page: Page,
  names = ["Alpha.md", "Beta.md", "Gamma.md"]
) => {
  await page.goto("/quill");
  await expect(async () => {
    await page.locator("#quill-actions").click();
    await expect(
      page.getByRole("menuitem", { name: "Import Markdown", exact: true })
    ).toBeVisible({ timeout: 1000 });
  }).toPass();
  await page.keyboard.press("Escape");
  await page
    .locator('input[type="file"][aria-label="Import Markdown"]')
    .setInputFiles(
      names.map((name) => ({
        name,
        mimeType: "text/markdown",
        buffer: Buffer.from(`# ${name}\nOriginal content`),
      }))
    );
  for (const name of names) {
    await page.getByRole("row", { name, exact: true }).click();
    await expect(page.locator(".quill-tab-open[aria-current=page]")).toHaveText(
      name
    );
  }
  return page.getByRole("navigation", { name: "Open files", exact: true });
};

test("drags open files in both directions without changing the active document", async ({
  page,
}) => {
  const strip = await openFiles(page);
  const alpha = strip.getByRole("group", { name: "Alpha.md", exact: true });
  const gamma = strip.getByRole("group", { name: "Gamma.md", exact: true });
  const editor = page.getByRole("textbox", {
    name: "Markdown source",
    exact: true,
  });
  await editor.fill("# Gamma draft\nKeep this text");
  const gammaBounds = await gamma.boundingBox();
  if (!gammaBounds) {
    throw new Error("Missing Gamma tab");
  }
  await alpha
    .getByRole("button", { name: "Alpha.md", exact: true })
    .dragTo(gamma, {
      targetPosition: { x: gammaBounds.width - 4, y: gammaBounds.height / 2 },
    });
  await expect(strip.locator(".quill-tab-open")).toHaveText([
    "Beta.md",
    "Gamma.md",
    "Alpha.md",
  ]);
  await expect(page.locator(".quill-tab-open[aria-current=page]")).toHaveText(
    "Gamma.md"
  );
  await expect(editor.locator(".cm-line")).toHaveText([
    "# Gamma draft",
    "Keep this text",
  ]);
  await alpha
    .getByRole("button", { name: "Close file: Alpha.md", exact: true })
    .dragTo(gamma);
  await expect(strip.locator(".quill-tab-open")).toHaveText([
    "Beta.md",
    "Gamma.md",
    "Alpha.md",
  ]);
  await alpha
    .getByRole("button", { name: "Alpha.md", exact: true })
    .dragTo(strip.getByRole("group", { name: "Beta.md", exact: true }), {
      targetPosition: { x: 4, y: 20 },
    });
  await expect(strip.locator(".quill-tab-open")).toHaveText([
    "Alpha.md",
    "Beta.md",
    "Gamma.md",
  ]);
  await alpha.getByRole("button", { name: "Alpha.md", exact: true }).click();
  await expect(editor.locator(".cm-line")).toHaveText([
    "# Alpha.md",
    "Original content",
  ]);
  await strip
    .getByRole("button", { name: "Close file: Alpha.md", exact: true })
    .click();
  await expect(strip.locator(".quill-tab-open")).toHaveText([
    "Beta.md",
    "Gamma.md",
  ]);
  await expect(
    page.getByRole("row", { name: "Alpha.md", exact: true })
  ).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  for (const width of [1440, 1280, 390]) {
    test(`scrolls the file strip during a drag in ${colorScheme} mode at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      const names = Array.from(
        { length: 8 },
        (_, index) => `Document-${index + 1}.md`
      );
      const strip = await openFiles(page, names);
      await strip.scrollIntoViewIfNeeded();
      await expect(strip.locator(".quill-tab-open")).toHaveText(names);
      await strip.evaluate((element) => {
        element.scrollLeft = 0;
      });
      const first = await strip
        .getByRole("button", { name: names[0], exact: true })
        .boundingBox();
      const bounds = await strip.boundingBox();
      if (!first || !bounds) {
        throw new Error("Missing file strip");
      }
      const y = bounds.y + bounds.height / 2;
      await page.mouse.move(first.x + 30, y);
      await page.mouse.down();
      await page.mouse.move(first.x + 50, y, { steps: 5 });
      await page.mouse.move(bounds.x + bounds.width - 8, y, { steps: 10 });
      await page.mouse.move(bounds.x + bounds.width - 8, y);
      await expect
        .poll(() => strip.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(100);
      await expect(strip.locator("[data-drop-side]")).toBeVisible();
      await testInfo.attach("tab-drop-marker", {
        body: await page
          .locator(".quill-tabs-bar")
          .screenshot({ path: testInfo.outputPath("tab-drop-marker.png") }),
        contentType: "image/png",
      });
      await page.mouse.move(bounds.x + bounds.width - 8, y);
      await page.mouse.move(bounds.x + bounds.width - 8, y);
      await page.mouse.up();
      await expect(strip.locator(".quill-tab-open").first()).not.toHaveText(
        names[0] ?? ""
      );
      await expect(strip.getByRole("group")).toHaveCount(names.length);
      await expect(
        page.locator(".quill-tab-open[aria-current=page]")
      ).toHaveText(names.at(-1) ?? "");
      await expect(
        page.locator(".quill-tab[data-dragging],.quill-tab[data-drop-side]")
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      ).toBe(true);
    });
  }
}

test("moves tabs from the keyboard menu and disables moves at the ends", async ({
  page,
}) => {
  const strip = await openFiles(page);
  const alpha = strip.getByRole("button", { name: "Alpha.md", exact: true });
  await alpha.focus();
  await alpha.press("Shift+F10");
  await expect(
    page.getByRole("menuitem", { name: "Move file left", exact: true })
  ).toBeDisabled();
  await page
    .getByRole("menuitem", { name: "Move file right", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(strip.locator(".quill-tab-open")).toHaveText([
    "Beta.md",
    "Alpha.md",
    "Gamma.md",
  ]);
  await alpha.focus();
  await alpha.press("Shift+F10");
  await page
    .getByRole("menuitem", { name: "Move file left", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(strip.locator(".quill-tab-open")).toHaveText([
    "Alpha.md",
    "Beta.md",
    "Gamma.md",
  ]);
  await strip
    .getByRole("button", { name: "Gamma.md", exact: true })
    .click({ button: "right" });
  await expect(
    page.getByRole("menuitem", { name: "Move file right", exact: true })
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.locator(".quill-tab-open[aria-current=page]")).toHaveText(
    "Gamma.md"
  );
});

test("cancels a drag without changing the file order", async ({ page }) => {
  const strip = await openFiles(page);
  const alpha = await strip
    .getByRole("button", { name: "Alpha.md", exact: true })
    .boundingBox();
  const gamma = await strip
    .getByRole("group", { name: "Gamma.md", exact: true })
    .boundingBox();
  if (!alpha || !gamma) {
    throw new Error("Missing file tabs");
  }
  await page.mouse.move(alpha.x + 30, alpha.y + alpha.height / 2);
  await page.mouse.down();
  await page.mouse.move(alpha.x + 50, alpha.y + alpha.height / 2, { steps: 5 });
  await page.mouse.move(gamma.x + gamma.width - 4, gamma.y + gamma.height / 2, {
    steps: 10,
  });
  await expect(page.locator(".quill-tab[data-drop-side=after]")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(
    page.locator(".quill-tab[data-dragging],.quill-tab[data-drop-side]")
  ).toHaveCount(0);
  await expect(strip.locator(".quill-tab-open")).toHaveText([
    "Alpha.md",
    "Beta.md",
    "Gamma.md",
  ]);
});
