"use client";

import { Masthead } from "@/core/components/ui/masthead";
import { useTranslation } from "@/features/i18n/use-translation";

/**
 * The masthead: the Expose name in ransom letters, and the promise and deck to
 * its right. The name holds the same column as the Squeeze name, so the two
 * pages put their text on the same x.
 */
export const ExposeHeader = () => {
  const { t } = useTranslation();
  return (
    <Masthead
      name={t("exposeName")}
      tagline={t("exposePromise")}
      note={t("exposeDeck")}
    />
  );
};
