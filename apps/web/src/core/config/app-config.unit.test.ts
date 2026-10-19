import { describe, expect, it } from "@effect/vitest";
import { ConfigProvider, Effect } from "effect";

import { loadAppConfig } from "@/core/config/app-config";

const load = (env: Record<string, string | undefined>) =>
  loadAppConfig.pipe(
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromUnknown(env)
    )
  );

describe("loadAppConfig", () => {
  it.effect("reads the app title and URL", () =>
    Effect.gen(function* () {
      const config = yield* load({
        VITE_APP_TITLE: "Heynbord",
        VITE_APP_URL: "https://heynbord.com",
      });

      expect(config).toEqual({
        title: "Heynbord",
        url: "https://heynbord.com",
      });
    })
  );

  it.effect("prefers the portless URL over the configured one", () =>
    Effect.gen(function* () {
      const config = yield* load({
        PORTLESS_URL: "https://web.heynbord.localhost",
        VITE_APP_TITLE: "Heynbord",
        VITE_APP_URL: "https://heynbord.com",
      });

      expect(config.url).toBe("https://web.heynbord.localhost");
    })
  );

  it.effect("fails on a URL that does not parse", () =>
    Effect.gen(function* () {
      const error = yield* load({
        VITE_APP_TITLE: "Heynbord",
        VITE_APP_URL: "heynbord",
      }).pipe(Effect.flip);

      expect(error._tag).toBe("ConfigError");
    })
  );

  it.effect("fails on an empty title", () =>
    Effect.gen(function* () {
      const error = yield* load({
        VITE_APP_TITLE: "",
        VITE_APP_URL: "https://heynbord.com",
      }).pipe(Effect.flip);

      expect(error._tag).toBe("ConfigError");
    })
  );
});
