import type { Page } from "@playwright/test";

import { expect, test } from "./_base";

test.use({ serviceWorkers: "block" });

const before = (page: Page) =>
  page.getByRole("textbox", { name: "Before Text", exact: true });
const after = (page: Page) =>
  page.getByRole("textbox", { name: "After Text", exact: true });
const tab = (page: Page, number: number) =>
  page.getByRole("button", { name: `Comparison ${number}`, exact: true });
const saved = (page: Page) =>
  expect(
    page
      .getByRole("status")
      .filter({ hasText: "Comparisons saved on this device." })
  ).toBeAttached();
const open = async (page: Page) => {
  await page.goto("/cleave");
  await expect(tab(page, 1)).toBeVisible({ timeout: 15_000 });
  await page.waitForFunction(() => {
    const input = document.querySelector("textarea");
    return (
      input &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });
};

for (const width of [1440, 390]) {
  test(`does not show plain input editors while restoring highlighted code at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: "dark" });
    await open(page);
    await before(page).fill("export const count = 1;\n");
    await after(page).fill("export const count = 2;\n");
    await page
      .getByRole("button", { name: "Find difference", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: /Language$/u })
    ).toContainText("Automatic · JavaScript");
    await page.getByRole("button", { name: /Theme$/u }).click();
    await page
      .getByRole("searchbox", { name: "Search themes" })
      .fill("dracula soft");
    await page
      .getByRole("option", { name: "Dracula Theme Soft", exact: true })
      .click();
    await expect
      .poll(() =>
        page
          .locator("diffs-container pre")
          .first()
          .evaluate((node) => getComputedStyle(node).backgroundColor)
      )
      .toBe("rgb(40, 42, 54)");
    await page
      .getByRole("button", { name: "Add comparison", exact: true })
      .click();
    const pending = Promise.withResolvers<boolean>();
    await page.route("**/*cleave.worker*", async (route) => {
      await pending.promise;
      await route.continue();
    });
    const paints = await page.evaluateHandle(() => {
      const samples: { background: string; colors: number }[] = [];
      let frame = 0;
      const sample = () => {
        const root = document.querySelector("diffs-container")?.shadowRoot;
        const code = root?.querySelector("code");
        const pre = root?.querySelector("pre");
        if (
          code?.textContent &&
          pre &&
          code.getBoundingClientRect().height > 0
        ) {
          samples.push({
            background: getComputedStyle(pre).backgroundColor,
            colors: new Set(
              Array.from(
                code.querySelectorAll("[data-line] span"),
                (node) => getComputedStyle(node).color
              )
            ).size,
          });
        }
        frame = requestAnimationFrame(sample);
      };
      frame = requestAnimationFrame(sample);
      return { samples, stop: () => cancelAnimationFrame(frame) };
    });
    try {
      await tab(page, 1).click();
      await expect(
        page.getByRole("button", { name: /Language$/u })
      ).toBeDisabled();
      await expect(before(page)).toHaveCount(0);
      await expect(after(page)).toHaveCount(0);
      await page.screenshot({
        path: `/tmp/ritools-cleave-styled-loading-${width}.png`,
      });
    } finally {
      pending.resolve(true);
    }
    await expect(page.locator("diffs-container")).toBeVisible();
    await expect
      .poll(() => paints.evaluate(({ samples }) => samples.length))
      .toBeGreaterThan(0);
    const renderedFrames = await paints.evaluate(({ samples, stop }) => {
      stop();
      return samples;
    });
    for (const sample of renderedFrames) {
      expect(sample.background).toBe("rgb(40, 42, 54)");
      expect(sample.colors).toBeGreaterThan(1);
    }
    await page.screenshot({
      path: `/tmp/ritools-cleave-styled-result-${width}.png`,
    });
  });
}

for (const [width, scenario] of [1440, 390].flatMap((viewportWidth) =>
  ["comparison", "Resolve", "Marked Text", "unchanged"].map(
    (kind) => [viewportWidth, kind] as const
  )
)) {
  test(`keeps the tabs still while restoring ${scenario} at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    await before(page).fill(
      scenario === "Marked Text"
        ? "<<<<<<< HEAD\nold\n=======\nnew\n>>>>>>> branch\n"
        : "same\nold\n"
    );
    if (scenario !== "Marked Text") {
      await after(page).fill(
        scenario === "unchanged" ? "same\nold\n" : "same\nnew\n"
      );
    }
    await page
      .getByRole("button", {
        name:
          scenario === "Marked Text" ? "Resolve Conflicts" : "Find difference",
        exact: true,
      })
      .click();
    const result =
      scenario === "unchanged"
        ? page.getByText("No differences", { exact: true })
        : page.locator("diffs-container");
    await expect(result).toBeVisible();
    if (scenario === "Resolve") {
      await page.getByRole("button", { name: "Resolve", exact: true }).click();
    }
    await saved(page);
    const expectedTop = await page
      .locator(".cleave-tabs-bar")
      .evaluate((element) => element.getBoundingClientRect().top + scrollY);
    await page
      .getByRole("button", { name: "Add comparison", exact: true })
      .click();
    await before(page).fill("second old\n");
    await after(page).fill("second new\n");
    await page
      .getByRole("button", { name: "Find difference", exact: true })
      .click();
    await expect(page.locator("diffs-container")).toBeVisible();
    await saved(page);
    const positions = await page.evaluateHandle((initial) => {
      const root = document.querySelector("main") ?? document.body;
      const top = () => {
        const bar = root.querySelector(".cleave-tabs-bar");
        return bar ? bar.getBoundingClientRect().top + scrollY : undefined;
      };
      const changes: (number | undefined)[] = [];
      const observer = new MutationObserver(() => changes.push(top()));
      observer.observe(root, {
        childList: true,
        subtree: true,
      });
      return { initial, changes, observer };
    }, expectedTop);
    await tab(page, 1).click();
    await expect(result).toBeVisible();
    const movement = await positions.evaluate(
      ({ initial, changes, observer }) => {
        observer.disconnect();
        return changes.filter((position) => position !== initial);
      }
    );
    expect(movement).toEqual([]);
    await page.screenshot({
      path: `/tmp/ritools-cleave-restore-${scenario}-${width}.png`,
      fullPage: false,
    });
  });
}

