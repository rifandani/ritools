import { readFile } from "node:fs/promises";
import path from "node:path";

import { createPdfRuntime } from "@embedpdf/engine-runtime";
import type { Locator } from "@playwright/test";
import { PDFArray, PDFDict, PDFDocument, PDFName } from "pdf-lib";

import { expect, test } from "./_base";
import type { Page } from "./_base";

test.setTimeout(120_000);

const fixtures = path.resolve(
  import.meta.dirname,
  "../src/features/folio/fixtures"
);

const viewer = (page: Page) => page.locator("embedpdf-viewer");

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

const openFlatten = async (page: Page) => {
  await viewer(page).getByRole("button", { name: "Menu", exact: true }).click();
  await viewer(page)
    .getByRole("menuitem", { name: "Flattened copy", exact: true })
    .click();
  const panel = page.getByRole("complementary", { name: "Flattened copy" });
  await expect(panel).toBeVisible({ timeout: 20_000 });
  return panel;
};

const makeCopy = async (panel: Locator, page: Page, name: string) => {
  await panel
    .getByRole("button", { name: "Make flattened copy", exact: true })
    .click();
  await expect(panel.getByText("Flattened copy ready")).toBeVisible({
    timeout: 60_000,
  });
  const waiting = page.waitForEvent("download");
  await panel
    .getByRole("button", { name: `Download ${name}`, exact: true })
    .click();
  const download = await waiting;
  expect(download.suggestedFilename()).toBe(name);
  return new Uint8Array(await readFile((await download.path()) ?? ""));
};

/** The page text of a PDF, read by PDFium in Node. */
const pageTexts = async (bytes: Uint8Array): Promise<readonly string[]> => {
  const { fn, mem } = await createPdfRuntime({ prefer: "wasm" });
  fn.FPDF_InitLibrary();
  const data = mem.alloc(bytes.byteLength);
  mem.writeBytes(data, bytes);
  const document = fn.FPDF_LoadMemDocument64(data, bytes.byteLength, "");
  expect(document).toBeTruthy();
  const texts: string[] = [];
  for (let index = 0; index < fn.FPDF_GetPageCount(document); index += 1) {
    const page = fn.FPDF_LoadPage(document, index);
    const textPage = fn.FPDFText_LoadPage(page);
    const count = fn.FPDFText_CountChars(textPage);
    const buffer = mem.alloc((count + 1) * 2);
    fn.FPDFText_GetText(textPage, 0, count, buffer);
    texts.push(
      new TextDecoder("utf-16le").decode(mem.readBytes(buffer, count * 2))
    );
    mem.free(buffer);
    fn.FPDFText_ClosePage(textPage);
    fn.FPDF_ClosePage(page);
  }
  fn.FPDF_CloseDocument(document);
  mem.free(data);
  return texts;
};

/** Reopen the copy with pdf-lib, a second parser, and prove it is inert. */
const expectInert = async (bytes: Uint8Array, pageCount: number) => {
  const document = await PDFDocument.load(bytes);
  expect(document.isEncrypted).toBe(false);
  expect(document.getPageCount()).toBe(pageCount);
  const { catalog } = document;
  for (const key of [
    "AcroForm",
    "OpenAction",
    "Names",
    "Outlines",
    "StructTreeRoot",
    "AA",
    "AF",
  ]) {
    expect(catalog.has(PDFName.of(key)), key).toBe(false);
  }
  for (const pdfPage of document.getPages()) {
    const annots = pdfPage.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    expect(annots?.size() ?? 0).toBe(0);
    expect(pdfPage.node.lookupMaybe(PDFName.of("AA"), PDFDict)).toBeUndefined();
  }
  const raw = new TextDecoder("latin1").decode(bytes);
  for (const name of ["/Widget", "/JavaScript", "/EmbeddedFiles", "/Annots"]) {
    expect(raw, name).not.toContain(name);
  }
};

