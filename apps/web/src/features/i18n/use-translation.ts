import { useAtomSet, useAtomValue } from "@effect/atom-react";

import { initI18n } from "@/core/libs/i18n/init";
import enUS from "@/core/libs/i18n/locales/en-US";
import idID from "@/core/libs/i18n/locales/id-ID";
import { DEFAULT_LOCALE } from "@/features/i18n/locale";
import { localeAtom, selectLocaleAtom } from "@/features/i18n/locale.atoms";

const translations = {
  "en-us": enUS,
  "id-id": idID,
};

/** `t` for the current Locale, the Locale itself, and a setter that persists it. */
export const useTranslation = () => {
  const locale = useAtomValue(localeAtom);
  const setLocale = useAtomSet(selectLocaleAtom);
  return {
    ...initI18n({ fallbackLocale: [DEFAULT_LOCALE], locale, translations }),
    locale,
    setLocale,
  };
};

declare module "@/core/libs/i18n/my-translations" {
  interface Register {
    translations: typeof enUS;
  }
}
