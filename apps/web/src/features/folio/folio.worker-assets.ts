/* oxlint-disable import/default, eslint/prefer-export-from -- Vite generates URL exports and the URL also builds the reader asset map. */
import pdfWorkerUrl from "./folio.pdf.worker?worker&url";
import type { ReaderAssets } from "./folio.reader";

/** Same-origin, versioned assets. Nothing here is user data. */
export const readerAssets: ReaderAssets = {
  workerSrc: pdfWorkerUrl,
  cMapUrl: "/folio/cmaps/",
  standardFontDataUrl: "/folio/standard_fonts/",
  wasmUrl: "/folio/wasm/",
};

export const folioPdfWorkerUrl = pdfWorkerUrl;
