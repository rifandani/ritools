import {
  getCookies,
  getRequestHeaders,
  setCookie,
} from "@tanstack/react-start/server";
import { Cause, Effect, Layer, ManagedRuntime } from "effect";
import type { Exit } from "effect";

import type { AppConfig } from "@/core/config/app-config";
import { AppConfigLayer } from "@/core/config/env";
import { LoggerLayer } from "@/core/observability/logger";
import {
  makeRequestSnapshot,
  ServerRequest,
} from "@/core/runtime/server-request";

// Server-only: import protection fails the build if client code imports a
// `*.server.*` file. Reach this through the server functions in `*.functions.ts`.

/** Services for server-function Effects. One runtime for the server process. */
const serverRuntime = ManagedRuntime.make(
  Layer.mergeAll(AppConfigLayer, LoggerLayer)
);

/**
 * Runs the Effect of one server function and returns its encoded `Exit`.
 *
 * The request is read into a snapshot before the Effect starts, and the cookie
 * writes are applied after it ends: TanStack's request helpers read an
 * AsyncLocalStorage, and an Effect fiber can run in another request's context.
 * Defects are logged here with their full cause; the contract hides them from
 * the client.
 */
export const runServerFn = async <A, E, Wire>(
  contract: { readonly encodeExit: (exit: Exit.Exit<A, E>) => Wire },
  effect: Effect.Effect<A, E, AppConfig | ServerRequest>
) => {
  const request = makeRequestSnapshot({
    cookies: getCookies(),
    headers: getRequestHeaders(),
  });
  const exit = await serverRuntime.runPromiseExit(
    effect.pipe(
      Effect.tapCause((cause) =>
        Cause.hasDies(cause)
          ? Effect.logError("Server function defect", cause)
          : Effect.void
      ),
      Effect.provideService(ServerRequest, request.service)
    )
  );
  for (const { name, options, value } of request.cookieWrites) {
    setCookie(name, value, options);
  }
  return contract.encodeExit(exit);
};