test("keeps drafts in separate tabs, restores the active tab, and deletes closed files", async ({
  page,
}) => {
  await open(page);
  await before(page).fill("first before");
  await after(page).fill("first after");
  await page
    .getByRole("button", { name: "Add comparison", exact: true })
    .click();
  await expect(tab(page, 2)).toHaveAttribute("aria-current", "page");
  await expect(before(page)).toHaveValue("");
  await before(page).fill("second before");
  await tab(page, 1).click();
  await expect(before(page)).toHaveValue("first before");
  await expect(after(page)).toHaveValue("first after");
  await saved(page);
  await page.reload();
  await expect(tab(page, 1)).toHaveAttribute("aria-current", "page");
  await expect(before(page)).toHaveValue("first before");
  await page
    .getByRole("button", {
      name: "Close comparison: Comparison 1",
      exact: true,
    })
    .click();
  await expect(tab(page, 2)).toHaveAttribute("aria-current", "page");
  await expect(before(page)).toHaveValue("second before");
  await saved(page);
  await page.reload();
  await expect(tab(page, 1)).toHaveCount(0);
  await expect(before(page)).toHaveValue("second before");
  await page
    .getByRole("button", {
      name: "Close comparison: Comparison 2",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("No comparisons are open. Add a comparison to start.", {
      exact: true,
    })
  ).toBeVisible();
  await saved(page);
  await page.reload();
  await expect(before(page)).toHaveCount(0);
  await page
    .getByRole("button", { name: "Add comparison", exact: true })
    .click();
  await expect(tab(page, 3)).toHaveAttribute("aria-current", "page");
  await expect(before(page)).toHaveValue("");
});

test("restores comparison choices and language after switching and reloading", async ({
  page,
}) => {
  await open(page);
  await before(page).fill("same\nold\n");
  await after(page).fill("same\nnew\n");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await page.getByRole("button", { name: /Language$/u }).click();
  await page.getByRole("option", { name: "Python", exact: true }).click();
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await page.getByRole("button", { name: "Accept both", exact: true }).click();
  await expect(
    page.getByText("0 Conflicts left", { exact: true })
  ).toBeVisible();
  await saved(page);
  await page
    .getByRole("button", { name: "Add comparison", exact: true })
    .click();
  await tab(page, 1).click();
  await expect(
    page.getByText("0 Conflicts left", { exact: true })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Language$/u })).toContainText(
    "Python"
  );
  await saved(page);
  await page.reload();
  await expect(
    page.getByText("0 Conflicts left", { exact: true })
  ).toBeVisible();
  await expect(
    page.locator("diffs-container code").first().locator("[data-line]")
  ).toHaveText(["same", "old", "new"]);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(
    page.getByText("1 Conflict left", { exact: true })
  ).toBeVisible();
  await saved(page);
  await page.reload();
  await expect(
    page.getByText("1 Conflict left", { exact: true })
  ).toBeVisible();
});

