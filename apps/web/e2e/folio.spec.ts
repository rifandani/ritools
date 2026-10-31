/* oxlint-disable unicorn/no-await-expression-member, eslint/no-await-in-loop, react-doctor/async-await-in-loop -- Independent viewer reads and ordered tab actions need these browser-test boundaries. */
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  beginText,
  decodePDFRawStream,
  endText,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFString,
  rgb,
  setFontAndSize,
  setTextMatrix,
  setTextRenderingMode,
  showText,
  StandardFonts,
  TextRenderingMode,
} from "pdf-lib";

import { expect, test } from "./_base";
import type { Page } from "./_base";

const fixtures = path.resolve(
  import.meta.dirname,
  "../src/features/folio/fixtures"
);

const ready = async (page: Page) => {
  await page.goto("/folio");
  await page.waitForFunction(() => {
    const input = document.querySelector("input[type=file]");
    return (
      input &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });
};

const viewer = (page: Page) => page.locator("embedpdf-viewer");

const openSample = async (page: Page) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Open a sample", exact: true })
    .click();
  await expect(viewer(page)).toBeVisible({ timeout: 20_000 });
  await expect(viewer(page).locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
};

const upload = async (page: Page, name: string) => {
  await ready(page);
  await page
    .locator("input[type=file]")
    .setInputFiles(path.join(fixtures, `${name}.pdf`));
  await expect(viewer(page)).toBeVisible({ timeout: 20_000 });
  await expect(viewer(page).locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
};

/** Open the Text (beta) panel, which the document menu carries. */
const openText = async (page: Page) => {
  await viewer(page).getByRole("button", { name: "Menu", exact: true }).click();
  await viewer(page)
    .getByRole("menuitem", { name: "Text (beta)", exact: true })
    .click();
  const panel = page.getByRole("complementary", { name: "Edit text" });
  await expect(panel).toBeVisible({ timeout: 20_000 });
  return panel;
};

/** Rewrite one object in the open editor and wait for the panel to list it. */
const reword = async (page: Page, from: string, to: string) => {
  const panel = page.getByRole("complementary", { name: "Edit text" });
  await panel.getByRole("button", { name: from, exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Text", exact: true });
  await expect(editor).toBeVisible();
  await editor.getByRole("textbox").fill(to);
  await editor
    .getByRole("button", { name: "Apply change", exact: true })
    .click();
};

/** A page with a visible text object that a later white box covers. */
const coveredTextPdf = async (): Promise<Uint8Array> => {
  const document = await PDFDocument.create();
  const page = document.addPage([200, 100]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText("SCALING", {
    color: rgb(0, 0, 0),
    font,
    size: 20,
    x: 20,
    y: 40,
  });
  page.drawRectangle({
    color: rgb(1, 1, 1),
    height: 100,
    width: 200,
    x: 0,
    y: 0,
  });
  return document.save();
};

const save = async (page: Page) => {
  const current = viewer(page);
  await current.getByRole("button", { name: "Menu", exact: true }).click();
  const waiting = page.waitForEvent("download", { timeout: 20_000 });
  await current.getByRole("menuitem", { name: /Download/u }).click();
  const download = await waiting;
  const file = await download.path();
  if (file === null) {
    throw new Error("No downloaded file");
  }
  return {
    bytes: await readFile(file),
    name: download.suggestedFilename(),
  };
};

/** A page with a visible box and an invisible text layer, as OCR writes. */
const invisibleTextPdf = async (): Promise<Uint8Array> => {
  const document = await PDFDocument.create();
  const page = document.addPage([200, 100]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawRectangle({
    color: rgb(1, 0.4, 0.2),
    height: 100,
    width: 200,
    x: 0,
    y: 0,
  });
  const fontKey = page.node.newFontDictionary(font.name, font.ref);
  page.pushOperators(
    setTextRenderingMode(TextRenderingMode.Invisible),
    beginText(),
    setFontAndSize(fontKey, 20),
    setTextMatrix(1, 0, 0, 1, 20, 40),
    showText(font.encodeText("SCALING")),
    endText()
  );
  return document.save();
};

test("opens the offline sample with the local viewer only", async ({
  page,
}) => {
  const origins = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol === "http:" || url.protocol === "https:") {
      origins.add(url.origin);
    }
  });
  await openSample(page);
  const current = viewer(page);
  await expect(
    current.getByRole("button", { name: "Close folio-sample", exact: true })
  ).toBeVisible();
  for (const mode of [
    "View",
    "Annotate",
    "Shapes",
    "Insert",
    "Form",
    "Redact",
  ]) {
    await expect(
      current.getByRole("button", { name: mode, exact: true })
    ).toBeVisible();
  }
  await expect(
    current.getByText("Page 1 of 2", { exact: true }).first()
  ).toBeVisible();
  await current.getByRole("button", { name: "Annotate", exact: true }).click();
  await expect(
    current.getByRole("button", { name: "Highlight", exact: true })
  ).toBeVisible();
  await expect(
    current.getByRole("button", { name: "Comment", exact: true })
  ).toBeVisible();
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});

test("opens several local files in tabs and closes back to the picker", async ({
  page,
}) => {
  await ready(page);
  await page
    .locator("input[type=file]")
    .setInputFiles([
      path.join(fixtures, "sample.pdf"),
      path.join(fixtures, "text-10.pdf"),
    ]);
  const current = viewer(page);
  await expect(current.getByRole("tab", { name: /sample/u })).toBeVisible({
    timeout: 20_000,
  });
  await expect(current.getByRole("tab", { name: /text-10/u })).toBeVisible();
  await current
    .getByRole("button", { name: "Close sample", exact: true })
    .click();
  await expect(current.getByRole("tab", { name: /text-10/u })).toBeVisible();
  await current
    .getByRole("button", { name: "Close text-10", exact: true })
    .click();
  await expect(page.getByText("Drop file here", { exact: true })).toBeVisible();
  await expect(viewer(page)).toHaveCount(0);
});

test("saves a filled form under its original name and reopens it", async ({
  page,
}) => {
  await upload(page, "sample");
  const current = viewer(page);
  await current
    .getByRole("textbox", { name: "Your name", exact: true })
    .fill("Local reader");
  const output = await save(page);
  expect(output.name).toBe("sample.pdf");
  expect(output.bytes.subarray(0, 5).toString()).toBe("%PDF-");
  await current
    .getByRole("button", { name: "Close sample", exact: true })
    .click();
  await expect(page.getByText("Drop file here", { exact: true })).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    buffer: output.bytes,
    mimeType: "application/pdf",
    name: "saved.pdf",
  });
  await expect(
    viewer(page).getByRole("textbox", { name: "Your name", exact: true })
  ).toHaveValue("Local reader", { timeout: 20_000 });
});

test("unlocks an encrypted local file", async ({ page }) => {
  await ready(page);
  await page
    .locator("input[type=file]")
    .setInputFiles(path.join(fixtures, "encrypted.pdf"));
  const current = viewer(page);
  await expect(
    current.getByPlaceholder("Enter password", { exact: true })
  ).toBeVisible({ timeout: 20_000 });
  await current
    .getByPlaceholder("Enter password", { exact: true })
    .fill("wrong");
  await current.getByRole("button", { name: "Open", exact: true }).click();
  await current
    .getByPlaceholder("Enter password", { exact: true })
    .fill("folio-test");
  await current.getByRole("button", { name: "Open", exact: true }).click();
  await expect(current.locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
});

test("opens another file from the tab strip", async ({ page }) => {
  await upload(page, "sample");
  const current = viewer(page);
  const choosing = page.waitForEvent("filechooser");
  await current
    .getByRole("button", { name: "Open a file in a new tab", exact: true })
    .click();
  await (await choosing).setFiles(path.join(fixtures, "text-10.pdf"));
  await expect(current.getByRole("tab", { name: /text-10/u })).toBeVisible({
    timeout: 20_000,
  });
  await expect(current.getByRole("tab", { name: /sample/u })).toBeVisible();
});

test("protects a file with a password and reopens it", async ({ page }) => {
  await upload(page, "sample");
  const current = viewer(page);
  await current.getByRole("button", { name: "Menu", exact: true }).click();
  await current
    .getByRole("menuitem", { name: "Security", exact: true })
    .click();
  await page.getByText("Require password to open", { exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Document password", { exact: true }).fill("secret");
  await dialog
    .getByLabel("Confirm document password", { exact: true })
    .fill("secret");
  await dialog.getByRole("button", { name: "Apply protection" }).click();
  await expect(dialog).toHaveCount(0, { timeout: 20_000 });

  const output = await save(page);
  expect(output.name).toBe("sample.pdf");
  await current
    .getByRole("button", { name: "Close sample", exact: true })
    .click();
  await expect(page.getByText("Drop file here", { exact: true })).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    buffer: output.bytes,
    mimeType: "application/pdf",
    name: "protected.pdf",
  });
  await expect(
    current.getByPlaceholder("Enter password", { exact: true })
  ).toBeVisible({ timeout: 20_000 });
  await current
    .getByPlaceholder("Enter password", { exact: true })
    .fill("secret");
  await current.getByRole("button", { name: "Open", exact: true }).click();
  await expect(current.locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
});

test("runs OCR on a scanned page and opens the machine-text copy", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await upload(page, "scan");
  const current = viewer(page);
  await current.getByRole("button", { name: "Menu", exact: true }).click();
  await current.getByRole("menuitem", { name: "OCR", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("No text", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Start OCR", exact: true }).click();
  await expect(current.getByRole("tab", { name: /scan-ocr/u })).toBeVisible({
    timeout: 120_000,
  });
  const output = await save(page);
  expect(output.name).toBe("scan-ocr.pdf");

  const document = await PDFDocument.load(output.bytes);
  const info = document.context.lookup(
    document.context.trailerInfo.Info,
    PDFDict
  );
  const marker = info?.get(PDFName.of("FolioOCR"));
  expect(marker instanceof PDFString ? marker.decodeText() : null).toContain(
    "folio-ocr/1"
  );

  const contents = document.getPage(0).node.Contents();
  const streams =
    contents instanceof PDFArray
      ? contents.asArray()
      : contents
        ? [contents]
        : [];
  let content = "";
  for (const entry of streams) {
    const stream = document.context.lookup(entry);
    if (stream instanceof PDFRawStream) {
      content += new TextDecoder("latin1").decode(
        decodePDFRawStream(stream).decode()
      );
    }
  }
  expect(content).toContain("3 Tr");
  const usedFonts = new Set(
    [...content.matchAll(/\/(?<font>[^\s/]+) [\d.]+ Tf/gu)].map(
      (match) => match.groups?.["font"] ?? ""
    )
  );
  expect(usedFonts.size).toBeGreaterThan(0);
  const fonts = document
    .getPage(0)
    .node.Resources()
    ?.lookup(PDFName.of("Font"), PDFDict);
  for (const used of usedFonts) {
    expect(fonts?.get(PDFName.of(used))).toBeDefined();
  }
});

test("rewords a text object and reopens the saved file", async ({ page }) => {
  test.setTimeout(120_000);
  await upload(page, "statement");
  await openText(page);
  await reword(page, "Amount", "Total");
  await expect(
    page.getByText("Text changed. Download to keep it.", { exact: true })
  ).toBeVisible({ timeout: 20_000 });
  const panel = page.getByRole("complementary", { name: "Edit text" });
  await expect(
    panel.getByRole("button", { name: "Total", exact: true })
  ).toBeVisible({ timeout: 20_000 });

  const output = await save(page);
  expect(output.name).toBe("statement.pdf");
  await viewer(page)
    .getByRole("button", { name: "Close statement", exact: true })
    .click();
  await expect(page.getByText("Drop file here", { exact: true })).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    buffer: output.bytes,
    mimeType: "application/pdf",
    name: "reopened.pdf",
  });
  await expect(viewer(page).locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
  const reopened = await openText(page);
  await expect(
    reopened.getByRole("button", { name: "Total", exact: true })
  ).toBeVisible({ timeout: 20_000 });
});

test("refuses characters the object font cannot draw", async ({ page }) => {
  test.setTimeout(120_000);
  await upload(page, "statement");
  await openText(page);
  await reword(page, "Amount", "Итого");
  await expect(
    page.getByText(
      "The font cannot draw one of these characters. Remove them, or use the annotation tools to add text.",
      { exact: true }
    )
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("dialog", { name: "Text", exact: true }).getByRole("textbox")
  ).toHaveValue("Итого");
  await page
    .getByRole("dialog", { name: "Text", exact: true })
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(
    page
      .getByRole("complementary", { name: "Edit text" })
      .getByRole("button", { name: "Amount", exact: true })
  ).toBeVisible();
});

test("shows the free space and blocks text wider than it", async ({ page }) => {
  test.setTimeout(120_000);
  await upload(page, "statement");
  const panel = await openText(page);
  await panel.getByRole("button", { name: "Amount", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Text", exact: true });
  await expect(editor).toBeVisible({ timeout: 20_000 });
  await expect(
    editor.getByText("Free space on this line:", { exact: false })
  ).toBeVisible({ timeout: 20_000 });
  await editor
    .getByRole("textbox")
    .fill(
      "Amount including every fee, every adjustment, every credit, and every charge for this year and the whole of the next year as well"
    );
  await expect(editor.getByText("This text is", { exact: false })).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    editor.getByText(
      "The new text is wider than the free space on this line. Shorten it.",
      { exact: true }
    )
  ).toBeVisible({ timeout: 20_000 });
  const apply = editor.getByRole("button", {
    name: "Apply change",
    exact: true,
  });
  await expect(apply).toBeDisabled();
  await editor.getByRole("textbox").fill("Total");
  await expect(apply).toBeEnabled({ timeout: 20_000 });
  await apply.click();
  await expect(
    panel.getByRole("button", { name: "Total", exact: true })
  ).toBeVisible({ timeout: 20_000 });
});

test("leaves an invisible OCR layer out of the editor", async ({ page }) => {
  test.setTimeout(120_000);
  const bytes = await invisibleTextPdf();
  await ready(page);
  await page.locator("input[type=file]").setInputFiles({
    buffer: Buffer.from(bytes),
    mimeType: "application/pdf",
    name: "invisible.pdf",
  });
  await expect(viewer(page).locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
  const panel = await openText(page);
  await expect(
    panel.getByText(
      "Some text on this page is invisible. An edit would not change it.",
      { exact: true }
    )
  ).toBeVisible({ timeout: 20_000 });
});

test("refuses an edit that paints no new pixels", async ({ page }) => {
  test.setTimeout(120_000);
  const bytes = await coveredTextPdf();
  await ready(page);
  await page.locator("input[type=file]").setInputFiles({
    buffer: Buffer.from(bytes),
    mimeType: "application/pdf",
    name: "covered.pdf",
  });
  await expect(viewer(page).locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
  const panel = await openText(page);
  await panel.getByRole("button", { name: "SCALING", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Text", exact: true });
  await editor.getByRole("textbox").fill("SCALING2");
  await editor
    .getByRole("button", { name: "Apply change", exact: true })
    .click();
  await expect(
    page.getByText(
      "This text does not paint the page. It may be an OCR layer. Use the annotation tools to add text.",
      { exact: true }
    )
  ).toBeVisible({ timeout: 20_000 });
});

test("warns that a tagged page may go stale", async ({ page }) => {
  await upload(page, "tags");
  const panel = await openText(page);
  await expect(
    panel.getByText(
      "This page is tagged. After an edit, its tags may be stale.",
      { exact: true }
    )
  ).toBeVisible({ timeout: 20_000 });
});

test("leaves a signed file without the text mode", async ({ page }) => {
  await upload(page, "signed");
  await viewer(page).getByRole("button", { name: "Menu", exact: true }).click();
  await expect(
    viewer(page).getByRole("menuitem", { name: "Text (beta)", exact: true })
  ).toHaveCount(0);
});

test("undoes a text change", async ({ page }) => {
  test.setTimeout(120_000);
  await upload(page, "statement");
  const panel = await openText(page);
  await reword(page, "Amount", "Total");
  const undo = panel.getByRole("button", {
    name: "Undo text change",
    exact: true,
  });
  await expect(undo).toBeEnabled({ timeout: 20_000 });
  await undo.click();
  await expect(
    panel.getByRole("button", { name: "Amount", exact: true })
  ).toBeVisible({ timeout: 20_000 });
  await expect(undo).toBeDisabled();
});

test("applies with Enter and cancels with Escape", async ({ page }) => {
  test.setTimeout(120_000);
  await upload(page, "statement");
  const panel = await openText(page);
  const editor = page.getByRole("dialog", { name: "Text", exact: true });
  await panel.getByRole("button", { name: "Amount", exact: true }).click();
  await expect(editor).toBeVisible();
  await editor.getByRole("textbox").press("Escape");
  await expect(editor).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Amount", exact: true })
  ).toBeVisible();

  await panel.getByRole("button", { name: "Amount", exact: true }).click();
  await editor.getByRole("textbox").fill("Total");
  await editor.getByRole("textbox").press("Enter");
  await expect(
    page.getByText("Text changed. Download to keep it.", { exact: true })
  ).toBeVisible({ timeout: 20_000 });
});

test("keeps the narrow layout inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSample(page);
  await expect(
    viewer(page).getByRole("button", {
      name: "Close folio-sample",
      exact: true,
    })
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
  const panel = await openText(page);
  await expect(
    panel.getByRole("button", { name: "Your name", exact: true })
  ).toBeVisible({ timeout: 20_000 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});
