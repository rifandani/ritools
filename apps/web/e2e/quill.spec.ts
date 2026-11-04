/* oxlint-disable eslint/no-await-in-loop -- Each browser export and its download must finish before the next one starts. */
import { mkdir, readFile, writeFile } from "node:fs/promises";

import { strFromU8, unzipSync } from "fflate";

import { expect, test } from "./_base";
import type { Page } from "./_base";

const ready = async (page: Page) => {
  await page.goto("/quill");
  await expect(
    page.getByRole("treegrid", { name: "Markdown Library", exact: true })
  ).toBeVisible();
};
const nameInTree = async (page: Page, name: string) => {
  const field = page
    .getByRole("treegrid", { name: "Markdown Library", exact: true })
    .getByRole("textbox", { name: "Name", exact: true });
  await expect(field).toBeFocused();
  await field.press("End");
  await expect(field).toBeInViewport();
  await field.fill(name);
  await field.press("Enter");
  await expect(field).toHaveCount(0);
  await expect(page.getByRole("row", { name, exact: true })).toBeVisible();
};
const create = async (page: Page, name: string) => {
  await page
    .getByRole("treegrid", { name: "Markdown Library", exact: true })
    .click({ button: "right", position: { x: 8, y: 8 } });
  await page
    .getByRole("menuitem", { name: "New document", exact: true })
    .click();
  await nameInTree(page, name);
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toBeVisible();
};
const source = async (page: Page, text: string) => {
  await page.getByRole("radio", { name: "Source", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Markdown source", exact: true })
    .fill(text);
};
const markdown = async (page: Page) => {
  await page
    .getByRole("button", { name: "Export document", exact: true })
    .click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download Markdown", exact: true })
    .last()
    .click();
  const file = await downloaded;
  const path = await file.path();
  if (!path) {
    throw new Error("Missing download");
  }
  return { name: file.suggestedFilename(), bytes: await readFile(path) };
};

for (const { colorScheme, width } of [
  { colorScheme: "light", width: 1440 },
  { colorScheme: "dark", width: 1440 },
  { colorScheme: "light", width: 390 },
  { colorScheme: "dark", width: 390 },
] as const) {
  test(`shows the source cursor and text selection in ${colorScheme} mode at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme });
    await ready(page);
    await expect(page.locator("html")).toHaveClass(
      new RegExp(colorScheme, "u")
    );
    await create(page, "Selection.md");
    await source(page, "Selection remains visible\nA second line");
    const editor = page.getByRole("textbox", {
      name: "Markdown source",
      exact: true,
    });
    await editor.press("ControlOrMeta+Home");
    const textColor = await editor.evaluate(
      (node) => getComputedStyle(node).color
    );
    await expect(page.locator(".quill-source .cm-cursor-primary")).toHaveCSS(
      "border-left-color",
      textColor
    );
    const line = page.locator(".quill-source .cm-activeLine");
    await expect(line).toHaveText("Selection remains visible");
    const bounds = await line.boundingBox();
    if (!bounds) {
      throw new Error("Missing active line");
    }
    // Sample above the glyphs, inside the first selected word. This checks
    // the painted result, including the layer behind the active line.
    const clip = {
      x: Math.ceil(bounds.x + 8),
      y: Math.ceil(bounds.y + 1),
      width: 3,
      height: 2,
    };
    const unselected = await page.screenshot({ clip });
    const mac = await page.evaluate(() => navigator.platform.includes("Mac"));
    await editor.press(
      mac ? "Shift+Alt+ArrowRight" : "Shift+Control+ArrowRight"
    );
    await expect
      .poll(() => page.evaluate(() => window.getSelection()?.toString()))
      .toMatch(/^Selection\s?$/u);
    await expect(
      page.locator(".quill-source .cm-selectionBackground")
    ).toBeVisible();
    const selected = await page.screenshot({ clip });
    expect(
      selected,
      "Selected text must have a visible background"
    ).not.toEqual(unselected);
    await testInfo.attach("source-selection", {
      body: await page.locator(".quill-source").screenshot(),
      contentType: "image/png",
    });
  });
}

for (const width of [1440, 390]) {
  test(`keeps the file strip height with no open files at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    const strip = page.locator(".quill-tabs-bar");
    const height = () =>
      strip.evaluate((node) => node.getBoundingClientRect().height);
    const emptyHeight = await height();
    await create(page, "Height.md");
    const openHeight = await height();
    await page
      .getByRole("button", { name: "Close file: Height.md", exact: true })
      .click();
    await expect(
      page
        .getByRole("navigation", { name: "Open files", exact: true })
        .getByRole("group")
    ).toHaveCount(0);
    expect(
      await height(),
      "Closing the last file must keep the strip height"
    ).toBe(openHeight);
    expect(emptyHeight, "The initial empty strip must match an open file").toBe(
      openHeight
    );
  });
}

test("creates a source document and restores committed text after reload", async ({
  page,
}) => {
  await ready(page);
  await create(page, "Notes.md");
  await expect(
    page.getByRole("radio", { name: "Visual", exact: true })
  ).toHaveCount(0);
  for (const mode of ["Split", "Source"]) {
    await page.getByRole("radio", { name: mode, exact: true }).click();
    for (const name of ["Bold", "Italic", "Strikethrough", "Link", "Heading"]) {
      await expect(
        page.getByRole("button", { name, exact: true })
      ).toBeVisible();
    }
  }
  await page
    .getByRole("textbox", { name: "Markdown source", exact: true })
    .fill("A note that stays on this device.");
  await expect(
    page.getByText("Changes awaiting save", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Changes awaiting save", { exact: true })
  ).toHaveCount(0);
  await page.evaluate(() => {
    const preferences = JSON.parse(
      localStorage.getItem("quill-preferences-v1") ?? "{}"
    );
    localStorage.setItem(
      "quill-preferences-v1",
      JSON.stringify({ ...preferences, mode: "visual" })
    );
  });
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toHaveText("A note that stays on this device.");
});

test("preserves import bytes and protects unsupported source", async ({
  page,
}) => {
  await ready(page);
  const original = Buffer.from(
    "\uFEFF---\r\ntitle: Private\r\n---\r\n# Notes\r\n<!-- Keep me -->\r\n",
    "utf-8"
  );
  await page
    .locator('input[type="file"][aria-label="Import Markdown"]')
    .setInputFiles({
      name: "import.md",
      mimeType: "text/markdown",
      buffer: original,
    });
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Source protected", { exact: true })).toHaveCount(
    0
  );
  await expect(
    page.getByRole("button", { name: "Download import original", exact: true })
  ).toHaveCount(0);
  const exported = await markdown(page);
  expect(exported.bytes).toEqual(original);
  await expect(
    page.getByRole("radio", { name: "Visual", exact: true })
  ).toHaveCount(0);
  await page.reload();
  const restored = await markdown(page);
  expect(restored.bytes).toEqual(original);
});

test("exports a backup with Markdown paths", async ({ page }) => {
  await ready(page);
  await create(page, "Plan.md");
  await source(
    page,
    "# Launch plan\n\nA **bold** statement.\n\n| Name | Value |\n| --- | --- |\n| Status | Ready |\n"
  );
  await page
    .getByRole("button", { name: "Library actions", exact: true })
    .click();
  const zipped = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Download Library Backup", exact: true })
    .click();
  const backup = await zipped;
  const backupPath = await backup.path();
  if (!backupPath) {
    throw new Error("Missing backup");
  }
  const files = unzipSync(await readFile(backupPath));
  expect(strFromU8(files["Plan.md"] ?? new Uint8Array())).toContain(
    "# Launch plan"
  );
  expect(files[".quill/manifest.json"]).toBeDefined();
});

test("renders math and Mermaid locally without fetching image references", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await ready(page);
  await create(page, "Private-local-document.md");
  await source(
    page,
    "# PrivateLocalSentinel\n\nInline $x^2$ and text.\n\n$$\n\\frac{a}{b}\n$$\n\n```mermaid\ngraph TD\n  A[Start] --> B[Finish]\n```\n\n![remote](https://example.org/never-request.png)\n"
  );
  await page.getByRole("radio", { name: "Read", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "math: x^2", exact: true })
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("img", { name: /mermaid: graph TD/u })
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByText("Image reference (not fetched)", { exact: false })
  ).toBeVisible();
  expect(
    requests.filter(
      (url) =>
        url.includes("never-request") ||
        url.includes("PrivateLocalSentinel") ||
        url.includes("Private-local-document")
    )
  ).toEqual([]);
});

