import type { Page } from "@playwright/test";

import {
  agentActionNames,
  agentActionSchema,
  callAgentAction,
  waitForAgentAction,
} from "./_agent";
import { expect, test } from "./_base";

const tab = (page: Page, name: string) =>
  page.getByRole("tab", { name, exact: true });

test.beforeEach(async ({ page }) => {
  await page.goto("/qraft");
  await waitForAgentAction(page, "qraft_get_state");
});

test("registers the Qraft Agent Actions and open_tool", async ({ page }) => {
  expect(await agentActionNames(page)).toEqual(
    expect.arrayContaining([
      "open_tool",
      "qraft_get_state",
      "qraft_set_code",
      "qraft_set_style",
      "qraft_render",
      "qraft_download",
      "qraft_set_batch",
      "qraft_set_sheet",
      "qraft_download_batch",
      "qraft_remove_logo",
    ])
  );
  expect(await agentActionSchema(page, "qraft_render")).toMatchObject({
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: { type: "object" },
  });
});

test("sets, styles, renders, and downloads a single code", async ({ page }) => {
  expect(
    await callAgentAction(page, "qraft_set_code", {
      payload: "5901234123457",
      symbology: "ean13",
    })
  ).toMatchObject({ family: "1d", ok: true, problem: null });
  await expect(page.locator('img[alt="Preview of EAN-13"]')).toBeVisible();

  // A field that does not apply lists the fields that do.
  const refused = await callAgentAction(page, "qraft_set_style", {
    dotType: "dots",
  });
  expect(refused).toMatchObject({ code: "not-applicable", ok: false });
  expect(String(refused.hint)).toContain("height");

  expect(
    await callAgentAction(page, "qraft_set_style", {
      height: 60,
      output: "png",
    })
  ).toMatchObject({ ok: true, output: "png", style: { height: 60 } });
  await expect(page.locator("#qraft-height")).toHaveValue("60");

  const rendered = await callAgentAction(page, "qraft_render");
  expect(rendered).toMatchObject({ ok: true, svgLeftOut: null });
  expect(String(rendered.svg)).toMatch(/^<svg/u);

  const download = page.waitForEvent("download");
  expect(
    await callAgentAction(page, "qraft_download", { format: "svg" })
  ).toMatchObject({ fileName: "qraft-5901234123457.svg", ok: true });
  const file = await download;
  expect(file.suggestedFilename()).toBe("qraft-5901234123457.svg");
});

test("fills a Wi-Fi preset, which makes a QR", async ({ page }) => {
  const result = await callAgentAction(page, "qraft_set_code", {
    fields: { password: "guest-pass", ssid: "Guest" },
    preset: "wifi",
  });
  expect(result).toMatchObject({ ok: true, preset: "wifi", symbology: "qr" });
  expect(String(result.payload)).toContain("S:Guest");
  await expect(page.locator("#qraft-payload")).toHaveValue(
    String(result.payload)
  );
});

test("writes a Batch from CSV text and downloads its Label Sheet", async ({
  page,
}) => {
  const batch = await callAgentAction(page, "qraft_set_batch", {
    text: "payload,label\nhttps://a.example,A\nhttps://b.example,B",
  });
  expect(batch).toMatchObject({ count: 2, ok: true });
  await expect(tab(page, "Batch")).toHaveAttribute("aria-selected", "true");

  expect(
    await callAgentAction(page, "qraft_set_sheet", { columns: 2 })
  ).toMatchObject({ ok: true, sheet: { columns: 2 } });
  await expect(page.locator("#qraft-batch-columns")).toHaveValue("2");

  const download = page.waitForEvent("download");
  expect(
    await callAgentAction(page, "qraft_download_batch", {
      format: "svg",
      kind: "sheet",
    })
  ).toEqual({ count: 2, kind: "sheet", ok: true });
  const sheet = await download;
  expect(sheet.suggestedFilename()).toBe("qraft-sheet.svg");

  // A single-code action shows the Single tab again.
  await callAgentAction(page, "qraft_set_style", { quietZone: 6 });
  await expect(tab(page, "Single")).toHaveAttribute("aria-selected", "true");
});
