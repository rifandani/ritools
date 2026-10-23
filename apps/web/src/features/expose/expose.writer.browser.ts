import wasmUrl from "@colorhythm/exiftool-wasm/dist/esm/zeroperl-mqcadjqm.wasm?url";

import { ExposeError } from "@/features/expose/expose";
import type { ExifToolWriter } from "@/features/expose/expose.cleaner";
import {
  EXIFTOOL_ENGINE,
  EXIFTOOL_VERSION,
  runExifTool,
} from "@/features/expose/expose.writer.node";

/**
 * The browser ExifTool writer.
 *
 * The WebAssembly artifact is 26.6 MB unpacked. It loads on the first clean,
 * reports bytes as they arrive, and is kept by the service worker in the codec
 * cache after that. The viewer never imports this module.
 */

let cachedWasm: ArrayBuffer | null = null;
let inFlight: Promise<ArrayBuffer> | null = null;

const unavailable = (detail: string): ExposeError =>
  new ExposeError({ code: "engine-unavailable", detail });

const loadWasm = async (
  report: (
    loadedBytes: number | null,
    totalBytes: number | null,
    percent: number | null
  ) => void
): Promise<ArrayBuffer> => {
  if (cachedWasm !== null) {
    report(cachedWasm.byteLength, cachedWasm.byteLength, 100);
    return cachedWasm;
  }
  if (inFlight !== null) {
    return inFlight;
  }
  if (typeof WebAssembly === "undefined") {
    throw unavailable("this browser does not provide WebAssembly");
  }
  inFlight = (async () => {
    let response: Response;
    try {
      response = await fetch(wasmUrl, { cache: "force-cache" });
    } catch (error) {
      throw unavailable(
        error instanceof Error
          ? error.message
          : "the cleaner could not be fetched"
      );
    }
    if (!response.ok) {
      throw unavailable(`the cleaner answered ${response.status}`);
    }
    const totalHeader = response.headers.get("content-length");
    const total = totalHeader === null ? null : Math.trunc(Number(totalHeader));
    let loaded = 0;
    if (response.body === null) {
      const bytes = await response.arrayBuffer();
      report(bytes.byteLength, bytes.byteLength, 100);
      cachedWasm = bytes;
      return bytes;
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      // oxlint-disable-next-line no-await-in-loop -- a stream yields the next chunk only after this read
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
      loaded += value.byteLength;
      const percent =
        total === null || total <= 0
          ? null
          : Math.min(100, Math.round((loaded / total) * 100));
      report(loaded, total, percent);
    }
    const bytes = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    cachedWasm = bytes.buffer;
    report(loaded, total ?? loaded, 100);
    return bytes.buffer;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
};

export const browserExifToolWriter: ExifToolWriter = {
  name: EXIFTOOL_ENGINE,
  version: EXIFTOOL_VERSION,
  write: async (input, tags, report) => {
    report(null, null, null);
    const wasm = await loadWasm(report);
    return runExifTool(input, tags, () =>
      Promise.resolve(
        new Response(wasm, {
          headers: { "content-type": "application/wasm" },
        })
      )
    );
  },
};
