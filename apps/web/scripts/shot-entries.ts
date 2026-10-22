/**
 * Capture each Component Entry of a batch, so a reviewer can read them.
 * Usage: bun scripts/shot-entries.ts <outDir> <entryId...>
 */
/* eslint-disable eslint/no-await-in-loop -- The captures must run in order: the catalog re-renders while the scroll spy follows, so each frame has to settle before the next. */
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

import { hideFixedOverlays, openMasterDesignPage } from "./shot-overlays";

const BASE = process.env.CATALOG_URL ?? "http://localhost:4300";
const outDir = path.resolve(
  process.argv[2] ?? "apps/web/.impeccable/review/entries"
);
const entries = process.argv.slice(3);

const modes = (process.env.SHOT_MODES ?? "light").split(",");

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();

for (const mode of modes) {
  for (const [vp, width] of [
    ["1440", 1440],
    ["390", 390],
  ] as const) {
    // SAFETY: the mode comes from the SHOT_MODES list, which holds only
    // "light" and "dark".
    const page = await openMasterDesignPage(browser, {
      colorScheme: mode as "light" | "dark",
      height: 1000,
      url: BASE,
      width,
    });
    await page.waitForTimeout(500);
    // The devtools launcher is a fixed element, and in a full page capture it
    // paints over whatever the clip holds. The toaster is hidden for the same
    // reason.
    await page.addStyleTag({
      content: "[data-sonner-toaster]{display:none !important}",
    });
    await page.evaluate(hideFixedOverlays, {
      bottom: 120,
      left: 100,
      maxSize: 96,
      minSize: 24,
    });
    for (const id of entries) {
      const locator = page.locator(`section[data-md-section][id="${id}"]`);
      await locator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      // Hide the devtools launcher again: it mounts lazily, after the first
      // paint, and a fixed element paints over whatever the clip holds.
      await page.evaluate(hideFixedOverlays, {
        bottom: 200,
        left: 140,
        maxSize: 120,
        minSize: 20,
      });
      const box = await locator.boundingBox();
      if (!box) {
        continue;
      }
      const scroll = await page.evaluate(() => ({
        x: window.scrollX,
        y: window.scrollY,
      }));
      await page.screenshot({
        path: path.join(outDir, `${id}-${vp}-${mode}.png`),
        fullPage: true,
        clip: {
          x: box.x + scroll.x,
          y: box.y + scroll.y,
          width: box.width,
          height: box.height,
        },
      });
    }
    await page.context().close();
  }
}

await browser.close();
console.log("captured", entries.length, "entries x", modes.length, "modes");
