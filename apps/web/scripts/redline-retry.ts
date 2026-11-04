import type { Plugin } from "vite";

const RETRY_QUERY = "redline-retry";

/** A fresh entry must also have fresh optional dependencies: browsers cache failed module graphs. */
export const redlineRetry = (): Plugin => ({
  name: "redline-library-retry",
  enforce: "pre",
  async resolveId(source, importer) {
    if (
      !importer?.includes(RETRY_QUERY) ||
      /^(?:react|react-dom)(?:\/|$)/u.test(source)
    ) {
      return null;
    }
    // Shared app code is already loaded before Find difference. Keep its framework singletons.
    if (
      !source.startsWith(".") &&
      !source.startsWith("@pierre/") &&
      !importer.includes("/node_modules/")
    ) {
      return null;
    }
    const resolved = await this.resolve(source, importer.split("?")[0], {
      skipSelf: true,
    });
    if (
      !resolved ||
      resolved.external ||
      resolved.id.startsWith("\0") ||
      !resolved.id.includes("/node_modules/")
    ) {
      return resolved;
    }
    if (
      /\/node_modules\/(?:react|react-dom|scheduler)\//u.test(resolved.id) ||
      (source.startsWith(".") && resolved.id.includes("/.vite/deps/"))
    ) {
      return resolved;
    }
    return {
      ...resolved,
      id: `${resolved.id}${resolved.id.includes("?") ? "&" : "?"}${RETRY_QUERY}`,
    };
  },
});
