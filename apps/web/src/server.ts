import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";

/**
 * Server entry: renders the full document and streams it. The shell and every
 * resolved route flush first; Suspense boundaries, deferred loader promises,
 * and SSR queries stream in as they settle.
 *
 * Nitro wraps this `fetch` handler for the target runtime (see `vite.config.ts`).
 */
export default createServerEntry({
  fetch: createStartHandler(defaultStreamHandler),
});
