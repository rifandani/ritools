import { Effect, Option } from "effect";

import { AppConfig } from "@/core/config/app-config";
import { ServerRequest } from "@/core/runtime/server-request";
import type { Locale } from "@/features/i18n/locale";
import { LOCALE_COOKIE, resolveLocale } from "@/features/i18n/locale";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/** The Locale the server renders in: the persisted cookie, then `Accept-Language`. */
export const readRequestLocale = Effect.gen(function* () {
  const request = yield* ServerRequest;
  const cookie = yield* request.getCookie(LOCALE_COOKIE);
  const acceptLanguage = yield* request.getHeader("accept-language");
  return resolveLocale({
    acceptLanguage: Option.getOrUndefined(acceptLanguage),
    cookie: Option.getOrUndefined(cookie),
  });
});

/** Persists the picked Locale, so the next server render uses it. */
export const persistLocaleCookie = Effect.fn("LocaleCookie.persist")(function* (
  locale: Locale
) {
  const config = yield* AppConfig;
  const request = yield* ServerRequest;
  yield* request.setCookie(LOCALE_COOKIE, locale, {
    httpOnly: true,
    maxAge: ONE_YEAR_IN_SECONDS,
    path: "/",
    sameSite: "lax",
    // A browser keeps a Secure cookie only over HTTPS. The deployed app is
    // HTTPS; the local e2e server is plain HTTP.
    secure: new URL(config.url).protocol === "https:",
  });
  return locale;
});
