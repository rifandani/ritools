/* oxlint-disable eslint/no-await-in-loop -- the download stream is read one chunk at a time. */
/**
 * Fetches the Unmask model into `public/`.
 *
 * The model is a build input, not a hand-committed blob. It is served from the
 * app's own origin at runtime; the browser never contacts a third-party model
 * CDN. The first Cut out downloads it with progress, and the engine caches it
 * at runtime. This script verifies the recorded size and SHA-256 before it
 * writes the file.
 *
 * Runs before `dev` and before `build`; a file that already matches is kept.
 */

import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const APP_DIR = path.resolve(import.meta.dirname, "..");
const TARGET_DIR = path.join(APP_DIR, "public/unmask/models");
const TARGET = path.join(TARGET_DIR, "isnet-int8.onnx");
const URL =
  process.env.UNMASK_MODEL_URL ??
  "https://huggingface.co/xrds/isnet-general-onnx-int8/resolve/main/onnx/model_quantized.onnx";
const EXPECTED_BYTES = 44_229_662;
const EXPECTED_SHA256 =
  "3b21a6706dc8d6e4ba9f5b31ebc6940f6c785b58862e27bb25daa9dd4424b87f";

const sizeOf = async (file: string): Promise<number | null> => {
  try {
    const { size } = await stat(file);
    return size;
  } catch {
    return null;
  }
};

const digestOf = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

const existing = await sizeOf(TARGET);
if (existing === EXPECTED_BYTES) {
  const bytes = await readFile(TARGET);
  if (digestOf(bytes) === EXPECTED_SHA256) {
    process.stdout.write("Unmask model is present and verified.\n");
    process.exit(0);
  }
  await unlink(TARGET);
}

process.stdout.write("Fetching the Unmask model (about 44 MB)…\n");
const response = await fetch(URL, { redirect: "follow" });
if (!response.ok || response.body === null) {
  throw new Error(
    `The Unmask model could not be fetched: ${response.status} ${response.statusText}`
  );
}
const chunks: Uint8Array[] = [];
const reader = response.body.getReader();
let loaded = 0;
for (;;) {
  const chunk = await reader.read();
  if (chunk.done) {
    break;
  }
  if (chunk.value !== undefined) {
    chunks.push(chunk.value);
    loaded += chunk.value.byteLength;
    if (loaded % (8 * 1024 * 1024) < chunk.value.byteLength) {
      process.stdout.write(`  ${Math.round(loaded / 1_000_000)} MB\n`);
    }
  }
}
const bytes = new Uint8Array(loaded);
let offset = 0;
for (const chunk of chunks) {
  bytes.set(chunk, offset);
  offset += chunk.byteLength;
}

if (bytes.byteLength !== EXPECTED_BYTES) {
  throw new Error(
    `The Unmask model is ${bytes.byteLength} bytes, expected ${EXPECTED_BYTES}.`
  );
}
const digest = digestOf(bytes);
if (digest !== EXPECTED_SHA256) {
  throw new Error(
    `The Unmask model SHA-256 is ${digest}, expected ${EXPECTED_SHA256}.`
  );
}

await mkdir(TARGET_DIR, { recursive: true });
const temporary = path.join(TARGET_DIR, ".isnet-int8.onnx.part");
await writeFile(temporary, bytes);
await rename(temporary, TARGET);
process.stdout.write(
  `Unmask model written to ${path.relative(APP_DIR, TARGET)} (${bytes.byteLength} bytes, ${digest}).\n`
);
