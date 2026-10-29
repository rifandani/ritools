/* oxlint-disable unicorn/no-await-expression-member, eslint/max-classes-per-file, eslint/no-await-in-loop -- Independent PDF read-back and ordered fault injection require these browser-test boundaries. */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { AxeBuilder } from "@axe-core/playwright";
import {
  PDFDocument,
  StandardFonts,
  PDFName,
  PDFArray,
  PDFDict,
  PDFHexString,
  PDFString,
} from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import { expect, test } from "./_base";
import type { Page } from "./_base";

declare global {
  interface Window {
    folioCrash?: () => void;
    folioReject?: string;
  }
}

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
test("opens the offline sample and reads searchable text", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Try a sample", exact: true }).click();
  await expect(page.locator("#folio-document")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator("[data-folio-text]").first()).toBeAttached({
    timeout: 20_000,
  });
  await page
    .getByRole("searchbox", { name: "Search text", exact: true })
    .fill("Folio");
  await page.getByRole("button", { name: "Search text", exact: true }).click();
  await expect(page.getByText(/Match \d+ of/u).last()).toBeVisible();
});

const sample = async (page: Page) => {
  await ready(page);
  await page.getByRole("button", { name: "Try a sample", exact: true }).click();
  await expect(page.locator("[data-folio-text]").first()).toBeAttached();
};
const uploaded = async (page: Page, name: string) => {
  await ready(page);
  await page
    .locator("input[type=file]")
    .setInputFiles(path.join(fixtures, `${name}.pdf`));
};
const download = async (page: Page, extract = false) => {
  if (!extract) {
    await page.locator("#folio-download").click();
  }
  const dialog = page.getByRole("dialog", {
    name: "Download scope",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const waiting = page.waitForEvent("download");
  await dialog
    .getByRole("button", {
      name: extract ? "Extract selected pages" : "Download PDF",
      exact: true,
    })
    .click();
  const result = await waiting;
  const file = await result.path();
  if (!file) {
    throw new Error("No download");
  }
  const bytes = await readFile(file);
  await dialog
    .getByRole("button", { name: "Close", exact: true })
    .last()
    .click();
  return { bytes, name: result.suggestedFilename() };
};

test("commits annotation and form drafts, mixes history, and verifies full and selected bytes", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await sample(page);
  await page.locator("#folio-open-annotations").click();
  await page.getByRole("button", { name: "Note", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Annotation text", exact: true })
    .fill("Browser note");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText("Browser note", { exact: true })).toBeVisible();
  await page.locator("#folio-open-forms").click();
  await page
    .locator("[data-folio-forms]")
    .getByRole("textbox", { name: "Your name", exact: true })
    .fill("Local reader");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(
    page
      .locator("[data-folio-forms]")
      .getByRole("textbox", { name: "Your name", exact: true })
  ).toHaveValue("Local reader");
  await page.locator("#folio-open-pages").click();
  await page
    .getByRole("checkbox", { name: "Select page 2", exact: true })
    .check();
  await page.getByRole("button", { name: "Move up", exact: true }).click();
  await page
    .getByRole("button", { name: "Rotate clockwise", exact: true })
    .click();
  await page.locator("#folio-undo").click();
  await page.locator("#folio-redo").click();
  const output = await download(page);
  expect(output.name).toBe("folio-sample-edited.pdf");
  const pdf = await PDFDocument.load(output.bytes);
  expect(pdf.getPageCount()).toBe(2);
  expect(pdf.getPage(0).getRotation().angle).toBe(90);
  expect(pdf.getPage(0).getWidth()).toBe(600);
  expect(pdf.getForm().getTextField("readerName").getText()).toBe(
    "Local reader"
  );
  const annots = pdf.getPage(1).node.lookup(PDFName.of("Annots"), PDFArray);
  const contents = annots.asArray().flatMap((ref) => {
    const item = pdf.context.lookup(ref, PDFDict);
    const value = item.lookup(PDFName.of("Contents"));
    return value instanceof PDFString || value instanceof PDFHexString
      ? [value.decodeText()]
      : [];
  });
  expect(contents).toContain("Browser note");
  const reopened = await getDocument({
    data: new Uint8Array(output.bytes),
    isEvalSupported: false,
  }).promise;
  const first = await reopened.getPage(1);
  const firstText = await first.getTextContent();
  expect(
    firstText.items
      .filter((item) => "str" in item)
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
  ).toContain("Move this page");
  const second = await reopened.getPage(2);
  const savedAnnotations = await second.getAnnotations();
  expect(
    savedAnnotations.some((item) => item.contentsObj?.str === "Browser note")
  ).toBe(true);
  const fieldObjects = await reopened.getFieldObjects();
  expect(fieldObjects?.readerName).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        value: "Local reader",
      }),
    ])
  );
  await reopened.destroy();

  await page
    .getByRole("button", { name: "Extract selected pages", exact: true })
    .click();
  const extracted = await download(page, true);
  const subset = await PDFDocument.load(extracted.bytes);
  expect(subset.getPageCount()).toBe(1);
  expect(subset.getPage(0).getRotation().angle).toBe(90);
  expect(subset.getPage(0).getWidth()).toBe(600);
});

