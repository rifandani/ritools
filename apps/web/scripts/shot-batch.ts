/**
 * Capture one restyle batch: the category sections, the first viewport, and a
 * horizontal-overflow report at 390px and 1440px in light and dark.
 * Usage: bun scripts/shot-batch.ts <outDir> <categoryId...>
 */
/* eslint-disable eslint/no-await-in-loop -- Frames must settle in order. */
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

import { hideFixedOverlays, openMasterDesignPage } from "./shot-overlays";

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
    const page = await openMasterDesignPage(browser, {
      colorScheme: mode,
      height: width === 390 ? 844 : 1000,
      url: BASE,
      width,
    });
    await page.evaluate(hideFixedOverlays, {
      bottom: 200,
      left: 140,
      maxSize: 120,
      minSize: 20,
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

    await page.context().close();
  }
}

await browser.close();
console.log(report.join("\n"));
