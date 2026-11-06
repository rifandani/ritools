import type { Page } from "@playwright/test";

import { languageLabel } from "../src/features/cleave/cleave.languages";
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
  await page.goto("/cleave");
  await ready(page);
  await page
    .getByRole("textbox", { name: "Before Text", exact: true })
    .fill(before);
  await page
    .getByRole("textbox", { name: "After Text", exact: true })
    .fill(after);
};

const selectControl = async (page: Page, label: string, option: string) => {
  await page
    .getByRole("button", { name: new RegExp(`${label}$`, "u") })
    .click();
  await page
    .getByRole("option", {
      name: label === "Language" ? languageLabel(option) : option,
      exact: true,
    })
    .click();
};

const unchangedContext = (name: string) =>
  Array.from({ length: 20 }, (_, index) => `${name} ${index + 1}\n`).join("");

for (const width of [1440, 390]) {
  test(`searches all languages by name and alias at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await fill(page, "const before = 1;", "const after = 2;");
    await page
      .getByRole("button", { name: "Find difference", exact: true })
      .click();
    const trigger = page.getByRole("button", { name: /Language$/u });
    await expect(trigger).toContainText("Automatic · JavaScript");
    await trigger.click();
    const search = page.getByRole("searchbox", { name: "Search languages" });
    await expect(search).toBeFocused();
    const options = page.getByRole("option");
    await expect(options).toHaveCount(155);
    await expect(options.nth(0)).toHaveAccessibleName("Automatic");
    await expect(options.nth(1)).toHaveAccessibleName("Plain text");
    const menu = page.getByRole("listbox");
    const bounds = await menu.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) {
      throw new Error("The language list is missing.");
    }
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(900);
    const searchBounds = await search.boundingBox();
    expect(searchBounds?.x).toBeGreaterThanOrEqual(bounds.x);
    expect(
      (searchBounds?.x ?? 0) + (searchBounds?.width ?? 0)
    ).toBeLessThanOrEqual(bounds.x + bounds.width);
    await page.screenshot({
      path: `/tmp/ritools-cleave-languages-${width}.png`,
      fullPage: false,
    });
    await search.fill("c++");
    await expect(options).toHaveCount(1);
    await expect(options.first()).toHaveAccessibleName("C++");
    await search.fill("js");
    await expect(
      page.getByRole("option", { name: "JavaScript", exact: true })
    ).toBeVisible();
    await search.press("ArrowDown");
    await search.press("Enter");
    await expect(trigger).toHaveText("JavaScript");
    await trigger.click();
    await search.fill("not-a-language");
    await expect(
      page.getByText("No matching languages.", { exact: true })
    ).toBeVisible();
    await search.fill("kotlin");
    await expect(options).toHaveCount(1);
    await expect(options.first()).toHaveAccessibleName("Kotlin");
    await options.first().click();
    await expect(trigger).toHaveText("Kotlin");
    await selectControl(page, "Language", "Automatic");
    await expect(trigger).toContainText("Automatic · JavaScript");
  });
}

test("keeps a manual language across comparisons and restores filename detection with Automatic", async ({
  page,
}) => {
  await fill(page, "old", "new");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await selectControl(page, "Language", "python");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page
    .getByRole("region", { name: "Before Text", exact: true })
    .locator('input[type="file"]')
    .setInputFiles({
      name: "Main.kt",
      mimeType: "text/plain",
      buffer: Buffer.from("fun before() = 1"),
    });
  await expect(
    page.getByRole("textbox", { name: "Before Text", exact: true })
  ).toHaveValue("fun before() = 1");
  await page
    .getByRole("textbox", { name: "After Text", exact: true })
    .fill("fun after() = 2");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Language$/u })).toHaveText(
    "Python"
  );
  await selectControl(page, "Language", "Automatic");
  await expect(page.getByRole("button", { name: /Language$/u })).toContainText(
    "Automatic · Kotlin"
  );
});

test("limits language choices to the JavaScript backend when WebAssembly is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "WebAssembly", { value: undefined });
  });
  await fill(page, "old", "new");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await page.getByRole("button", { name: /Language$/u }).click();
  const search = page.getByRole("searchbox", { name: "Search languages" });
  await search.fill("cuda");
  await expect(
    page.getByRole("option", { name: "CUDA", exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByText("No matching languages.", { exact: true })
  ).toBeVisible();
  await search.fill("swift");
  await page.getByRole("option", { name: "Swift", exact: true }).click();
  await expect(page.getByRole("button", { name: /Language$/u })).toHaveText(
    "Swift"
  );
});

test("detects pasted TypeScript when finding differences", async ({ page }) => {
  const before = `export function createSpanFromToken(token: ThemedToken) {
  const element = document.createElement('div');
  return element;
}`;
  await fill(page, before, before.replace("'div'", "'span'"));
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Language$/u })).toContainText(
    "Automatic · TypeScript"
  );
  const syntaxColorCount = () =>
    page
      .locator("diffs-container code [data-line] span")
      .evaluateAll(
        (nodes) =>
          new Set(nodes.map((node) => getComputedStyle(node).color)).size
      );
  await expect.poll(syntaxColorCount, { timeout: 15_000 }).toBeGreaterThan(1);
  await selectControl(page, "Language", "Plain text");
  await expect.poll(syntaxColorCount).toBe(1);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Before Text", exact: true })
    .fill("const count = 1;");
  await page
    .getByRole("textbox", { name: "After Text", exact: true })
    .fill("const count = 2;");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Language$/u })).toContainText(
    "Plain text"
  );
  await selectControl(page, "Language", "Automatic");
  await expect(page.getByRole("button", { name: /Language$/u })).toContainText(
    "Automatic · JavaScript"
  );
});

for (const layout of ["split", "stacked"]) {
  test(`expands unchanged lines in ${layout} and preserves them during Resolve`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: layout === "split" ? 1440 : 390,
      height: 900,
    });
    const start = unchangedContext("start");
    const middle = unchangedContext("middle");
    const end = unchangedContext("end");
    const before = `${start}old first\n${middle}old last\n${end}`;
    const after = `${start}new first\n${middle}new last\n${end}`;
    await fill(page, before, after);
    await page
      .getByRole("button", { name: "Find difference", exact: true })
      .click();
    await selectControl(
      page,
      "Layout",
      layout === "split" ? "Split" : "Stacked"
    );
    const renderer = page.locator("diffs-container");
    const folds = renderer.locator("[data-unmodified-lines]");
    await expect(folds.first()).toContainText("unmodified lines");
    await Promise.all(
      ["start 1", "middle 10", "end 20"].map((text) =>
        expect(renderer.getByText(text, { exact: true })).toHaveCount(0)
      )
    );
    await Promise.all(
      ["old first", "new first", "old last", "new last"].map((text) =>
        expect(renderer.getByText(text, { exact: true })).toBeVisible()
      )
    );
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: `/tmp/ritools-cleave-folded-${layout}.png`,
      fullPage: true,
    });
    // Each click reveals the complete unchanged region in these short files.
    for (const text of ["start 1", "middle 10", "end 20"]) {
      // oxlint-disable-next-line no-await-in-loop -- Expanding a region changes which fold is first.
      await folds.first().click();
      // oxlint-disable-next-line no-await-in-loop -- Check this region before expanding the next one.
      await expect(
        renderer.getByText(text, { exact: true }).first()
      ).toBeVisible();
    }
    await expect(folds).toHaveCount(0);
    await page.getByRole("button", { name: "Resolve", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Accept After", exact: true })
    ).toHaveCount(2);
    await page
      .getByRole("button", { name: "Accept all After", exact: true })
      .click();
    await expect(
      page.locator("diffs-container code").first().locator("[data-line]")
    ).toHaveText(after.trimEnd().split("\n"));
  });
}

test("compares text and clears from the display controls", async ({ page }) => {
  await fill(page);
  await page.getByRole("button", { name: "Swap", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Before Text", exact: true })
  ).toHaveValue("same\nnew\n");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(page.getByText("1 Removal", { exact: true })).toBeVisible();
  await expect(page.getByText("1 Addition", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit texts", exact: true })
  ).toHaveCount(0);
  const clear = page.getByRole("button", { name: "Clear", exact: true });
  await expect(
    page.locator(".cleave-controls").getByRole("button").nth(-2)
  ).toHaveText("Clear");
  await clear.click();
  await Promise.all(
    ["Before Text", "After Text"].map((name) =>
      expect(page.getByRole("textbox", { name, exact: true })).toHaveValue("")
    )
  );
  await expect(
    page.getByRole("button", { name: "Find difference", exact: true })
  ).toBeDisabled();
});

test("swaps the texts of a Text Diff from the display controls", async ({
  page,
}) => {
  await fill(page, "same\nold\nextra\n", "same\nnew\n");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(page.getByText("2 Removals", { exact: true })).toBeVisible();
  await expect(page.getByText("1 Addition", { exact: true })).toBeVisible();
  await selectControl(page, "Language", "python");
  const buttons = page.locator(".cleave-controls").getByRole("button");
  await expect(buttons.nth(-3)).toHaveText("Swap");
  await expect(buttons.nth(-2)).toHaveText("Clear");
  await page.getByRole("button", { name: "Swap", exact: true }).click();
  await expect(page.getByText("1 Removal", { exact: true })).toBeVisible();
  await expect(page.getByText("2 Additions", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Language$/u })).toContainText(
    "Python"
  );
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Swap", exact: true })
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Before Text", exact: true })
  ).toHaveValue("");
});

for (const layout of ["split", "stacked"]) {
  test(`resolves in ${layout} with wrapped lines and no separate Resolved Text section`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: layout === "split" ? 1440 : 390,
      height: 900,
    });
    const long = "long changed line ".repeat(40);
    await fill(page, `same\n${long}old`, `same\n${long}new`);
    await page
      .getByRole("button", { name: "Find difference", exact: true })
      .click();
    await selectControl(
      page,
      "Layout",
      layout === "split" ? "Split" : "Stacked"
    );
    await page.getByRole("checkbox", { name: "Wrapping", exact: true }).focus();
    await page
      .getByRole("checkbox", { name: "Wrapping", exact: true })
      .press("Space");
    await page.getByRole("button", { name: "Resolve", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Copy Resolved Text", exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Resolved Text", exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Download Resolved Text", exact: true })
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Accept both", exact: true })
      .click();
    await expect(
      page.getByText("0 Conflicts left", { exact: true })
    ).toBeVisible();
    await expect(
      page.locator("diffs-container code").first().locator("[data-line]")
    ).toHaveText(["same", `${long}old`, `${long}new`]);
    await expect(
      page.getByRole("heading", { name: "Resolved Text", exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Copy Resolved Text", exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Download Resolved Text", exact: true })
    ).toHaveCount(0);
    await expect(page.locator(".cleave-resolved")).toHaveCount(0);
    await page.screenshot({
      path: `/tmp/ritools-cleave-resolved-${layout}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page
      .getByRole("button", { name: "Accept all After", exact: true })
      .click();
    await expect(
      page.locator("diffs-container code").first().locator("[data-line]")
    ).toHaveText(`same\n${long}new`.trimEnd().split("\n"));
  });
}

