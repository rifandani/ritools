/**
 * Copies the OCR engine, its worker, and its language models into `public/`.
 *
 * Folio must not fetch an OCR asset from a third-party origin: the notices say
 * that no page image or OCR text leaves the tab, and the first OCR run must
 * work offline after the assets are cached. The files are served like the
 * viewer's WASM, from the app's own origin.
 *
 * Runs before `dev` and before `build`; a file that already matches is kept.
 */

import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const APP_DIR = path.resolve(import.meta.dirname, "..");
const TARGET = path.join(APP_DIR, "public/folio/ocr");

const files: readonly (readonly [string, string])[] = [
  [
    path.join(APP_DIR, "node_modules/tesseract.js/dist/worker.min.js"),
    "tesseract-worker.js",
  ],
  // This loader carries the WASM inside itself. There is no separate binary
  // to fetch, so Folio ships one file for the engine instead of three.
  [
    path.join(
      APP_DIR,
      "node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js"
    ),
    "tesseract-core-simd-lstm.wasm.js",
  ],
  [
    path.join(
      APP_DIR,
      "node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz"
    ),
    "eng.traineddata.gz",
  ],
  [
    path.join(
      APP_DIR,
      "node_modules/@tesseract.js-data/ind/4.0.0_best_int/ind.traineddata.gz"
    ),
    "ind.traineddata.gz",
  ],
];

const sizeOf = async (file: string) => {
  try {
    const { size } = await stat(file);
    return size;
  } catch {
    return -1;
  }
};

await mkdir(TARGET, { recursive: true });

await Promise.all(
  files.map(async ([from, name]) => {
    const to = path.join(TARGET, name);
    const [fromSize, toSize] = await Promise.all([sizeOf(from), sizeOf(to)]);
    if (fromSize < 0) {
      throw new Error(`The OCR asset is missing: ${from}`);
    }
    if (fromSize === toSize) {
      return;
    }
    await copyFile(from, to);
    process.stdout.write(`Copied ${name}\n`);
  })
);
