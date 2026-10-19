import { expect, test } from "./_base";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("should have title", async ({ page }) => {
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toBeVisible();
  await expect(title).toHaveText("Tools");
});

test("should list every Tool that exists", async ({ page }) => {
  const squeeze = page.getByRole("link", { name: /Squeeze/u });
  await expect(squeeze).toBeVisible();
  await expect(squeeze).toHaveAttribute("href", "/squeeze");
});
