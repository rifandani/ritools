import { expect, test } from "./_base";

test("compares and resolves after first use and an offline reload", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.CI && process.env.PW_OFFLINE !== "1",
    "Uses the production service worker"
  );
  test.setTimeout(120_000);
  await page.goto("/cleave");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => {
    const input = document.querySelector("textarea");
    return (
      input &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });
  const before = page.getByRole("textbox", {
    name: "Before Text",
    exact: true,
  });
  const after = page.getByRole("textbox", { name: "After Text", exact: true });
  await expect(before).toBeVisible();
  await before.fill("before");
  await after.fill("after");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await expect(page.getByText("1 Removal", { exact: true })).toBeVisible();
  await expect(page.locator("diffs-container")).toContainText("before");
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => {
    const input = document.querySelector("textarea");
    return (
      input &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });
  await expect(before).toHaveValue("");
  await before.fill("offline before");
  await after.fill("offline after");
  await page
    .getByRole("button", { name: "Find difference", exact: true })
    .click();
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await page.getByRole("button", { name: "Accept both", exact: true }).click();
  await expect(
    page.locator("diffs-container code").first().locator("[data-line]")
  ).toHaveText("offline before\noffline after".trimEnd().split("\n"));
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page
    .getByRole("button", { name: "Leave Resolve", exact: true })
    .click();
  await before.fill(
    "<<<<<<< HEAD\ncurrent\n=======\nincoming\n>>>>>>> branch\n"
  );
  await after.fill("");
  await page
    .getByRole("button", { name: "Resolve Conflicts", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Accept current", exact: true })
    .click();
  await expect(
    page.locator("diffs-container code").first().locator("[data-line]")
  ).toHaveText("current\n".trimEnd().split("\n"));
});
