import { expect, test } from "./_base";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("should have title", async ({ page }) => {
  const title = page.getByRole("heading", { level: 1 });
  const welcome = page.getByRole("heading", { level: 2 });
  await expect(title).toBeVisible();
  await expect(welcome).toBeVisible();
});
