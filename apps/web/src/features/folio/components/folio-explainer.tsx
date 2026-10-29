"use client";

import { Note } from "@/core/components/ui/note";
import { useTranslation } from "@/features/i18n/use-translation";

export const FolioExplainer = () => {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="folio-explainer-title"
      className="border-rule flex flex-col gap-5 border-t-[3px] pt-6"
    >
      <h2
        id="folio-explainer-title"
        className="font-display text-3xl leading-tight font-black uppercase [font-stretch:75%]"
      >
        {t("folioExplainerTitle")}
      </h2>
      <p className="text-muted-fg max-w-[70ch] text-base/6">
        {t("folioExplainerScope")}
      </p>
      <Note intent="warning">
        <p>{t("folioLifetimeHelp")}</p>
      </Note>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex max-w-[70ch] flex-col gap-3 text-sm/6">
          <p>{t("folioLocalSession")}</p>
          <p>{t("folioOfflineHelp")}</p>
          <p>{t("folioDeviceHelp")}</p>
        </div>
        <div className="text-muted-fg flex max-w-[70ch] flex-col gap-3 text-sm/6">
          <p>{t("folioExplainerLimits")}</p>
          <p>{t("folioAccessHelp")}</p>
          <p>{t("folioNotOcr")}</p>
        </div>
      </div>
    </section>
  );
};
