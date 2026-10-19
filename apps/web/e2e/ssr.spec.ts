import { expect, test } from "./_base";

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the server renders the full document", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveTitle(/^Home \| Heynbord$/u);
  });
});

test("the server renders in the Accept-Language locale", async ({
  request,
}) => {
  const response = await request.get("/", {
    headers: { "accept-language": "id-ID,id;q=0.9,en;q=0.8" },
  });
  const html = await response.text();
  expect(response.status()).toBe(200);
  expect(html).toContain('<html lang="id-id"');
  expect(html).toContain("Selamat Datang Kembali");
});

test("a picked locale persists across a server render", async ({ page }) => {
  await page.goto("/");
  // The SSR button is visible before hydration but not yet interactive.
  await expect(async () => {
    await page.getByRole("button", { name: /English|Indonesia/u }).click();
    await expect(
      page.getByRole("menuitemradio", { name: "Indonesia" })
    ).toBeVisible({ timeout: 1000 });
  }).toPass();
  // The server function sets the cookie; wait for it before reloading.
  const persisted = page.waitForResponse((response) =>
    response.url().includes("/_serverFn/")
  );
  await page.getByRole("menuitemradio", { name: "Indonesia" }).click();
  await persisted;

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "id-id");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    "Selamat Datang Kembali"
  );
});

test("hydrates without a mismatch", async ({ page }) => {
  const mismatches: string[] = [];
  page.on("console", (message) => {
    // React reports a mismatch through `hydrateRoot`'s `onRecoverableError`.
    if (
      message.type() === "error" &&
      /hydrat|onRecoverableError/iu.test(message.text())
    ) {
      mismatches.push(message.text());
    }
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(mismatches).toEqual([]);
});
