/* oxlint-disable unicorn/no-await-expression-member, anti-slop/no-unsafe-dictionary-type, anti-slop/require-safety-comment-for-type-assertion -- The test reads one download and one JSON result at a time, as an agent does. */
import path from "node:path";

import type { Page } from "@playwright/test";

import {
  agentActionNames,
  agentActionSchema,
  callAgentAction,
  waitForAgentAction,
} from "./_agent";
import { expect, test } from "./_base";

const fixture = (name: string) =>
  path.resolve("src/features/expose/fixtures", name);

/** The rows of a result, as an agent reads them. */
const rowsOf = (result: Record<string, unknown>) =>
  (result.items as { rows: { id: string; name: string; state: string }[] })
    .rows;

/** Puts two files in the Batch through the file input, as the user does. */
const addBatch = async (page: Page) => {
  await page
    .locator("#expose-file")
    .setInputFiles([fixture("metadata.jpg"), fixture("metadata.png")]);
  await expect(
    page.getByRole("list", { name: "Files in the Batch" })
  ).toBeVisible();
  await expect(
    page.getByText("Reading the metadata…", { exact: true })
  ).toHaveCount(0, { timeout: 60_000 });
};

test.beforeEach(async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/expose");
  await waitForAgentAction(page, "expose_get_state");
});

test("registers the Expose Agent Actions", async ({ page }) => {
  expect(await agentActionNames(page)).toEqual(
    expect.arrayContaining([
      "open_tool",
      "expose_get_state",
      "expose_get_report",
      "expose_open_sample",
      "expose_set_preset",
      "expose_run",
      "expose_stop",
      "expose_remove",
      "expose_download",
    ])
  );
  expect(
    (await agentActionSchema(page, "expose_get_report")).annotations
  ).toMatchObject({ readOnlyHint: true, untrustedContentHint: true });
  const state = await callAgentAction(page, "expose_get_state");
  expect(state).toMatchObject({ items: { total: 0 }, ok: true });
  expect(String(state.note)).toContain("Ask the user to drop files");
});

test("sets a preset, cleans the Batch, reads it, and downloads the ZIP", async ({
  page,
}) => {
  await addBatch(page);

  expect(
    await callAgentAction(page, "expose_set_preset", { preset: "everything" })
  ).toMatchObject({ ok: true, preset: "everything" });
  await expect(
    page.getByRole("row", { name: /^Everything/u, selected: true })
  ).toBeVisible();

  const run = await callAgentAction(page, "expose_run");
  expect(run).toMatchObject({ ok: true, ran: 2, cancelled: false });
  expect(rowsOf(run).map((row) => row.state)).toEqual(["cleaned", "cleaned"]);
  await expect(page.locator("#expose-batch-summary")).toHaveText(
    "2 of 2 files Cleaned."
  );

  const state = await callAgentAction(page, "expose_get_state");
  expect(state).toMatchObject({
    preset: "everything",
    totals: { cleaned: 2 },
  });

  const zip = page.waitForEvent("download");
  expect(await callAgentAction(page, "expose_download")).toMatchObject({
    downloaded: 2,
    kind: "zip",
    ok: true,
  });
  expect((await zip).suggestedFilename()).toBe("expose-clean.zip");

  const [first] = rowsOf(state);
  const one = page.waitForEvent("download");
  expect(
    await callAgentAction(page, "expose_download", { ids: [first?.id] })
  ).toMatchObject({ downloaded: 1, kind: "files" });
  expect((await one).suggestedFilename()).toBe("metadata-clean.jpg");
});

test("reads the Metadata Report of a sample, opens it, and leaves out the thumbnail", async ({
  page,
}) => {
  const sample = await callAgentAction(page, "expose_open_sample", {
    sample: "ai",
  });
  expect(sample).toMatchObject({
    added: true,
    name: "ai-firefly-c2pa.jpg",
    ok: true,
  });
  await addBatch(page);

  const report = await callAgentAction(page, "expose_get_report", {
    id: sample.id,
  });
  expect(report).toMatchObject({
    name: "ai-firefly-c2pa.jpg",
    ok: true,
    aiProvenance: { c2pa: { manifests: expect.any(Number) } },
  });
  const text = JSON.stringify(report);
  expect(text).not.toContain('thumbnail":');
  expect(text).not.toContain("data:image");
  expect(text).toContain('"group":"ai-provenance"');

  // The page opens the same file.
  await expect(
    page.getByRole("button", { name: "Back to the batch", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Metadata Report", level: 2 })
  ).toBeVisible();
});

test("asks the user before it removes all, and reports a no", async ({
  page,
}) => {
  await addBatch(page);
  const declined = callAgentAction(page, "expose_remove", { all: true });
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(await declined).toMatchObject({ code: "declined", ok: false });

  const confirmed = callAgentAction(page, "expose_remove", { all: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Clear all" }).click();
  expect(await confirmed).toEqual({ ok: true, removed: 2 });
  expect(await callAgentAction(page, "expose_get_state")).toMatchObject({
    items: { total: 0 },
  });
});
