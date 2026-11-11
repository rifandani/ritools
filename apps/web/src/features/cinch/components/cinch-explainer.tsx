"use client";

import { Note } from "@/core/components/ui/note";
import { Ransom } from "@/core/components/ui/ransom";
import { CinchComparison } from "@/features/cinch/components/cinch-comparison";
import { useTranslation } from "@/features/i18n/use-translation";

const HEADING_CLASS =
  "font-display mt-12 text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]";

/**
 * Below the Tool: what Cinch is, how it compares, what it cannot do, and the
 * answers a person needs before they trust the Batch. Same layout as Squeeze.
 */
export const CinchExplainer = () => {
  const { t } = useTranslation();

  return (
    <section className="border-rule border-t-[3px] pt-8">
      <h2 className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {t("cinchAltTitleLead")}{" "}
        <Ransom as="span">{t("cinchAltTitleAccent")}</Ransom>{" "}
        {t("cinchAltTitleBridge")}{" "}
        <span className="text-primary-ink">{t("cinchAltTitleTail")}</span>
      </h2>
      <p className="text-muted-fg mt-4 text-base/6">{t("cinchAltLead")}</p>

      <CinchComparison />

      <Note className="mt-12" intent="warning">
        <h3 className="font-display text-base/5 font-extrabold uppercase [font-stretch:75%]">
          {t("cinchHonestyTitle")}
        </h3>
        <p className="mt-2 text-sm/6">{t("cinchHonestyBody")}</p>
      </Note>

      <h3 className={HEADING_CLASS}>{t("cinchDisclaimerHeading")}</h3>
      <p className="text-muted-fg mt-4 font-mono text-xs/6">
        {t("cinchDisclaimer")}
      </p>
    </section>
  );
};
