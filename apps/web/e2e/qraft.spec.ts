import type { Page } from "@playwright/test";

import { expect, test } from "./_base";

const preview = (page: Page) => page.locator('img[alt^="Preview of"]');
const payload = (page: Page) =>
  page.getByRole("textbox", { name: "Text", exact: true });
const rawPayload = (page: Page) =>
  page.getByRole("textbox", { name: "Raw Payload", exact: true });

/** React has hydrated once its listeners sit on the first field. */
const ready = (page: Page) =>
  page.waitForFunction(() => {
    const field = document.querySelector("#qraft-field-text");
    return (
      field !== null &&
      Object.getOwnPropertyNames(field).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });

const choose = async (page: Page, trigger: RegExp, option: string) => {
  await page.getByRole("button", { name: trigger }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
};

test.beforeEach(async ({ page }) => {
  await page.goto("/qraft");
  await ready(page);
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 })
  ).toContainText("Qraft");
});

test("carries the heading and the default QR in the HTML", async ({ page }) => {
  const image = preview(page);
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("alt", "Preview of QR code");
  expect(await image.getAttribute("src")).toMatch(
    /^data:image\/svg\+xml;charset=utf-8,/u
  );
});

test("changes the Payload and the preview at once", async ({ page }) => {
  const image = preview(page);
  const before = await image.getAttribute("src");
  await payload(page).fill("https://example.com/hello");
  await expect(rawPayload(page)).toHaveValue("https://example.com/hello");
  await expect.poll(() => image.getAttribute("src")).not.toBe(before);
  await expect(
    page.getByText("File name: qraft-https-example-com-hello.svg")
  ).toBeVisible();
});

test("gives the phone, website, and email fields native input types", async ({
  page,
}) => {
  await choose(page, /Payload preset$/u, "vCard contact");
  await expect(page.locator("#qraft-field-phone")).toHaveAttribute(
    "type",
    "tel"
  );
  await expect(page.locator("#qraft-field-url")).toHaveAttribute("type", "url");
  await expect(page.locator("#qraft-field-email")).toHaveAttribute(
    "type",
    "email"
  );
});

test("clears the Payload and blocks the preview", async ({ page }) => {
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(rawPayload(page)).toHaveValue("");
  await expect(page.getByText("Type a Payload first.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download SVG" })
  ).toBeDisabled();
});

test("switches the Code Family and the Symbology", async ({ page }) => {
  await choose(page, /Code family$/u, "1D");
  await expect(preview(page)).toHaveAttribute("alt", "Preview of Code 128");
  await choose(page, /Symbology$/u, "EAN-13");
  await expect(
    page.getByRole("button", { name: /EAN-13 Symbology$/u })
  ).toBeVisible();
  await expect(
    page.getByText("This Symbology cannot encode the Payload.")
  ).toBeVisible();
});

test("changes the style and keeps a Scan Warning from blocking", async ({
  page,
}) => {
  await page
    .getByRole("textbox", { name: "Foreground", exact: true })
    .fill("#eeeeee");
  await expect(
    page.getByRole("heading", { name: "Scan Warnings" })
  ).toBeVisible();
  await expect(page.getByText(/The contrast is/u)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download SVG" })
  ).toBeEnabled();
});

test("downloads the SVG and the PNG under their own names", async ({
  page,
}) => {
  await payload(page).fill("https://example.com");
  const [svg] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download SVG" }).click(),
  ]);
  expect(svg.suggestedFilename()).toBe("qraft-https-example-com.svg");

  await choose(page, /File format$/u, "PNG");
  await expect(
    page.getByRole("textbox", { name: "Pixel size", exact: true })
  ).toHaveValue("512");
  const [png] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PNG" }).click(),
  ]);
  expect(png.suggestedFilename()).toBe("qraft-https-example-com.png");
});

test("offers every Copy source in one menu", async ({ page }) => {
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "SVG" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "PNG" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Payload" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Terminal" })).toBeVisible();
});

