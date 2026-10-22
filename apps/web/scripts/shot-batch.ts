/* oxlint-disable unicorn/consistent-function-scoping -- page.evaluate bodies are serialized into the browser, so their helpers cannot move to module scope. */
/**
 * Capture one restyle batch: the category sections, the first viewport, and a
 * horizontal-overflow report at 390px and 1440px in light and dark.
 * Usage: bun scripts/shot-batch.ts <outDir> <categoryId...>
 */
/* eslint-disable eslint/no-await-in-loop -- Frames must settle in order. */
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const BASE = process.env.CATALOG_URL ?? "http://localhost:4300";
const outDir = path.resolve(
  process.argv[2] ?? "apps/web/.impeccable/review/batch"
);
const categories = process.argv.slice(3);

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const report: string[] = [];

for (const width of [1440, 390] as const) {
  for (const mode of ["light", "dark"] as const) {
    const context = await browser.newContext({
      colorScheme: mode,
      reducedMotion: "reduce",
      viewport: { width, height: width === 390 ? 844 : 1000 },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/master-design`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      const isFixed = (el: Element) =>
        getComputedStyle(el).position === "fixed";
      const isDevtools = (el: Element) => el.id.startsWith("tanstack_devtools");
      const inCorner = (box: DOMRect, left: number, bottom: number) =>
        box.left < left && box.bottom > innerHeight - bottom;
      const isLauncher = (
        el: Element,
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
        return inCorner(box, left, bottom);
      };
      for (const el of document.querySelectorAll("*")) {
        if (isLauncher(el, 140, 200)) {
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
    await page.waitForTimeout(700);

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const offenders: string[] = [];
      for (const el of document.querySelectorAll("*")) {
        if (el.getBoundingClientRect().right > doc.clientWidth + 1) {
          offenders.push(
            `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 70)}`
          );
        }
      }
      return {
        client: doc.clientWidth,
        scroll: doc.scrollWidth,
        offenders: [...new Set(offenders)].slice(0, 12),
      };
    });
    report.push(
      `${width}/${mode}: scroll=${overflow.scroll} client=${overflow.client}`
    );
    for (const o of overflow.offenders) {
      report.push(`   overflow: ${o}`);
    }

    for (const id of categories) {
      const section = page.locator(`section[aria-labelledby="category-${id}"]`);
      if ((await section.count()) === 0) {
        continue;
      }
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await section.screenshot({
        path: path.join(outDir, `${id}-${width}-${mode}.png`),
      });
    }

    // Start at the first Component Entry of the batch, so the rail's scroll
    // spy settles on the batch and the capture shows a complete entry.
    await page.evaluate(() => {
      const entry = document.querySelector("#color-picker");
      if (entry) {
        entry.scrollIntoView({ block: "start" });
        window.scrollBy(0, -24);
      }
    });
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(
        outDir,
        `${width === 390 ? "mobile" : "desktop"}${mode === "dark" ? "-dark" : ""}.png`
      ),
    });

    await context.close();
  }
}

await browser.close();
console.log(report.join("\n"));
