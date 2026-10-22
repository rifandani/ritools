/**
 * Copies the rasteriser's WebAssembly out of the package and into `public/`.
 *
 * The card endpoint fetches the module from the app's own origin once per
 * process. Importing the `.wasm` from the package instead would either bind
 * the build to Node (Vite's server-side wasm helper reads a file) or inline
 * 2.4 MB of base64 into every server bundle, so the file is served like the
 * icons are.
 *
 * Runs before `dev` and before `build`; a file that already matches is kept.
 */

import { copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const APP_DIR = path.resolve(import.meta.dirname, "..");
const FILE = "index_bg.wasm";

const from = path.join(APP_DIR, "node_modules/@resvg/resvg-wasm", FILE);
const to = path.join(APP_DIR, "public/resvg.wasm");

const sizeOf = async (file: string) => {
  try {
    const { size } = await stat(file);
    return size;
  } catch {
    return null;
  }
};

const source = await sizeOf(from);
if (source === null) {
  throw new Error(
    `The rasteriser is not installed: ${path.relative(APP_DIR, from)} is missing. Run bun install.`
  );
}

if ((await sizeOf(to)) !== source) {
  await mkdir(path.dirname(to), { recursive: true });
  await copyFile(from, to);
  console.log(
    `Rasteriser copied to public/resvg.wasm (${Math.round(source / 1024)} kB).`
  );
}
