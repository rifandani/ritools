/**
 * Capture the Component Catalog for a design round.
 * Usage: bun scripts/shot-catalog.ts <outDir> [tag]
 */
/* eslint-disable eslint/no-await-in-loop -- The captures must run in order: the catalog re-renders while the scroll spy follows, so each frame has to settle before the next. */
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const BASE = process.env.CATALOG_URL ?? "http://localhost:4300";
const outDir = path.resolve(
  process.argv[2] ?? "apps/web/.impeccable/review/shot"
);
const tag = process.argv[3] ?? "";

const viewports = [
  { name: "1440", width: 1440, height: 1000 },
  { name: "390", width: 390, height: 844 },
];

const modes = ["light", "dark"] as const;

const sections = [
  { id: "data-display", label: "Data Display" },
  { id: "feedback", label: "Feedback" },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const report: string[] = [];

for (const viewport of viewports) {
  for (const mode of modes) {
    const context = await browser.newContext({
      colorScheme: mode,
      reducedMotion: "reduce",
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/master-design`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
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
    await page.waitForTimeout(600);

    // The page must not scroll sideways.
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const offenders: string[] = [];
      for (const el of document.querySelectorAll("*")) {
        if (el.getBoundingClientRect().right > doc.clientWidth + 1) {
          offenders.push(
            `${el.tagName.toLowerCase()}.${el.className?.toString().slice(0, 60)}`
          );
        }
      }
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        offenders: [...new Set(offenders)].slice(0, 12),
      };
    });
    report.push(
      `${viewport.name}/${mode}: scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`
    );
    for (const offender of overflow.offenders) {
      report.push(`    overflow: ${offender}`);
    }

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
    await page.screenshot({
      path: path.join(outDir, `${tag}catalog-${viewport.name}-${mode}.png`),
    });

    for (const section of sections) {
      const locator = page.locator(
        `section[aria-labelledby="category-${section.id}"]`
      );
      await locator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      await locator.screenshot({
        path: path.join(
          outDir,
          `${tag}${section.id}-${viewport.name}-${mode}.png`
        ),
      });
    }

    await context.close();
  }
}

await browser.close();
console.log(report.join("\n"));
