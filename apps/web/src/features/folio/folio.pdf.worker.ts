/* oxlint-disable unicorn/require-post-message-target-origin, promise/avoid-new -- This is a dedicated renderer Worker; its diagnostics contain no PDF data. */
/// <reference lib="webworker" />
import "pdfjs-dist/legacy/build/pdf.worker.mjs";
import { isFolioAsset } from "./folio.assets";

declare const self: DedicatedWorkerGlobalScope;

// Keep the pinned renderer implementation as this Worker entry. PDF.js also
// initializes its message port on import. No document scripts are instantiated.
const fetchAsset = self.fetch.bind(self);
self.fetch = async (input, init) => {
  try {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      self.location.href
    );
    if (!isFolioAsset(url, self.location.origin)) {
      throw new Error("PDF asset unavailable");
    }
    const response = await fetchAsset(input, init);
    if (!response.ok) {
      self.postMessage({ folioAssetMissing: true });
    }
    return response;
  } catch (error) {
    // PDF.js can recover a missing font with boxes. Tell the private reader so
    // the application reports a cache miss instead of accepting that fallback.
    self.postMessage({ folioAssetMissing: true });
    throw error;
  }
};
