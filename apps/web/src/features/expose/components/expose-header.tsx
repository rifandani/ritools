"use client";

import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";

/**
 * The masthead: the Expose name in ransom letters, the promise, and the
 * local-only stamp on its red plate. It is the same at both widths; only the
 * stamp moves from the right edge to under the promise.
 */
export const ExposeHeader = () => {
  const { t } = useTranslation();
  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
      <div className="flex max-w-[52ch] flex-col gap-y-3">
        <Ransom
          as="h1"
          className="text-[clamp(2.75rem,8vw,7rem)] max-sm:[--angle-tilt:0deg] max-sm:[--slash-run:0]"
          fit
        >
          {t("exposeName")}
        </Ransom>
        <p className="text-lg leading-7 font-semibold">{t("exposePromise")}</p>
        <p className="text-muted-fg text-sm/6">{t("exposeDeck")}</p>
        <p className="text-muted-fg text-xs/5">
          {t("exposeOneFile")} {t("exposeFormatLine")}
        </p>
      </div>

      <aside className="ground-red border-red flex shrink-0 flex-col gap-2 border-2 p-4 lg:max-w-[20rem]">
        <p className="text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
          {t("homeLocalKicker")}
        </p>
        <p className="font-display text-xl leading-6 font-black uppercase [font-stretch:75%]">
          {t("exposeLocal")}
        </p>
        <p className="text-sm/5">{t("exposeLocalNote")}</p>
      </aside>
    </header>
  );
};