test("keeps both texts when two tabs save the same revision", async ({
  page,
  context,
}) => {
  await ready(page);
  await create(page, "Shared.md");
  await source(page, "Initial text");
  await expect(
    page.getByText("Saved on this device", { exact: true })
  ).toBeVisible();
  const other = await context.newPage();
  await other.goto("/quill");
  await expect(
    other.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toContainText("Initial text");
  await page
    .getByRole("textbox", { name: "Markdown source", exact: true })
    .fill("First committed text");
  await expect(
    page.getByText("Changes awaiting save", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Saved on this device", { exact: true })
  ).toBeVisible();
  await other
    .getByRole("textbox", { name: "Markdown source", exact: true })
    .fill("Other tab retains this text");
  await expect(
    other.getByText("Another tab saved a newer revision.", { exact: false })
  ).toBeVisible();
  await other
    .getByRole("button", { name: "Save as another document", exact: true })
    .click();
  await expect(
    other.getByRole("heading", { name: "Shared (2).md", exact: true })
  ).toBeVisible();
  await other.reload();
  await expect(
    other.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toContainText("Other tab retains this text");
  await page.reload();
  await page.getByRole("row", { name: "Shared.md", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toContainText("First committed text");
  await other.close();
});

test("organizes nested documents and confirms permanent removal", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("treegrid", { name: "Markdown Library", exact: true })
    .click({ button: "right", position: { x: 8, y: 8 } });
  await page.getByRole("menuitem", { name: "New folder", exact: true }).click();
  await nameInTree(page, "Work");
  await page.getByRole("row", { name: "Work", exact: true }).click();
  await create(page, "Notes.md");
  await source(page, "Keep this text");
  await page
    .getByRole("button", { name: "Library actions: Notes.md", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Notes (2).md", exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Library actions: Notes (2).md", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Move to Trash", exact: true })
    .click();
  await page.getByRole("radio", { name: "Trash", exact: true }).click();
  await page
    .getByRole("button", { name: "Library actions: Notes (2).md", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Restore", exact: true }).click();
  await page.getByRole("radio", { name: "Workspaces", exact: true }).click();
  await page.getByRole("row", { name: "Notes (2).md", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toContainText("Keep this text");
  await page
    .getByRole("button", { name: "Library actions: Notes (2).md", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Move to Trash", exact: true })
    .click();
  await page.getByRole("radio", { name: "Trash", exact: true }).click();
  await page
    .getByRole("button", { name: "Library actions: Notes (2).md", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Remove permanently", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("row", { name: "Notes (2).md", exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Library actions: Notes (2).md", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Remove permanently", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await page.reload();
  await page.getByRole("radio", { name: "Trash", exact: true }).click();
  await expect(page.getByText("Notes (2).md", { exact: true })).toHaveCount(0);
});

test("restores a downloaded backup without replacing current documents", async ({
  page,
}, testInfo) => {
  await ready(page);
  await create(page, "Original.md");
  await source(page, "Original Library text");
  await page
    .getByRole("button", { name: "Library actions", exact: true })
    .click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Download Library Backup", exact: true })
    .click();
  const file = await pending;
  const path = testInfo.outputPath("backup.zip");
  await file.saveAs(path);
  await page
    .getByLabel("Restore Library Backup", { exact: true })
    .setInputFiles(path);
  await expect(
    page.getByRole("row", { name: "Restored Library", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: "Original.md", exact: true })
  ).toHaveCount(2);
  await page.reload();
  await expect(
    page.getByRole("row", { name: "Original.md", exact: true })
  ).toHaveCount(2);
});

test("restores and permanently removes all Trash from the heading menu", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await ready(page);
  await page
    .locator('input[type="file"][aria-label="Import Markdown"]')
    .setInputFiles(
      ["Alpha", "Beta", "Keep"].map((name) => ({
        name: `${name}.md`,
        mimeType: "text/markdown",
        buffer: Buffer.from(`# ${name}\n\nKeep this source.`),
      }))
    );
  await expect(
    page.getByRole("row", { name: "Keep.md", exact: true })
  ).toBeVisible();
  const trashDocuments = async () => {
    for (const name of ["Alpha.md", "Beta.md"]) {
      await page
        .getByRole("button", { name: `Library actions: ${name}`, exact: true })
        .click();
      await page
        .getByRole("menuitem", { name: "Move to Trash", exact: true })
        .click();
      await expect(page.getByRole("row", { name, exact: true })).toHaveCount(0);
    }
    await page.getByRole("radio", { name: "Trash", exact: true }).click();
  };
  await trashDocuments();
  const actions = page.getByRole("button", {
    name: "Trash actions",
    exact: true,
  });
  // Check the new heading menu in both themes and at desktop and phone widths.
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await expect(page.locator("html")).toHaveClass(
        colorScheme === "dark" ? /dark/u : /light/u
      );
      await actions.click();
      await expect(
        page.getByRole("menuitem", { name: "Restore all", exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole("menuitem", {
          name: "Remove all permanently",
          exact: true,
        })
      ).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`trash-${width}-${colorScheme}.png`),
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      ).toBe(true);
      await page.keyboard.press("Escape");
    }
  }
  await actions.focus();
  await actions.press("Enter");
  await page
    .getByRole("menuitem", { name: "Restore all", exact: true })
    .press("Enter");
  await expect(actions).toBeDisabled();
  await expect(
    page.getByRole("treegrid", { name: "Trash", exact: true }).getByRole("row")
  ).toHaveCount(0);
  await page.getByRole("radio", { name: "Workspaces", exact: true }).click();
  await expect(
    page.getByRole("row", { name: "Alpha.md", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: "Beta.md", exact: true })
  ).toBeVisible();
  await trashDocuments();
  await actions.click();
  await page
    .getByRole("menuitem", { name: "Remove all permanently", exact: true })
    .click();
  const confirmation = page.getByRole("alertdialog", {
    name: "Permanently remove everything in Trash?",
    exact: true,
  });
  await expect(confirmation).toBeVisible();
  await confirmation
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(
    page.getByRole("row", { name: "Alpha.md", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: "Beta.md", exact: true })
  ).toBeVisible();
  await actions.click();
  await page
    .getByRole("menuitem", { name: "Remove all permanently", exact: true })
    .click();
  await confirmation
    .getByRole("button", { name: "Confirm", exact: true })
    .click();
  await expect(confirmation).toHaveCount(0);
  await expect(actions).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("row", { name: "Keep.md", exact: true })
  ).toBeVisible();
  await page.getByRole("radio", { name: "Trash", exact: true }).click();
  await expect(actions).toBeDisabled();
  await expect(
    page.getByRole("treegrid", { name: "Trash", exact: true }).getByRole("row")
  ).toHaveCount(0);
  await page.getByRole("radio", { name: "Workspaces", exact: true }).click();
  await expect(
    page.getByRole("row", { name: "Keep.md", exact: true })
  ).toBeVisible();
  await page.getByRole("row", { name: "Keep.md", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toContainText("Keep this source.");
  await expect(
    page.getByRole("row", { name: "Alpha.md", exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("row", { name: "Beta.md", exact: true })
  ).toHaveCount(0);
});

test("supports desktop and narrow layouts in both color modes", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  await create(page, "Field notes.md");
  await source(
    page,
    '# Field notes\n\nWrite a plan. Keep the source. Take your work with you.\n\n## Next steps\n\n- [x] Keep the Markdown Library on this device\n- [ ] Download a Library Backup\n\n| Action | Result |\n| --- | --- |\n| Write | Markdown source |\n| Export | Markdown |\n\n```typescript\nconst promise = "Your words stay here.";\n```\n'
  );
  await page.getByRole("radio", { name: "Read", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Field notes", exact: true })
  ).toBeVisible();
  const closeToast = page.getByRole("button", { name: "Close", exact: true });
  if (await closeToast.isVisible()) {
    await closeToast.click();
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    if (width === 390) {
      await page
        .getByRole("button", { name: "Hide Library", exact: true })
        .click();
    }
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await expect(page.locator("html")).toHaveClass(
        colorScheme === "dark" ? /dark/u : /light/u
      );
      await page.screenshot({
        path: testInfo.outputPath(`${width}-${colorScheme}.png`),
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      ).toBe(true);
    }
  }
});

test("renders Quill in the Indonesian Locale", async ({ browser }) => {
  const context = await browser.newContext({ locale: "id-ID" });
  const page = await context.newPage();
  await page.goto("/quill");
  await expect(
    page.getByText("Tulis, susun, dan ekspor Markdown di perangkat Anda.", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Dokumen baru", exact: true }).first()
  ).toBeEnabled();
  await context.close();
});

test("terminates a stalled diagram and keeps the page controls responsive", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.route(/quill\.diagram\.worker\.ts\?worker_file/u, (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "self.postMessage({ready:true}); self.onmessage = () => { while (true) {} };",
    })
  );
  await ready(page);
  await create(page, "Stalled.md");
  await source(page, "```mermaid\ngraph TD\n A --> B\n```\n");
  await page.getByRole("radio", { name: "Read", exact: true }).click();
  await expect(
    page.getByText("Could not render. Source retained.", { exact: false })
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole("radio", { name: "Source", exact: true }).click();
  await expect(page.locator(".cm-content")).toContainText("graph TD");
});

test("imports a folder from the Explorer with nested Markdown paths", async ({
  page,
}, testInfo) => {
  const folder = testInfo.outputPath("Notes");
  await mkdir(testInfo.outputPath("Notes", "Guides"), { recursive: true });
  await Promise.all([
    writeFile(testInfo.outputPath("Notes", "Readme.md"), "# Notes\r\n"),
    writeFile(
      testInfo.outputPath("Notes", "Guides", "Guide.MARKDOWN"),
      "# Guide\n"
    ),
    writeFile(testInfo.outputPath("Notes", "ignore.txt"), "Skip this file"),
  ]);
  await ready(page);
  const trigger = page.getByRole("button", {
    name: "Import Markdown",
    exact: true,
  });
  await trigger.focus();
  await trigger.press("Enter");
  const choosing = page.waitForEvent("filechooser");
  await page
    .getByRole("menuitem", { name: "Import folder", exact: true })
    .click();
  const chooser = await choosing;
  await chooser.setFiles(folder);
  await expect(
    page.getByRole("row", { name: "Readme.md", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: "Guide.MARKDOWN", exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Files that did not import", { exact: true })
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("row", { name: "Guide.MARKDOWN", exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Library actions", exact: true })
    .click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Export Library ZIP", exact: true })
    .click();
  const download = await downloading;
  const path = await download.path();
  if (!path) {
    throw new Error("Missing Library ZIP");
  }
  const files = unzipSync(await readFile(path));
  expect(Object.keys(files).toSorted()).toEqual([
    "Notes/",
    "Notes/Guides/",
    "Notes/Guides/Guide.MARKDOWN",
    "Notes/Readme.md",
  ]);
  expect(strFromU8(files["Notes/Readme.md"] ?? new Uint8Array())).toBe(
    "# Notes\r\n"
  );
});

test("measures import and switching for a representative local Library", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await ready(page);
  const files = Array.from({ length: 100 }, (_, index) => ({
    name: `Note-${String(index).padStart(3, "0")}.md`,
    mimeType: "text/markdown",
    buffer: Buffer.from(
      `# Note ${index}\n\n${"A local paragraph with a **bold** word.\n\n".repeat(100)}`
    ),
  }));
  const started = performance.now();
  await page
    .locator('input[type="file"][aria-label="Import Markdown"]')
    .setInputFiles(files);
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole("row", { name: "Note-099.md", exact: true })
  ).toBeVisible();
  const importedMs = performance.now() - started;
  const switching = performance.now();
  await page.getByRole("row", { name: "Note-099.md", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toContainText("Note 99");
  const switchMs = performance.now() - switching;
  const reloading = performance.now();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toContainText("Note 99");
  const metrics = {
    documents: files.length,
    markdownBytes: files.reduce((sum, file) => sum + file.buffer.length, 0),
    importedMs: Math.round(importedMs),
    switchMs: Math.round(switchMs),
    reloadMs: Math.round(performance.now() - reloading),
  };
  await testInfo.attach("library-measurement", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
  console.log("Quill Library measurement", JSON.stringify(metrics));
});

test("uses split view, filters nested files, and closes tabs without deleting work", async ({
  page,
}) => {
  await ready(page);
  await page
    .locator('input[type="file"][aria-label="Import Markdown"]')
    .setInputFiles([
      {
        name: "Alpha.md",
        mimeType: "text/markdown",
        buffer: Buffer.from("# Alpha\n\nKeep this text."),
      },
      {
        name: "Beta.md",
        mimeType: "text/markdown",
        buffer: Buffer.from("# Beta"),
      },
    ]);
  await expect(
    page.getByRole("radio", { name: "Split", exact: true })
  ).toBeChecked();
  await expect(
    page.getByRole("region", { name: "Preview", exact: true })
  ).toContainText("Alpha");
  await page.getByRole("row", { name: "Beta.md", exact: true }).click();
  const tabs = page.getByRole("navigation", {
    name: "Open files",
    exact: true,
  });
  await expect(
    tabs.getByRole("button", { name: "Alpha.md", exact: true })
  ).toBeVisible();
  await expect(
    tabs.getByRole("button", { name: "Beta.md", exact: true })
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search files", exact: true })
    .fill("alpha");
  await expect(
    page.getByRole("row", { name: "Beta.md", exact: true })
  ).toHaveCount(0);
  await page
    .getByRole("searchbox", { name: "Search files", exact: true })
    .fill("absent");
  await expect(
    page.getByText("No matching files", { exact: true })
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search files", exact: true })
    .fill("");
  await tabs.getByRole("button", { name: "Alpha.md", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Markdown source", exact: true })
    .fill("# Unsaved Alpha");
  await tabs
    .getByRole("button", { name: "Alpha.md", exact: true })
    .click({ button: "right" });
  await page
    .getByRole("menuitem", { name: "Close other files", exact: true })
    .click();
  await expect(
    tabs.getByRole("button", { name: "Beta.md", exact: true })
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Close file: Alpha.md", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toHaveCount(0);
  await page.getByRole("row", { name: "Alpha.md", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toContainText("Unsaved Alpha");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toContainText("Unsaved Alpha");
});

test("applies source commands at the caret and formats selected Markdown", async ({
  page,
}) => {
  await ready(page);
  await page
    .locator('input[type="file"][aria-label="Import Markdown"]')
    .setInputFiles({
      name: "Commands.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(""),
    });
  const editor = page.getByRole("textbox", {
    name: "Markdown source",
    exact: true,
  });
  await page.getByRole("radio", { name: "Split", exact: true }).click();
  await editor.fill("Menu heading");
  await page.getByRole("button", { name: "Heading", exact: true }).click();
  const headings = page.getByRole("menu", { name: "Heading", exact: true });
  await expect(headings.getByRole("menuitem")).toHaveCount(7);
  await expect(headings.locator('svg[aria-hidden="true"]')).toHaveCount(7);
  await headings
    .getByRole("menuitem", { name: "Heading 4", exact: true })
    .click();
  await expect(editor).toContainText("#### Menu heading");
  await editor.fill("Keep this\n\n");
  await editor.press("ControlOrMeta+End");
  await editor.pressSequentially("/heading 2");
  const menu = page.getByRole("listbox", { name: "Insert block", exact: true });
  await expect(
    menu.getByRole("option", { name: "Heading 2", exact: true })
  ).toBeVisible();
  await editor.press("Enter");
  await expect(editor).toContainText("##");
  await expect(editor).not.toContainText("/heading");
  await editor.pressSequentially("New section");
  await page.getByRole("radio", { name: "Read", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "New section", exact: true })
  ).toBeVisible();
  await page.getByRole("radio", { name: "Source", exact: true }).click();
  await editor.fill("Selected text");
  await editor.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(editor).toContainText("**Selected text**");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(editor).toContainText("Selected text");
  await expect(editor).not.toContainText("**");
  await editor.fill("/");
  await expect(menu).toBeVisible();
  await editor.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(editor).toHaveText("/");
});

test("keeps the rename field open when moving the caret with arrow keys", async ({
  page,
}) => {
  await ready(page);
  await page
    .locator('input[type="file"][aria-label="Import Markdown"]')
    .setInputFiles({
      name: "Notes.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(""),
    });
  await page
    .getByRole("row", { name: "Notes.md", exact: true })
    .click({ button: "right" });
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  const field = page
    .getByRole("treegrid", { name: "Markdown Library", exact: true })
    .getByRole("textbox", { name: "Name", exact: true });
  const caret = () =>
    field.evaluate((input: HTMLInputElement) => [
      input.selectionStart,
      input.selectionEnd,
    ]);
  await expect(field).toBeFocused();
  await field.press("ArrowRight");
  await expect(field).toBeFocused();
  await expect(field).toHaveValue("Notes.md");
  expect(await caret()).toEqual([8, 8]);
  await field.press("ArrowLeft");
  await expect(field).toBeFocused();
  expect(await caret()).toEqual([7, 7]);
  await field.press("Shift+ArrowLeft");
  expect(await caret()).toEqual([6, 7]);
  await field.pressSequentially("M");
  await expect(field).toHaveValue("Notes.Md");
  await field.press("ArrowUp");
  await expect(field).toBeFocused();
  await field.press("ArrowDown");
  await expect(field).toBeFocused();
  await field.press("Enter");
  await expect(field).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("row", { name: "Notes.Md", exact: true })
  ).toBeVisible();
});

test("uses the right-clicked file for actions and creates files in a chosen folder", async ({
  page,
}) => {
  await ready(page);
  await page
    .locator('input[type="file"][aria-label="Import Markdown"]')
    .setInputFiles([
      {
        name: "One.md",
        mimeType: "text/markdown",
        buffer: Buffer.from("# One"),
      },
      {
        name: "Two.md",
        mimeType: "text/markdown",
        buffer: Buffer.from("# Two"),
      },
    ]);
  await page
    .getByRole("row", { name: "Two.md", exact: true })
    .click({ button: "right" });
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  await expect(
    page
      .getByRole("row", { name: "Two.md", exact: true })
      .getByRole("textbox", { name: "Name", exact: true })
  ).toBeFocused();
  await nameInTree(page, "Renamed.md");
  await expect(
    page.getByRole("row", { name: "One.md", exact: true })
  ).toBeVisible();
  await page
    .getByRole("row", { name: "Renamed.md", exact: true })
    .click({ button: "right" });
  await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toContainText("# Two");
  await expect(
    page.getByRole("row", { name: "Renamed (2).md", exact: true })
  ).toBeVisible();
  const tree = page.getByRole("treegrid", {
    name: "Markdown Library",
    exact: true,
  });
  await tree.click({ button: "right", position: { x: 4, y: 4 } });
  await page.getByRole("menuitem", { name: "New folder", exact: true }).click();
  await nameInTree(page, "Work");
  await page
    .getByRole("row", { name: "Work", exact: true })
    .click({ button: "right" });
  await page
    .getByRole("menuitem", { name: "New document", exact: true })
    .click();
  await nameInTree(page, "Nested.md");
  const rowOrder = () =>
    tree
      .getByRole("row")
      .evaluateAll((rows) => rows.map((row) => row.dataset.quillEntry));
  const beforeRename = await rowOrder();
  await page
    .getByRole("button", { name: "Library actions: Work", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  await expect(
    page
      .getByRole("row", { name: "Work", exact: true })
      .getByRole("textbox", { name: "Name", exact: true })
  ).toBeFocused();
  await nameInTree(page, "Projects");
  expect(await rowOrder()).toEqual(beforeRename);
  await expect(
    page.getByRole("row", { name: "Nested.md", exact: true })
  ).toHaveAttribute("aria-level", "2");
  await page
    .getByRole("button", { name: "Library actions: Projects", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  const nameField = tree.getByRole("textbox", { name: "Name", exact: true });
  await expect(nameField).toBeFocused();
  await nameField.press("ArrowRight");
  await expect(nameField).toBeFocused();
  await nameField.press("ArrowLeft");
  await expect(nameField).toBeFocused();
  await expect(
    page.getByRole("row", { name: "Nested.md", exact: true })
  ).toBeVisible();
  await nameField.fill("Discard this name");
  await nameField.press("Escape");
  await expect(nameField).toHaveCount(0);
  await expect(
    page.getByRole("row", { name: "Projects", exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Library actions: Projects", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  await expect(nameField).toBeFocused();
  await nameField.fill("Archive");
  await page
    .getByRole("searchbox", { name: "Search files", exact: true })
    .click();
  await expect(nameField).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("row", { name: "Archive", exact: true })
  ).toBeVisible();
  expect(await rowOrder()).toEqual(beforeRename);
  await page
    .getByRole("searchbox", { name: "Search files", exact: true })
    .fill("nested");
  await expect(
    page.getByRole("row", { name: "Archive", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: "Nested.md", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: "One.md", exact: true })
  ).toHaveCount(0);
});

test("keeps the split workbench within desktop and phone viewports", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await ready(page);
  const content =
    "# Field notes\n\nA place for the next idea.\n\n## The plan\n\n- [x] Keep notes on this device\n- [ ] Write the first draft\n\n> Make room for a clear thought.\n\n| Action | Result |\n| --- | --- |\n| Write | Markdown source |\n| Keep | Local Library |\n";
  await page
    .locator('input[type="file"][aria-label="Import Markdown"]')
    .setInputFiles([
      {
        name: "Field notes.md",
        mimeType: "text/markdown",
        buffer: Buffer.from(content),
      },
      {
        name: "Reading list.md",
        mimeType: "text/markdown",
        buffer: Buffer.from("# Reading list\n\n- A new perspective"),
      },
    ]);
  await page.getByRole("row", { name: "Reading list.md", exact: true }).click();
  await page.getByRole("row", { name: "Field notes.md", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Preview", exact: true })
      .getByRole("heading", { name: "Field notes", exact: true })
  ).toBeVisible();
  const closeToast = page.getByRole("button", { name: "Close", exact: true });
  if (await closeToast.isVisible()) {
    await closeToast.click();
  }
  for (const size of [
    { width: 1440, height: 1000, name: "desktop" },
    { width: 1280, height: 800, name: "user-1280" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize({ width: size.width, height: size.height });
    if (size.width === 390) {
      await page
        .getByRole("button", { name: "Hide Library", exact: true })
        .click();
    }
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await expect(page.locator("html")).toHaveClass(
        new RegExp(colorScheme, "u")
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      ).toBe(true);
      await page.evaluate(
        () =>
          // oxlint-disable-next-line promise/avoid-new -- CodeMirror needs two paint frames to measure after a viewport or theme change.
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => resolve());
            });
          })
      );
      await page.screenshot({
        path: `.impeccable/review/quill/${size.name}${colorScheme === "dark" ? "-dark" : ""}.png`,
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: "dark" });
  const editor = page.getByRole("textbox", {
    name: "Markdown source",
    exact: true,
  });
  await editor.fill(`${content}\n/`);
  await expect(
    page.getByRole("listbox", { name: "Insert block", exact: true })
  ).toBeVisible();
  await page.screenshot({
    path: ".impeccable/review/quill/slash-menu.png",
    fullPage: true,
  });
  await editor.press("Escape");
  await editor.fill(content);
  await page
    .getByRole("row", { name: "Reading list.md", exact: true })
    .click({ button: "right" });
  await expect(
    page.getByRole("menuitem", { name: "Rename", exact: true })
  ).toBeVisible();
  await page.screenshot({
    path: ".impeccable/review/quill/file-menu.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation", { name: "Open files", exact: true })
    .getByRole("button", { name: "Field notes.md", exact: true })
    .click({ button: "right" });
  await expect(
    page.getByRole("menuitem", { name: "Close all files", exact: true })
  ).toBeVisible();
  await page.screenshot({
    path: ".impeccable/review/quill/tab-menu.png",
    fullPage: true,
  });
});

test("moves a file into a folder and back to the root by dragging", async ({
  page,
}) => {
  await ready(page);
  await page
    .locator('input[type="file"][aria-label="Import Markdown"]')
    .setInputFiles([
      {
        name: "Loose.md",
        mimeType: "text/markdown",
        buffer: Buffer.from("# Loose"),
      },
    ]);
  const tree = page.getByRole("treegrid", {
    name: "Markdown Library",
    exact: true,
  });
  await tree.click({ button: "right", position: { x: 4, y: 4 } });
  await page.getByRole("menuitem", { name: "New folder", exact: true }).click();
  await nameInTree(page, "Work");
  const file = page.getByRole("row", { name: "Loose.md", exact: true });
  const folder = page.getByRole("row", { name: "Work", exact: true });
  await expect(file).toHaveAttribute("aria-level", "1");
  await page.setViewportSize({ width: 873, height: 705 });
  const overflow = () =>
    tree.evaluate((node: HTMLElement) => node.offsetHeight - node.clientHeight);
  await file.dragTo(folder);
  await expect(file).toHaveAttribute("aria-level", "2");
  await expect.poll(overflow).toBe(0);
  await file.dragTo(folder, { targetPosition: { x: 40, y: 2 } });
  await expect(file).toHaveAttribute("aria-level", "1");
  await expect.poll(overflow).toBe(0);
  await page.reload();
  await expect(file).toHaveAttribute("aria-level", "1");
  await expect(folder).toBeVisible();
});
