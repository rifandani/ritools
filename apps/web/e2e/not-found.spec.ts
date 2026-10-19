import { expect, test } from "./_base";

// The server answers an unknown route with a real 404 document.
test.use({ expectedHttpErrors: [/\/hahahahaha$/u] });

test.beforeEach(async ({ page }) => {
  // not exists route
  const response = await page.goto("/hahahahaha");
  expect(response?.status()).toBe(404);
});
test("should have heading, text description, and back to home link", async ({
  page,
}) => {
  const title = page.getByRole("heading", { level: 1 });
  const subtitle = page.getByRole("heading", { level: 2 });
  const description = page.getByRole("paragraph");
  // The shell also carries a link to the home page, so this names the one the
  // 404 page itself offers.
  const link = page.getByRole("link", {
    name: /Back to Home page|Kembali ke halaman Home/u,
  });
  await expect(title).toBeVisible();
  await expect(subtitle).toBeVisible();
  await expect(description).toBeVisible();
  await expect(link).toBeVisible();
  await expect(link).toHaveText(/Back to Home page|Kembali ke halaman Home/u);
});
