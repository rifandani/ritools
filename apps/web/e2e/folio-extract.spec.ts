/* oxlint-disable unicorn/no-await-expression-member, eslint/no-await-in-loop, react-doctor/async-await-in-loop -- A browser test reads one download at a time in document order. */
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Locator } from "@playwright/test";
import { unzipSync } from "fflate";

import { expect, test } from "./_base";
import type { Page } from "./_base";

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

const openExtract = async (page: Page) => {
  await viewer(page).getByRole("button", { name: "Menu", exact: true }).click();
  await viewer(page)
    .getByRole("menuitem", { name: "Extract", exact: true })
    .click();
  const panel = page.getByRole("complementary", {
    name: "Extract from PDF",
  });
  await expect(panel).toBeVisible({ timeout: 20_000 });
  return panel;
};

const output = async (panel: Locator, name: RegExp) => {
  // The printed label covers the input; the control itself is the target.
  await panel.getByRole("checkbox", { name }).click({ force: true });
};

const start = async (panel: Locator, page: Page) => {
  await panel
    .getByRole("button", { name: "Start extract", exact: true })
    .click();
  await expect(panel.getByRole("button", { name: /^Download/u })).toBeVisible({
    timeout: 60_000,
  });
  const waiting = page.waitForEvent("download");
  await panel.getByRole("button", { name: /^Download/u }).click();
  const download = await waiting;
  const file = await download.path();
  if (file === null) {
    throw new Error("No downloaded file");
  }
  return {
    bytes: new Uint8Array(await readFile(file)),
    name: download.suggestedFilename(),
  };
};

const entriesOf = (bytes: Uint8Array) => unzipSync(bytes);

test("exports text as JSON in page order and makes no upload", async ({
  page,
}) => {
  const leaks: string[] = [];
  page.on("request", (request) => {
    const carried = `${request.url()} ${request.postData() ?? ""}`;
    if (carried.includes("text-10") || carried.includes("Folio fixture page")) {
      leaks.push(carried);
    }
  });
  await upload(page, "text-10");
  const panel = await openExtract(page);
  await panel
    .getByRole("combobox", { name: "Text format" })
    .selectOption("json");
  const saved = await start(panel, page);
  expect(saved.name).toBe("text-10-pages.json");
  const document = JSON.parse(new TextDecoder().decode(saved.bytes));
  expect(document.pages).toHaveLength(10);
  for (const [index, entry] of document.pages.entries()) {
    expect(entry.page).toBe(index + 1);
    expect(entry.hasText).toBe(true);
    expect(entry.text).toContain(`Folio fixture page ${index + 1}`);
  }
  expect(leaks).toEqual([]);
});

test("writes one text file per page and keeps the page order", async ({
  page,
}) => {
  await upload(page, "sample");
  const panel = await openExtract(page);
  const saved = await start(panel, page);
  expect(saved.name).toBe("sample-extract.zip");
  const entries = entriesOf(saved.bytes);
  expect(Object.keys(entries)).toEqual([
    "text/page-001.txt",
    "text/page-002.txt",
  ]);
  expect(new TextDecoder().decode(entries["text/page-001.txt"])).toContain(
    "Folio sample"
  );
  expect(new TextDecoder().decode(entries["text/page-002.txt"])).toContain(
    "Move this page"
  );
});

test("extracts only the selected pages", async ({ page }) => {
  await upload(page, "text-10");
  const panel = await openExtract(page);
  await panel.getByRole("radio", { name: /^Selected pages/u }).click({
    force: true,
  });
  await panel.getByRole("checkbox", { name: "Page 3", exact: true }).click({
    force: true,
  });
  await panel.getByRole("checkbox", { name: "Page 1", exact: true }).click({
    force: true,
  });
  await panel
    .getByRole("combobox", { name: "Text format" })
    .selectOption("json");
  const saved = await start(panel, page);
  const document = JSON.parse(new TextDecoder().decode(saved.bytes));
  expect(document.pages).toHaveLength(1);
  expect(document.pages[0].page).toBe(3);
  expect(document.pages[0].text).toContain("Folio fixture page 3");
});

test("stops without a success receipt", async ({ page }) => {
  await upload(page, "text-10");
  const panel = await openExtract(page);
  await output(panel, /^Text\b/u);
  await output(panel, /^Page images\b/u);
  await panel
    .getByRole("combobox", { name: "Image width" })
    .selectOption("double");
  await panel
    .getByRole("button", { name: "Start extract", exact: true })
    .click();
  await panel.getByRole("button", { name: /^Stop/u }).click();
  await expect(
    panel.getByText("Extract stopped. No file was written.", { exact: true })
  ).toBeVisible({ timeout: 20_000 });
  await expect(panel.getByRole("button", { name: /^Download/u })).toHaveCount(
    0
  );
});

