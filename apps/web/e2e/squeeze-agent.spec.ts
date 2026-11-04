/* oxlint-disable unicorn/no-await-expression-member, anti-slop/require-safety-comment-for-type-assertion -- The test reads one download and one JSON result at a time, as an agent does. */
import {
  agentActionNames,
  agentActionSchema,
  callAgentAction,
  waitForAgentAction,
} from "./_agent";
import { expect, test } from "./_base";

/** A real PNG from the build, as in the Squeeze spec. */
const SAMPLE = "public/screenshot-wide.png";
const SAMPLE_NAME = "screenshot-wide.png";

test.beforeEach(async ({ page }) => {
  await page.goto("/squeeze");
  await waitForAgentAction(page, "squeeze_get_state");
});

test("registers the Squeeze Agent Actions and open_tool", async ({ page }) => {
  const names = await agentActionNames(page);
  expect(names).toEqual(
    expect.arrayContaining([
      "open_tool",
      "squeeze_get_state",
      "squeeze_set_settings",
      "squeeze_run",
      "squeeze_stop",
      "squeeze_remove",
      "squeeze_download",
    ])
  );
  const { annotations, inputSchema } = await agentActionSchema(
    page,
    "squeeze_get_state"
  );
  expect(annotations).toMatchObject({
    readOnlyHint: true,
    untrustedContentHint: true,
  });
  expect(inputSchema).toMatchObject({ type: "object" });
});

test("tells the agent to ask for files when the Batch is empty", async ({
  page,
}) => {
  const state = await callAgentAction(page, "squeeze_get_state");
  expect(state).toMatchObject({ ok: true, items: { total: 0 } });
  expect(String(state.note)).toContain("Ask the user to drop images");
  expect(await callAgentAction(page, "squeeze_run")).toMatchObject({
    code: "empty-batch",
    ok: false,
  });
});

test("sets, runs, reads, and downloads the Batch the user dropped", async ({
  page,
}) => {
  // A setting the agent changes shows in the page.
  expect(
    await callAgentAction(page, "squeeze_set_settings", {
      outputFormat: "webp",
      targetBytes: 50_000,
    })
  ).toMatchObject({ ok: true, settings: { outputFormat: "webp" } });
  await expect(
    page.locator("#squeeze-output-format [data-selected]")
  ).toContainText("WebP");
  await expect(page.locator("#squeeze-target")).toHaveValue("50");

  // A conflicting pair changes nothing and says why.
  expect(
    await callAgentAction(page, "squeeze_set_settings", {
      outputFormat: "multi",
      sizeMode: "batch-total",
    })
  ).toMatchObject({ code: "invalid-settings", ok: false });

  // The user puts the file in the Batch.
  await page.setInputFiles("#squeeze-files", SAMPLE);
  await page.locator("#squeeze-files").dispatchEvent("change");
  const before = await callAgentAction(page, "squeeze_get_state");
  expect(before).toMatchObject({
    items: { rows: [{ name: SAMPLE_NAME, state: "pending" }], total: 1 },
    totals: { pending: 1 },
  });

  // `run` waits for the run to end and returns each row.
  const run = await callAgentAction(page, "squeeze_run");
  expect(run).toMatchObject({ ok: true, ran: 1, stopped: false });
  expect(JSON.stringify(run)).toMatch(/"state":"(?<state>done|miss|bigger)"/u);
  await expect(
    page.locator("li").filter({ hasText: SAMPLE_NAME }).first()
  ).toContainText(/Done|Miss|Bigger/u);

  // The download is the page's own download.
  const id = String(
    (before.items as { rows: { id: string }[] }).rows[0]?.id ?? ""
  );
  const download = page.waitForEvent("download");
  expect(
    await callAgentAction(page, "squeeze_download", { ids: [id] })
  ).toMatchObject({ downloaded: 1, ok: true });
  expect((await download).suggestedFilename()).toBe("screenshot-wide.webp");

  // A row id that left the Batch is an error the agent can read.
  expect(
    await callAgentAction(page, "squeeze_remove", { ids: ["gone"] })
  ).toMatchObject({ code: "unknown-id" });
});

test("asks the user before it removes all, and reports a no", async ({
  page,
}) => {
  await page.setInputFiles("#squeeze-files", SAMPLE);
  await page.locator("#squeeze-files").dispatchEvent("change");
  await expect(page.getByText(SAMPLE_NAME).first()).toBeVisible();

  const declined = callAgentAction(page, "squeeze_remove", { all: true });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  expect(await declined).toMatchObject({ code: "declined", ok: false });
  await expect(page.getByText(SAMPLE_NAME).first()).toBeVisible();

  const confirmed = callAgentAction(page, "squeeze_remove", { all: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Clear all" }).click();
  expect(await confirmed).toEqual({ ok: true, removed: 1 });
  expect(await callAgentAction(page, "squeeze_get_state")).toMatchObject({
    items: { total: 0 },
  });
});