test("restores partial Marked Text progress and can reset it", async ({
  page,
}) => {
  await open(page);
  await before(page).fill(
    "<<<<<<< HEAD\na\n=======\nb\n>>>>>>> branch\nsame\n<<<<<<< HEAD\nc\n=======\nd\n>>>>>>> branch\n"
  );
  await page
    .getByRole("button", { name: "Resolve Conflicts", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Accept incoming", exact: true })
    .last()
    .click();
  await expect(
    page.getByText("1 Conflict left", { exact: true })
  ).toBeVisible();
  await saved(page);
  await page
    .getByRole("button", { name: "Add comparison", exact: true })
    .click();
  await tab(page, 1).click();
  await expect(
    page.getByText("1 Conflict left", { exact: true })
  ).toBeVisible();
  await saved(page);
  await page.reload();
  await expect(
    page.getByText("1 Conflict left", { exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Accept both", exact: true }).click();
  await expect(
    page.getByText("0 Conflicts left", { exact: true })
  ).toBeVisible();
  await expect(
    page.locator("diffs-container code").first().locator("[data-line]")
  ).toHaveText(["a", "b", "same", "d"]);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(
    page.getByText("2 Conflicts left", { exact: true })
  ).toBeVisible();
});

test("does not put a slow file read into another comparison", async ({
  page,
}) => {
  await open(page);
  const release = await page.evaluateHandle(() => {
    const original = File.prototype.arrayBuffer;
    const gate = Promise.withResolvers<ArrayBuffer>();
    File.prototype.arrayBuffer = function arrayBuffer() {
      return this.name === "pending.txt" ? gate.promise : original.call(this);
    };
    return () =>
      gate.resolve(new TextEncoder().encode("late private text").buffer);
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
    .getByRole("button", { name: "Add comparison", exact: true })
    .click();
  await expect(tab(page, 2)).toHaveAttribute("aria-current", "page");
  await before(page).fill("keep second");
  await release.evaluate((finish) => finish());
  await expect(before(page)).toHaveValue("keep second");
  await tab(page, 1).click();
  await expect(before(page)).toHaveValue("");
});

for (const width of [1440, 390]) {
  test(`keeps many tabs within the ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    for (let index = 0; index < 7; index += 1) {
      // Each press creates the next tab before the next interaction.
      // oxlint-disable-next-line no-await-in-loop
      await page
        .getByRole("button", { name: "Add comparison", exact: true })
        .click();
    }
    await expect(tab(page, 8)).toHaveAttribute("aria-current", "page");
    await expect(
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
    ).resolves.toBe(true);
    await page
      .getByRole("navigation", { name: "Open comparisons", exact: true })
      .evaluate((element) => {
        element.scrollLeft = 0;
      });
    await tab(page, 1).focus();
    await tab(page, 1).press("Enter");
    await expect(tab(page, 1)).toHaveAttribute("aria-current", "page");
    await page.screenshot({
      path: `/tmp/ritools-cleave-tabs-${width}.png`,
      fullPage: true,
    });
  });
}