test("imports reviewed sources atomically and keeps all files in a multiple-file choice", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await ready(page);
  await page
    .locator("input[type=file]")
    .setInputFiles([
      path.join(fixtures, "sample.pdf"),
      path.join(fixtures, "pages-1.pdf"),
    ]);
  await expect(page.getByRole("dialog")).toContainText("sample.pdf");
  await expect(page.getByRole("dialog")).toContainText("pages-1.pdf");
  await page
    .getByRole("button", {
      name: "Open and review other files for import",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Import pages",
    exact: true,
  });
  await expect(dialog).toContainText("1 pages will be added");
  await dialog
    .getByRole("button", { name: "Import pages", exact: true })
    .click();
  await expect(page.getByText(/3 pages · revision 1/u)).toBeVisible();
  await page.locator("#folio-undo").click();
  await expect(page.getByText(/2 pages · revision 2/u)).toBeVisible();
  await page.locator("#folio-redo").click();
  const output = await download(page);
  expect((await PDFDocument.load(output.bytes)).getPageCount()).toBe(3);
});

for (const [fixture, reason] of [
  ["signed", "signature"],
  ["xfa", "XFA"],
  ["script", "active content"],
  ["layers", "layers"],
  ["tags", "tags"],
  ["attachments", "attachments"],
  ["unknown-annotation", "annotation"],
] as const) {
  test(`opens ${fixture} read only`, async ({ page }) => {
    await uploaded(page, fixture);
    await expect(page.locator("#folio-document")).toBeVisible();
    await expect(
      page.getByText(new RegExp(`Read only:.*${reason}`, "iu"))
    ).toBeVisible();
    await expect(page.locator("#folio-download")).toBeDisabled();
  });
}

test("reports corrupt input and supports wrong-password recovery without output", async ({
  page,
}) => {
  await uploaded(page, "corrupt");
  await expect(page.locator("#folio-error")).toContainText("cannot be opened");
  await page
    .locator("input[type=file]")
    .setInputFiles(path.join(fixtures, "encrypted.pdf"));
  await expect(page.locator("#folio-password")).toBeVisible();
  await page.locator("#folio-password").fill("wrong");
  await page
    .getByRole("button", { name: "Open for reading", exact: true })
    .click();
  await expect(
    page.getByText("Password is incorrect. Try again.", { exact: true })
  ).toBeVisible();
  await page.locator("#folio-password").fill("folio-test");
  await page
    .getByRole("button", { name: "Open for reading", exact: true })
    .click();
  await expect(page.locator("#folio-document")).toBeVisible();
  await expect(page.locator("#folio-download")).toBeDisabled();
});

