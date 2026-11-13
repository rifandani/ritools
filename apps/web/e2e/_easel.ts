/* oxlint-disable unicorn/no-await-expression-member -- Playwright locators and downloads are read where they are used. */
import { readFile } from "node:fs/promises";

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Helpers for the Easel specs: a known test image, the image box on the
 * stage, and the pixels of a downloaded export.
 */

export const QUAD = { height: 300, width: 400 } as const;
export const RED = [255, 0, 0, 255] as const;
export const GREEN = [0, 255, 0, 255] as const;
export const BLUE = [0, 0, 255, 255] as const;
export const WHITE = [255, 255, 255, 255] as const;

/**
 * A 400×300 PNG with four flat quadrants: red at the top left, green at the
 * top right, blue at the bottom left, and white at the bottom right.
 */
export const quadImage = async (page: Page, name = "quad.png") => {
  const bytes = await page.evaluate(async ({ height, width }) => {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("no 2D canvas");
    }
    const quadrants = [
      ["#ff0000", 0, 0],
      ["#00ff00", width / 2, 0],
      ["#0000ff", 0, height / 2],
      ["#ffffff", width / 2, height / 2],
    ] as const;
    for (const [color, x, y] of quadrants) {
      context.fillStyle = color;
      context.fillRect(x, y, width / 2, height / 2);
    }
    const blob = await canvas.convertToBlob({ type: "image/png" });
    return [...new Uint8Array(await blob.arrayBuffer())];
  }, QUAD);
  return { buffer: Buffer.from(bytes), mimeType: "image/png", name };
};

/** Waits until the stage has drawn the photo at least once more. */
export const waitForDraw = async (page: Page) => {
  await expect(
    page.locator("[data-easel-photo][data-easel-drawn]")
  ).toBeVisible({ timeout: 15_000 });
};

/** Opens the test image and waits for its first draw. */
export const openQuad = async (page: Page, name = "quad.png") => {
  await page.setInputFiles("#easel-files", await quadImage(page, name));
  await waitForDraw(page);
};

export const openPanel = async (page: Page, panel: string) => {
  await page.locator(`[data-easel-panel-tab="${panel}"]`).click();
  await expect(page.locator(`[data-easel-panel="${panel}"]`)).toBeVisible();
};

/** Opens the export drop-down in the toolbar. It stays open when it is already open. */
export const openExport = async (page: Page) => {
  if (!(await page.locator("#easel-export").isVisible())) {
    await page.locator("#easel-export-menu").click();
  }
  await expect(page.locator("#easel-export")).toBeVisible();
};

/** The CSS box of the image on the stage. */
export const imageBox = async (page: Page) => {
  const box = await page.locator("[data-easel-backdrop-box]").boundingBox();
  if (box === null) {
    throw new Error("the image box is not on the stage");
  }
  return box;
};

/** Drags on the image, between two points given as parts of its box. */
export const dragOnImage = async (
  page: Page,
  from: readonly [number, number],
  to: readonly [number, number]
) => {
  const box = await imageBox(page);
  await page.mouse.move(
    box.x + box.width * from[0],
    box.y + box.height * from[1]
  );
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * ((from[0] + to[0]) / 2),
    box.y + box.height * ((from[1] + to[1]) / 2),
    { steps: 4 }
  );
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], {
    steps: 4,
  });
  await page.mouse.up();
};

/** Sets a slider with the keyboard: `Home`, `End`, or arrow presses. */
export const pressSlider = async (
  page: Page,
  id: string,
  keys: readonly string[]
) => {
  const slider = page.locator(`[data-easel-slider="${id}"] input[type=range]`);
  await slider.focus();
  for (const key of keys) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- key presses run in order.
    await slider.press(key);
  }
};

export interface ExportedPixels {
  readonly bytes: Buffer;
  readonly height: number;
  readonly name: string;
  /** The RGBA values at each asked point, in the same order. */
  readonly pixels: readonly (readonly number[])[];
  readonly width: number;
}

/**
 * Exports the open image, downloads it, decodes it in the page, and reads
 * the pixels at `points` (each a part of the width and the height).
 */
export const exportAndRead = async (
  page: Page,
  options: {
    readonly format?: "avif" | "jpeg" | "png" | "webp";
    readonly points?: readonly (readonly [number, number])[];
  } = {}
): Promise<ExportedPixels> => {
  const format = options.format ?? "png";
  await openExport(page);
  await page.locator(`[data-easel-format="${format}"]`).click();
  await page.locator("#easel-export").click();
  const button = page.locator("#easel-download");
  await expect(button).toBeVisible({ timeout: 30_000 });
  const waiting = page.waitForEvent("download");
  await button.click();
  const download = await waiting;
  const bytes = await readFile(await download.path());
  const mime = {
    avif: "image/avif",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  }[format];
  const decoded = await page.evaluate(
    async ({ data, points, type }) => {
      const bitmap = await createImageBitmap(
        new Blob([new Uint8Array(data)], { type }),
        { premultiplyAlpha: "none" }
      );
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context === null) {
        throw new Error("no 2D canvas");
      }
      context.drawImage(bitmap, 0, 0);
      return {
        height: bitmap.height,
        pixels: points.map(([x, y]) => [
          ...context.getImageData(
            Math.min(bitmap.width - 1, Math.floor(x * bitmap.width)),
            Math.min(bitmap.height - 1, Math.floor(y * bitmap.height)),
            1,
            1
          ).data,
        ]),
        width: bitmap.width,
      };
    },
    { data: [...bytes], points: options.points ?? [], type: mime }
  );
  return { ...decoded, bytes, name: download.suggestedFilename() };
};

/** Whether two colors are the same within `tolerance` for each channel. */
export const near = (
  actual: readonly number[] | undefined,
  expected: readonly number[],
  tolerance = 6
): boolean =>
  actual !== undefined &&
  expected.every(
    (value, index) => Math.abs((actual[index] ?? -999) - value) <= tolerance
  );

/**
 * How many File Tabs the browser has saved. It is `-1` before the database
 * exists. A spec waits for it before a reload, because a write follows a
 * change after a short pause.
 */
export const savedTabCount = (page: Page): Promise<number> =>
  page.evaluate(
    () =>
      // oxlint-disable-next-line promise/avoid-new -- IndexedDB reports through callbacks.
      new Promise<number>((resolve) => {
        const opening = indexedDB.open("ritools-easel");
        opening.addEventListener("error", () => {
          resolve(-1);
        });
        opening.addEventListener("success", () => {
          const db = opening.result;
          if (!db.objectStoreNames.contains("tabs")) {
            db.close();
            resolve(-1);
            return;
          }
          const counting = db.transaction("tabs").objectStore("tabs").count();
          counting.addEventListener("success", () => {
            db.close();
            resolve(counting.result);
          });
        });
      })
  );
