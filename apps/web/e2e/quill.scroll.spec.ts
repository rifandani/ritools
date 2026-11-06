import { expect, test } from "./_base";

for (const { mode, fragment } of [
  { mode: "Read", fragment: "" },
  { mode: "Split", fragment: "" },
  { mode: "Read", fragment: "#details" },
  { mode: "Split", fragment: "#details" },
] as const) {
  test(`keeps the page scroll when a Document Link opens a file${fragment} in ${mode}`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 900 });
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
      .setInputFiles([
        {
          name: "start.md",
          mimeType: "text/markdown",
          buffer: Buffer.from(`# Start\n\n[Open target](target.md${fragment})`),
        },
        {
          name: "target.md",
          mimeType: "text/markdown",
          buffer: Buffer.from(
            `# Target\n\n${"A paragraph in the target document.\n\n".repeat(60)}## Details\n\n${"A paragraph after the heading.\n\n".repeat(20)}`
          ),
        },
      ]);
    await page
      .getByRole("treegrid", { name: "Markdown Library", exact: true })
      .getByRole("row", { name: "start.md", exact: true })
      .click();
    await page.getByRole("radio", { name: mode, exact: true }).click();
    const article = page.getByRole("article", { name: "Read", exact: true });
    const link = article.getByRole("button", {
      name: "Open target",
      exact: true,
    });
    await expect(link).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 80));
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(0);
    await link.click();
    await expect(
      article.getByRole("heading", { name: "Target", exact: true })
    ).toBeVisible();
    if (fragment) {
      const section = article.getByRole("heading", {
        name: "Details",
        exact: true,
      });
      await expect(section).toBeFocused();
      await expect(section).toBeInViewport();
      expect(await article.evaluate((node) => node.scrollTop)).toBeGreaterThan(
        0
      );
    } else {
      await expect(article).toBeFocused();
      expect(await article.evaluate((node) => node.scrollTop)).toBe(0);
    }
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before);
  });
}
