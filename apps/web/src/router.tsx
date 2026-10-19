import { RegistryContext, scheduleTask } from "@effect/atom-react";
import { createRouter } from "@tanstack/react-router";
import { AtomRegistry } from "effect/reactivity";

import { reportError } from "@/core/observability/logger";
import {
  ErrorRoute,
  NotFoundRoute,
  PendingRoute,
} from "@/core/providers/router/fallbacks";
import { dehydrateAtoms, hydrateAtoms } from "@/core/runtime/atom-hydration";

import { routeTree } from "./routeTree.gen";

/**
 * TanStack Start calls this once per server request and once in the browser,
 * so the router and its atom registry are never shared between requests.
 */
export const getRouter = () => {
  const registry = AtomRegistry.make({ defaultIdleTTL: 400, scheduleTask });
  const router = createRouter({
    routeTree,
    defaultOnCatch: (error, errorInfo) => {
      reportError("[router.onError]", { error, errorInfo });
    },
    defaultNotFoundComponent: NotFoundRoute,
    defaultPendingComponent: PendingRoute,
    defaultErrorComponent: ErrorRoute,
    context: {
      registry,
    },
    defaultPreload: "intent",
    scrollRestoration: true,
    Wrap: ({ children }) => (
      <RegistryContext value={registry}>{children}</RegistryContext>
    ),
    // `Atom.serializable` atoms that SSR resolved travel with the streamed
    // HTML, so the browser does not load them again.
    dehydrate: () => ({ atoms: dehydrateAtoms(registry) }),
    hydrate: ({ atoms }) => hydrateAtoms(registry, atoms),
  });
  // On the server the registry lives for one request: free its atoms and
  // fibers when the response is done.
  router.serverSsrLifecycle = {
    ...router.serverSsrLifecycle,
    onServerSsrAttach: [
      ...(router.serverSsrLifecycle?.onServerSsrAttach ?? []),
      (serverSsr) => serverSsr.onCleanup(() => registry.dispose()),
    ],
  };
  return router;
};

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
