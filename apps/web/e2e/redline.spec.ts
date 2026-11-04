import { readFile } from "node:fs/promises";

import type { Page } from "@playwright/test";

import { expect, test } from "./_base";

test.use({ serviceWorkers: "block" });

const ready = (page: Page) =>
  page.waitForFunction(() => {
    const input = document.querySelector("textarea");
    return (
      input &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });

const fill = async (
  page: Page,
  before = "same\nold\n",
  after = "same\nnew\n"
) => {
  await page.goto("/redline");
  await ready(page);
  await page
    .getByRole("textbox", { name: "Before Text", exact: true })
    .fill(before);
  await page
    .getByRole("textbox", { name: "After Text", exact: true })
    .fill(after);
};
test("compares text, reads counts, swaps, and returns to edit", async ({
  page,
}) => {
  await fill(page);
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(page.getByText("1 Removal", { exact: true })).toBeVisible();
  await expect(page.getByText("1 Addition", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Swap", exact: true }).click();
  await expect(page.locator("diffs-container")).toContainText("old");
  await page.getByRole("button", { name: "Edit texts", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Before Text", exact: true })
  ).toHaveValue("same\nnew\n");
});

for (const layout of ["split", "stacked"]) {
  test(`resolves in ${layout} with wrapped lines and exports exact text`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const long = "long changed line ".repeat(40);
    await fill(page, `same\n${long}old`, `same\n${long}new`);
    await page
      .getByRole("button", { name: "Find difference", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Layout", exact: true })
      .selectOption(layout);
    await page.getByRole("checkbox", { name: "Wrapping", exact: true }).focus();
    await page
      .getByRole("checkbox", { name: "Wrapping", exact: true })
      .press("Space");
    await page.getByRole("button", { name: "Resolve", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Copy Resolved Text", exact: true })
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Accept both", exact: true })
      .click();
    await expect(
      page.getByText("0 Conflicts left", { exact: true })
    ).toBeVisible();
    const downloading = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download Resolved Text", exact: true })
      .click();
    const file = await downloading;
    expect(file.suggestedFilename()).toBe("redline-resolved.txt");
    await expect(readFile((await file.path()) ?? "", "utf-8")).resolves.toBe(
      `same\n${long}old\n${long}new`
    );
    await page
      .getByRole("button", { name: "Copy Resolved Text", exact: true })
      .click();
    await expect(page.getByText("Text copied.", { exact: true })).toBeVisible();
    await expect(
      page.evaluate(() => navigator.clipboard.readText())
    ).resolves.toBe(`same\n${long}old\n${long}new`);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page
      .getByRole("button", { name: "Accept all After", exact: true })
      .click();
    await expect(page.locator(".redline-resolved")).toHaveText(
      `same\n${long}new`
    );
  });
}

test("keeps choices across layout changes and confirms before leaving", async ({
  page,
}) => {
  await fill(page, "a\nsame\nb", "x\nsame\ny");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await page
    .getByRole("button", { name: "Accept Before", exact: true })
    .last()
    .click();
  await page
    .getByRole("combobox", { name: "Layout", exact: true })
    .selectOption("stacked");
  await expect(
    page.getByText("1 Conflict left", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Swap", exact: true })
  ).toBeDisabled();
  await page.getByRole("button", { name: "Edit texts", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep working", exact: true }).click();
  await page.getByRole("button", { name: "Accept After", exact: true }).click();
  await expect(page.locator(".redline-resolved")).toHaveText("x\nsame\nb");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page
    .getByRole("button", { name: "Leave Resolve", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Before Text", exact: true })
  ).toHaveValue("");
});

const marked =
  "start\n<<<<<<< HEAD\ncurrent\n||||||| base\nbase\n=======\nincoming\n>>>>>>> branch\ncontext\n<<<<<<< HEAD\nlast current\n=======\nlast incoming\n>>>>>>> branch\nend\n";
test("resolves Marked Text in any order, resets, and handles broken markers", async ({
  page,
}) => {
  await fill(page, marked, "");
  await page
    .getByRole("button", { name: "Resolve Conflicts", exact: true })
    .click();
  await expect(
    page.getByText("2 Conflicts left", { exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Accept incoming", exact: true })
    .last()
    .click();
  await expect(
    page.getByText("1 Conflict left", { exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Accept both", exact: true }).click();
  await expect(page.locator(".redline-resolved")).toHaveText(
    "start\ncurrent\nincoming\ncontext\nlast incoming\nend\n"
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page
    .getByRole("button", { name: "Accept all current", exact: true })
    .click();
  await expect(page.locator(".redline-resolved")).toHaveText(
    "start\ncurrent\ncontext\nlast current\nend\n"
  );
  await page.getByRole("button", { name: "Edit texts", exact: true }).click();
  await page
    .getByRole("button", { name: "Leave Resolve", exact: true })
    .click();
  const broken = "<<<<<<< HEAD\nmissing end";
  await page
    .getByRole("textbox", { name: "Before Text", exact: true })
    .fill(broken);
  await page
    .getByRole("button", { name: "Resolve Conflicts", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("markers are broken");
  await expect(
    page.getByRole("textbox", { name: "Before Text", exact: true })
  ).toHaveValue(broken);
});

test("opens each side, refuses binary data, and preserves CRLF download bytes", async ({
  page,
}) => {
  await fill(page, "", "");
  await Promise.all(
    ["Before Text", "After Text"].map(async (side) => {
      await page
        .getByRole("region", { name: side, exact: true })
        .locator('input[type="file"]')
        .setInputFiles({
          name: side === "Before Text" ? "before.ts" : "after.ts",
          mimeType: "text/plain",
          buffer: Buffer.from(
            side === "Before Text" ? "a\r\nb\r\n" : "a\r\nc\r\n"
          ),
        });
    })
  );
  await expect(
    page.getByRole("textbox", { name: "Before Text", exact: true })
  ).toHaveValue("a\nb\n");
  await expect(page.getByText("after.ts", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Language", exact: true })
  ).toHaveValue("typescript");
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await page
    .getByRole("button", { name: "Accept all After", exact: true })
    .click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download Resolved Text", exact: true })
    .click();
  const file = await downloading;
  expect(file.suggestedFilename()).toBe("after-resolved.ts");
  await expect(readFile((await file.path()) ?? "")).resolves.toEqual(
    Buffer.from("a\r\nc\r\n")
  );
  await page.getByRole("button", { name: "Edit texts", exact: true }).click();
  await page
    .getByRole("button", { name: "Leave Resolve", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Before Text", exact: true })
    .locator('input[type="file"]')
    .setInputFiles({
      name: "binary.bin",
      mimeType: "application/octet-stream",
      buffer: Buffer.from([65, 0, 66]),
    });
  await expect(page.getByRole("alert")).toContainText("binary or is not UTF-8");
  await expect(
    page.getByRole("textbox", { name: "Before Text", exact: true })
  ).toHaveValue("a\nb\n");
});

test("changes the rendered controls and keeps preferences across a reload", async ({
  page,
}) => {
  await fill(page);
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  const pre = page.locator("diffs-container pre[data-diff-type]");
  await page
    .getByRole("combobox", { name: "Layout", exact: true })
    .selectOption("stacked");
  await expect(pre).toHaveAttribute("data-diff-type", "single");
  await page
    .getByRole("combobox", { name: "Indicators", exact: true })
    .selectOption("classic");
  await expect(pre).toHaveAttribute("data-indicators", "classic");
  await page.getByRole("checkbox", { name: "Wrapping", exact: true }).focus();
  await page
    .getByRole("checkbox", { name: "Wrapping", exact: true })
    .press("Space");
  await expect(pre).toHaveAttribute("data-overflow", "wrap");
  await page
    .getByRole("checkbox", { name: "Line Numbers", exact: true })
    .focus();
  await page
    .getByRole("checkbox", { name: "Line Numbers", exact: true })
    .press("Space");
  await expect(pre).toHaveAttribute("data-disable-line-numbers", "");
  await page
    .getByRole("checkbox", { name: "Backgrounds", exact: true })
    .focus();
  await page
    .getByRole("checkbox", { name: "Backgrounds", exact: true })
    .press("Space");
  await expect(pre).not.toHaveAttribute("data-background", "");
  await page
    .getByRole("combobox", { name: "Inline highlight", exact: true })
    .selectOption("none");
  await expect(page.locator("diffs-container [data-diff-span]")).toHaveCount(0);
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole("textbox", { name: "Before Text", exact: true })
  ).toHaveValue("");
  await page
    .getByRole("textbox", { name: "Before Text", exact: true })
    .fill("x");
  await page
    .getByRole("textbox", { name: "After Text", exact: true })
    .fill("y");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Layout", exact: true })
  ).toHaveValue("stacked");
  await expect(
    page.getByRole("checkbox", { name: "Wrapping", exact: true })
  ).toBeChecked();
});

test("uses Indonesian Conflict actions", async ({ browser }) => {
  const context = await browser.newContext({ locale: "id-ID" });
  const page = await context.newPage();
  await page.goto("/redline");
  await page.waitForFunction(() => {
    const input = document.querySelector("textarea");
    return (
      input &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });
  await page
    .getByRole("textbox", { name: "Teks Sebelum", exact: true })
    .fill("a");
  await page
    .getByRole("textbox", { name: "Teks Sesudah", exact: true })
    .fill("b");
  await page
    .getByRole("button", { name: "Cari perbedaan", exact: true })
    .click();
  await page.getByRole("button", { name: "Selesaikan", exact: true }).click();
  await page
    .getByRole("button", { name: "Terima keduanya", exact: true })
    .click();
  await expect(page.locator(".redline-resolved")).toHaveText("a\nb");
  await page.getByRole("button", { name: "Edit teks", exact: true }).click();
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Teks Sebelum", exact: true })
    .fill("<<<<<<< HEAD\nsaat ini\n=======\nmasuk\n>>>>>>> branch\n");
  await page
    .getByRole("textbox", { name: "Teks Sesudah", exact: true })
    .fill("");
  await page
    .getByRole("button", { name: "Selesaikan Konflik", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Terima saat ini", exact: true })
    .click();
  await expect(page.locator(".redline-resolved")).toHaveText("saat ini\n");
  await context.close();
});

test("shows syntax colors and falls back to plain text when a grammar cannot load", async ({
  page,
}) => {
  await fill(page, "const before = 1;", "const after = 2;");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("javascript");
  const syntaxColorCount = () =>
    page
      .locator("diffs-container code [data-line] span")
      .evaluateAll(
        (nodes) =>
          new Set(nodes.map((node) => getComputedStyle(node).color)).size
      );
  await expect.poll(syntaxColorCount, { timeout: 15_000 }).toBeGreaterThan(1);
  const attempted = Promise.withResolvers<boolean>();
  await page.route(/python[^/]*\.js/u, async (route) => {
    await route.abort("blockedbyclient");
    attempted.resolve(true);
  });
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("python");
  await attempted.promise;
  await expect(
    page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Redline library failed to load" })
  ).toHaveCount(1);
  await expect.poll(syntaxColorCount).toBe(1);
  await expect(page.locator("diffs-container")).toContainText(
    "const after = 2;"
  );
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await page.getByRole("button", { name: "Accept After", exact: true }).click();
  await expect(page.locator(".redline-resolved")).toHaveText(
    "const after = 2;"
  );
});

test("keeps texts and shows one toast when the renderer load fails", async ({
  page,
}) => {
  const module =
    /\/(?:src\/features\/redline\/components\/redline-result\.tsx|assets\/redline-result-[^/]+\.js)(?:\?|$)/u;
  await page.route(module, (route) => route.abort("blockedbyclient"));
  await fill(page);
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  const toast = page
    .locator("[data-sonner-toast]")
    .filter({ hasText: "Redline library failed to load" });
  await expect(toast).toHaveCount(1);
  await expect(
    page.getByRole("textbox", { name: "Before Text", exact: true })
  ).toHaveValue("same\nold\n");
  await page.unroute(module);
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(page.getByText("1 Removal", { exact: true })).toBeVisible();
});

for (const [name, module] of [
  [
    "session",
    /\/(?:src\/features\/redline\/redline\.session\.ts|assets\/redline\.session-[^/]+\.js)(?:\?|$)/u,
  ],
  [
    "shared library",
    /\/(?:node_modules\/\.vite\/deps\/@pierre_diffs\.js|assets\/(?:FileDiff|shared_highlighter)-[^/]+\.js)(?:\?|$)/u,
  ],
] as const) {
  test(`retries a failed ${name} load with the same texts`, async ({
    page,
  }) => {
    await page.route(module, (route) => route.abort("blockedbyclient"));
    await fill(page);
    await page
      .getByRole("button", { name: "Find difference", exact: true })
      .click();
    await expect(
      page
        .locator("[data-sonner-toast]")
        .filter({ hasText: "Redline library failed to load" })
    ).toHaveCount(1);
    await expect(
      page.getByRole("textbox", { name: "Before Text", exact: true })
    ).toHaveValue("same\nold\n");
    await page.unroute(module);
    await page
      .getByRole("button", { name: "Find difference", exact: true })
      .click();
    await expect(page.locator("diffs-container")).toContainText("new");
    await expect(page.getByText("1 Removal", { exact: true })).toBeVisible();
  });
}

test("opens a dropped file on each side", async ({ page }) => {
  await fill(page, "", "");
  // Synthetic files have no OS entry. A real file drop has one.
  await page.evaluate(() =>
    Object.defineProperty(DataTransferItem.prototype, "webkitGetAsEntry", {
      configurable: true,
      value: () => ({ isFile: true, isDirectory: false }),
    })
  );
  const drop = async (side: string, text: string, name: string) => {
    const transfer = await page.evaluateHandle(
      ({ contents, filename }) => {
        const data = new DataTransfer();
        data.items.add(new File([contents], filename, { type: "text/plain" }));
        return data;
      },
      { contents: text, filename: name }
    );
    const zone = page
      .getByRole("region", { name: side, exact: true })
      .locator(".redline-drop");
    await zone.dispatchEvent("dragenter", { dataTransfer: transfer });
    await zone.dispatchEvent("dragover", { dataTransfer: transfer });
    await zone.dispatchEvent("drop", { dataTransfer: transfer });
  };
  await drop("Before Text", "dropped before", "before.txt");
  await drop("After Text", "dropped after", "after.txt");
  await expect(
    page.getByRole("textbox", { name: "Before Text", exact: true })
  ).toHaveValue("dropped before");
  await expect(
    page.getByRole("textbox", { name: "After Text", exact: true })
  ).toHaveValue("dropped after");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(page.getByText("1 Addition", { exact: true })).toBeVisible();
});

test("keeps an active compare when an earlier file read finishes", async ({
  page,
}) => {
  await fill(page);
  const release = await page.evaluateHandle(() => {
    const original = File.prototype.arrayBuffer;
    const gate = Promise.withResolvers<ArrayBuffer>();
    File.prototype.arrayBuffer = function arrayBuffer() {
      return this.name === "pending.txt" ? gate.promise : original.call(this);
    };
    return () => gate.resolve(new ArrayBuffer(0));
  });
  await page
    .getByRole("region", { name: "Before Text", exact: true })
    .locator('input[type="file"]')
    .setInputFiles({
      name: "pending.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("pending"),
    });
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(page.getByText("1 Removal", { exact: true })).toBeVisible();
  await release.evaluate((finish) => finish());
  await page.getByRole("button", { name: "Edit texts", exact: true }).click();
  const overwritten = expect(
    page.getByRole("textbox", { name: "Before Text", exact: true })
  ).toHaveValue("", { timeout: 500 });
  await expect(overwritten).rejects.toThrow();
  await expect(
    page.getByRole("textbox", { name: "Before Text", exact: true })
  ).toHaveValue("same\nold\n");
});

test("compares private text without a request that contains it", async ({
  page,
}) => {
  const secret = "redline-private-57-unique-text";
  await page.route("**/*", async (route) => {
    // Validate the privacy contract at the network boundary.
    expect(
      `${route.request().url()} ${route.request().postData() ?? ""}`
    ).not.toContain(secret);
    await route.continue();
  });
  await fill(page, `${secret}\nbefore`, `${secret}\nafter`);
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await page.getByRole("button", { name: "Accept both", exact: true }).click();
  await expect(page.locator(".redline-resolved")).toHaveText(
    `${secret}\nbefore\nafter`
  );
});

test("warns above 5 MB and cancels a compare while its Worker starts", async ({
  page,
}) => {
  await fill(page, "", "after");
  await page
    .getByRole("region", { name: "Before Text", exact: true })
    .locator('input[type="file"]')
    .setInputFiles({
      name: "large.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("a".repeat(5_000_001)),
    });
  await expect(
    page.getByText(
      "This text is above 5 MB. The compare can take time. You can cancel it.",
      { exact: true }
    )
  ).toBeVisible();
  await page.route(/redline\.worker/u, () => {
    /* Keep startup pending until Cancel ends the Worker. */
  });
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Before Text", exact: true })
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Find difference", exact: true })
  ).toBeEnabled();
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`fits the ${viewport.width}px viewport and keeps the right default layout`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await fill(page);
    await page
      .getByRole("button", { name: "Find difference", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Layout", exact: true })
    ).toHaveValue(viewport.width < 768 ? "stacked" : "split");
    await page.getByRole("button", { name: "Resolve", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Accept both", exact: true })
    ).toBeVisible();
    await expect(
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    ).resolves.toBe(true);
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `/tmp/ritools-redline-${viewport.width}.png`,
      fullPage: true,
    });
  });
}
