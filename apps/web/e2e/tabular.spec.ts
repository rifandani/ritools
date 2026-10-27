import { readFile } from "node:fs/promises";
import path from "node:path";

import * as XLSX from "xlsx";

import { expect, test } from "./_base";
import type { Page } from "./_base";

const fixtures = path.resolve(
  import.meta.dirname,
  "../../../docs/proofs/tabular/samples"
);
const grid = (page: Page) => page.getByRole("grid");
const cell = (page: Page, text: string) =>
  grid(page).getByRole("gridcell", { name: text, exact: true });
const accept = async (page: Page) => {
  await expect(grid(page)).toBeVisible();
  await expect(grid(page).getByRole("columnheader")).not.toHaveCount(1);
};
const sample = async (page: Page) => {
  await page.goto("/tabular");
  await expect(
    page.getByRole("button", { name: "Choose a file", exact: true })
  ).toBeEnabled();
  await page.getByRole("button", { name: "Try a sample", exact: true }).click();
  await accept(page);
  await expect(
    page.getByRole("region", { name: "Preview file", exact: true })
  ).toHaveCount(0);
};
const edit = async (page: Page, old: string, value: string) => {
  await cell(page, old).dblclick();
  const input = page.getByRole("textbox", { name: "Cell text", exact: true });
  await input.fill(value);
  await input.press("Enter");
  await expect(cell(page, `${value} Edited`)).toBeVisible();
};
const output = async (page: Page, format: string, scope = "view") => {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Output format", exact: true })
    .first()
    .selectOption(format);
  await page
    .getByRole("combobox", { name: "Export Scope", exact: true })
    .selectOption(scope);
  await page
    .getByRole("button", {
      name: "Check export",
      exact: true,
    })
    .click();
  if (format === "xls" || format === "xlsx") {
    await page
      .getByRole("checkbox", { name: "I understand: export values only." })
      .check();
  }
  await page
    .getByRole("button", { name: "Create download", exact: true })
    .click();
  const received = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: `Download ${format.toUpperCase()}`,
      exact: true,
    })
    .click();
  const download = await received;
  const filename = await download.path();
  if (!filename) {
    throw new Error("No downloaded file");
  }
  return await readFile(filename);
};

