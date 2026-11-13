/* oxlint-disable unicorn/no-await-expression-member, anti-slop/require-safety-comment-for-type-assertion -- The test reads one download and one JSON result at a time, as an agent does. */
import { readFile } from "node:fs/promises";

import {
  agentActionNames,
  callAgentAction,
  waitForAgentAction,
} from "./_agent";
import { expect, test } from "./_base";

test.beforeEach(async ({ page }) => {
  await page.goto("/easel");
  await waitForAgentAction(page, "easel_get_state");
});

test("registers the Easel Agent Actions and asks for an image", async ({
  page,
}) => {
  expect(await agentActionNames(page)).toEqual(
    expect.arrayContaining([
      "open_tool",
      "easel_get_state",
      "easel_open_sample",
      "easel_apply_crop_preset",
      "easel_rotate",
      "easel_flip",
      "easel_set_finetune",
      "easel_apply_filter",
      "easel_export",
    ])
  );
  const state = await callAgentAction(page, "easel_get_state");
  expect(state).toMatchObject({ image: null, ok: true });
  expect(String(state.note)).toContain("easel_open_sample");

  const refused = await callAgentAction(page, "easel_rotate", {
    direction: "right",
  });
  expect(refused).toMatchObject({ code: "not-applicable", ok: false });
});

test("opens the Sample Image, edits it, and exports the file", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const opened = await callAgentAction(page, "easel_open_sample");
  expect(opened).toMatchObject({
    image: { height: 900, name: "easel-sample.png", width: 1200 },
    ok: true,
  });
  await expect(page.getByRole("tab")).toHaveCount(1);

  const cropped = await callAgentAction(page, "easel_apply_crop_preset", {
    preset: "x-header",
  });
  expect(cropped).toMatchObject({
    image: { cropPreset: "x-header", exportHeight: 500, exportWidth: 1500 },
  });

  const turned = await callAgentAction(page, "easel_rotate", {
    direction: "right",
  });
  // A fixed ratio does not survive a quarter turn.
  expect(turned).toMatchObject({ image: { cropPreset: "custom", rotate: 90 } });
  const mirrored = await callAgentAction(page, "easel_flip", {
    axis: "vertical",
  });
  expect(mirrored).toMatchObject({ image: { flipVertical: true } });

  const tuned = await callAgentAction(page, "easel_set_finetune", {
    key: "contrast",
    value: 30,
  });
  expect(tuned).toMatchObject({ image: { finetune: { contrast: 30 } } });
  const outOfRange = await callAgentAction(page, "easel_set_finetune", {
    key: "blur",
    value: -5,
  });
  expect(outOfRange).toMatchObject({ code: "invalid-settings", ok: false });

  const filtered = await callAgentAction(page, "easel_apply_filter", {
    filter: "noir",
    strength: 60,
  });
  expect(filtered).toMatchObject({
    image: { filter: "noir", filterStrength: 60 },
  });
  // The page shows the same state as the agent got.
  await page.locator('[data-easel-panel-tab="filter"]').click();
  await expect(page.locator('[data-easel-filter="noir"]')).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  const waiting = page.waitForEvent("download");
  const exported = await callAgentAction(page, "easel_export", {
    format: "webp",
    quality: 70,
  });
  const download = await waiting;
  expect(download.suggestedFilename()).toBe("easel-sample-easel.webp");
  const bytes = await readFile(await download.path());
  expect(exported).toMatchObject({
    bytes: bytes.byteLength,
    format: "webp",
    name: "easel-sample-easel.webp",
    ok: true,
  });
  expect(bytes.subarray(0, 4).toString("latin1")).toBe("RIFF");
  // The export is downloaded, so the File Tab has no unexported edits.
  await expect(page.locator("[data-tab-id][data-dirty]")).toHaveCount(0);
});