test("keeps native draft undo and composition outside PDF History", async ({
  page,
}) => {
  await sample(page);
  await page.locator("#folio-open-forms").click();
  const field = page
    .locator("[data-folio-forms]")
    .getByRole("textbox", { name: "Your name", exact: true });
  await field.focus();
  await field.pressSequentially("Draft");
  await field.press("ControlOrMeta+z");
  await expect(field).not.toHaveValue("Draft");
  await field.fill("");
  const ime = await page.context().newCDPSession(page);
  await ime.send("Input.imeSetComposition", {
    text: "Composed",
    selectionStart: 8,
    selectionEnd: 8,
  });
  await expect(page.getByText(/revision 0/u).first()).toBeVisible();
  await ime.send("Input.insertText", { text: "Composed name" });
  await expect(field).toHaveValue("Composed name");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText(/revision 1/u).first()).toBeVisible();
  await page.locator("#folio-open-pages").click();
  await page
    .getByRole("checkbox", { name: "Select page 1", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Select page 2", exact: true })
    .check();
  await expect(
    page.getByRole("button", { name: "Delete selected pages", exact: true })
  ).toBeDisabled();
});

for (const locale of ["en-us", "id-id"] as const) {
  for (const color of ["light", "dark"] as const) {
    for (const width of [390, 1440]) {
      test(`layout and accessibility ${locale} ${color} ${width}`, async ({
        page,
        context,
      }) => {
        test.setTimeout(45_000);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({
          colorScheme: color,
          reducedMotion: "reduce",
        });
        await context.addCookies([
          { name: "app-locale", value: locale, domain: "localhost", path: "/" },
        ]);
        await ready(page);
        await page
          .getByRole("button", {
            name: locale === "id-id" ? "Coba sampel" : "Try a sample",
            exact: true,
          })
          .click();
        await expect(page.locator("[data-folio-text]").first()).toBeAttached();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth
          )
        ).toBe(true);
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
              .analyze()
          ).violations
        ).toEqual([]);
        await page.locator("#folio-open-pages").click();
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
              .analyze()
          ).violations
        ).toEqual([]);
      });
    }
  }
}

test("creates highlights from keyboard text selection and added text with one commit each", async ({
  page,
}) => {
  await sample(page);
  await page.locator('[data-folio-page="1"] summary').click();
  const text = page.locator('[data-folio-page="1"] textarea');
  await text.focus();
  await text.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Highlight", exact: true }).click();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText(/revision 1/u).first()).toBeVisible();
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Annotation text", exact: true })
    .fill("Added annotation");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  const output = await download(page);
  const pdf = await getDocument({
    data: new Uint8Array(output.bytes),
    isEvalSupported: false,
  }).promise;
  const saved = await (await pdf.getPage(1)).getAnnotations();
  expect(
    saved.some(
      (item) => item.subtype === "Highlight" && item.quadPoints?.length
    )
  ).toBe(true);
  expect(
    saved.some(
      (item) =>
        item.subtype === "FreeText" &&
        item.contentsObj?.str === "Added annotation"
    )
  ).toBe(true);
  await pdf.destroy();
});

test("blocks order-changing writes on reference-bearing documents and rejects unsafe sources", async ({
  page,
}) => {
  await uploaded(page, "structure");
  await expect(page.locator("#folio-document")).toBeVisible();
  await page.locator("#folio-open-pages").click();
  await page
    .getByRole("checkbox", { name: "Select page 2", exact: true })
    .check();
  await page.getByRole("button", { name: "Move up", exact: true }).click();
  await expect(page.locator("#folio-error")).toContainText(
    "cannot be remapped"
  );
  await expect(page.getByText(/revision 0/u).first()).toBeVisible();
  await page
    .locator("input[type=file]")
    .setInputFiles(path.join(fixtures, "sample.pdf"));
  await expect(page.locator("[data-folio-text]").first()).toBeAttached();
  await page.locator("#folio-open-pages").click();
  await page.getByRole("button", { name: "Import pages", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Import pages",
    exact: true,
  });
  await dialog
    .locator("input[type=file]")
    .setInputFiles(path.join(fixtures, "signed.pdf"));
  await expect(dialog).toContainText("signature");
  await expect(
    dialog.getByRole("button", { name: "Import pages", exact: true })
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText(/2 pages · revision 0/u)).toBeVisible();
});

