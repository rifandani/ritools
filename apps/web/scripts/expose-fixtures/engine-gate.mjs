// Run in a separate Node process: the PDF write can poison the interpreter.
import { readFileSync } from "node:fs";

import { parseMetadata, writeMetadata } from "@colorhythm/exiftool-wasm";

const fixture = (extension) =>
  new Uint8Array(
    readFileSync(
      new URL(
        `../../src/features/expose/fixtures/metadata.${extension}`,
        import.meta.url
      )
    )
  );
const output = { package: "@colorhythm/exiftool-wasm@1.0.4", engine: "13.59" };
const pdf = { data: fixture("pdf"), name: "fixture.pdf" };
output.pdfRead = await parseMetadata(pdf, {
  args: ["-json", "-G1", "-s", "-m", "-q"],
});
try {
  output.pdfWrite = await writeMetadata(
    pdf,
    { "PDF:Author": "" },
    { args: ["-m", "-q"] }
  );
} catch (error) {
  output.pdfWrite = { success: false, error: String(error) };
}
try {
  output.nextRead = await parseMetadata(
    { data: fixture("jpg"), name: "fixture.jpg" },
    { args: ["-json", "-m", "-q"] }
  );
} catch (error) {
  output.nextRead = { success: false, error: String(error) };
}
console.log(JSON.stringify(output, null, 2));
