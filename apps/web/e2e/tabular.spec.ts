import { readFile } from "node:fs/promises";
import path from "node:path";

import { unzipSync } from "fflate";
import * as XLSX from "xlsx";

import { expect, test } from "./_base";
import type { Page } from "./_base";

/* oxlint-disable no-await-in-loop -- Browser steps run in the order the user takes them. */

const fixtures = path.resolve(
  import.meta.dirname,
  "../../../docs/proofs/tabular/samples"
);
const grid = (page: Page) => page.getByRole("grid");
const cell = (page: Page, text: string) =>
  grid(page).getByRole("gridcell", { name: text, exact: true });

/**
 * Waits until React has hydrated the page. The file actions render enabled on
 * the server, so a press or a file injection before hydration is dropped.
 */
const ready = (page: Page) =>
  page.waitForFunction(() => {
    const input = document.querySelector('input[type="file"]');
    return (
      input !== null &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });
const centre = (box: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => ({
  x: Math.round(box.x + box.width / 2),
  y: Math.round(box.y + box.height / 2),
});
const accept = async (page: Page) => {
  await expect(grid(page)).toBeVisible();
  await expect(grid(page).getByRole("columnheader")).not.toHaveCount(1);
};
const sample = async (page: Page) => {
  await page.goto("/tabular");
  await ready(page);
  await expect(
    page.getByRole("button", { name: "Choose a file", exact: true })
  ).toBeEnabled();
  await page.getByRole("button", { name: "Try a sample", exact: true }).click();
  await accept(page);
  await expect(
    page.getByRole("region", { name: "Preview file", exact: true })
  ).toHaveCount(0);
};
const mergedSampleText =
  'SKU,Item,Location,Quantity,Note\n00104,Paper clips,A-03,48,Keep leading zeros\n00027,Notebook,B-12,12,"Two lines:\ncheck stock"\n00931,Pencil,A-01,120,"  keep spaces  "\n00008,Marker,C-02,0,""\n';
const edit = async (page: Page, old: string, value: string) => {
  await cell(page, old).dblclick();
  const input = page.getByRole("textbox", { name: "Cell text", exact: true });
  await input.fill(value);
  await input.press("Enter");
  await expect(cell(page, `${value} Edited`)).toBeVisible();
};
const select = async (page: Page, label: string, option: string) => {
  await page
    .getByRole("button", { name: new RegExp(`${label}$`, "u") })
    .click();
  await page
    .getByRole("listbox")
    .getByRole("option", { name: option, exact: true })
    .click();
};
const output = async (page: Page, format: string, scope = "view") => {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await select(
    page,
    "Output format",
    format === "clipboard" ? "Copy" : format.toUpperCase()
  );
  await select(
    page,
    "Export Scope",
    scope === "sheet"
      ? "Whole Sheet"
      : scope === "workbook"
        ? "Whole Workbook"
        : "Current View"
  );
  await page
    .getByRole("button", {
      name: "Check export",
      exact: true,
    })
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
const chartHeading = (page: Page) => page.locator("#tabular-chart-heading");
const openChart = async (page: Page, name = "Line chart") => {
  await page.getByRole("button", { name: "Chart", exact: true }).click();
  await page.getByRole("menuitem", { name, exact: true }).click();
};
const chooseChartType = async (page: Page, name: string) => {
  await page.getByRole("button", { name: /Chart type/u }).click();
  await page
    .getByRole("listbox")
    .getByRole("option", { name, exact: true })
    .click();
};
const chartedTable = (page: Page) =>
  page
    .locator("section[aria-labelledby='tabular-chart-heading']")
    .getByRole("table");

test.describe("Tabular", () => {
  test.describe.configure({ mode: "default" });
  test("opens the sample, commits text, pastes atomically, and changes structure", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
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
    await page.evaluate(() =>
      navigator.clipboard.writeText("00001\tChanged\n00002\tSecond")
    );
    await page.keyboard.press("ControlOrMeta+v");
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

  test("reverts the active cell with Alt + Backspace", async ({ page }) => {
    await sample(page);
    await edit(page, "00104", "00099");
    await cell(page, "00099 Edited").click();
    await page.keyboard.press("Alt+Backspace");
    await expect(cell(page, "00104")).toBeVisible();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(cell(page, "00099 Edited")).toBeVisible();
  });

  test("jumps to the sheet edge with Ctrl/Cmd + arrows", async ({ page }) => {
    await sample(page);
    const address = page.locator("output.num");
    await cell(page, "00104").click();
    await expect(address).toHaveText("A1");
    await page.keyboard.press("ControlOrMeta+ArrowRight");
    await expect(address).toHaveText("E1");
    await expect(cell(page, "Keep leading zeros")).toBeFocused();
    await page.keyboard.press("ControlOrMeta+ArrowDown");
    await expect(address).toHaveText("E4");
    await page.keyboard.press("ControlOrMeta+ArrowLeft");
    await expect(address).toHaveText("A4");
    await page.keyboard.press("ControlOrMeta+ArrowUp");
    await expect(address).toHaveText("A1");
    await page.keyboard.press("ControlOrMeta+Shift+ArrowRight");
    await expect(address).toHaveText("E1");
    await expect(page.locator('[role="gridcell"].tabular-range')).toHaveCount(
      5
    );
    await page.keyboard.press("ControlOrMeta+Shift+ArrowDown");
    await expect(address).toHaveText("E4");
    await expect(page.locator('[role="gridcell"].tabular-range')).toHaveCount(
      20
    );
  });

  test("extends a range with Shift + arrows and moves the active cell", async ({
    page,
  }) => {
    await sample(page);
    const address = page.locator("output.num");
    await cell(page, "00104").click();
    await expect(address).toHaveText("A1");
    await page.keyboard.press("Shift+ArrowRight");
    await expect(address).toHaveText("B1");
    await expect(cell(page, "Paper clips")).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(cell(page, "Paper clips")).toBeFocused();
    await expect(cell(page, "00104")).toHaveAttribute("aria-selected", "false");
    await expect(page.locator('[role="gridcell"].tabular-range')).toHaveCount(
      2
    );
    await page.keyboard.press("Shift+ArrowDown");
    await expect(address).toHaveText("B2");
    await expect(cell(page, "Notebook")).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(page.locator('[role="gridcell"].tabular-range')).toHaveCount(
      4
    );
    await page.keyboard.press("Shift+ArrowLeft");
    await expect(address).toHaveText("A2");
    await expect(cell(page, "00027")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('[role="gridcell"].tabular-range')).toHaveCount(
      2
    );
  });

  test("jumps to the far edge of a large sheet", async ({ page }) => {
    await page.goto("/tabular");
    await ready(page);
    await expect(
      page.getByRole("button", { name: "Choose a file", exact: true })
    ).toBeEnabled();
    const header = Array.from({ length: 20 }, (_, index) => `C${index + 1}`);
    const rows = Array.from({ length: 500 }, (_, row) =>
      Array.from(
        { length: 20 },
        (_value, column) => `${row + 1}-${column + 1}`
      ).join(",")
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "large.csv",
      mimeType: "text/csv",
      buffer: Buffer.from([header.join(","), ...rows].join("\n")),
    });
    await accept(page);
    const address = page.locator("output.num");
    await cell(page, "1-1").click();
    await page.keyboard.press("ControlOrMeta+ArrowRight");
    await expect(address).toHaveText("T1");
    await page.keyboard.press("ControlOrMeta+ArrowDown");
    await expect(address).toHaveText("T500");
    await expect(cell(page, "500-20")).toBeFocused();
  });

  test("keeps the last rows loaded after inserting a row there", async ({
    page,
  }) => {
    await page.goto("/tabular");
    await ready(page);
    const header = Array.from({ length: 8 }, (_, index) => `C${index + 1}`);
    const rows = Array.from({ length: 500 }, (_, row) =>
      Array.from(
        { length: 8 },
        (_value, column) => `${row + 1}-${column + 1}`
      ).join(",")
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "tall.csv",
      mimeType: "text/csv",
      buffer: Buffer.from([header.join(","), ...rows].join("\n")),
    });
    await accept(page);
    await cell(page, "1-1").click();
    await page.keyboard.press("ControlOrMeta+ArrowDown");
    await expect(cell(page, "500-1")).toBeFocused();
    await grid(page)
      .locator('[role="gridcell"][aria-colindex="1"]')
      .last()
      .click({ button: "right" });
    await page
      .getByRole("menuitem", { name: "Insert row after", exact: true })
      .click();
    await expect(grid(page)).toHaveAttribute("aria-rowcount", "502");
    // The visible rows above the inserted row must load, not shimmer.
    await expect(page.locator(".tabular-cell-loading")).toHaveCount(0);
  });

  test("keeps the visible columns loaded after inserting a column there", async ({
    page,
  }) => {
    await page.goto("/tabular");
    await ready(page);
    const header = Array.from({ length: 40 }, (_, index) => `C${index + 1}`);
    const rows = Array.from({ length: 30 }, (_, row) =>
      Array.from(
        { length: 40 },
        (_value, column) => `${row + 1}-${column + 1}`
      ).join(",")
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "wide.csv",
      mimeType: "text/csv",
      buffer: Buffer.from([header.join(","), ...rows].join("\n")),
    });
    await accept(page);
    await cell(page, "1-1").click();
    await page.keyboard.press("ControlOrMeta+ArrowRight");
    await expect(page.locator("output.num")).toHaveText("AN1");
    await grid(page)
      .getByRole("columnheader", { name: "C38", exact: true })
      .click({ button: "right" });
    await page
      .getByRole("menuitem", { name: "Insert column after", exact: true })
      .click();
    await expect(grid(page)).toHaveAttribute("aria-colcount", "42");
    await expect(page.locator(".tabular-cell-loading")).toHaveCount(0);
  });

  test.describe("touch selection", () => {
    test.use({ hasTouch: true });

    test("selects a range by holding and dragging a cell", async ({
      page,
      context,
    }) => {
      await sample(page);
      const from = await cell(page, "00104").boundingBox();
      const to = await cell(page, "Notebook").boundingBox();
      if (!from || !to) {
        throw new Error("Range cells are not visible");
      }
      const client = await context.newCDPSession(page);
      await client.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [centre(from)],
      });
      // The finger rests longer than the long-press threshold before it moves.
      await page.waitForTimeout(600);
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [centre(to)],
      });
      await client.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await expect(page.locator('[role="gridcell"].tabular-range')).toHaveCount(
        4
      );
    });
  });

  test("pastes a clipboard block into a selected range with the keyboard", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await sample(page);
    await expect(
      page.getByRole("button", { name: "Paste text", exact: true })
    ).toHaveCount(0);
    await page.evaluate(() =>
      navigator.clipboard.writeText("a\tb\tc\nd\te\tf\ng\th\ti")
    );
    await cell(page, "00027").click();
    await cell(page, "C-02").click({ modifiers: ["Shift"] });
    await page.keyboard.press("ControlOrMeta+v");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("textbox", { name: "Cell text", exact: true })
    ).toHaveCount(0);
    await expect(cell(page, "a Edited")).toBeVisible();
    await expect(cell(page, "e Edited")).toBeVisible();
    await expect(cell(page, "i Edited")).toBeVisible();
    await expect(cell(page, "00027")).toHaveCount(0);
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
    await ready(page);
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

  test("rejects a paste that does not match the selected range", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await sample(page);
    await page.evaluate(() => navigator.clipboard.writeText("only-one"));
    await cell(page, "00027").click();
    await cell(page, "Pencil").click({ modifiers: ["Shift"] });
    await page.keyboard.press("ControlOrMeta+v");
    await expect(page.getByRole("alert")).toContainText(
      "The pasted block does not match the selected range"
    );
    await expect(
      page.getByRole("button", { name: "Retry", exact: true })
    ).toHaveCount(0);
    await expect(cell(page, "00027")).toBeVisible();
    await expect(cell(page, "Notebook")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
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
    await page.getByRole("button", { name: /Delimiter$/u }).click();
    const delimiters = page.getByRole("listbox");
    await expect(delimiters.getByRole("option")).toHaveCount(3);
    await expect(
      delimiters.getByRole("option", { name: /^(?:Comma|Semicolon|Pipe)$/u })
    ).toHaveCount(3);
    await page.keyboard.press("Escape");
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
    await ready(page);
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

  test("shows a sort placeholder on sortable headers only", async ({
    page,
  }) => {
    await sample(page);
    const sku = grid(page).getByRole("columnheader", {
      name: "SKU",
      exact: true,
    });
    const placeholder = sku.locator(".tabular-sort-placeholder");
    await expect(placeholder).toBeVisible();
    await expect(
      grid(page)
        .getByRole("columnheader", { name: "#", exact: true })
        .locator(".tabular-sort-placeholder")
    ).toHaveCount(0);
    await sku.click();
    await expect(placeholder).toHaveCount(0);
    await expect(sku.locator(".rdg-sort-arrow")).toBeVisible();
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
    await ready(page);
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
    await page.getByRole("button", { name: /Delimiter$/u }).click();
    const delimiters = page.getByRole("listbox");
    await expect(delimiters.getByRole("option")).toHaveCount(3);
    await expect(
      delimiters.getByRole("option", { name: /^(?:Comma|Semicolon|Pipe)$/u })
    ).toHaveCount(3);
  });

  for (const extension of ["csv", "tsv", "tab", "txt", "xls", "xlsx"]) {
    test(`opens real ${extension} bytes`, async ({ page }) => {
      await page.goto("/tabular");
      await ready(page);
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
    await ready(page);
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

  test("exports a PDF report with page options and the untagged note", async ({
    page,
  }) => {
    await sample(page);
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await select(page, "Output format", "PDF");
    await expect(
      page.getByRole("button", { name: /Page size$/u })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Orientation$/u })
    ).toBeVisible();
    await expect(
      page.getByText(
        "This PDF is not tagged. For screen readers, use CSV or XLSX.",
        { exact: true }
      )
    ).toBeVisible();
    await select(page, "Page size", "Letter");
    await select(page, "Orientation", "Landscape");
    await page
      .getByRole("button", { name: "Check export", exact: true })
      .click();
    await expect(page.getByText(/About \d+ pages\./u)).toBeVisible();
    const received = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download PDF", exact: true })
      .click();
    const download = await received;
    const filename = await download.path();
    if (!filename) {
      throw new Error("No downloaded file");
    }
    const bytes = await readFile(filename);
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.subarray(-32).toString().trimEnd().endsWith("%%EOF")).toBe(
      true
    );
    await expect(
      page.getByRole("dialog").getByText(/PDF ready: \d+ pages/u)
    ).toBeVisible();
  });

  test("splits the sample into CSV parts with the header repeated", async ({
    page,
  }) => {
    await sample(page);
    await page.getByRole("button", { name: "Split CSV", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: "CSV Splitter",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("spinbutton", { name: "Rows per part", exact: true })
      .fill("2");
    await expect(
      dialog.getByText("First file: stock-list-part-1-of-2.csv")
    ).toBeVisible();
    await expect(
      dialog.getByText("Last file: stock-list-part-2-of-2.csv")
    ).toBeVisible();
    const received = page.waitForEvent("download");
    await dialog
      .getByRole("button", { name: "Create download", exact: true })
      .click();
    const download = await received;
    expect(download.suggestedFilename()).toBe("stock-list-split.zip");
    const filename = await download.path();
    if (!filename) {
      throw new Error("No downloaded file");
    }
    const entries = unzipSync(await readFile(filename));
    const header = "SKU,Item,Location,Quantity,Note";
    const first = new TextDecoder().decode(
      entries["stock-list-part-1-of-2.csv"]
    );
    const last = new TextDecoder().decode(
      entries["stock-list-part-2-of-2.csv"]
    );
    expect(first.split("\n")[0]).toBe(header);
    expect(first).toContain("00104,Paper clips,A-03,48,Keep leading zeros");
    expect(first).toContain("00027,Notebook,B-12,12,");
    expect(last.split("\n")[0]).toBe(header);
    expect(last).toContain("00931,Pencil,A-01,120,");
    expect(last).toContain("00008,Marker,C-02,0,");
    expect(last).not.toContain("00104");
  });

  test("merges the Split ZIP back into the same table", async ({ page }) => {
    await sample(page);
    await page.getByRole("button", { name: "Split CSV", exact: true }).click();
    const splitter = page.getByRole("dialog", {
      name: "CSV Splitter",
      exact: true,
    });
    await expect(splitter).toBeVisible();
    await splitter
      .getByRole("spinbutton", { name: "Rows per part", exact: true })
      .fill("2");
    const splitDownload = page.waitForEvent("download");
    await splitter
      .getByRole("button", { name: "Create download", exact: true })
      .click();
    const splitFile = await splitDownload;
    const splitPath = await splitFile.path();
    if (!splitPath) {
      throw new Error("No Split ZIP");
    }
    const splitBytes = await readFile(splitPath);
    await splitter.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Merge CSV", exact: true }).click();
    const merger = page.getByRole("dialog", {
      name: "CSV Merger",
      exact: true,
    });
    await expect(merger).toBeVisible();
    await merger.locator("#tabular-merge-files").setInputFiles({
      name: "stock-list-split.zip",
      mimeType: "application/zip",
      buffer: splitBytes,
    });
    await expect(
      merger.getByText("SKU · Item · Location · Quantity · Note", {
        exact: true,
      })
    ).toBeVisible();
    const mergeDownload = page.waitForEvent("download");
    await merger
      .getByRole("button", { name: "Create download", exact: true })
      .click();
    const merged = await mergeDownload;
    expect(merged.suggestedFilename()).toBe("stock-list-merged.csv");
    const mergedPath = await merged.path();
    if (!mergedPath) {
      throw new Error("No Merged CSV");
    }
    const text = await readFile(mergedPath, "utf-8");
    expect(text).toBe(mergedSampleText);
    expect(text.match(/^SKU,/gmu)).toHaveLength(1);
    await merger
      .locator('[data-slot="dialog-footer"]')
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Merge CSV", exact: true })
    ).toBeFocused();
  });

  test("adds the open file as one Merge Source", async ({ page }) => {
    await sample(page);
    await page.getByRole("button", { name: "Merge CSV", exact: true }).click();
    const merger = page.getByRole("dialog", {
      name: "CSV Merger",
      exact: true,
    });
    await expect(merger).toBeVisible();
    await merger
      .getByRole("button", { name: "Add the open file", exact: true })
      .click();
    await expect(
      merger.getByText("1 file · 4 rows · 5 columns", { exact: true })
    ).toBeVisible();
    const received = page.waitForEvent("download");
    await merger
      .getByRole("button", { name: "Create download", exact: true })
      .click();
    const download = await received;
    expect(download.suggestedFilename()).toBe("stock-list-merged.csv");
    const filename = await download.path();
    if (!filename) {
      throw new Error("No Merged CSV");
    }
    expect(await readFile(filename, "utf-8")).toBe(mergedSampleText);
  });

  test("uses global history across hidden Sheets and blocks unresolved export", async ({
    page,
  }) => {
    await page.goto("/tabular");
    await ready(page);
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
      page.getByRole("button", { name: "Download CSV", exact: true })
    ).toBeDisabled();
    await expect(page.getByRole("alert")).toContainText("Resolve or exclude");
  });

  test("keeps duplicate and blank headers in array JSON", async ({ page }) => {
    await page.goto("/tabular");
    await ready(page);
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

  test("opens each chart type and returns to the same selection", async ({
    page,
  }) => {
    await sample(page);
    await cell(page, "00104").click();
    await cell(page, "Notebook").click({ modifiers: ["Shift"] });
    await expect(page.locator('[role="gridcell"].tabular-range')).toHaveCount(
      4
    );

    await page.getByRole("button", { name: "Chart", exact: true }).click();
    for (const name of [
      "Line chart",
      "Bar chart",
      "Area chart",
      "Donut chart",
      "Scatter chart",
    ]) {
      await expect(
        page.getByRole("menuitem", { name, exact: true })
      ).toBeVisible();
    }
    await page.keyboard.press("Escape");

    await openChart(page, "Bar chart");
    await expect(chartHeading(page)).toBeFocused();
    await expect(chartHeading(page)).toHaveText("Sheet1 · 2 rows");
    await expect(page.locator('output[aria-live="polite"]')).toHaveText(
      "Bar chart: 2 rows, 1 series."
    );
    await expect(
      page.getByRole("figure", {
        name: /^Bar chart\. Selection in Sheet1\. 2 rows\. Category: Item\. Series: SKU\./u,
      })
    ).toBeVisible();

    await page.getByText("Charted data", { exact: true }).click();
    const table = chartedTable(page);
    await expect(
      table.getByRole("columnheader", { name: "Item", exact: true })
    ).toHaveCSS("text-align", "start");
    await expect(
      table.getByRole("columnheader", { name: "SKU", exact: true })
    ).toHaveCSS("text-align", "end");
    await expect(
      table.getByRole("rowheader", { name: "Paper clips", exact: true })
    ).toBeVisible();
    await expect(
      table.getByRole("rowheader", { name: "Notebook", exact: true })
    ).toBeVisible();

    await chooseChartType(page, "Donut chart");
    await expect(chartHeading(page)).toHaveText("Sheet1 · 2 rows");
    await chooseChartType(page, "Scatter chart");
    await expect(
      page
        .getByText(
          "Scatter needs exactly two numeric columns. Select both columns.",
          { exact: true }
        )
        .last()
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Chart", exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Table", exact: true })
    ).toBeVisible();

    await page.getByRole("button", { name: "Table", exact: true }).click();
    await expect(grid(page)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Chart", exact: true })
    ).toBeFocused();
    await expect(page.locator('[role="gridcell"].tabular-range')).toHaveCount(
      4
    );
  });

  test("shows the series selector without a disclosure", async ({ page }) => {
    await page.goto("/tabular");
    await ready(page);
    await expect(
      page.getByRole("button", { name: "Choose a file", exact: true })
    ).toBeEnabled();
    await page.locator('input[type="file"]').setInputFiles({
      name: "series.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        ["Name,A,B,C,D,E,F", "Alpha,1,2,3,4,5,6", "Beta,7,8,9,10,11,12"].join(
          "\n"
        )
      ),
    });
    await accept(page);
    await openChart(page);
    await expect(
      page.getByText("5 of 6 selected", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("Choose up to five numeric columns.", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "F", exact: true })
    ).toBeVisible();
  });

  test("follows search, sort, edit, undo, and the live announcement", async ({
    page,
  }) => {
    await sample(page);
    await openChart(page);
    await expect(chartHeading(page)).toHaveText("Sheet1 · 4 rows");
    await expect(page.locator('output[aria-live="polite"]')).toHaveText(
      "Line chart: 4 rows, 2 series."
    );
    await page.getByText("Charted data", { exact: true }).click();
    const table = chartedTable(page);
    await expect(
      table.getByRole("cell", { name: "48", exact: true })
    ).toBeVisible();

    await page.getByRole("searchbox").fill("Pencil");
    await expect(chartHeading(page)).toHaveText("Sheet1 · 1 rows");
    await expect(
      table.getByRole("rowheader", { name: "Pencil", exact: true })
    ).toBeVisible();
    await page.getByRole("searchbox").fill("");
    await expect(chartHeading(page)).toHaveText("Sheet1 · 4 rows");

    await page.getByRole("button", { name: "Table", exact: true }).click();
    const quantity = grid(page).getByRole("columnheader", {
      name: "Quantity",
      exact: true,
    });
    await quantity.click();
    await expect(
      grid(page).locator('[role="row"][aria-rowindex="2"]')
    ).toContainText("Marker");
    await openChart(page, "Bar chart");
    await expect(chartHeading(page)).toHaveText("Sheet1 · 4 rows");
    await page.getByText("Charted data", { exact: true }).click();
    await expect(table.getByRole("rowheader").first()).toHaveText("Marker");

    await page.getByRole("button", { name: "Table", exact: true }).click();
    await edit(page, "120", "999");
    await openChart(page);
    await page.getByText("Charted data", { exact: true }).click();
    await expect(
      table.getByRole("cell", { name: "999", exact: true })
    ).toBeVisible();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(
      table.getByRole("cell", { name: "120", exact: true })
    ).toBeVisible();
  });

  test("reads a comma decimal only when Decimal comma is on", async ({
    page,
  }) => {
    await page.goto("/tabular");
    await ready(page);
    await expect(
      page.getByRole("button", { name: "Choose a file", exact: true })
    ).toBeEnabled();
    await page.locator('input[type="file"]').setInputFiles({
      name: "decimals.csv",
      mimeType: "text/csv",
      buffer: Buffer.from('Name,Value\nAlpha,"1,5"\nBeta,"2,5"\nGamma,"3,5"\n'),
    });
    await accept(page);
    await openChart(page);
    await expect(
      page
        .getByText(
          "This scope has no numeric column. Select a range with numbers, or turn on Decimal comma.",
          { exact: true }
        )
        .last()
    ).toBeVisible();
    await page
      .getByRole("switch", { name: "Decimal comma", exact: true })
      .check({ force: true });
    await expect(chartHeading(page)).toHaveText("Sheet1 · 3 rows");
    await page.getByText("Charted data", { exact: true }).click();
    const table = chartedTable(page);
    await expect(
      table.getByRole("cell", { name: "1.5", exact: true })
    ).toBeVisible();
    await expect(
      table.getByRole("cell", { name: "2.5", exact: true })
    ).toBeVisible();
  });

  test("names every display cap", async ({ page }) => {
    await page.goto("/tabular");
    await ready(page);
    await expect(
      page.getByRole("button", { name: "Choose a file", exact: true })
    ).toBeEnabled();
    const rows = Array.from(
      { length: 1001 },
      (_, index) => `Row ${index},${index}`
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "caps.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(["Label,Value", ...rows].join("\n")),
    });
    await accept(page);
    await openChart(page);
    await expect(chartHeading(page)).toHaveText("Sheet1 · 1,000 rows");
    await expect(
      page.getByText(
        "Showing 1,000 of 1,001 rows. The chart keeps the first and last row.",
        { exact: true }
      )
    ).toBeVisible();

    await chooseChartType(page, "Bar chart");
    await expect(chartHeading(page)).toHaveText(
      "Sheet1 · 50 of 1,001 categories (Select a smaller range to see the rest)"
    );
    await chooseChartType(page, "Donut chart");
    await expect(chartHeading(page)).toHaveText("Sheet1 · 13 rows");
    await expect(
      page.getByText(
        "Showing the top 12 categories. 988 more are summed as Other.",
        { exact: true }
      )
    ).toBeVisible();
  });

  test("renders in both Locales, both color modes, and both widths", async ({
    page,
  }) => {
    await sample(page);
    await expect(async () => {
      await page.getByRole("button", { name: /English|Indonesia/u }).click();
      await page.getByRole("menuitemradio", { name: "Indonesia" }).click();
      await expect(
        page.getByRole("button", { name: "Bagan", exact: true })
      ).toBeVisible();
    }).toPass();
    await page.getByRole("button", { name: "Bagan", exact: true }).click();
    await page
      .getByRole("menuitem", { name: "Bagan garis", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Sheet1 · 4 baris",
      })
    ).toBeVisible();

    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: "Sheet1 · 4 baris",
        })
      ).toBeVisible();
      await expect(page.getByRole("figure")).toBeVisible();
    }

    await expect(async () => {
      await page
        .getByRole("button", { name: /Toggle theme|Ubah tema/u })
        .click();
      await expect(page.locator("html")).toHaveClass(/\bdark\b/u, {
        timeout: 1000,
      });
    }).toPass();
    await expect(page.getByRole("figure")).toBeVisible();
  });

  test("renders line, area, and scatter from the Current View", async ({
    page,
  }) => {
    await sample(page);
    await openChart(page);
    await expect(page.getByRole("figure")).toBeVisible();
    await chooseChartType(page, "Area chart");
    await expect(
      page.getByRole("figure", {
        name: /^Area chart\. Current View in Sheet1\. 4 rows\./u,
      })
    ).toBeVisible();
    await chooseChartType(page, "Scatter chart");
    await expect(chartHeading(page)).toHaveText("Sheet1 · 4 rows");
    await expect(
      page.getByRole("figure", {
        name: /^Scatter chart\. Current View in Sheet1\. 4 rows\. Category: Item\. Series: Paper clips, Notebook, Pencil, Marker\./u,
      })
    ).toBeVisible();
    await page.getByText("Charted data", { exact: true }).click();
    const table = chartedTable(page);
    await expect(
      table.getByRole("rowheader", { name: "Paper clips", exact: true })
    ).toBeVisible();
    await expect(
      table.getByRole("cell", { name: "104", exact: true })
    ).toBeVisible();
    await expect(
      table.getByRole("cell", { name: "48", exact: true })
    ).toBeVisible();
  });

  test("follows a Sheet change", async ({ page }) => {
    await page.goto("/tabular");
    await ready(page);
    await expect(
      page.getByRole("button", { name: "Choose a file", exact: true })
    ).toBeEnabled();
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(fixtures, "values-lab.xlsx"));
    await accept(page);
    await openChart(page);
    await page.getByRole("button", { name: /Sheet/u }).click();
    await page
      .getByRole("listbox")
      .getByRole("option", { name: /Archive/u })
      .click();
    await expect(chartHeading(page)).toContainText("Archive");
  });

  test("never puts the chart in an export", async ({ page }) => {
    await sample(page);
    await openChart(page);
    const csvBytes = await output(page, "csv");
    const csv = csvBytes.toString();
    expect(csv.split("\n")[0]).toBe("SKU,Item,Location,Quantity,Note");
    expect(csv).not.toContain("Charted data");
    expect(csv).not.toContain("Line chart");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();

    const jsonBytes = await output(page, "json");
    const json = JSON.parse(jsonBytes.toString());
    expect(Object.keys(json[0])).toEqual([
      "SKU",
      "Item",
      "Location",
      "Quantity",
      "Note",
    ]);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();

    const xlsx = await output(page, "xlsx");
    const workbook = XLSX.read(xlsx);
    expect(workbook.SheetNames).toEqual(["Sheet1"]);
    const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
    expect(sheet?.["!ref"]).toBe("A1:E5");
    expect(xlsx.toString("latin1")).not.toContain("Charted data");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();

    const pdf = await output(page, "pdf");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1")).not.toContain("Charted data");
  });

  test("sends no file content or chart data over the network", async ({
    page,
  }) => {
    const bodies: string[] = [];
    page.on("request", (request) => {
      const body = request.postData();
      if (body) {
        bodies.push(body);
      }
    });
    await sample(page);
    await openChart(page);
    await page.getByText("Charted data", { exact: true }).click();
    await expect(chartedTable(page)).toBeVisible();
    await expect.poll(() => bodies.join("\n")).not.toContain("Paper clips");
    expect(bodies.join("\n")).not.toContain("Line chart");
  });
});
