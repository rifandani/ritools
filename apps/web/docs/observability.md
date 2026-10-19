# Observability

- In Effect code, log with `Effect.logInfo`, `Effect.logWarning` and `Effect.logError`. Add context with `Effect.annotateLogs`. `LoggerLayer` in `@/core/observability/logger` is part of the client and server runtimes.
- In code that is not an Effect (React error callbacks, router hooks, error components), use `reportError` from `@/core/observability/logger`.
- The server logs the full cause of a server-function defect. The browser gets only "Internal server error".
