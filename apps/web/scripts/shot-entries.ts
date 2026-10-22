/* oxlint-disable unicorn/consistent-function-scoping -- page.evaluate bodies are serialized into the browser, so their helpers cannot move to module scope. */
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
      const isFixed = (el: Element) =>
        getComputedStyle(el).position === "fixed";
      const isDevtools = (el: Element) => el.id.startsWith("tanstack_devtools");
      const inSquare = (box: DOMRect, min: number, max: number) =>
        box.width >= min &&
        box.width <= max &&
        box.height >= min &&
        box.height <= max;
      const inCorner = (box: DOMRect, left: number, bottom: number) =>
        box.left < left && box.bottom > innerHeight - bottom;
      const isLauncher = (
        el: Element,
        min: number,
        max: number,
        left: number,
        bottom: number
      ): boolean => {
        if (!isFixed(el)) {
          return false;
        }
        if (isDevtools(el)) {
          return true;
        }
        const box = el.getBoundingClientRect();
        return inSquare(box, min, max) && inCorner(box, left, bottom);
      };
      for (const el of document.querySelectorAll("*")) {
        if (isLauncher(el, 24, 96, 100, 120)) {
          // SAFETY: a fixed overlay is removed from the capture, not restyled.

          (el as HTMLElement).style.display = "none";
        }
      }
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
        const isFixed = (el: Element) =>
          getComputedStyle(el).position === "fixed";
        const isDevtools = (el: Element) =>
          el.id.startsWith("tanstack_devtools");
        const inSquare = (box: DOMRect, min: number, max: number) =>
          box.width >= min &&
          box.width <= max &&
          box.height >= min &&
          box.height <= max;
        const inCorner = (box: DOMRect, left: number, bottom: number) =>
          box.left < left && box.bottom > innerHeight - bottom;
        const isLauncher = (
          el: Element,
          min: number,
          max: number,
          left: number,
          bottom: number
        ): boolean => {
          if (!isFixed(el)) {
            return false;
          }
          if (isDevtools(el)) {
            return true;
          }
          const box = el.getBoundingClientRect();
          return inSquare(box, min, max) && inCorner(box, left, bottom);
        };
        for (const el of document.querySelectorAll("*")) {
          if (isLauncher(el, 20, 120, 140, 200)) {
            // SAFETY: a fixed overlay is removed from the capture, not restyled.

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
