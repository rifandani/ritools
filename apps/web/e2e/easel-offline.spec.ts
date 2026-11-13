import { expect, test } from "./_base";
import {
  exportAndRead,
  near,
  openPanel,
  pressSlider,
  waitForDraw,
} from "./_easel";

test.beforeEach(async ({ page }) => {
  test.skip(
    !process.env.CI && process.env.PW_OFFLINE !== "1",
    "Uses the production service worker"
  );
  test.setTimeout(120_000);
  await page.goto("/easel");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.locator("#easel-sample")).toBeVisible();
});

test("opens, edits, and exports the Sample Image after an offline reload", async ({
  page,
  context,
}) => {
  // The first use loads the optional libraries, and the service worker
  // caches them (ADR-0036).
  await page.locator("#easel-sample").click();
  await waitForDraw(page);
  await exportAndRead(page);

  await context.setOffline(true);
  await page.reload();
  await page.locator("#easel-sample").click();
  await waitForDraw(page);
  await openPanel(page, "finetune");
  await pressSlider(page, "saturation", ["Home"]);
  const file = await exportAndRead(page, { points: [[0.5, 0.5]] });
  expect(file.name).toBe("easel-sample-easel.png");
  expect([file.width, file.height]).toEqual([1200, 900]);
  const [red, green, blue] = file.pixels[0] ?? [];
  // −100 Saturation removes all color.
  expect(near([red ?? 0, green ?? 0], [blue ?? 0, blue ?? 0], 2)).toBe(true);
});
