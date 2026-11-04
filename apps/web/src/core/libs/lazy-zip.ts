import type { makeZip as zip } from "client-zip";

import { loadLibrary } from "@/core/libs/library-load";

/** ZIP support is downloaded only for a ZIP download. */
export const makeZip = async (...args: Parameters<typeof zip>) => {
  const module = await loadLibrary("client-zip", () => import("client-zip"));
  return module.makeZip(...args);
};
