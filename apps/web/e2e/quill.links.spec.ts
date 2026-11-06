import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "./_base";

for (const mode of ["Read", "Split"] as const) {
  test(`follows Document Links across nested Folders and headings in ${mode}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    const notes = testInfo.outputPath("notes");
    await mkdir(path.join(notes, "deep"), { recursive: true });
    await writeFile(
      path.join(notes, "b.md"),
      "# Parent target\n\n[Deep](deep/nested.md)"
    );
    await writeFile(
      path.join(notes, "deep", "nested.md"),
      "# Nested target\n\n[Parent](../b.md)\n\n[Root heading](/b.md#installation-1)"
    );
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
          name: "a.md",
          mimeType: "text/markdown",
          buffer: Buffer.from(
            "# Start\n\n[Sibling](b.md)\n\n[Nested](notes/deep/nested.md)\n\n[Missing](missing.md)\n\n[Above](../b.md)\n\n[Folder](notes)"
          ),
        },
        {
          name: "b.md",
          mimeType: "text/markdown",
          buffer: Buffer.from(
            `# Root target\n\n[Home](/a.md)\n\n[Jump](#installation-1)\n\n[Unknown](#missing-heading)\n\n## Installation\n\n${"A paragraph for scrolling.\n\n".repeat(60)}## Installation\n\nTarget section.`
          ),
        },
      ]);
    await expect(
      page.getByRole("row", { name: "a.md", exact: true })
    ).toBeVisible();
    await page
      .locator('input[type="file"][aria-label="Import folder"]')
      .setInputFiles(notes);
    await expect(
      page.getByRole("row", { name: "notes", exact: true })
    ).toBeVisible();
    const tree = page.getByRole("treegrid", {
      name: "Markdown Library",
      exact: true,
    });
    await tree.getByRole("row", { name: "a.md", exact: true }).click();
    await page.getByRole("radio", { name: mode, exact: true }).click();
    const article = page.getByRole("article", { name: "Read", exact: true });
    const heading = (name: string) =>
      article.getByRole("heading", { name, exact: true });
    await article.getByRole("button", { name: "Sibling", exact: true }).click();
    await expect(heading("Root target")).toBeVisible();
    await expect(
      page.getByRole("radio", { name: mode, exact: true })
    ).toBeChecked();
    await expect(
      page
        .getByRole("navigation", { name: "Open files", exact: true })
        .locator('button[aria-current="page"]')
        .filter({ hasText: /^b\.md$/u })
    ).toHaveCount(1);
    await article.getByRole("button", { name: "Home", exact: true }).click();
    await article.getByRole("button", { name: "Nested", exact: true }).click();
    await expect(heading("Nested target")).toBeVisible();
    await article.getByRole("button", { name: "Parent", exact: true }).click();
    await expect(heading("Parent target")).toBeVisible();
    await article.getByRole("button", { name: "Deep", exact: true }).click();
    await article
      .getByRole("button", { name: "Root heading", exact: true })
      .click();
    const section = article.locator('[id="installation-1"]');
    await expect(section).toBeFocused();
    await expect(section).toBeInViewport();
    await article.getByRole("button", { name: "Jump", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(section).toBeFocused();
    await expect(section).toBeInViewport();
    await article.getByRole("button", { name: "Unknown", exact: true }).click();
    await expect(article.getByRole("status")).toContainText(
      "Heading not found"
    );
    await expect(heading("Root target")).toBeInViewport();
    await article.getByRole("button", { name: "Home", exact: true }).click();
    const expectFailedLink = async (label: string, message: string) => {
      await article.getByRole("button", { name: label, exact: true }).click();
      await expect(page.getByRole("alert")).toContainText(message);
      await expect(heading("Start")).toBeVisible();
    };
    await expectFailedLink("Missing", "No matching Library document");
    await expectFailedLink("Above", "above the Library root");
    await expectFailedLink("Folder", "points to a Folder");
    expect(new URL(page.url()).pathname).toBe("/quill");
  });
}
