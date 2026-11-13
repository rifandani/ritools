"use client";

import { Note } from "@/core/components/ui/note";
import { Ransom } from "@/core/components/ui/ransom";
import { EaselComparison } from "@/features/easel/components/easel-comparison";
import { useTranslation } from "@/features/i18n/use-translation";
import { ExplainerFooter } from "@/features/tools/components/explainer-footer";

const FAQ = [
  ["easelFaqReloadQuestion", "easelFaqReloadAnswer"],
  ["easelFaqUndoQuestion", "easelFaqUndoAnswer"],
  ["easelFaqRedactQuestion", "easelFaqRedactAnswer"],
  ["easelFaqMetadataQuestion", "easelFaqMetadataAnswer"],
] as const;

/**
 * Below the Tool: what Easel is, how it compares, what it cannot do, and the
 * answers a person needs before they trust an image to this tab. The
 * comparison sits above the limits. The source line carries the date the
 * cells were checked.
 */
export const EaselExplainer = () => {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="easel-explainer-title"
      className="border-rule flex flex-col gap-6 border-t-[3px] pt-6"
    >
      <h2
        className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]"
        id="easel-explainer-title"
      >
        {t("easelExplainerTitleLead")}{" "}
        <Ransom as="span">{t("easelExplainerTitleAccent")}</Ransom>{" "}
        {t("easelExplainerTitleBridge")}{" "}
        <span className="text-primary-ink">{t("easelExplainerTitleTail")}</span>
      </h2>
      <div className="flex flex-col gap-4">
        <p className="text-muted-fg text-base/6">{t("easelExplainerLede")}</p>
        <p className="text-muted-fg text-base/6">{t("easelExplainerIntro")}</p>
      </div>
      <EaselComparison />
      <Note intent="warning">
        <h3 className="font-display text-base/5 font-extrabold uppercase [font-stretch:75%]">
          {t("easelHonestyTitle")}
        </h3>
        <p className="mt-2 text-sm/6">{t("easelHonestyBody")}</p>
      </Note>
      <ExplainerFooter
        disclaimer={t("easelCompareDisclaimer")}
        disclaimerHeading={t("easelDisclaimerHeading")}
        faq={FAQ.map(([question, answer]) => ({
          answer: t(answer),
          id: question,
          question: t(question),
        }))}
        faqHeading={t("easelFaqHeading")}
      />
    </section>
  );
};
