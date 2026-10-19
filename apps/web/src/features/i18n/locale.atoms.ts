import { Effect } from "effect";
import { Atom } from "effect/reactivity";

import { appRuntime } from "@/core/runtime/client";
import type { Locale } from "@/features/i18n/locale";
import { DEFAULT_LOCALE } from "@/features/i18n/locale";
import { persistLocale } from "@/features/i18n/locale.functions";

/**
 * The Locale the UI renders in. The root route seeds it with the server's
 * pick, so the SSR HTML and hydration agree. Kept alive: it is app state, not a
 * cache, and must not reset when no component reads it for a moment.
 */
export const localeAtom = Atom.make<Locale>(DEFAULT_LOCALE).pipe(
  Atom.keepAlive
);

/**
 * Switches the UI Locale at once, then persists it for the next server render.
 * Persisting is best effort: the UI has already switched, so a failure is only
 * logged.
 */
export const selectLocaleAtom = appRuntime.fn(
  Effect.fn("Locale.select")(function* (locale: Locale, get: Atom.FnContext) {
    get.set(localeAtom, locale);
    yield* persistLocale(locale).pipe(
      Effect.catch((error) =>
        Effect.logError("Cannot persist the picked Locale", error)
      )
    );
  })
);
