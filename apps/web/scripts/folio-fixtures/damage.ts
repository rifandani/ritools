/**
 * Generate the damaged PDF that proves Repair copy.
 *
 * The input is `text-10.pdf`. The output keeps every object, but its
 * cross-reference table stops after the first entries, `startxref` points to
 * a wrong offset, and junk follows `%%EOF`. PDFium can still open it, because
 * it scans the objects to rebuild the table. The output is committed, and the
 * manifest records its hash, so a build never runs this script.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const APP_DIR = path.resolve(import.meta.dirname, "../..");
const FIXTURES = path.join(APP_DIR, "src/features/folio/fixtures");

/** The cross-reference entries that stay: the free entry and objects 1–11. */
const KEPT_ENTRIES = 12;

const source = new TextDecoder("latin1").decode(
  await readFile(path.join(FIXTURES, "text-10.pdf"))
);
const xref = source.lastIndexOf("\nxref\n");
const trailer = source.indexOf("trailer", xref);
if (xref === -1 || trailer === -1) {
  throw new Error("text-10.pdf has no classic cross-reference table");
}
const lines = source.slice(xref + 1, trailer).split("\n");
const [keyword = "xref", , ...entries] = lines;
const truncated = [
  keyword,
  `0 ${KEPT_ENTRIES}`,
  ...entries.slice(0, KEPT_ENTRIES),
  "",
].join("\n");
const tail = source
  .slice(trailer)
  .replace(/startxref\n\d+\n/u, "startxref\n999999\n");
const damaged = `${source.slice(0, xref + 1)}${truncated}${tail.trimEnd()}\njunk after the end marker\n`;
const bytes = Uint8Array.from(
  damaged,
  (character) => character.codePointAt(0) ?? 0
);
await writeFile(path.join(FIXTURES, "broken-xref.pdf"), bytes);
process.stdout.write(`Wrote broken-xref.pdf (${bytes.byteLength} bytes)\n`);
