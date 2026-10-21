/**
 * Drawing a card into a PNG.
 *
 * The renderer is WebAssembly, not a native module, because the app may be
 * built for a Worker. The wasm itself is a static file the build copies out of
 * `@resvg/resvg-wasm`: inlining it would put megabytes of base64 into the
 * server bundle, and the module is needed once per process either way.
 */

import { initWasm, Resvg } from "@resvg/resvg-wasm";

import type { CardDrawing } from "./og.drawing";
import { embedProvenance } from "./og.png";

/** Where the rasteriser's module sits, on the app's own origin. */
const WASM_PATH = "/resvg.wasm";

/** How many drawings one process keeps as rasters. */
const MAX_RASTERS = 8;

let wasm: Promise<void> | null = null;

/** Loads the rasteriser once per process. A failed load is retried. */
const loadWasm = async (origin: string) => {
  wasm ??= (async () => {
    const response = await fetch(new URL(WASM_PATH, origin));
    if (!response.ok) {
      throw new Error(
        `The rasteriser was not found at ${WASM_PATH} (${response.status}).`
      );
    }
    await initWasm(response);
  })();
  try {
    await wasm;
  } catch (error) {
    wasm = null;
    throw error;
  }
};

const rasters = new Map<string, Uint8Array<ArrayBuffer>>();

/** Draws a card, and stamps where it came from into the file. */
export const renderDrawing = async (
  drawing: CardDrawing,
  origin: string
): Promise<Uint8Array<ArrayBuffer>> => {
  const cached = rasters.get(drawing.svg);
  if (cached) {
    return cached;
  }
  await loadWasm(origin);
  const image = new Resvg(drawing.svg).render();
  const png = embedProvenance(image.asPng(), drawing.origin);
  image.free();

  if (rasters.size >= MAX_RASTERS) {
    const oldest = rasters.keys().next();
    if (!oldest.done) {
      rasters.delete(oldest.value);
    }
  }
  rasters.set(drawing.svg, png);
  return png;
};
