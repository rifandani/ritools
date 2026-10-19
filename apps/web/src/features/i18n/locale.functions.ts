import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";

import { makeServerFnContract } from "@/core/runtime/server-fn";
import { runServerFn } from "@/core/runtime/server.server";
import { Locale } from "@/features/i18n/locale";
import {
  persistLocaleCookie,
  readRequestLocale,
} from "@/features/i18n/locale-cookie";

const localeContract = makeServerFnContract({
  failure: Schema.Never,
  success: Locale,
});

const getRequestLocaleFn = createServerFn({ method: "GET" }).handler(() =>
  runServerFn(localeContract, readRequestLocale)
);

const persistLocaleFn = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(Schema.Struct({ locale: Locale })))
  .handler(({ data }) =>
    runServerFn(localeContract, persistLocaleCookie(data.locale))
  );

/** The Locale the server renders in: cookie, then `Accept-Language`. */
export const requestLocale = localeContract.call(() => getRequestLocaleFn());

/** Persists the picked Locale so the next server render uses it. */
export const persistLocale = (locale: Locale) =>
  localeContract.call(() => persistLocaleFn({ data: { locale } }));
