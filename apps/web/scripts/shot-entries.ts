/**
 * Capture each Component Entry of a batch, so a reviewer can read them.
 * Usage: bun scripts/shot-entries.ts <outDir> <entryId...>
 */
/* eslint-disable eslint/no-await-in-loop -- The captures must run in order: the catalog re-renders while the scroll spy follows, so each frame has to settle before the next. */
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

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
    const context = await browser.newContext({
      // SAFETY: the mode comes from the SHOT_MODES list, which holds only
      // "light" and "dark".
      colorScheme: mode as "light" | "dark",
      reducedMotion: "reduce",
      viewport: { width, height: 1000 },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/master-design`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    // The devtools launcher is a fixed element, and in a full page capture it
    // paints over whatever the clip holds. The toaster is hidden for the same
    // reason.
    await page.addStyleTag({
      content: "[data-sonner-toaster]{display:none !important}",
    });
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("*")) {
        const style = getComputedStyle(el);
        if (style.position !== "fixed") {
          continue;
        }
        const box = el.getBoundingClientRect();
        const isLauncher =
          el.id.startsWith("tanstack_devtools") ||
          (box.width >= 24 &&
            box.width <= 96 &&
            box.height >= 24 &&
            box.height <= 96 &&
            box.left < 100 &&
            box.bottom > window.innerHeight - 120);
        if (isLauncher) {
          // SAFETY: the element is the fixed devtools launcher, a square in
          // the bottom-left corner.
          (el as HTMLElement).style.display = "none";
        }
      }
      // The sticky filter bar would cover the top of every element capture.
      // SAFETY: the filter bar is the only element with this class stack.
      const bar = document.querySelector(
        ".sticky.top-0.z-20"
      ) as HTMLElement | null;
      if (bar) {
        bar.style.position = "static";
      }
    });
    for (const id of entries) {
      const locator = page.locator(`section[data-md-section][id="${id}"]`);
      await locator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      // Hide the devtools launcher again: it mounts lazily, after the first
      // paint, and a fixed element paints over whatever the clip holds.
      await page.evaluate(() => {
        for (const el of document.querySelectorAll("*")) {
          const style = getComputedStyle(el);
          if (style.position !== "fixed") {
            continue;
          }
          const box = el.getBoundingClientRect();
          const isLauncher =
            el.id.startsWith("tanstack_devtools") ||
            (box.width >= 20 &&
              box.width <= 120 &&
              box.height >= 20 &&
              box.height <= 120 &&
              box.left < 140 &&
              box.bottom > window.innerHeight - 200);
          if (isLauncher) {
            // SAFETY: the element is the fixed devtools launcher.
            (el as HTMLElement).style.display = "none";
          }
        }
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
    await context.close();
  }
}

await browser.close();
console.log("captured", entries.length, "entries x", modes.length, "modes");
