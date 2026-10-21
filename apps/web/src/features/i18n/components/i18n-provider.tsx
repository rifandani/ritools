import { useAtomInitialValues, useAtomValue } from "@effect/atom-react";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { I18nProvider as AriaI18nProvider } from "react-aria";

import type { Locale } from "@/features/i18n/locale";
import { localeAtom } from "@/features/i18n/locale.atoms";

/**
 * Seeds `localeAtom` with the Locale the server rendered in (once per atom
 * registry, so once per request on the server) and gives it to React Aria.
 */
export const AppI18nProvider = ({
  children,
  locale: serverLocale,
}: PropsWithChildren<{ locale: Locale }>) => {
  useAtomInitialValues([[localeAtom, serverLocale]]);
  const locale = useAtomValue(localeAtom);
  // The server renders `<html lang>`; keep it in step when the user switches.
  useEffect(() => {
    document.documentElement.lang = locale;
    // `offline.html` is a static file with no server render. It reads this
    // copy, because the Locale cookie is httpOnly.
    try {
      localStorage.setItem("app-locale", locale);
    } catch {
      // Private mode can refuse storage; the offline page falls back to the
      // browser language.
    }
  }, [locale]);
  return <AriaI18nProvider locale={locale}>{children}</AriaI18nProvider>;
};
