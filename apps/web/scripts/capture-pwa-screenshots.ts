/**
 * Captures the PWA manifest screenshots from the running app.
 *
 * The Batch holds real files: the brand assets this repository ships. The app
 * is the real app, on the real route, with the real file picker.
 *
 * Usage: bun scripts/capture-pwa-screenshots.ts
 */

/* eslint-disable eslint/no-await-in-loop -- The two shots must settle one after the other. */

import { spawn } from "node:child_process";
import { stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { chromium } from "@playwright/test";
import type { Page } from "@playwright/test";

import { embedProvenance } from "@/features/og/og.png";

const APP_DIR = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(APP_DIR, "public");
const PORT = Number(process.env.BRAND_PORT ?? 4310);
const BASE = `http://localhost:${PORT}`;

/** The line that rides in the file. */
const ORIGIN =
  "Captured by apps/web/scripts/capture-pwa-screenshots.ts from the running Ritools app at /squeeze, with a Batch of the repository's own brand assets.";

/** The files that go into the Batch. */
const BATCH = ["public/logo.png", "public/pwa-512x512.png"] as const;

/** The two shots the manifest asks for. */
const SHOTS = [
  { file: "screenshot-wide.png", width: 1280, height: 720 },
  { file: "screenshot-narrow.png", width: 750, height: 1334 },
] as const;

/** Waits until React has hydrated the page. */
const ready = (page: Page) =>
  page.waitForFunction(() => {
    const input = document.querySelector("#squeeze-files");
    return (
      input !== null &&
      Object.getOwnPropertyNames(input).some((key) =>
        key.startsWith("__reactEvents$")
      )
    );
  });

/** Waits for the server to answer. */
const waitForServer = async () => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(BASE);
      if (response.ok) {
        return;
      }
    } catch {
      // The server is not up yet.
    }
    await sleep(500);
  }
  throw new Error(`The app never came up on ${BASE}.`);
};

const server = spawn("bunx", ["vite", "--port", String(PORT), "--strictPort"], {
  cwd: APP_DIR,
  stdio: "ignore",
});

try {
  await waitForServer();

  const browser = await chromium.launch();
  for (const shot of SHOTS) {
    const context = await browser.newContext({
      colorScheme: "light",
      reducedMotion: "reduce",
      viewport: { height: shot.height, width: shot.width },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/squeeze`, { waitUntil: "networkidle" });
    await ready(page);

    // The Batch takes real files, through the real picker.
    await page.setInputFiles(
      "#squeeze-files",
      BATCH.map((file) => path.join(APP_DIR, file))
    );
    await page.locator("#squeeze-files").dispatchEvent("change");

    const rows = page.locator("ul.px-3 > li");
    await rows.first().waitFor({ timeout: 30_000 });

    // The tool runs, so the ledger shows what it did.
    await page.getByRole("button", { name: /Compress all/u }).click();
    await page
      .getByRole("button", { name: /^Stop/u })
      .waitFor({ timeout: 60_000 });
    await page
      .getByRole("button", { name: /Compress all/u })
      .waitFor({ timeout: 180_000 });

    // The offline notice is the app talking to the user, not the poster.
    const notice = page.getByText("App is ready to use offline");
    if (await notice.count()) {
      await notice.first().waitFor({ state: "hidden", timeout: 20_000 });
    }

    // The wide shot shows the sheet as it opens; the narrow shot shows the
    // Batch, which is what a phone is used for.
    await (shot.width > 1000
      ? page.evaluate(() => window.scrollTo(0, 0))
      : rows.first().scrollIntoViewIfNeeded());
    await page.waitForTimeout(600);

    const buffer = await page.screenshot({ type: "png" });
    await writeFile(
      path.join(PUBLIC_DIR, shot.file),
      embedProvenance(buffer, ORIGIN)
    );
    const { size } = await stat(path.join(PUBLIC_DIR, shot.file));
    console.log(
      `  ${shot.file.padEnd(24)} ${String(Math.round((size / 1024) * 10) / 10).padStart(8)} kB`
    );
    await context.close();
  }
  await browser.close();
} finally {
  server.kill();
}
