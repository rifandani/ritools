import { ConfigProvider, Effect, Layer } from "effect";

import { AppConfig, loadAppConfig } from "@/core/config/app-config";

/**
 * `import.meta.env` as a `ConfigProvider`. Vite exposes only `VITE_*` and
 * `PORTLESS_*` keys (see `envPrefix` in `vite.config.ts`). An empty value counts
 * as absent, so an unset `PORTLESS_URL=` falls back to `VITE_APP_URL`.
 */
const viteEnvProvider = ConfigProvider.fromUnknown(
  Object.fromEntries(
    Object.entries(import.meta.env).filter(([, value]) => value !== "")
  )
);

/**
 * The validated app config, read once when the module loads. A missing or
 * malformed value throws here, so both the build and the server fail at startup.
 * Synchronous code (route `head()`, SEO helpers) reads this. Effect code reads
 * the `AppConfig` service.
 */
export const APP_CONFIG = Effect.runSync(
  loadAppConfig.pipe(
    Effect.provideService(ConfigProvider.ConfigProvider, viteEnvProvider)
  )
);

/** `APP_CONFIG` as the `AppConfig` service. */
export const AppConfigLayer = Layer.succeed(AppConfig, APP_CONFIG);
