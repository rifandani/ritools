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
  const code = page.getByText("404", { exact: true });
  const description = page.getByText(
    /can't find the page you're looking for|tidak bisa menemukan halaman yang anda cari/u
  );
  // The shell also carries a link to the home page, so this names the one the
  // 404 page itself offers.
  const link = page.getByRole("link", {
    name: /Back to Home page|Kembali ke halaman Beranda/u,
  });
  await expect(title).toBeVisible();
  await expect(code).toBeVisible();
  await expect(description).toBeVisible();
  await expect(link).toBeVisible();
  await expect(link).toHaveText(
    /Back to Home page|Kembali ke halaman Beranda/u
  );
  // The status code is decorative; the name is the only heading.
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(0);
});
