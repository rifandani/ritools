/**
 * Generate the image-only PDF that proves OCR.
 *
 * The page holds one raster and no text layer, which is what a scanner
 * produces. The words are known, so a test can look for them after OCR.
 *
 * The words are drawn as font outlines, not as SVG text: the rasteriser ships
 * no font loader, and a committed font keeps the fixture identical on every
 * machine. The output is committed, and the manifest records its hash, so a
 * build never runs this script.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import fontkit from "@pdf-lib/fontkit";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { PDFDocument } from "pdf-lib";

const APP_DIR = path.resolve(import.meta.dirname, "../..");
const FIXTURES = path.join(APP_DIR, "src/features/folio/fixtures");
const FONT = path.join(
  APP_DIR,
  "public/fonts/pdf/archivo-latin-400-normal.ttf"
);
const WASM = path.join(APP_DIR, "node_modules/@resvg/resvg-wasm/index_bg.wasm");

const WIDTH = 1240;
const HEIGHT = 1754;

const lines = [
  { size: 76, text: "FOLIO TEST INVOICE", y: 180 },
  { size: 44, text: "ACME STATIONERY", y: 320 },
  { size: 44, text: "Invoice 42", y: 400 },
  { size: 44, text: "Total 128.50 USD", y: 480 },
];

const fontBytes = new Uint8Array(await readFile(FONT));
const font = fontkit.create(fontBytes);
const scaleOf = (size: number) => size / font.unitsPerEm;

const paths: string[] = [];
for (const line of lines) {
  const run = font.layout(line.text);
  let pen = 100;
  const scale = scaleOf(line.size);
  for (let index = 0; index < run.glyphs.length; index += 1) {
    const glyph = run.glyphs[index];
    const position = run.positions[index];
    if (!glyph || !position) {
      continue;
    }
    const outline = glyph.path.toSVG();
    if (outline) {
      paths.push(
        `<path d="${outline}" transform="translate(${pen + position.xOffset}, ${line.y}) scale(${scale} ${-scale})"/>`
      );
    }
    pen += position.xAdvance * scale;
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><rect width="${WIDTH}" height="${HEIGHT}" fill="white"/><g fill="black">${paths.join("")}</g></svg>`;

await initWasm(await readFile(WASM));
const image = new Resvg(svg);
const png = image.render().asPng();
image.free();

const document = await PDFDocument.create();
document.setCreationDate(new Date("2026-01-01T00:00:00Z"));
document.setModificationDate(new Date("2026-01-01T00:00:00Z"));
const embedded = await document.embedPng(png);
const page = document.addPage([595.28, 841.89]);
page.drawImage(embedded, {
  height: 841.89,
  width: 595.28,
  x: 0,
  y: 0,
});
const bytes = await document.save();
await writeFile(path.join(FIXTURES, "scan.pdf"), bytes);
process.stdout.write(`Wrote scan.pdf (${bytes.byteLength} bytes)\n`);
