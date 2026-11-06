/* oxlint-disable eslint/no-await-in-loop -- Each view or file change must settle before the next click. */
import { expect, test } from "./_base";

for (const mode of ["Source", "Read", "Split"] as const) {
  test(`changes files without loading or replacing the panes in ${mode}`, async ({
    page,
  }) => {
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
          name: "first.md",
          mimeType: "text/markdown",
          buffer: Buffer.from("# First document\n\nFirst source."),
        },
        {
          name: "second.md",
          mimeType: "text/markdown",
          buffer: Buffer.from("# Second document\n\nSecond source."),
        },
      ]);
    const tree = page.getByRole("treegrid", {
      name: "Markdown Library",
      exact: true,
    });
    await tree.getByRole("row", { name: "second.md", exact: true }).click();
    await page.getByRole("radio", { name: mode, exact: true }).click();
    const editor = page.getByRole("textbox", {
      name: "Markdown source",
      exact: true,
    });
    const reader = page.getByRole("article", { name: "Read", exact: true });
    if (mode !== "Read") {
      await expect(editor).toContainText("Second source.");
    }
    if (mode !== "Source") {
      await expect(
        reader.getByRole("heading", { name: "Second document", exact: true })
      ).toBeVisible();
    }
    const probe = await page.evaluateHandle(() => {
      const root = document.querySelector(".quill-document");
      if (!root) {
        throw new Error("Missing document pane");
      }
      const loading: string[] = [];
      const observer = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.textContent?.trim() === "Loading") {
              loading.push("Loading");
            }
          }
        }
      });
      observer.observe(root, { childList: true, subtree: true });
      return {
        loading,
        observer,
        source: root.querySelector(".cm-content"),
        reader: root.querySelector("article"),
      };
    });
    const tabs = page.getByRole("navigation", {
      name: "Open files",
      exact: true,
    });
    await tree.getByRole("row", { name: "first.md", exact: true }).click();
    if (mode !== "Read") {
      await expect(editor).toContainText("First source.");
    }
    if (mode !== "Source") {
      await expect(
        reader.getByRole("heading", { name: "First document", exact: true })
      ).toBeVisible();
    }
    await tabs.getByRole("button", { name: "second.md", exact: true }).click();
    if (mode !== "Read") {
      await expect(editor).toContainText("Second source.");
    }
    if (mode !== "Source") {
      await expect(
        reader.getByRole("heading", { name: "Second document", exact: true })
      ).toBeVisible();
    }
    await tabs.getByRole("button", { name: "first.md", exact: true }).click();
    if (mode !== "Read") {
      await expect(editor).toContainText("First source.");
    }
    if (mode !== "Source") {
      await expect(
        reader.getByRole("heading", { name: "First document", exact: true })
      ).toBeVisible();
    }
    const result = await probe.evaluate((state) => {
      state.observer.disconnect();
      return {
        loading: state.loading,
        sameSource: state.source === document.querySelector(".cm-content"),
        sameReader:
          state.reader === document.querySelector(".quill-document article"),
      };
    });
    expect(
      result.loading,
      "Changing files must not show a loading fallback"
    ).toEqual([]);
    expect(result.sameSource, "Keep the editor when changing files").toBe(true);
    expect(result.sameReader, "Keep the reader when changing files").toBe(true);
    await page.getByRole("radio", { name: "Source", exact: true }).click();
    await editor.fill("# First edited");
    await tabs.getByRole("button", { name: "second.md", exact: true }).click();
    await expect(editor).toContainText("Second source.");
    await editor.fill("# Second edited");
    await editor.press("ControlOrMeta+z");
    await expect(editor).toContainText("Second source.");
    await tabs.getByRole("button", { name: "first.md", exact: true }).click();
    await expect(editor).toHaveText("# First edited");
    await editor.press("ControlOrMeta+z");
    await expect(editor).toContainText("First source.");
  });
}