test("flattens a filled form and keeps the open file unsaved", async ({
  page,
}) => {
  const leaks: string[] = [];
  page.on("request", (request) => {
    const carried = `${request.url()} ${request.postData() ?? ""}`;
    if (carried.includes("Flat proof") || carried.includes("-flat.pdf")) {
      leaks.push(carried);
    }
  });
  await upload(page, "sample");
  const field = viewer(page).getByRole("textbox", {
    name: "Your name",
    exact: true,
  });
  await field.fill("Flat proof 33");
  const panel = await openFlatten(page);

  await expect(panel.getByText("All pages (2)")).toBeVisible();
  await expect(panel.getByText("sample-flat.pdf")).toBeVisible();
  await expect(panel.getByText(/not accessible/u)).toBeVisible();
  await expect(panel.getByText(/cannot be filled/u)).toBeVisible();

  const bytes = await makeCopy(panel, page, "sample-flat.pdf");
  await expectInert(bytes, 2);
  const texts = await pageTexts(bytes);
  expect(texts[0]).toContain("Folio sample");
  expect(texts[0]).toContain("Flat proof 33");
  expect(texts[1]).toContain("Page 2");

  // The open file keeps its form field, its value, and its unsaved state.
  await expect(field).toHaveValue("Flat proof 33");
  await viewer(page)
    .getByRole("button", { name: "Close sample", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Close without downloading?" })
  ).toBeVisible();
  expect(leaks).toEqual([]);
});

test("paints the form values of every field type", async ({ page }) => {
  await upload(page, "all-forms");
  const panel = await openFlatten(page);
  const bytes = await makeCopy(panel, page, "all-forms-flat.pdf");
  await expectInert(bytes, 1);
  const [text] = await pageTexts(bytes);
  expect(text).toContain("All simple field types");
  expect(text).toContain("draft alpha");
});

test("removes the document script", async ({ page }) => {
  await upload(page, "script");
  const panel = await openFlatten(page);
  const bytes = await makeCopy(panel, page, "script-flat.pdf");
  await expectInert(bytes, 1);
  expect(new TextDecoder("latin1").decode(bytes)).not.toContain(
    "FOLIO_SCRIPT_SENTINEL"
  );
});

test("removes the attachments", async ({ page }) => {
  await upload(page, "attachments");
  const panel = await openFlatten(page);
  const bytes = await makeCopy(panel, page, "attachments-flat.pdf");
  await expectInert(bytes, 1);
  const [text] = await pageTexts(bytes);
  expect(text).toContain("Generated attachments");
});

test("copies only the selected pages, in page order", async ({ page }) => {
  await upload(page, "text-10");
  const panel = await openFlatten(page);
  await panel.getByRole("radio", { name: /^Selected pages/u }).check({
    force: true,
  });
  await panel
    .getByRole("checkbox", { name: "Page 4", exact: true })
    .click({ force: true });
  await panel
    .getByRole("checkbox", { name: "Page 2", exact: true })
    .click({ force: true });
  await expect(panel.getByText("Selected pages (3)")).toBeVisible();
  const bytes = await makeCopy(panel, page, "text-10-flat.pdf");
  await expectInert(bytes, 3);
  const texts = await pageTexts(bytes);
  // The panel opens on page 1, and pages 4 and 2 join it.
  expect(texts.map((text) => text.trim())).toEqual([
    "Folio fixture page 1",
    "Folio fixture page 2",
    "Folio fixture page 4",
  ]);
});

/** One page whose square sits on a layer that is hidden when the file opens. */
const hiddenLayerPdf = async (): Promise<Uint8Array> => {
  const document = await PDFDocument.create();
  const page = document.addPage([200, 200]);
  const layer = document.context.register(
    document.context.obj({ Name: "Hidden", Type: "OCG" })
  );
  document.catalog.set(
    PDFName.of("OCProperties"),
    document.context.obj({ D: { OFF: [layer], Order: [layer] }, OCGs: [layer] })
  );
  page.node
    .normalizedEntries()
    .Resources.set(
      PDFName.of("Properties"),
      document.context.obj({ hidden: layer })
    );
  page.drawText("Layer proof", { size: 18, x: 20, y: 170 });
  page.node.addContentStream(
    document.context.register(
      document.context.flateStream(
        "/OC /hidden BDC 0 0 0 rg 20 20 160 120 re f EMC"
      )
    )
  );
  return document.save({ useObjectStreams: false });
};

test("refuses pages that use layers and writes no copy", async ({ page }) => {
  await ready(page);
  await page.locator("input[type=file]").setInputFiles({
    buffer: Buffer.from(await hiddenLayerPdf()),
    mimeType: "application/pdf",
    name: "layered.pdf",
  });
  await expect(viewer(page).locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
  const panel = await openFlatten(page);
  await panel
    .getByRole("button", { name: "Make flattened copy", exact: true })
    .click();
  await expect(panel.getByText(/^Layers\./u)).toBeVisible({ timeout: 60_000 });
  await expect(panel.getByText("Flattened copy ready")).toHaveCount(0);
  await expect(panel.getByRole("button", { name: /^Download/u })).toHaveCount(
    0
  );
});

test("refuses a signed file", async ({ page }) => {
  await upload(page, "signed");
  const panel = await openFlatten(page);
  await expect(panel.getByText(/^Signed\./u)).toBeVisible({ timeout: 20_000 });
  await expect(
    panel.getByRole("button", { name: "Make flattened copy", exact: true })
  ).toBeDisabled();
});

test("refuses an encrypted file", async ({ page }) => {
  await ready(page);
  await page
    .locator("input[type=file]")
    .setInputFiles(path.join(fixtures, "encrypted.pdf"));
  const current = viewer(page);
  await current
    .getByPlaceholder("Enter password", { exact: true })
    .fill("folio-test");
  await current.getByRole("button", { name: "Open", exact: true }).click();
  await expect(current.locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
  const panel = await openFlatten(page);
  await expect(panel.getByText(/^Encrypted\./u)).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Make flattened copy", exact: true })
  ).toBeDisabled();
});

test("offers no copy of a corrupt file", async ({ page }) => {
  await ready(page);
  await page
    .locator("input[type=file]")
    .setInputFiles(path.join(fixtures, "corrupt.pdf"));
  const current = viewer(page);
  await expect(current.getByRole("tab", { name: /corrupt/u })).toBeVisible({
    timeout: 20_000,
  });
  const alert = current.getByRole("alert");
  await expect(
    alert.getByRole("heading", { name: "Couldn’t open document" })
  ).toBeVisible();
  await expect(
    alert.getByText("The document could not be opened.")
  ).toBeVisible();
  await current.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(
    current.getByRole("menuitem", { name: "Flattened copy", exact: true })
  ).toHaveCount(0);
});
