/* eslint-disable eslint/no-await-in-loop -- the persistent engine accepts one request at a time */
/* oxlint-disable react-doctor/async-await-in-loop -- parallel calls would overlap the Perl interpreter */
import { readFileSync } from "node:fs";

import { readFile } from "../../src/features/expose/expose.reader";

const names = process.argv.includes("--camera")
  ? ["apps/web/public/samples/expose/camera-nikon-z9-c2pa.jpg"]
  : ["jpg", "png", "tiff", "webp", "heic", "avif", "jxl", "gif"].map(
      (extension) =>
        `apps/web/src/features/expose/fixtures/metadata.${extension}`
    );
const inputs = names.map((name) => ({
  bytes: new Uint8Array(readFileSync(name)),
  name,
  type: "",
}));
const [first] = inputs;
if (first === undefined) {
  throw new Error("No benchmark fixture");
}
const coldStart = performance.now();
await readFile(first);
const coldReadMs = performance.now() - coldStart;
const warmStart = performance.now();
for (let index = 0; index < 100; index += 1) {
  await readFile(inputs[index % inputs.length] ?? first);
}
console.log(
  JSON.stringify(
    {
      fixtures: names,
      coldReadMs,
      warmBatchMs: performance.now() - warmStart,
      files: 100,
      memory: process.memoryUsage(),
    },
    null,
    2
  )
);