test("guards replacement, makes receipts stale, and keeps selected extraction out of history", async ({
  page,
}) => {
  await sample(page);
  await page.locator("#folio-open-pages").click();
  await page
    .getByRole("checkbox", { name: "Select page 1", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Rotate clockwise", exact: true })
    .click();
  await expect(page.getByText(/revision 1/u).first()).toBeVisible();
  await page
    .locator("input[type=file]")
    .setInputFiles(path.join(fixtures, "pages-1.pdf"));
  await expect(page.getByRole("alertdialog")).toContainText("Discard changes?");
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await download(page);
  await page
    .getByRole("button", { name: "Rotate clockwise", exact: true })
    .click();
  await expect(
    page.getByText("Changes were made after the last download.", {
      exact: true,
    })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Extract selected pages", exact: true })
    .click();
  await download(page, true);
  await expect(page.getByText(/revision 2/u).first()).toBeVisible();
  await expect(
    page.getByText("Changes are ready to download.", { exact: true })
  ).toBeVisible();
});

test("uses a touch profile for page selection, sheets, and form entry", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await sample(page);
  await page.locator("#folio-open-pages").tap();
  await page
    .getByRole("checkbox", { name: "Select page 2", exact: true })
    .tap();
  await expect(
    page.getByRole("dialog", { name: "Pages", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).last().tap();
  await page.locator("#folio-more").tap();
  await page.getByRole("menuitem", { name: "Form fields", exact: true }).tap();
  const field = page
    .locator("[data-folio-forms]")
    .getByRole("textbox", { name: "Your name", exact: true });
  await field.fill("Touch reader");
  await page.getByRole("button", { name: "Apply", exact: true }).tap();
  await expect(field).toHaveValue("Touch reader");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await context.close();
});

for (const width of [390, 1440]) {
  test(`bounds live pages and raster bytes across 1000 pages at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    const workload = await PDFDocument.create();
    for (let i = 0; i < 1000; i += 1) {
      const sheet = workload.addPage([612, 792]);
      sheet.drawText(`Folio workload page ${i + 1}`, {
        x: 48,
        y: 720,
        size: 16,
      });
    }
    const bytes = Buffer.from(await workload.save());
    await page.locator("input[type=file]").setInputFiles({
      name: `${"A long local filename ".repeat(12)}.pdf`,
      mimeType: "application/pdf",
      buffer: bytes,
    });
    await expect(page.locator("[data-folio-text]").first()).toBeAttached();
    await page.locator("#folio-page-input").fill("1000");
    await page.locator("#folio-page-input").press("Enter");
    await expect(page.locator('[data-folio-page="1000"]')).toBeAttached();
    await page.waitForFunction(() =>
      [
        ...document.querySelectorAll<HTMLCanvasElement>(
          "#folio-document canvas"
        ),
      ].every(
        (canvas) =>
          canvas.getContext("2d")?.getImageData(0, 0, 1, 1).data[3] === 255
      )
    );
    const metrics = await page.locator("#folio-document").evaluate((node) => {
      const canvases = [...node.querySelectorAll("canvas")];
      return {
        count: canvases.length,
        bytes: canvases.reduce(
          (total, canvas) => total + canvas.width * canvas.height * 4,
          0
        ),
      };
    });
    expect(metrics.count).toBeLessThanOrEqual(width === 390 ? 3 : 6);
    expect(metrics.bytes).toBeLessThanOrEqual(
      (width === 390 ? 16 : 48) * 1024 * 1024
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
    await page.locator("#folio-zoom").selectOption("3");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
    await page
      .locator("input[type=file]")
      .setInputFiles(path.join(fixtures, "sample.pdf"));
    await expect(page.getByText(/2 pages · revision 0/u)).toBeVisible();
  });
}

test("reports missing engine assets with retry and keeps the file local", async ({
  page,
}) => {
  const requests: { url: string; method: string; body: string | null }[] = [];
  page.on("request", (request) =>
    requests.push({
      url: request.url(),
      method: request.method(),
      body: request.postData(),
    })
  );
  await ready(page);
  await page.route(
    (url) =>
      url.pathname.includes("folio.worker") &&
      (url.pathname.endsWith(".js") || url.searchParams.has("worker_file")),
    (route) => route.abort("failed")
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "private-name-8731.pdf",
    mimeType: "application/pdf",
    buffer: await readFile(path.join(fixtures, "sample.pdf")),
  });
  await expect(page.locator("#folio-error")).toContainText(
    "Connect to download"
  );
  await page.unrouteAll();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator("#folio-document")).toBeVisible();
  expect(
    requests.every(
      (request) => new URL(request.url).origin === new URL(page.url()).origin
    )
  ).toBe(true);
  expect(JSON.stringify(requests)).not.toContain("private-name-8731");
  expect(
    requests
      .filter((request) => request.method !== "GET" || request.body)
      .map(({ url, method }) => ({ url, method })).length === 0
  ).toBe(true);
});

test("reports a missing required font instead of accepting replacement boxes", async ({
  page,
  context,
}) => {
  await ready(page);
  await context.route("**/folio/standard_fonts/**", (route) =>
    route.abort("failed")
  );
  await page.getByRole("button", { name: "Try a sample", exact: true }).click();
  await expect(page.locator("#folio-error")).toContainText(
    "Connect to download"
  );
});

test("keeps the last committed document after cancellation and reports Worker loss", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.Worker;
    const workers = new Set<Worker>();
    window.Worker = class extends Native {
      constructor(url: URL | string, options?: WorkerOptions) {
        super(url, options);
        if (options?.name === "folio-engine") {
          workers.add(this);
        }
      }
    };
    Object.defineProperty(window, "folioCrash", {
      value: () => {
        for (const worker of workers) {
          worker.terminate();
          worker.dispatchEvent(
            new ErrorEvent("error", { message: "Synthetic Worker loss" })
          );
        }
      },
    });
  });
  await sample(page);
  await page.evaluate(() => {
    window.folioCrash?.();
  });
  await page.locator("#folio-search").fill("Folio");
  await page.getByRole("button", { name: "Search text", exact: true }).click();
  await expect(page.locator("#folio-error")).toContainText("session was lost");
  await expect(page.locator("#folio-download")).toHaveCount(0);
});

test("cached offline reload can edit and download without sending document data", async ({
  page,
  context,
}) => {
  test.skip(
    process.env.PW_PRODUCTION !== "true",
    "Requires the production Service Worker and hashed assets."
  );
  await sample(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await ready(page);
  await page.getByRole("button", { name: "Try a sample", exact: true }).click();
  await expect(page.locator("[data-folio-text]").first()).toBeAttached();
  await download(page);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => {
    const input = document.querySelector("input[type=file]");
    return (
      input &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });
  await page.getByRole("button", { name: "Try a sample", exact: true }).click();
  await expect(page.locator("[data-folio-text]").first()).toBeAttached();
  await page.locator("#folio-open-pages").click();
  await page
    .getByRole("checkbox", { name: "Select page 1", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Rotate clockwise", exact: true })
    .click();
  const output = await download(page);
  expect(
    (await PDFDocument.load(output.bytes)).getPage(0).getRotation().angle
  ).toBe(90);
});

test("fills each supported form kind and retains field appearances in saved bytes", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await uploaded(page, "all-forms");
  await expect(page.locator("#folio-document")).toBeVisible();
  await page.locator("#folio-open-forms").click();
  const panel = page.locator("[data-folio-forms]");
  await expect(
    panel.getByRole("textbox", { name: /^requiredText/u })
  ).toHaveAttribute("aria-required", "true");
  await panel
    .getByRole("textbox", { name: /^requiredText/u })
    .fill("Required draft");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText(/revision 1/u).first()).toBeVisible();
  await panel.getByRole("checkbox", { name: "check", exact: true }).check();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText(/revision 2/u).first()).toBeVisible();
  await panel.getByRole("radio", { name: "two", exact: true }).check();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText(/revision 3/u).first()).toBeVisible();
  await panel
    .getByRole("combobox", { name: "combo", exact: true })
    .selectOption("beta");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText(/revision 4/u).first()).toBeVisible();
  const multi = panel.getByRole("group", { name: "multi", exact: true });
  await multi.getByRole("checkbox", { name: "one", exact: true }).uncheck();
  await multi.getByRole("checkbox", { name: "two", exact: true }).check();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText(/revision 5/u).first()).toBeVisible();
  await panel
    .getByRole("combobox", { name: "single", exact: true })
    .selectOption("two");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText(/revision 6/u).first()).toBeVisible();
  await expect(
    panel.getByRole("textbox", { name: "locked", exact: true })
  ).toBeDisabled();
  const output = await download(page);
  const pdf = await PDFDocument.load(output.bytes);
  const form = pdf.getForm();
  expect(form.getTextField("requiredText").getText()).toBe("Required draft");
  expect(form.getCheckBox("check").isChecked()).toBe(true);
  expect(form.getRadioGroup("radio").getSelected()).toBe("two");
  expect(form.getDropdown("combo").getSelected()).toEqual(["beta"]);
  expect(form.getOptionList("multi").getSelected()).toEqual(["two", "three"]);
  expect(form.getOptionList("single").getSelected()).toEqual(["two"]);
  for (const field of form.getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      expect(widget.dict.has(PDFName.of("AP"))).toBe(true);
    }
  }
});

test("creates a keyboard drawing and deletes a selected page without orphan fields", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await sample(page);
  await page.locator("#folio-open-annotations").click();
  await page.getByRole("button", { name: "Draw", exact: true }).click();
  await page.getByRole("button", { name: "Add point", exact: true }).click();
  await page
    .getByRole("spinbutton", {
      name: "Horizontal position (PDF points)",
      exact: true,
    })
    .last()
    .fill("80");
  await page.getByRole("button", { name: "Add point", exact: true }).click();
  await page
    .getByRole("button", { name: "Finish drawing", exact: true })
    .click();
  await expect(page.getByText(/revision 1/u).first()).toBeVisible();
  const output = await download(page);
  const pdf = await getDocument({
    data: new Uint8Array(output.bytes),
    isEvalSupported: false,
  }).promise;
  const annotations = await (await pdf.getPage(1)).getAnnotations();
  expect(
    annotations.some(
      (annotation) =>
        annotation.subtype === "Ink" && annotation.inkLists?.[0]?.length === 4
    )
  ).toBe(true);
  const ink = annotations.find((annotation) => annotation.subtype === "Ink");
  expect(ink?.rect).toEqual([23, 23, 81, 25]);
  expect([...(ink?.color ?? [])]).toEqual([184, 0, 22]);
  await pdf.destroy();
  await page.locator("#folio-open-pages").click();
  await page
    .getByRole("checkbox", { name: "Select page 1", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Delete selected pages", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete selected pages", exact: true })
    .click();
  await expect(page.getByText(/1 pages · revision 2/u)).toBeVisible();
  const deleted = await download(page);
  const remaining = await PDFDocument.load(deleted.bytes);
  expect(remaining.getPageCount()).toBe(1);
  expect(remaining.getForm().getFields()).toHaveLength(0);
});

test("renders the empty route on the server without PDF engine requests", async ({
  page,
  browser,
  request,
}) => {
  const html = await (await request.get("/folio")).text();
  expect(html).toContain("Folio — PDF viewer and editor");
  expect(html).toContain("Drop file here");
  expect(html).toContain("og:image");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  await staticPage.goto("/folio");
  await expect(
    staticPage.getByRole("button", { name: "Choose file", exact: true }).first()
  ).toBeVisible();
  await context.close();
  const loaded: string[] = [];
  page.on("request", (outgoing) => loaded.push(outgoing.url()));
  await ready(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  expect(
    loaded.filter((url) =>
      /folio.*worker|standard_fonts|cmaps|\/folio\/wasm/u.test(url)
    )
  ).toEqual([]);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/folio");
});

test("retries a required font without discarding committed changes", async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await ready(page);
  const fixture = await PDFDocument.create();
  const sans = await fixture.embedFont(StandardFonts.Helvetica);
  const fixed = await fixture.embedFont(StandardFonts.Courier);
  for (let i = 0; i < 7; i += 1) {
    fixture.addPage([612, 792]).drawText(`Page ${i + 1}`, {
      x: 48,
      y: 720,
      font: i === 6 ? fixed : sans,
      size: 18,
    });
  }
  await page.locator("input[type=file]").setInputFiles({
    name: "font-retry.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await fixture.save()),
  });
  await expect(page.locator("[data-folio-text]").first()).toBeAttached();
  await page.locator("#folio-open-annotations").click();
  await page.getByRole("button", { name: "Note", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Annotation text", exact: true })
    .fill("Keep this edit");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText(/revision 1/u).first()).toBeVisible();
  await context.route("**/folio/standard_fonts/FoxitFixed.pfb", (route) =>
    route.abort("failed")
  );
  await page.locator("#folio-page-input").fill("7");
  await page.locator("#folio-page-input").press("Enter");
  await expect(page.locator("#folio-error")).toContainText(
    "Connect to download"
  );
  await context.unrouteAll();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator("#folio-error")).toHaveCount(0);
  await expect(
    page.locator('[data-folio-page="7"] [data-folio-text]').first()
  ).toBeAttached();
  await expect(page.getByText(/revision 1/u).first()).toBeVisible();
  const output = await download(page);
  const pdf = await getDocument({
    data: new Uint8Array(output.bytes),
    isEvalSupported: false,
  }).promise;
  expect(
    (await (await pdf.getPage(1)).getAnnotations()).some(
      (annotation) => annotation.contentsObj?.str === "Keep this edit"
    )
  ).toBe(true);
  await pdf.destroy();
});

test("reports live memory, stale-change, and verification failures without a false receipt", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.Worker;
    const held = new Map<Worker, { id: string; revision: number }>();
    window.Worker = class extends Native {
      postMessage(
        message: Parameters<Worker["postMessage"]>[0],
        options?: StructuredSerializeOptions | Transferable[]
      ) {
        const request = message?.payload;
        const code = window.folioReject;
        if (code === "hold-cancel" && request?._tag === "Commit") {
          window.folioReject = undefined;
          held.set(this, {
            id: request.request,
            revision: request.baseRevision,
          });
          return;
        }
        const pending = held.get(this);
        if (request?._tag === "Cancel" && pending) {
          held.delete(this);
          queueMicrotask(() => {
            this.dispatchEvent(
              new MessageEvent("message", {
                data: {
                  protocol: 1,
                  payload: {
                    _tag: "Rejected",
                    request: pending.id,
                    code: "cancelled",
                    reason: null,
                    preservedRevision: pending.revision,
                    sessionAlive: true,
                    retry: "same-operation",
                  },
                },
              })
            );
            this.dispatchEvent(
              new MessageEvent("message", {
                data: {
                  protocol: 1,
                  payload: {
                    _tag: "Cancelled",
                    request: request.request,
                    target: pending.id,
                  },
                },
              })
            );
          });
          return;
        }
        if (code && (request?._tag === "Commit" || request?._tag === "Write")) {
          window.folioReject = undefined;
          queueMicrotask(() =>
            this.dispatchEvent(
              new MessageEvent("message", {
                data: {
                  protocol: 1,
                  payload: {
                    _tag: "Rejected",
                    request: request.request,
                    code,
                    reason: null,
                    preservedRevision:
                      request.revision ?? request.baseRevision ?? null,
                    sessionAlive: true,
                    retry: "none",
                  },
                },
              })
            )
          );
          return;
        }
        if (Array.isArray(options)) {
          super.postMessage(message, options);
        } else {
          super.postMessage(message, options);
        }
      }
    };
  });
  await sample(page);
  await page.locator("#folio-open-pages").click();
  await page
    .getByRole("checkbox", { name: "Select page 1", exact: true })
    .check();
  for (const [code, cause] of [
    ["resource-limit", "memory"],
    ["stale-revision", "changed"],
  ] as const) {
    await page.evaluate((next) => {
      window.folioReject = next;
    }, code);
    await page
      .getByRole("button", { name: "Rotate clockwise", exact: true })
      .click();
    await expect(page.locator("#folio-error")).toContainText(
      new RegExp(cause, "iu")
    );
    await expect(page.locator("#folio-error")).toBeFocused();
    await expect(page.getByText(/2 pages · revision 0/u)).toBeVisible();
  }
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.evaluate(() => {
    window.folioReject = "hold-cancel";
  });
  await page
    .getByRole("button", { name: "Rotate clockwise", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByText("Cancelled. No changes were made.", { exact: true })
  ).toBeVisible();
  await expect(page.locator("#folio-document")).toBeFocused();
  await expect(page.getByText(/2 pages · revision 0/u)).toBeVisible();
  await page
    .getByRole("button", { name: "Rotate clockwise", exact: true })
    .click();
  await expect(page.getByText(/2 pages · revision 1/u)).toBeVisible();
  await page.locator("#folio-download").click();
  await page.evaluate(() => {
    window.folioReject = "verification-failed";
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Download PDF", exact: true })
    .click();
  await expect(page.locator("#folio-error")).toContainText(
    "No download was created."
  );
  await expect(page.getByText(/Download started for revision/u)).toHaveCount(0);
  await expect(
    page.getByText("Changes are ready to download.", { exact: true })
  ).toBeVisible();
});

test("paints JPEG and PNG image pages inside the session Worker", async ({
  page,
}) => {
  await ready(page);
  const images = await page.evaluate(() => {
    const source = document.createElement("canvas");
    source.width = 64;
    source.height = 32;
    const context = source.getContext("2d");
    if (!context) {
      throw new Error("Canvas unavailable");
    }
    context.fillStyle = "#e00000";
    context.fillRect(0, 0, 64, 32);
    return {
      jpeg: source.toDataURL("image/jpeg"),
      png: source.toDataURL("image/png"),
    };
  });
  const pdf = await PDFDocument.create();
  const jpeg = await pdf.embedJpg(images.jpeg);
  const png = await pdf.embedPng(images.png);
  for (const image of [jpeg, png]) {
    const sheet = pdf.addPage([600, 300]);
    sheet.drawImage(image, { x: 0, y: 0, width: 600, height: 300 });
  }
  await page.locator("input[type=file]").setInputFiles({
    name: "image-pages.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(page.locator("#folio-document canvas")).toHaveCount(2);
  await page.waitForFunction(() =>
    [
      ...document.querySelectorAll<HTMLCanvasElement>("#folio-document canvas"),
    ].every((canvas) => {
      const color = canvas
        .getContext("2d")
        ?.getImageData(
          Math.floor(canvas.width / 2),
          Math.floor(canvas.height / 2),
          1,
          1
        ).data;
      return (
        color &&
        (color[0] ?? 0) > 200 &&
        (color[1] ?? 255) < 10 &&
        (color[2] ?? 255) < 10 &&
        color[3] === 255
      );
    })
  );
  await expect(page.locator("#folio-error")).toHaveCount(0);
  const saved = await download(page);
  expect((await PDFDocument.load(saved.bytes)).getPageCount()).toBe(2);
});