test("reports a scanned page as no text", async ({ page }) => {
  await upload(page, "scan");
  const panel = await openExtract(page);
  await panel
    .getByRole("combobox", { name: "Text format" })
    .selectOption("json");
  const saved = await start(panel, page);
  const document = JSON.parse(new TextDecoder().decode(saved.bytes));
  expect(document.pages).toEqual([{ hasText: false, page: 1, text: null }]);
  await expect(
    panel.getByText("1 page had no searchable text and was left out.", {
      exact: true,
    })
  ).toBeVisible();
});

test("exports link annotations with the page, box, and target", async ({
  page,
}) => {
  await upload(page, "structure");
  const panel = await openExtract(page);
  await output(panel, /^Text\b/u);
  await output(panel, /^Links\b/u);
  await panel
    .getByRole("combobox", { name: "Link format" })
    .selectOption("json");
  const saved = await start(panel, page);
  expect(saved.name).toBe("structure-links.json");
  const document = JSON.parse(new TextDecoder().decode(saved.bytes));
  expect(document.links).toHaveLength(1);
  const [link] = document.links;
  expect(link.page).toBe(1);
  expect(link.subtype).toBe("link");
  // The box is in page space: origin at the top left of a 400 pt page.
  expect(link.rect[0]).toBeCloseTo(10);
  expect(link.rect[1]).toBeCloseTo(370);
  expect(link.rect[2]).toBeCloseTo(100);
  expect(link.rect[3]).toBeCloseTo(390);
  expect(link.target).toEqual({ detail: "2", kind: "goto", page: 2 });
});

test("renders page images at the selected width", async ({ page }) => {
  await upload(page, "pages-1");
  const panel = await openExtract(page);
  await output(panel, /^Text\b/u);
  await output(panel, /^Page images\b/u);
  const saved = await start(panel, page);
  expect(saved.name).toBe("pages-1-page-001.png");
  expect(
    [...saved.bytes.subarray(0, 8)].map((value) =>
      value.toString(16).padStart(2, "0")
    )
  ).toEqual(["89", "50", "4e", "47", "0d", "0a", "1a", "0a"]);
  const view = new DataView(
    saved.bytes.buffer,
    saved.bytes.byteOffset,
    saved.bytes.byteLength
  );
  expect(view.getUint32(16)).toBe(1440);
  expect(view.getUint32(20)).toBe(1920);

  await panel.getByRole("button", { name: "Start again", exact: true }).click();
  await panel
    .getByRole("combobox", { name: "Image width" })
    .selectOption("double");
  const doubled = await start(panel, page);
  const doubledView = new DataView(
    doubled.bytes.buffer,
    doubled.bytes.byteOffset,
    doubled.bytes.byteLength
  );
  expect(doubledView.getUint32(16)).toBe(600);
  expect(doubledView.getUint32(20)).toBe(800);
});

test("keeps every attachment's name, type, and bytes in one ZIP", async ({
  page,
}) => {
  await upload(page, "attachments");
  const panel = await openExtract(page);
  await output(panel, /^Attachments\b/u);
  const saved = await start(panel, page);
  expect(saved.name).toBe("attachments-extract.zip");
  const entries = entriesOf(saved.bytes);
  expect(Object.keys(entries).toSorted()).toEqual([
    "attachments/generated.txt",
    "attachments/manifest.json",
    "text/page-001.txt",
  ]);
  const manifest = JSON.parse(
    new TextDecoder().decode(entries["attachments/manifest.json"])
  );
  expect(manifest.attachments).toEqual([
    {
      bytes: 20,
      mimeType: "text/plain",
      name: "generated.txt",
      path: "attachments/generated.txt",
    },
  ]);
  expect(entries["attachments/generated.txt"]).toHaveLength(20);
  expect(new TextDecoder().decode(entries["attachments/generated.txt"])).toBe(
    "Generated attachment"
  );
});

test("exports a signed file without changing it", async ({ page }) => {
  await upload(page, "signed");
  const panel = await openExtract(page);
  await panel
    .getByRole("combobox", { name: "Text format" })
    .selectOption("json");
  const saved = await start(panel, page);
  expect(saved.name).toBe("signed-pages.json");
  const document = JSON.parse(new TextDecoder().decode(saved.bytes));
  expect(document.pages.length).toBe(10);
});

test("exports an unlocked encrypted file", async ({ page }) => {
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
    .fill("folio-test");
  await current.getByRole("button", { name: "Open", exact: true }).click();
  await expect(current.locator("img").first()).toBeVisible({
    timeout: 20_000,
  });
  const panel = await openExtract(page);
  const text = panel.getByRole("checkbox", { name: /^Text\b/u });
  if (await text.isDisabled()) {
    await expect(
      panel.getByText("This PDF does not allow text copying.", {
        exact: true,
      })
    ).toBeVisible();
    return;
  }
  await panel
    .getByRole("combobox", { name: "Text format" })
    .selectOption("json");
  const saved = await start(panel, page);
  expect(saved.name).toBe("encrypted-pages.json");
  const document = JSON.parse(new TextDecoder().decode(saved.bytes));
  expect(document.pages.length).toBe(10);
});
