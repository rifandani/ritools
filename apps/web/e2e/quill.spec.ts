/* oxlint-disable eslint/no-await-in-loop -- Each browser export and its download must finish before the next one starts. */
import { readFile } from "node:fs/promises";

import { strFromU8, unzipSync } from "fflate";

import { expect, test } from "./_base";
import type { Page } from "./_base";

const ready = async (page: Page) => {
  await page.goto("/quill");
  await expect(
    page.getByRole("treegrid", { name: "Markdown Library", exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Working on this device…", { exact: true })
  ).toHaveCount(0, { timeout: 15_000 });
};
const create = async (page: Page, name: string) => {
  await page
    .getByRole("button", { name: "New document", exact: true })
    .first()
    .click();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill(name);
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Markdown editor", exact: true })
  ).toBeVisible();
};
const source = async (page: Page, text: string) => {
  await page.getByRole("button", { name: "Source", exact: true }).click();
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

test("creates a visual document and restores committed text after reload", async ({
  page,
}) => {
  await ready(page);
  await create(page, "Notes.md");
  await page
    .getByRole("textbox", { name: "Markdown editor", exact: true })
    .fill("A note that stays on this device.");
  await expect(
    page.getByText("Changes awaiting save", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Saved on this device", { exact: true })
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Markdown editor", exact: true })
  ).toHaveText("A note that stays on this device.");
  const file = await markdown(page);
  expect(file.name).toBe("Notes.md");
  expect(file.bytes.toString("utf-8")).toContain(
    "A note that stays on this device."
  );
});

test("preserves import bytes and protects unsupported source", async ({
  page,
}) => {
  await ready(page);
  const original = Buffer.from(
    "\uFEFF---\r\ntitle: Private\r\n---\r\n# Notes\r\n<!-- Keep me -->\r\n",
    "utf-8"
  );
  await page.getByLabel("Import Markdown", { exact: true }).setInputFiles({
    name: "import.md",
    mimeType: "text/markdown",
    buffer: original,
  });
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toBeVisible();
  const exported = await markdown(page);
  expect(exported.bytes).toEqual(original);
  await page.getByRole("button", { name: "Visual", exact: true }).click();
  await expect(
    page.getByText("Visual conversion was refused.", { exact: false })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Review visual conversion", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Review affected content", exact: true })
  ).toContainText("title: Private");
  await page
    .getByRole("button", {
      name: "Keep recovery copy and convert",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Markdown editor", exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Conversion recovery copies", { exact: true })
  ).toBeVisible();
});

test("exports editable DOCX and a backup with Markdown paths", async ({
  page,
}) => {
  await ready(page);
  await create(page, "Plan.md");
  await source(
    page,
    "# Launch plan\n\nA **bold** statement.\n\n| Name | Value |\n| --- | --- |\n| Status | Ready |\n"
  );
  await page
    .getByRole("button", { name: "Export document", exact: true })
    .click();
  await page.getByRole("button", { name: "Prepare DOCX", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download prepared file", exact: true })
    .click();
  const file = await pending;
  const path = await file.path();
  if (!path) {
    throw new Error("Missing download");
  }
  const xml = strFromU8(
    unzipSync(await readFile(path))["word/document.xml"] ?? new Uint8Array()
  );
  expect(xml).toContain("Launch plan");
  expect(xml).toContain("<w:tbl>");
  expect(xml).toContain("Ready");
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
  await page.getByRole("button", { name: "Read", exact: true }).click();
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

test("downloads a paginated PDF from one snapshot with selectable text", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await ready(page);
  await create(page, "Report.md");
  const text = `# Launch report\n\n${Array.from({ length: 100 }, (_, index) => `Paragraph ${index + 1}: This text remains selectable in the PDF.`).join("\n\n")}`;
  await source(page, text);
  await page
    .getByRole("button", { name: "Export document", exact: true })
    .click();
  await page.getByRole("button", { name: "Prepare PDF", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Download prepared file", exact: true })
  ).toBeVisible({ timeout: 20_000 });
  await page
    .getByRole("textbox", { name: "Markdown source", exact: true })
    .fill("# Changed after preparation");
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download prepared file", exact: true })
    .click();
  const file = await downloaded;
  const path = testInfo.outputPath("report.pdf");
  await file.saveAs(path);
  const parser = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = parser.getDocument({
    data: Uint8Array.from(await readFile(path)),
  });
  const pdf = await task.promise;
  expect(pdf.numPages).toBeGreaterThan(1);
  const first = await pdf.getPage(1);
  const content = await first.getTextContent();
  const readable = content.items
    .flatMap((item) => ("str" in item ? [item.str] : []))
    .join(" ");
  expect(readable).toContain("Launch report");
  expect(readable).toContain("This text remains selectable");
  expect(readable).not.toContain("Changed after preparation");
  await task.destroy();
});

test("keeps rendered figures in real DOCX and PDF files", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await ready(page);
  await create(page, "Figures.md");
  await source(
    page,
    "# Local figures\n\nA **bold** word and an *italic* word.\n\n$$\nx^2 + y^2 = z^2\n$$\n\n```mermaid\ngraph TD\n  A[Start] --> B[Finish]\n```\n\n```unknown-language\nA long line of code that must remain readable when it reaches the margin.\n```\n"
  );
  await page
    .getByRole("button", { name: "Export document", exact: true })
    .click();
  for (const format of ["DOCX", "PDF"]) {
    await page
      .getByRole("button", { name: `Prepare ${format}`, exact: true })
      .click();
    await expect(
      page.getByText(`Figures.${format.toLowerCase()}`, { exact: true })
    ).toBeVisible({ timeout: 20_000 });
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download prepared file", exact: true })
      .click();
    const file = await pending;
    const path = testInfo.outputPath(`figures.${format.toLowerCase()}`);
    await file.saveAs(path);
    if (format === "DOCX") {
      const entries = unzipSync(await readFile(path));
      expect(
        Object.keys(entries).filter(
          (name) => name.startsWith("word/media/") && name.endsWith(".png")
        )
      ).toHaveLength(2);
      expect(
        strFromU8(entries["word/document.xml"] ?? new Uint8Array())
      ).toContain("x^2 + y^2 = z^2");
      for (const [name, bytes] of Object.entries(entries)) {
        if (!name.startsWith("word/media/") || !name.endsWith(".png")) {
          continue;
        }
        const ink = await page.evaluate(
          async (url) => {
            const image = new Image();
            image.src = url;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext("2d");
            if (!context) {
              throw new Error("Canvas unavailable");
            }
            context.drawImage(image, 0, 0);
            const pixels = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            ).data;
            let visible = 0;
            for (let index = 0; index < pixels.length; index += 4) {
              if (
                (pixels[index + 3] ?? 0) > 0 &&
                (pixels[index] ?? 255) < 200
              ) {
                visible += 1;
              }
            }
            return visible;
          },
          `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`
        );
        expect(ink, `${name} must contain visible figure ink`).toBeGreaterThan(
          100
        );
      }
    }
  }
});

test("organizes nested documents and confirms permanent removal", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "New folder", exact: true }).click();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Work");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await page.getByRole("row", { name: "Work", exact: true }).click();
  await create(page, "Notes.md");
  await source(page, "Keep this text");
  await page
    .getByRole("button", { name: "Library actions", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Notes (2).md", exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Library actions", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Move to Trash", exact: true })
    .click();
  await page.getByRole("button", { name: "Trash", exact: true }).click();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await page
    .getByRole("button", { name: "Markdown Library", exact: true })
    .click();
  await page.getByRole("row", { name: "Notes (2).md", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Markdown source", exact: true })
  ).toContainText("Keep this text");
  await page
    .getByRole("button", { name: "Library actions", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Move to Trash", exact: true })
    .click();
  await page.getByRole("button", { name: "Trash", exact: true }).click();
  await page
    .getByRole("button", { name: "Remove permanently", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Restore", exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove permanently", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm permanent removal", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Trash", exact: true }).click();
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

test("supports desktop and narrow layouts in both color modes", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  await create(page, "Field notes.md");
  await source(
    page,
    '# Field notes\n\nWrite a plan. Keep the source. Take your work with you.\n\n## Next steps\n\n- [x] Keep the Markdown Library on this device\n- [ ] Download a Library Backup\n\n| Action | Result |\n| --- | --- |\n| Write | Markdown source |\n| Export | DOCX or PDF |\n\n```typescript\nconst promise = "Your words stay here.";\n```\n'
  );
  await page.getByRole("button", { name: "Read", exact: true }).click();
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
  await page.getByRole("button", { name: "Read", exact: true }).click();
  await expect(
    page.getByText("Could not render. Source retained.", { exact: false })
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Source", exact: true }).click();
  await expect(page.locator(".cm-content")).toContainText("graph TD");
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
    .getByLabel("Import Markdown", { exact: true })
    .setInputFiles(files);
  await expect(
    page.getByRole("textbox", { name: "Markdown editor", exact: true })
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole("row", { name: "Note-099.md", exact: true })
  ).toBeVisible();
  const importedMs = performance.now() - started;
  const switching = performance.now();
  await page.getByRole("row", { name: "Note-099.md", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Markdown editor", exact: true })
  ).toContainText("Note 99");
  const switchMs = performance.now() - switching;
  const reloading = performance.now();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Markdown editor", exact: true })
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
