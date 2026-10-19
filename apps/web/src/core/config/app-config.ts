import { Config, Context, Effect, Option, Schema } from "effect";

/** An absolute URL, kept as the string it was configured with. */
const AbsoluteUrl = Schema.String.check(
  Schema.makeFilter((value: string) => URL.canParse(value), {
    expected: "an absolute URL",
  })
);

interface AppSettings {
  /** Product title, from `VITE_APP_TITLE`. */
  readonly title: string;
  /** Origin the app is served from: portless's worktree URL, else `VITE_APP_URL`. */
  readonly url: string;
}

/**
 * Reads and validates the app config from the current `ConfigProvider`. A
 * missing or malformed value fails with a `ConfigError`, so a bad deploy stops
 * at startup instead of rendering wrong links.
 */
export const loadAppConfig = Effect.gen(function* () {
  const title = yield* Config.NonEmptyString("VITE_APP_TITLE");
  const portlessUrl = yield* Config.option(
    Config.schema(AbsoluteUrl, "PORTLESS_URL")
  );
  const url = Option.isSome(portlessUrl)
    ? portlessUrl.value
    : yield* Config.schema(AbsoluteUrl, "VITE_APP_URL");
  return { title, url } satisfies AppSettings;
});

/**
 * The validated app config, for Effect code. `core/config/env.ts` gives its
 * layer; a test gives a fake with `Effect.provideService`.
 */
export class AppConfig extends Context.Service<AppConfig, AppSettings>()(
  "@heynbord/web/AppConfig"
) {}