for (const width of [1440, 390]) {
  test(`cancels Resolve and restores the comparison at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const middle = unchangedContext("middle");
    await fill(
      page,
      `old first\n${middle}old last\n`,
      `new first\n${middle}new last\n`
    );
    await page
      .getByRole("button", { name: "Find difference", exact: true })
      .click();
    const resolve = page.getByRole("button", { name: "Resolve", exact: true });
    const cancel = page.getByRole("button", { name: "Cancel", exact: true });
    const accept = page.getByRole("button", {
      name: "Accept After",
      exact: true,
    });
    for (const progress of ["none", "partial", "all"]) {
      // oxlint-disable-next-line no-await-in-loop -- Each pass starts a new Resolve session.
      await resolve.click();
      if (progress === "partial") {
        // oxlint-disable-next-line no-await-in-loop -- Resolve one Conflict before Cancel.
        await accept.first().click();
        // oxlint-disable-next-line no-await-in-loop -- Confirm the partial state before Cancel.
        await expect(
          page.getByText("1 Conflict left", { exact: true })
        ).toBeVisible();
      } else if (progress === "all") {
        // oxlint-disable-next-line no-await-in-loop -- Resolve all Conflicts before Cancel.
        await page
          .getByRole("button", { name: "Accept all After", exact: true })
          .click();
        // oxlint-disable-next-line no-await-in-loop -- Confirm completion before Cancel.
        await expect(
          page.getByText("0 Conflicts left", { exact: true })
        ).toBeVisible();
      }
      // oxlint-disable-next-line no-await-in-loop -- Cancel must restore the comparison each time.
      await cancel.click();
      // oxlint-disable-next-line no-await-in-loop -- Check the complete return state before the next pass.
      await Promise.all([
        expect(resolve).toBeVisible(),
        expect(cancel).toHaveCount(0),
        expect(accept).toHaveCount(0),
        expect(
          page.getByRole("button", { name: "Reset", exact: true })
        ).toHaveCount(0),
        ...["old first", "new first", "old last", "new last"].map((text) =>
          expect(
            page.locator("diffs-container").getByText(text, { exact: true })
          ).toBeVisible()
        ),
      ]);
    }
    await resolve.click();
    await expect(
      page.getByText("2 Conflicts left", { exact: true })
    ).toBeVisible();
    await expect(accept).toHaveCount(2);
  });

  test(`shows comparison statistics and copies each input at ${width}px`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width, height: 900 });
    const before = "same\nold 😀\n";
    const after = "same\nnew\nextra\n";
    await fill(page, before, after);
    await page
      .getByRole("button", { name: "Find difference", exact: true })
      .click();
    await selectControl(page, "Layout", "Split");
    const header = page.locator(".cleave-comparison-header");
    const footer = page.locator(".cleave-comparison-footer");
    const metrics = footer.getByRole("region");
    await expect(metrics).toHaveText([
      "2 lines · 9 characters",
      "3 lines · 12 characters",
    ]);
    await expect(header.getByText(/\d+ lines/u)).toHaveCount(0);
    const [viewerBox, footerBox, beforeBox, afterBox] = await Promise.all([
      page.locator(".cleave-renderer").boundingBox(),
      footer.boundingBox(),
      metrics.first().boundingBox(),
      metrics.last().boundingBox(),
    ]);
    expect(footerBox?.y).toBeGreaterThanOrEqual(
      (viewerBox?.y ?? 0) + (viewerBox?.height ?? 0)
    );
    expect(beforeBox?.y).toBe(afterBox?.y);
    expect(afterBox?.x).toBeCloseTo(
      (beforeBox?.x ?? 0) + (beforeBox?.width ?? 0),
      0
    );
    await page.mouse.move(0, 0);
    await page.getByRole("button", { name: "1 Removal", exact: true }).hover();
    const details = page.getByRole("tooltip");
    await expect(details).toContainText("Characters");
    await expect(details.locator("dl").first()).toHaveText(
      "Total2Removed−50% 1"
    );
    await expect(details.locator("dl").last()).toHaveText(
      "Total9Removed−55.6% 5"
    );
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `/tmp/ritools-cleave-statistics-${width}.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(details).toHaveCount(0);
    await page
      .getByRole("button", { name: "2 Additions", exact: true })
      .focus();
    await expect(details.locator("dl").first()).toHaveText(
      "Total3Added+66.7% 2"
    );
    await expect(details.locator("dl").last()).toHaveText(
      "Total12Added+66.7% 8"
    );
    await page.keyboard.press("Escape");
    const copyBefore = page.getByRole("button", {
      name: "Copy Before Text",
      exact: true,
    });
    // Restore pointer input before entering a trigger after keyboard input.
    await page.mouse.move(0, 0);
    await copyBefore.hover();
    await expect(details).toHaveText("Copy");
    await copyBefore.click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(before);
    await page
      .getByRole("button", { name: "Copy After Text", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(after);
    await expect(
      page.getByText("Text copied.", { exact: true }).first()
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
    await page.mouse.move(0, 0);
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await page.screenshot({
      path: `/tmp/ritools-cleave-header-${width}.png`,
      fullPage: true,
    });
  });
}

for (const width of [1440, 390]) {
  test(`merges the header in the Stacked layout at ${width}px`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.setViewportSize({ width, height: 900 });
    await fill(page, "same\nold 😀\n", "same\nnew\nextra\n");
    await page
      .getByRole("button", { name: "Find difference", exact: true })
      .click();
    await selectControl(page, "Layout", "Stacked");
    const header = page.locator(".cleave-comparison-header");
    const removals = header.getByRole("button", {
      name: "1 Removal",
      exact: true,
    });
    const additions = header.getByRole("button", {
      name: "2 Additions",
      exact: true,
    });
    const copyStacked = header.getByRole("button", {
      name: "Copy Stacked Text",
      exact: true,
    });
    await expect(header.locator(".cleave-comparison-row")).toHaveCount(1);
    const footer = page.locator(".cleave-comparison-footer");
    await expect(footer.getByRole("region")).toHaveCount(1);
    await expect(footer).toHaveText("4 lines · 17 characters");
    await expect(header.getByText("4 lines", { exact: true })).toHaveCount(0);
    await expect(
      header.getByRole("button", { name: /^Copy (?:Before|After) Text$/u })
    ).toHaveCount(0);
    const [removalsBox, additionsBox, copyBox] = await Promise.all(
      [removals, additions, copyStacked].map((locator) => locator.boundingBox())
    );
    expect(additionsBox?.x).toBeGreaterThan(
      (removalsBox?.x ?? 0) + (removalsBox?.width ?? 0)
    );
    expect(additionsBox?.y).toBe(removalsBox?.y);
    expect(copyBox?.x).toBeGreaterThan(
      (additionsBox?.x ?? 0) + (additionsBox?.width ?? 0)
    );
    await additions.hover();
    await expect(page.getByRole("tooltip").locator("dl").first()).toHaveText(
      "Total3Added+66.7% 2"
    );
    await page.mouse.move(0, 0);
    await copyStacked.click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe("same\nold 😀\nnew\nextra\n");
    await page.screenshot({
      path: `/tmp/ritools-cleave-stacked-footer-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
  });
}

test("updates the change counts and details after each choice", async ({
  page,
}) => {
  await fill(
    page,
    "a\nremoved\nsame\nold one\nold two\n",
    "a\nsame\nnew one\n"
  );
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await selectControl(page, "Layout", "Stacked");
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  const counts = page.locator(".cleave-comparison-counts").getByRole("button");
  await expect(counts).toHaveText(["3 Removals", "1 Addition"]);
  await page
    .getByRole("button", { name: "Accept Before", exact: true })
    .first()
    .click();
  await expect(counts).toHaveText(["2 Removals", "1 Addition"]);
  await counts.first().hover();
  const details = page.getByRole("tooltip");
  await expect(details.locator("dl").first()).toHaveText("Total5Removed−40% 2");
  await page.mouse.move(0, 0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Accept After", exact: true }).click();
  await expect(counts).toHaveText(["0 Removals", "0 Additions"]);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(counts).toHaveText(["3 Removals", "1 Addition"]);
  await page
    .getByRole("button", { name: "Accept all After", exact: true })
    .click();
  await expect(counts).toHaveText(["0 Removals", "0 Additions"]);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(counts).toHaveText(["3 Removals", "1 Addition"]);
});

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
  await selectControl(page, "Layout", "Stacked");
  await expect(
    page.getByText("1 Conflict left", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Swap", exact: true })
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "Your choices and input texts will be cleared."
  );
  await page.getByRole("button", { name: "Keep working", exact: true }).click();
  await page.getByRole("button", { name: "Accept After", exact: true }).click();
  await expect(
    page.locator("diffs-container code").first().locator("[data-line]")
  ).toHaveText("x\nsame\nb".trimEnd().split("\n"));
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
  await expect(
    page.locator("diffs-container code").first().locator("[data-line]")
  ).toHaveText(
    "start\ncurrent\nincoming\ncontext\nlast incoming\nend\n"
      .trimEnd()
      .split("\n")
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page
    .getByRole("button", { name: "Accept all current", exact: true })
    .click();
  await expect(
    page.locator("diffs-container code").first().locator("[data-line]")
  ).toHaveText(
    "start\ncurrent\ncontext\nlast current\nend\n".trimEnd().split("\n")
  );
  await page.getByRole("button", { name: "Clear", exact: true }).click();
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

test("opens each side, resolves CRLF text, and refuses binary data", async ({
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
  await expect(
    page.getByRole("textbox", { name: "After Text", exact: true })
  ).toHaveValue("a\nc\n");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Language$/u })).toContainText(
    "TypeScript"
  );
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await page
    .getByRole("button", { name: "Accept all After", exact: true })
    .click();
  await expect(
    page.getByText("0 Conflicts left", { exact: true })
  ).toBeVisible();
  await expect(
    page.locator("diffs-container code").first().locator("[data-line]")
  ).toHaveText(["a", "c"]);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
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
  ).toHaveValue("");
});

test("changes the rendered controls and keeps preferences across a reload", async ({
  page,
}) => {
  await fill(page);
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  const pre = page.locator("diffs-container pre[data-diff-type]");
  await selectControl(page, "Layout", "Stacked");
  await expect(pre).toHaveAttribute("data-diff-type", "single");
  await selectControl(page, "Indicators", "Classic");
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
  await page.getByRole("button", { name: /Inline highlight$/u }).click();
  await expect(
    page.getByRole("option", { name: "Word-Line", exact: true })
  ).toHaveAccessibleDescription(
    "Highlight one region from the first change to the last"
  );
  await page.getByRole("option", { name: "None", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Inline highlight$/u })
  ).toHaveAccessibleName("None Inline highlight");
  await expect(page.locator("diffs-container [data-diff-span]")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("1 Removal", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Layout$/u })).toContainText(
    "Stacked"
  );
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Before Text", exact: true })
    .fill("x");
  await page
    .getByRole("textbox", { name: "After Text", exact: true })
    .fill("y");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Layout$/u })).toContainText(
    "Stacked"
  );
  await expect(
    page.getByRole("checkbox", { name: "Wrapping", exact: true })
  ).toBeChecked();
});

test("uses Indonesian Conflict actions", async ({ browser }) => {
  const context = await browser.newContext({ locale: "id-ID" });
  const page = await context.newPage();
  await page.goto("/cleave");
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
  const language = page.getByRole("button", { name: /Bahasa$/u });
  await expect(language).toContainText("Otomatis · Teks biasa");
  await language.click();
  const search = page.getByRole("searchbox", { name: "Cari bahasa" });
  await search.fill("txt");
  await expect(
    page.getByRole("option", { name: "Teks biasa", exact: true })
  ).toBeVisible();
  await search.fill("tidak-ada-bahasa");
  await expect(
    page.getByText("Tidak ada bahasa yang cocok.", { exact: true })
  ).toBeVisible();
  await search.fill("");
  await page.getByRole("option", { name: "Otomatis", exact: true }).click();
  await page.getByRole("button", { name: "Selesaikan", exact: true }).click();
  await page
    .getByRole("button", { name: "Terima keduanya", exact: true })
    .click();
  await expect(
    page.locator("diffs-container code").first().locator("[data-line]")
  ).toHaveText("a\nb".trimEnd().split("\n"));
  await page.getByRole("button", { name: "Hapus", exact: true }).click();
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
  await expect(
    page.locator("diffs-container code").first().locator("[data-line]")
  ).toHaveText("saat ini\n".trimEnd().split("\n"));
  await context.close();
});

for (const mode of ["light", "dark"]) {
  test(`uses bundled Highlights lexers with the ${mode} theme`, async ({
    page,
  }) => {
    await page.addInitScript((value) => {
      localStorage.setItem("app-color-mode", value);
    }, mode);
    const grammarRequests: string[] = [];
    await page.route(
      /(?:javascript|typescript|python)[^/]*\.js/u,
      async (route) => {
        grammarRequests.push(route.request().url());
        await route.abort("blockedbyclient");
      }
    );
    await fill(
      page,
      'const before = "<script>alert(1)</script>";',
      'const after = "safe";'
    );
    await page
      .getByRole("button", { name: "Find difference", exact: true })
      .click();
    const lines = page.locator("diffs-container code [data-line]");
    await expect(lines).toContainText([
      'const before = "<script>alert(1)</script>";',
      'const after = "safe";',
    ]);
    await expect(page.locator("diffs-container script")).toHaveCount(0);
    // Each selection must finish before the next menu can open.
    /* oxlint-disable no-await-in-loop */
    for (const language of [
      "javascript",
      "typescript",
      "jsx",
      "tsx",
      "json",
      "html",
      "css",
      "markdown",
      "python",
      "rust",
      "go",
      "java",
      "c",
      "cpp",
      "yaml",
      "toml",
      "bash",
      "sql",
      "xml",
    ]) {
      await selectControl(page, "Language", language);
      await expect(page.locator("diffs-container")).toContainText(
        'const after = "safe";'
      );
    }
    /* oxlint-enable no-await-in-loop */
    await selectControl(page, "Language", "javascript");
    await expect
      .poll(() =>
        lines
          .locator("span")
          .evaluateAll(
            (nodes) =>
              new Set(nodes.map((node) => getComputedStyle(node).color)).size
          )
      )
      .toBeGreaterThan(1);
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
    expect(grammarRequests).toEqual([]);
  });
}

test("ignores type and JSX syntax inside literals with the standalone tokenizer", async ({
  page,
}) => {
  await fill(
    page,
    "const value = /interface User { name: string; } <div>/;",
    'const value = "interface User { name: string; } <div>";'
  );
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Language$/u })).toContainText(
    "JavaScript"
  );
});

test("uses the JavaScript fallback and plain text when its grammar cannot load", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "WebAssembly", { value: undefined });
  });
  const highlightsRequests: string[] = [];
  page.on("request", (request) => {
    if (/highlights(?:[_./]|-)/u.test(request.url())) {
      highlightsRequests.push(request.url());
    }
  });
  await fill(page, "const before = 1;", "const after = 2;");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Language$/u })).toContainText(
    "JavaScript"
  );
  const syntaxColorCount = () =>
    page
      .locator("diffs-container code [data-line] span")
      .evaluateAll(
        (nodes) =>
          new Set(nodes.map((node) => getComputedStyle(node).color)).size
      );
  await expect.poll(syntaxColorCount, { timeout: 15_000 }).toBeGreaterThan(1);
  expect(highlightsRequests).toEqual([]);
  const attempted = Promise.withResolvers<boolean>();
  await page.route(/python[^/]*\.js/u, async (route) => {
    await route.abort("blockedbyclient");
    attempted.resolve(true);
  });
  await selectControl(page, "Language", "python");
  await attempted.promise;
  await expect(
    page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Cleave library failed to load" })
  ).toHaveCount(1);
  await expect.poll(syntaxColorCount).toBe(1);
  await expect(page.locator("diffs-container")).toContainText(
    "const after = 2;"
  );
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await page.getByRole("button", { name: "Accept After", exact: true }).click();
  await expect(
    page.locator("diffs-container code").first().locator("[data-line]")
  ).toHaveText("const after = 2;".trimEnd().split("\n"));
});

test("keeps texts and shows one toast when the renderer load fails", async ({
  page,
}) => {
  const module =
    /\/(?:src\/features\/cleave\/components\/cleave-result\.tsx|assets\/cleave-result-[^/]+\.js)(?:\?|$)/u;
  await page.route(module, (route) => route.abort("blockedbyclient"));
  await fill(page);
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  const toast = page
    .locator("[data-sonner-toast]")
    .filter({ hasText: "Cleave library failed to load" });
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
    /\/(?:src\/features\/cleave\/cleave\.session\.ts|assets\/cleave\.session-[^/]+\.js)(?:\?|$)/u,
  ],
  [
    "shared library",
    /\/(?:node_modules\/\.vite\/deps\/@pierre_diffs\.js|assets\/(?:FileDiff|shared_highlighter|canUseWASM)-[^/]+\.js)(?:\?|$)/u,
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
        .filter({ hasText: "Cleave library failed to load" })
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
      .locator(".cleave-drop");
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
  await expect(page.locator("diffs-container")).toContainText("old");
  await expect(page.locator("diffs-container")).toContainText("new");
  await expect(page.getByText("1 Removal", { exact: true })).toBeVisible();
});

test("compares private text without a request that contains it", async ({
  page,
}) => {
  const secret = "cleave-private-57-unique-text";
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
  await expect(
    page.locator("diffs-container code").first().locator("[data-line]")
  ).toHaveText(`${secret}\nbefore\nafter`.trimEnd().split("\n"));
});

test("warns above 5 MB and keeps inputs in place while its Worker starts", async ({
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
    page.getByText("This text is above 5 MB. The compare can take time.", {
      exact: true,
    })
  ).toBeVisible();
  const before = page.getByRole("textbox", {
    name: "Before Text",
    exact: true,
  });
  await before.fill("before");
  const position = () =>
    before.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x + scrollX,
        y: rect.y + scrollY,
        width: rect.width,
        height: rect.height,
      };
    });
  const bounds = await position();
  const started = Promise.withResolvers<boolean>();
  const gate = Promise.withResolvers<boolean>();
  await page.route(/cleave\.worker/u, async (route) => {
    started.resolve(true);
    await gate.promise;
    await route.continue();
  });
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await started.promise;
  try {
    await expect(before).toBeDisabled();
    expect(await position()).toEqual(bounds);
    const loading = page.getByRole("button", { name: "Loading", exact: true });
    await expect(loading).toBeVisible();
    await expect(loading).toHaveAttribute("data-pending", "true");
    await expect(loading).toBeDisabled();
    await expect(
      loading.getByRole("progressbar", { name: "Loading", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cancel", exact: true })
    ).toHaveCount(0);
  } finally {
    gate.resolve(true);
  }
  await expect(page.getByText("1 Removal", { exact: true })).toBeVisible();
  await expect(page.getByText("1 Addition", { exact: true })).toBeVisible();
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`contains long input lines and scrolls line numbers at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const text = Array.from(
      { length: 48 },
      (_, index) => `${index + 1}: ${"long input text ".repeat(30)}`
    ).join("\n");
    await fill(page, text, text);
    await Promise.all(
      ["Before Text", "After Text"].map(async (side) => {
        const region = page.getByRole("region", { name: side, exact: true });
        const input = region.getByRole("textbox", { name: side, exact: true });
        const bounds = await region.evaluate((element) => {
          const panel = element.getBoundingClientRect();
          const textarea = element.querySelector("textarea");
          if (!textarea) {
            throw new Error("Text input is missing.");
          }
          const field = textarea.getBoundingClientRect();
          return {
            panelRight: panel.right,
            fieldRight: field.right,
            scrollWidth: textarea.scrollWidth,
            clientWidth: textarea.clientWidth,
          };
        });
        expect(bounds.fieldRight).toBeLessThanOrEqual(bounds.panelRight);
        expect(bounds.scrollWidth).toBeGreaterThan(bounds.clientWidth);
        await input.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
          element.scrollLeft = element.scrollWidth;
        });
        await expect
          .poll(() =>
            region.evaluate((element) => {
              const textarea = element.querySelector("textarea");
              const numbers = element.querySelector("pre");
              if (!textarea || !numbers) {
                throw new Error("Text input or line numbers are missing.");
              }
              return {
                scrolled: textarea.scrollTop > 0 && textarea.scrollLeft > 0,
                aligned: numbers.scrollTop === textarea.scrollTop,
              };
            })
          )
          .toEqual({ scrolled: true, aligned: true });
        await expect(input).toHaveValue(text);
      })
    );
    await expect(
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    ).resolves.toBe(true);
    await page.screenshot({
      path: `/tmp/ritools-cleave-input-${viewport.width}.png`,
      fullPage: true,
    });
  });

  test(`fits the ${viewport.width}px viewport and keeps the right default layout`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await fill(page);
    await page
      .getByRole("button", { name: "Find difference", exact: true })
      .click();
    await expect(page.getByRole("button", { name: /Layout$/u })).toContainText(
      viewport.width < 768 ? "Stacked" : "Split"
    );
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
      path: `/tmp/ritools-cleave-${viewport.width}.png`,
      fullPage: true,
    });
  });
}
