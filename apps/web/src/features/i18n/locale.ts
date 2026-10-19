import { Schema } from "effect";

import type { LocaleDictLanguage } from "@/core/libs/i18n/init";

/** Every Locale that has a Message Catalog. The first one is the default. */
const LOCALES = [
  "en-us",
  "id-id",
] as const satisfies readonly LocaleDictLanguage[];

export const Locale = Schema.Literals(LOCALES);
export type Locale = typeof Locale.Type;

export const [DEFAULT_LOCALE] = LOCALES;

/** Cookie that persists the picked Locale, so the server renders in it. */
export const LOCALE_COOKIE = "app-locale";

const isLocale = Schema.is(Locale);

/** `Accept-Language` tags, lowercased, highest `q` first (stable for ties). */
const parseAcceptLanguage = (header: string) =>
  header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qParam = params.find((param) => param.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { index, q: Number.isNaN(q) ? 0 : q, tag: tag.toLowerCase() };
    })
    .filter(({ q, tag }) => tag !== "" && tag !== "*" && q > 0)
    .toSorted((a, b) => b.q - a.q || a.index - b.index)
    .map(({ tag }) => tag);

/** Exact Locale for a tag, else the first Locale with the same language. */
const matchLocale = (tag: string) => {
  if (isLocale(tag)) {
    return tag;
  }
  const [language] = tag.split("-");
  return LOCALES.find((locale) => locale.startsWith(`${language}-`));
};

/**
 * Picks the Locale for a request: the persisted cookie wins, then the
 * preferred `Accept-Language` tag that has a Message Catalog, then the default.
 */
export const resolveLocale = ({
  acceptLanguage,
  cookie,
}: {
  acceptLanguage?: string;
  cookie?: string;
}): Locale => {
  if (cookie && isLocale(cookie)) {
    return cookie;
  }
  for (const tag of parseAcceptLanguage(acceptLanguage ?? "")) {
    const locale = matchLocale(tag);
    if (locale) {
      return locale;
    }
  }
  return DEFAULT_LOCALE;
};
