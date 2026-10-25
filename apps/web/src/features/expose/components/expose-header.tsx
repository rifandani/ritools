"use client";

import { Masthead } from "@/core/components/ui/masthead";
import { useTranslation } from "@/features/i18n/use-translation";

/** The Expose name in ransom letters. */
export const ExposeHeader = () => {
  const { t } = useTranslation();
  return <Masthead name={t("exposeName")} />;
};
