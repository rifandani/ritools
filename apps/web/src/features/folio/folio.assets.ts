import paths from "./folio.assets.generated.json";

const allowedPaths = new Set(paths);

/** No URL, query, or resource name from a PDF may become a network request. */
export const isFolioAsset = (url: URL, origin: string): boolean =>
  url.origin === origin &&
  !url.search &&
  !url.hash &&
  allowedPaths.has(url.pathname);
