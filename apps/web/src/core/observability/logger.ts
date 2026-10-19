import { Effect, Logger } from "effect";

/**
 * Pretty, leveled console logs. `mode: "auto"` picks the browser console format
 * on the client and the TTY format on the server.
 */
export const LoggerLayer = Logger.layer([Logger.consolePretty()]);

/**
 * Logs an error from code that is not an Effect: React error callbacks, router
 * hooks and error components. Effect code calls `Effect.logError` instead.
 */
export const reportError = (
  message: string,
  report: { readonly error: unknown; readonly errorInfo?: unknown }
) => {
  Effect.runFork(
    Effect.logError(message).pipe(
      Effect.annotateLogs(report),
      Effect.provide(LoggerLayer)
    )
  );
};
