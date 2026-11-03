/* oxlint-disable unicorn/no-await-expression-member, anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-unsafe-dictionary-type -- The test reads one download and one JSON result at a time, as an agent does. */
import { readFile } from "node:fs/promises";

import {
  agentActionNames,
  callAgentAction,
  waitForAgentAction,
} from "./_agent";
import { expect, test } from "./_base";

/** A real photo, as in the Unmask spec. */
const imageFile = async (name: string) => ({
  buffer: await readFile("../../artifacts/unmask/fixtures/product-plain.jpg"),
  mimeType: "image/jpeg",
  name,
});

interface Row {
  readonly id: string;
  readonly sourceHeight: number | null;
  readonly sourceWidth: number | null;
}

/** The rows of a result that pages them. */
const rowsOf = (result: Record<string, unknown>): readonly Row[] =>
  (result.items as { rows: readonly Row[] }).rows;

test.beforeEach(async ({ page }) => {
  await page.goto("/unmask");
  await waitForAgentAction(page, "unmask_get_state");
});

test("registers the Unmask Agent Actions and asks for files", async ({
  page,
}) => {
  expect(await agentActionNames(page)).toEqual(
    expect.arrayContaining([
      "open_tool",
      "unmask_get_state",
      "unmask_load_sample",
      "unmask_set_settings",
      "unmask_run",
      "unmask_stop",
      "unmask_remove",
      "unmask_edit_matte",
      "unmask_undo",
      "unmask_redo",
      "unmask_reset_matte",
      "unmask_download",
    ])
  );
  const state = await callAgentAction(page, "unmask_get_state");
  expect(state).toMatchObject({ items: { total: 0 }, ok: true });
  expect(String(state.note)).toContain("Ask the user to drop images");
});

test("sets, runs, edits the Matte, and downloads the file the user dropped", async ({
  page,
}) => {
  // The real model runs, and the first run downloads it (about 44 MB).
  test.setTimeout(180_000);
  await page.setInputFiles("#unmask-files", await imageFile("product.jpg"));
  const before = await callAgentAction(page, "unmask_get_state");
  expect(before).toMatchObject({
    items: { rows: [{ name: "product.jpg", state: "queued" }], total: 1 },
  });
  const [row] = rowsOf(before);
  const id = row?.id ?? "";

  // JPEG cannot hold transparency, as the page says.
  expect(
    await callAgentAction(page, "unmask_set_settings", { format: "jpeg" })
  ).toMatchObject({ code: "invalid-settings", ok: false });

  // A setting the agent changes shows in the page.
  expect(
    await callAgentAction(page, "unmask_set_settings", {
      backdrop: { _tag: "Solid", color: { a: 255, b: 255, g: 255, r: 255 } },
      format: "png",
    })
  ).toMatchObject({ ok: true, settings: { format: "png" } });
  await expect(
    page
      .getByRole("grid", { name: "Backdrop", exact: true })
      .getByRole("row", { selected: true })
      .getByText("Solid", { exact: true })
  ).toBeVisible();

  // `run` waits until the Cutout is written.
  const run = await callAgentAction(page, "unmask_run");
  expect(run).toMatchObject({
    ok: true,
    ran: 1,
    stopped: false,
    totals: { ready: 1 },
  });
  expect(run.model).toMatchObject({ name: expect.any(String) });
  const [ran] = rowsOf(run);
  expect(ran?.sourceWidth).toBe(1321);
  expect(ran?.sourceHeight).toBe(2000);

  // A Matte edit opens the editor for that row, and Undo reverses it.
  expect(
    await callAgentAction(page, "unmask_edit_matte", {
      id,
      operations: [{ _tag: "Wand", mode: "erase", seed: { x: 2, y: 2 } }],
    })
  ).toMatchObject({ matteEdits: 1, ok: true, state: "edited" });
  await expect(
    page.locator("canvas[aria-describedby='unmask-canvas-hint']")
  ).toBeVisible();
  expect(await callAgentAction(page, "unmask_undo", { id })).toMatchObject({
    matteEdits: 0,
    redoCount: 1,
  });

  // The download is the page's own download, written at full resolution.
  const file = page.waitForEvent("download");
  expect(
    await callAgentAction(page, "unmask_download", { ids: [id] })
  ).toMatchObject({ downloaded: 1, kind: "files", ok: true });
  expect((await file).suggestedFilename()).toBe("product-cutout.png");
  expect(
    JSON.stringify(await callAgentAction(page, "unmask_get_state"))
  ).toContain('"state":"downloaded"');
});

test("asks the user before it clears all, and reports a no", async ({
  page,
}) => {
  await page.setInputFiles("#unmask-files", await imageFile("first.jpg"));
  await expect(page.locator("#unmask-cut-out")).toBeVisible();

  const declined = callAgentAction(page, "unmask_remove", { all: true });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(await declined).toMatchObject({ code: "declined", ok: false });
  expect(await callAgentAction(page, "unmask_get_state")).toMatchObject({
    items: { total: 1 },
  });

  const confirmed = callAgentAction(page, "unmask_remove", { all: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Clear all" }).click();
  // Clear all keeps the rows and clears their results, as the confirm says.
  expect(await confirmed).toEqual({ cleared: 1, ok: true, removed: 0 });
  expect(await callAgentAction(page, "unmask_get_state")).toMatchObject({
    items: { total: 1 },
  });
});