for (const { width, colorScheme } of [
  { width: 1440, colorScheme: "light" },
  { width: 1440, colorScheme: "dark" },
  { width: 1280, colorScheme: "light" },
  { width: 1280, colorScheme: "dark" },
  { width: 390, colorScheme: "light" },
  { width: 390, colorScheme: "dark" },
] as const) {
  test(`changes document views without loading or replacing the panes at ${width}px in ${colorScheme}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme });
    await page.goto("/quill");
    await expect(
      page.getByRole("treegrid", { name: "Markdown Library", exact: true })
    ).toBeVisible();
    await expect(async () => {
      await page.locator("#quill-actions").click();
      await expect(
        page.getByRole("menuitem", { name: "Import Markdown", exact: true })
      ).toBeVisible({ timeout: 1000 });
    }).toPass();
    await page.keyboard.press("Escape");
    await page
      .locator('input[type="file"][aria-label="Import Markdown"]')
      .setInputFiles({
        name: "views.md",
        mimeType: "text/markdown",
        buffer: Buffer.from(
          `# View changes\n\n${"Keep both panes ready.\n\n".repeat(60)}Last line.`
        ),
      });
    await page.getByRole("radio", { name: "Split", exact: true }).click();
    const source = page.getByRole("textbox", {
      name: "Markdown source",
      exact: true,
    });
    const reader = page.getByRole("article", { name: "Read", exact: true });
    await expect(source).toBeVisible();
    await expect(
      reader.getByRole("heading", { name: "View changes" })
    ).toBeVisible();
    await expect(reader).toHaveAttribute("aria-busy", "false");
    await page.evaluate(() => document.fonts.ready);
    const splitPath = testInfo.outputPath("split.png");
    await page.locator(".quill-document").screenshot({ path: splitPath });
    await testInfo.attach("split", {
      path: splitPath,
      contentType: "image/png",
    });
    await source.press("ControlOrMeta+Home");
    await source.press("Shift+End");
    const selection = await page.evaluate(() =>
      window.getSelection()?.toString()
    );
    expect(selection).toBe("# View changes");
    await page.getByRole("radio", { name: "Split", exact: true }).click();
    await page.locator(".quill-source .cm-scroller").evaluate((node) => {
      node.scrollTop = 100;
    });
    await reader.evaluate((node) => {
      node.scrollTop = 100;
    });
    const readerScroll = await reader.evaluate((node) => node.scrollTop);
    expect(readerScroll).toBeGreaterThan(0);
    const sourceScroll = await page
      .locator(".quill-source .cm-scroller")
      .evaluate((node) => node.scrollTop);
    expect(sourceScroll).toBeGreaterThan(0);

    // Record even a loading fallback that disappears before the next assertion.
    const probe = await page.evaluateHandle(() => {
      const root = document.querySelector(".quill-document");
      if (!root) {
        throw new Error("Missing document pane");
      }
      const loading: string[] = [];
      const observer = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.textContent?.trim() === "Loading") {
              loading.push("Loading");
            }
          }
        }
      });
      observer.observe(root, { childList: true, subtree: true });
      return {
        loading,
        observer,
        source: root.querySelector(".cm-content"),
        reader: root.querySelector("article"),
      };
    });

    for (const mode of ["Source", "Split", "Read", "Split", "Read", "Source"]) {
      await page.getByRole("radio", { name: mode, exact: true }).click();
      await expect(source).toBeVisible({ visible: mode !== "Read" });
      await expect(reader).toBeVisible({ visible: mode !== "Source" });
      await expect(
        page.getByRole("radio", { name: mode, exact: true })
      ).toHaveCount(1);
      await expect(
        page.getByRole("button", { name: "Bold", exact: true })
      ).toBeVisible({ visible: mode !== "Read" });
    }

    const result = await probe.evaluate((state) => {
      state.observer.disconnect();
      return {
        loading: state.loading,
        sameSource: state.source === document.querySelector(".cm-content"),
        sameReader:
          state.reader === document.querySelector(".quill-document article"),
      };
    });
    expect(
      result.loading,
      "Changing views must not show a loading fallback"
    ).toEqual([]);
    expect(
      result.sameSource,
      "Keep the source editor across view changes"
    ).toBe(true);
    expect(result.sameReader, "Keep the reader across view changes").toBe(true);
    expect(
      await page
        .locator(".quill-source .cm-scroller")
        .evaluate((node) => node.scrollTop)
    ).toBe(sourceScroll);
    await source.focus();
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
      selection
    );
    const sourcePath = testInfo.outputPath("source.png");
    await page.locator(".quill-document").screenshot({ path: sourcePath });
    await testInfo.attach("source", {
      path: sourcePath,
      contentType: "image/png",
    });
    await page.getByRole("radio", { name: "Read", exact: true }).click();
    // Phone Split adds a 2px top rule; scroll anchoring can account for it.
    expect(
      Math.abs((await reader.evaluate((node) => node.scrollTop)) - readerScroll)
    ).toBeLessThanOrEqual(2);
    const readPath = testInfo.outputPath("read.png");
    await page.locator(".quill-document").screenshot({ path: readPath });
    await testInfo.attach("read", { path: readPath, contentType: "image/png" });
    await page.getByRole("radio", { name: "Source", exact: true }).click();
    await source.fill("# Updated while reading was hidden");
    await page.getByRole("radio", { name: "Read", exact: true }).click();
    await expect(
      reader.getByRole("heading", {
        name: "Updated while reading was hidden",
        exact: true,
      })
    ).toBeVisible();
  });
}