test("copies the terminal output as text", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await payload(page).fill("https://example.com/terminal");
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await page.getByRole("menuitem", { name: "Terminal" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("█");
});

test("builds a Wi-Fi Payload from a network name and a password", async ({
  page,
}) => {
  await choose(page, /Payload preset$/u, "Wi-Fi");
  await page.getByRole("textbox", { name: "Network name" }).fill("Cafe Guest");
  await page.getByRole("textbox", { name: "Password" }).fill("secret123");
  await expect(rawPayload(page)).toHaveValue(
    "WIFI:T:WPA;S:Cafe Guest;P:secret123;;"
  );
  await expect(preview(page)).toHaveAttribute("alt", "Preview of QR code");
  await expect(page.getByText("File name: qraft-wifi.svg")).toBeVisible();
});

test("adds a local logo without uploading it", async ({ page }) => {
  const image = preview(page);
  const before = await image.getAttribute("src");
  await page.setInputFiles("#qraft-logo-file", "public/logo.png");
  await expect(page.getByText("logo.png")).toBeVisible();
  await expect.poll(() => image.getAttribute("src")).not.toBe(before);
  await expect(page.getByRole("button", { name: "Remove logo" })).toBeVisible();
});

test("opens the color picker from a swatch", async ({ page }) => {
  await page
    .getByRole("button", { name: "Open the color picker for Foreground" })
    .click();
  const picker = page.getByRole("dialog", {
    name: "Open the color picker for Foreground",
  });
  await expect(picker).toBeVisible();
  await expect(picker.getByRole("slider", { name: "Hue" })).toBeVisible();

  const before = await page.locator("#qraft-fg").inputValue();
  const area = picker.locator('[data-slot="color-area"]');
  const box = await area.boundingBox();
  if (box === null) {
    throw new Error("The color area has no box.");
  }
  await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.2);
  await expect(page.locator("#qraft-fg")).not.toHaveValue(before);
});

test("changes a white background from the color area", async ({ page }) => {
  await page
    .getByRole("button", { name: "Open the color picker for Background" })
    .click();
  const picker = page.getByRole("dialog", {
    name: "Open the color picker for Background",
  });
  const area = picker.locator('[data-slot="color-area"]');
  const box = await area.boundingBox();
  if (box === null) {
    throw new Error("The color area has no box.");
  }
  await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.2);
  await expect(page.locator("#qraft-bg")).not.toHaveValue("#ffffff");
});

test("prints the code as one image with its logo", async ({ page }) => {
  await page.setInputFiles("#qraft-logo-file", "public/logo.png");
  await expect(page.getByText("logo.png")).toBeVisible();

  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Print", exact: true }).click();
  const printPage = await popup;
  const image = printPage.locator("img");
  await expect
    .poll(() =>
      image.evaluate((node) =>
        node instanceof HTMLImageElement ? node.naturalWidth : 0
      )
    )
    .toBeGreaterThan(0);
  const source = decodeURIComponent((await image.getAttribute("src")) ?? "");
  expect(source).toContain("data:image/png;base64");
});

test("loads a CSV with a Payload and a label", async ({ page }) => {
  await page.setInputFiles("#qraft-batch-file", {
    buffer: Buffer.from(
      "payload,label\nhttps://a.test,First\nhttps://b.test,Second"
    ),
    mimeType: "text/csv",
    name: "codes.csv",
  });
  await expect(
    page.getByRole("textbox", { name: "Payloads, one per line" })
  ).toHaveValue(/https:\/\/a\.test/u);
});

test("loads a sample Batch next to the CSV mark", async ({ page }) => {
  await page.getByRole("button", { name: "Load a sample" }).click();
  await expect(
    page.getByRole("textbox", { name: "Payloads, one per line" })
  ).toHaveValue(/Qraft/u);
});

test("writes a Batch as a Label Sheet and a ZIP", async ({ page }) => {
  await page
    .getByRole("textbox", { name: "Payloads, one per line" })
    .fill("https://a.test\nhttps://b.test\nhttps://c.test");

  const download = page.getByRole("button", { name: "Download", exact: true });
  await download.click();
  await expect(page.getByRole("menuitem", { name: "ZIP (PNG)" })).toBeVisible();
  const [sheet] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: "Sheet SVG" }).click(),
  ]);
  expect(sheet.suggestedFilename()).toBe("qraft-sheet.svg");

  await download.click();
  const [zip] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: "ZIP (SVG)" }).click(),
  ]);
  expect(zip.suggestedFilename()).toBe("qraft-codes.zip");
});

test("warns above 500 codes and never caps", async ({ page }) => {
  const lines = Array.from({ length: 501 }, (_, index) => `code-${index}`);
  await page
    .getByRole("textbox", { name: "Payloads, one per line" })
    .fill(lines.join("\n"));
  await expect(page.getByText(/More than 500 codes/u)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download", exact: true })
  ).toBeEnabled();
});

test("reaches the Payload and the download mark by keyboard", async ({
  page,
}) => {
  await payload(page).focus();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("https://example.com/keyboard");
  await expect(rawPayload(page)).toHaveValue("https://example.com/keyboard");
  const mark = page.getByRole("button", { name: "Download SVG" });
  await mark.focus();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.keyboard.press("Enter"),
  ]);
  expect(download.suggestedFilename()).toBe(
    "qraft-https-example-com-keyboard.svg"
  );
});

test("works offline after the first load", async ({ page, context }) => {
  test.skip(
    !process.env.CI && process.env.PW_OFFLINE !== "1",
    "Uses the production service worker"
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(preview(page)).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(preview(page)).toBeVisible();
  await payload(page).fill("https://offline.test");
  await expect(rawPayload(page)).toHaveValue("https://offline.test");
});