test.describe("Tabular", () => {
  test.describe.configure({ mode: "default" });
  test("opens the sample, commits text, pastes atomically, and changes structure", async ({
    page,
  }) => {
    await sample(page);
    await grid(page).evaluate((element) => {
      element.dataset.stable = "true";
    });
    await edit(page, "00104", "00099");
    await expect(grid(page)).toHaveAttribute("data-stable", "true");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(cell(page, "00104")).toBeVisible();
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(cell(page, "00099 Edited")).toBeVisible();
    await cell(page, "00099 Edited").click();
    await page.getByRole("button", { name: "Paste text", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("textbox")
      .fill("00001\tChanged\n00002\tSecond");
    await page
      .getByRole("button", {
        name: "Check paste",
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Apply", exact: true })
      .click();
    await expect(cell(page, "Changed Edited")).toBeVisible();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(cell(page, "Paper clips")).toBeVisible();
    await expect(cell(page, "Notebook")).toBeVisible();
    await grid(page)
      .getByRole("columnheader", { name: "#", exact: true })
      .click({ button: "right" });
    await page
      .getByRole("menuitem", { name: "Add row at end", exact: true })
      .click();
    await expect(grid(page)).toHaveAttribute("aria-rowcount", "6");
    await grid(page)
      .getByRole("columnheader", { name: "Note", exact: true })
      .click({ button: "right" });
    await page
      .getByRole("menuitem", { name: "Insert column after", exact: true })
      .click();
    await expect(grid(page)).toHaveAttribute("aria-colcount", "7");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(grid(page)).toHaveAttribute("aria-colcount", "6");
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(grid(page)).toHaveAttribute("aria-colcount", "7");
  });

  test("copies a selected range with the keyboard and opens no dialog", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await sample(page);
    await cell(page, "00104").click();
    await cell(page, "Paper clips").click({ modifiers: ["Shift"] });
    await page.keyboard.press("ControlOrMeta+c");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe("00104\tPaper clips");
    await expect(
      page.getByText("Copied 1 rows.", { exact: true })
    ).toBeVisible();
  });

  test("renames a header with the menu and F2 without remounting the grid", async ({
    page,
  }) => {
    await sample(page);
    await grid(page).evaluate((element) => {
      element.dataset.stable = "true";
    });
    const item = grid(page)
      .getByRole("columnheader", { name: "Item", exact: true })
      .getByRole("button");
    await item.click({ button: "right" });
    await page
      .getByRole("menuitem", { name: "Rename header", exact: true })
      .click();
    const input = page.getByRole("textbox", {
      name: "Rename header",
      exact: true,
    });
    await expect(input).toBeFocused();
    await input.fill("Product");
    await input.press("Enter");
    await expect(
      grid(page).getByRole("columnheader", { name: "Product", exact: true })
    ).toBeVisible();
    await expect(grid(page)).toHaveAttribute("data-stable", "true");
    const sku = grid(page)
      .getByRole("columnheader", { name: "SKU", exact: true })
      .getByRole("button");
    await sku.click();
    await sku.press("F2");
    const next = page.getByRole("textbox", {
      name: "Rename header",
      exact: true,
    });
    await expect(next).toHaveValue("SKU");
    await next.fill("Code");
    await next.press("Enter");
    await expect(
      grid(page).getByRole("columnheader", { name: "Code", exact: true })
    ).toBeVisible();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(
      grid(page).getByRole("columnheader", { name: "SKU", exact: true })
    ).toBeVisible();
    await expect(grid(page)).toHaveAttribute("data-stable", "true");
  });

  test("adds a row from the empty grid state", async ({ page }) => {
    await page.goto("/tabular");
    await expect(
      page.getByRole("button", { name: "Choose a file", exact: true })
    ).toBeEnabled();
    await page.locator('input[type="file"]').setInputFiles({
      name: "empty.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("Name,Mark\n"),
    });
    await accept(page);
    await expect(
      page.getByText("No data rows. Add a row to start.", { exact: true })
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Add row at end", exact: true })
      .click();
    await expect(grid(page)).toHaveAttribute("aria-rowcount", "2");
  });

  test("keeps multiline source text when editing from the grid", async ({
    page,
  }) => {
    await sample(page);
    await edit(page, "00104", "line one\nline two");
    await cell(page, "line one line two Edited").dblclick();
    const input = page.getByRole("textbox", {
      name: "Cell text",
      exact: true,
    });
    await expect(input).toHaveValue("line one\nline two");
    await input.press("Escape");
    await expect(cell(page, "line one line two Edited")).toBeFocused();
    await cell(page, "line one line two Edited").press("Enter");
    await expect(input).toHaveValue("line one\nline two");
    await input.fill("line one! line two");
    await input.press("Enter");
    await expect(cell(page, "line one! line two Edited")).toBeVisible();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(cell(page, "line one line two Edited")).toBeVisible();
    await expect(page.locator('output[aria-live="polite"]')).toContainText(
      "Undo: Edit cell in Sheet1."
    );
  });

  test("retains a failed paste draft and permits correction", async ({
    page,
  }) => {
    await sample(page);
    await cell(page, "00104").click();
    await page.getByRole("button", { name: "Paste text", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const draft = Array.from({ length: 10 }, (_, i) => String(i)).join("\n");
    await dialog.getByRole("textbox").fill(draft);
    await dialog
      .getByRole("button", {
        name: "Check paste",
        exact: true,
      })
      .click();
    await dialog.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(dialog.getByRole("textbox")).toHaveValue(draft);
    await expect(dialog.getByRole("alert")).toBeVisible();
    await dialog.getByRole("textbox").fill("fixed");
    await dialog
      .getByRole("button", {
        name: "Check paste",
        exact: true,
      })
      .click();
    await dialog.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(cell(page, "fixed Edited")).toBeVisible();
  });

  test("keeps the active identity through search and resolves a filtered edit nearby", async ({
    page,
  }) => {
    await sample(page);
    await cell(page, "Notebook").click();
    const search = page.getByRole("searchbox");
    await search.fill("o");
    await expect(page.locator("#tabular-search")).toBeFocused();
    await cell(page, "Notebook").dblclick();
    const input = page.getByRole("textbox", {
      name: "Cell text",
      exact: true,
    });
    await expect(input).toHaveValue("Notebook");
    await input.press("Escape");
    await expect(cell(page, "Notebook")).toBeFocused();
    await search.fill("Notebook");
    await expect(
      page.getByText("1 / 4 rows · 5 columns", { exact: true }).first()
    ).toBeVisible();
    await cell(page, "Notebook").dblclick();
    await input.fill("xxx");
    await input.press("Enter");
    await expect(cell(page, "xxx Edited")).not.toBeVisible();
    await expect(page.locator("#tabular-clear-search")).toBeFocused();
    await search.fill("no-such-row");
    await expect(page.locator("#tabular-clear-search")).toBeVisible();
    await expect(search).toBeFocused();
    await expect(page.locator('output[aria-live="polite"]')).toHaveText(
      "0 / 4 rows · 5 columns"
    );
    await page.locator("#tabular-clear-search").click();
    await expect(cell(page, "Paper clips")).toBeFocused();
  });

  test("Clear search returns to the first row after searching from a later row", async ({
    page,
  }) => {
    await sample(page);
    await cell(page, "Marker").click();
    await expect(cell(page, "Marker").locator("..")).toHaveAttribute(
      "aria-rowindex",
      "5"
    );
    await page.getByRole("searchbox").fill("no-such-row");
    await expect(
      page.getByText("0 / 4 rows · 5 columns", { exact: true }).first()
    ).toBeVisible();
    await page.locator("#tabular-clear-search").click();
    await expect(cell(page, "Paper clips")).toBeFocused();
    await expect(cell(page, "Paper clips").locator("..")).toHaveAttribute(
      "aria-rowindex",
      "2"
    );
    await expect(cell(page, "Paper clips")).toHaveAttribute(
      "aria-colindex",
      "3"
    );
  });

  test("clears a deleted column sort and restores export focus", async ({
    page,
  }) => {
    await sample(page);
    const header = grid(page).getByRole("columnheader", {
      name: "Item",
      exact: true,
    });
    await cell(page, "Paper clips").click();
    await header.click();
    await expect(cell(page, "Paper clips")).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(cell(page, "Paper clips").locator("..")).toHaveAttribute(
      "aria-rowindex",
      "4"
    );
    await cell(page, "Notebook").click();
    await grid(page)
      .getByRole("columnheader", { name: "Item", exact: true })
      .click({ button: "right" });
    await page
      .getByRole("menuitem", { name: "Delete column", exact: true })
      .click();
    await expect(grid(page)).toHaveAttribute("aria-colcount", "5");
    await expect(cell(page, "B-12")).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Clear sort", exact: true })
    ).not.toBeVisible();
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await expect(page.locator("#tabular-export-format")).toBeFocused();
    await expect(
      page
        .getByRole("combobox", { name: "Delimiter", exact: true })
        .getByRole("option", { name: "Tab", exact: true })
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.locator("#tabular-open-export")).toBeFocused();
  });

  test("uses the prior matching index and column when an edited row leaves the View", async ({
    page,
  }) => {
    await sample(page);
    await page.locator('input[type="file"]').setInputFiles({
      name: "focus.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("Name,Mark\none,keep\ntwo,keep\nthree,keep\n"),
    });
    await accept(page);
    await expect(cell(page, "two")).toBeVisible();
    await page.getByRole("searchbox").fill("keep");
    await expect(
      page.getByText("3 / 3 rows · 2 columns", { exact: true }).first()
    ).toBeVisible();
    const keep = grid(page)
      .getByRole("row")
      .filter({ has: page.getByRole("gridcell", { name: "two", exact: true }) })
      .getByRole("gridcell", { name: "keep", exact: true });
    await keep.click();
    await keep.dblclick();
    const input = page.getByRole("textbox", {
      name: "Cell text",
      exact: true,
    });
    await input.fill("gone");
    await input.press("Enter");
    await expect(grid(page)).toHaveAttribute("aria-rowcount", "3");
    await expect(
      grid(page)
        .getByRole("row")
        .filter({
          has: page.getByRole("gridcell", { name: "three", exact: true }),
        })
        .getByRole("gridcell", { name: "keep", exact: true })
    ).toBeFocused();
    await expect(page.locator('output[aria-live="polite"]')).toHaveText(
      "The edited row no longer matches the search."
    );
  });

  test("keeps a sorted active identity visible beyond the virtual window", async ({
    page,
  }) => {
    await page.goto("/tabular");
    await expect(
      page.getByRole("button", { name: "Choose a file", exact: true })
    ).toBeEnabled();
    await page.locator('input[type="file"]').setInputFiles({
      name: "sort.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `ID,Value\n${Array.from({ length: 200 }, (_, i) => `v${i},text`).join("\n")}`
      ),
    });
    await accept(page);
    await cell(page, "v0").click();
    const header = grid(page).getByRole("columnheader", {
      name: "ID",
      exact: true,
    });
    await header.click();
    await header.click();
    await expect(cell(page, "v0").locator("..")).toHaveAttribute(
      "aria-rowindex",
      "201"
    );
    await expect(cell(page, "v0")).toBeInViewport();
    await expect(cell(page, "v0")).toHaveAttribute("aria-selected", "true");
  });

  test("focuses the next row, then the previous row at the Sheet end", async ({
    page,
  }) => {
    await sample(page);
    await cell(page, "Notebook").click();
    const remove = async (name: string) => {
      await grid(page)
        .getByRole("row")
        .filter({
          has: page.getByRole("gridcell", { name, exact: true }),
        })
        .getByRole("gridcell")
        .first()
        .click({ button: "right" });
      await page
        .getByRole("menuitem", { name: "Delete row", exact: true })
        .click();
    };
    await remove("Notebook");
    await expect(cell(page, "Pencil")).toBeFocused();
    await cell(page, "Marker").click();
    await remove("Marker");
    await expect(cell(page, "Pencil")).toBeFocused();
    await expect(grid(page)).toHaveAttribute("aria-rowcount", "3");
  });

  test("requires explicit TSV or TAB for a tab source dialect", async ({
    page,
  }) => {
    await page.goto("/tabular");
    await expect(
      page.getByRole("button", { name: "Choose a file", exact: true })
    ).toBeEnabled();
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(fixtures, "stock-check.tsv"));
    await accept(page);
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Use source dialect", exact: true })
    ).not.toBeVisible();
    const delimiters = await page
      .getByRole("combobox", { name: "Delimiter", exact: true })
      .locator("option")
      .evaluateAll((options) =>
        options.map((option) => option.getAttribute("value"))
      );
    expect(delimiters).toEqual([",", ";", "|"]);
  });

  for (const extension of ["csv", "tsv", "tab", "txt", "xls", "xlsx"]) {
    test(`opens real ${extension} bytes`, async ({ page }) => {
      await page.goto("/tabular");
      await expect(
        page.getByRole("button", { name: "Choose a file", exact: true })
      ).toBeEnabled();
      const workbook = extension === "xls" || extension === "xlsx";
      await page
        .locator('input[type="file"]')
        .setInputFiles(
          path.join(
            fixtures,
            workbook ? `values-lab.${extension}` : `stock-check.${extension}`
          )
        );
      await accept(page);
      await expect(grid(page)).toHaveAttribute("aria-rowcount", /\d+/u);
      if (workbook) {
        await expect(
          page.getByLabel("Sheet", { exact: true }).locator("option")
        ).not.toHaveCount(1);
      }
    });
  }

  test("exports full Current View beyond virtual rows, and Whole Sheet ignores filters", async ({
    page,
  }) => {
    await page.goto("/tabular");
    await expect(
      page.getByRole("button", { name: "Choose a file", exact: true })
    ).toBeEnabled();
    const content = `ID,Value\n${Array.from({ length: 200 }, (_, i) => `${String(i).padStart(5, "0")},${i % 2 ? "odd" : "even"}`).join("\n")}`;
    await page.locator('input[type="file"]').setInputFiles({
      name: "scope.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(content),
    });
    await accept(page);
    await page.getByRole("searchbox").fill("even");
    await expect(
      page.getByText("100 / 200 rows · 2 columns", { exact: true }).first()
    ).toBeVisible();
    expect(await grid(page).getByRole("row").count()).toBeLessThan(30);
    const bytes = await output(page, "xlsx");
    const workbook = XLSX.read(bytes);
    const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
    expect(sheet?.["!ref"]).toBe("A1:B101");
    expect(sheet?.A2?.v).toBe("00000");
    expect(sheet?.A101?.v).toBe("00198");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    const csv = await output(page, "csv", "sheet");
    expect(csv.toString()).toContain("00199,odd");
  });

  test("keeps edits under search and warns before replacement and navigation", async ({
    page,
  }) => {
    await sample(page);
    await page.getByRole("searchbox").fill("Notebook");
    await expect(
      page.getByText("1 / 4 rows · 5 columns", { exact: true }).first()
    ).toBeVisible();
    await edit(page, "00027", "00028");
    await page.locator('input[type="file"]').setInputFiles({
      name: "replacement.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("Name\nreplacement\n"),
    });
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page
      .getByRole("button", { name: "Keep working", exact: true })
      .click();
    await expect(cell(page, "00028 Edited")).toBeVisible();
    await page.getByRole("link", { name: "Ritools", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page
      .getByRole("button", { name: "Keep working", exact: true })
      .click();
    await expect(page).toHaveURL(/\/tabular$/u);
  });

  for (const format of ["csv", "tsv", "tab", "json", "xls", "xlsx"]) {
    test(`downloads ${format} with text values intact`, async ({ page }) => {
      await sample(page);
      const bytes = await output(page, format);
      if (format === "json") {
        const data = JSON.parse(bytes.toString());
        expect(data[0].SKU).toBe("00104");
        expect(data[1].Note).toBe("Two lines:\ncheck stock");
      } else {
        const book = XLSX.read(bytes, { type: "buffer", raw: true });
        const sheet = book.Sheets[book.SheetNames[0] ?? ""];
        expect(sheet?.A2?.v).toBe("00104");
        expect(sheet?.E3?.v).toBe("Two lines:\ncheck stock");
        expect(sheet?.A2?.f).toBeUndefined();
      }
    });
  }

  test("uses global history across hidden Sheets and blocks unresolved export", async ({
    page,
  }) => {
    await page.goto("/tabular");
    await expect(
      page.getByRole("button", { name: "Choose a file", exact: true })
    ).toBeEnabled();
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(fixtures, "values-lab.xlsx"));
    await accept(page);
    await edit(page, "000001", "000101");
    await page.getByRole("button", { name: /Sheet/u }).click();
    await page
      .getByRole("listbox")
      .getByRole("option", { name: /Archive/u })
      .click();
    await edit(page, "000002", "000202");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(cell(page, "000002")).toBeVisible();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(cell(page, "000001")).toBeVisible();
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Check export",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", { name: "Create download", exact: true })
    ).toBeDisabled();
    await expect(page.getByRole("alert")).toContainText("Resolve or exclude");
  });

  test("keeps duplicate and blank headers in array JSON", async ({ page }) => {
    await page.goto("/tabular");
    await expect(
      page.getByRole("button", { name: "Choose a file", exact: true })
    ).toBeEnabled();
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(fixtures, "headers-collision.csv"));
    await accept(page);
    const bytes = await output(page, "json");
    expect(JSON.parse(bytes.toString())).toEqual([
      ["__proto__", "constructor", "", "same", "same"],
      ["a", "b", "c", "d", "e"],
    ]);
  });
});
