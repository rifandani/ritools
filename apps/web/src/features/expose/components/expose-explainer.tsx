"use client";

import { Note } from "@/core/components/ui/note";
import { Ransom } from "@/core/components/ui/ransom";
import { ExposeComparison } from "@/features/expose/components/expose-comparison";
import { useTranslation } from "@/features/i18n/use-translation";
import { ExplainerFooter } from "@/features/tools/components/explainer-footer";

const FAQ = [
  ["exposeFaqExifQ", "exposeFaqExifA"],
  ["exposeFaqC2paQ", "exposeFaqC2paA"],
  ["exposeFaqRemoveQ", "exposeFaqRemoveA"],
  ["exposeFaqSocialQ", "exposeFaqSocialA"],
  ["exposeFaqFormatsQ", "exposeFaqFormatsA"],
  ["exposeFaqGroupsQ", "exposeFaqGroupsA"],
  ["exposeFaqWatermarkQ", "exposeFaqWatermarkA"],
] as const;

/**
 * Below the Tool: what Expose is, how it compares with the tools a
 * person comes from, what a Clean cannot remove, and the answers a person
 * needs before they trust a Clean. The limits carry a checked date and a
 * source link, because a vendor can change one without notice.
 */
export const ExposeExplainer = () => {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="expose-explainer-title"
      className="border-rule flex flex-col gap-6 border-t-[3px] pt-6"
    >
      <h2
        className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]"
        id="expose-explainer-title"
      >
        {t("exposeExplainerTitleLead")}{" "}
        <Ransom as="span">{t("exposeExplainerTitleAccent")}</Ransom>{" "}
        {t("exposeExplainerTitleBridge")}{" "}
        <span className="text-primary-ink">
          {t("exposeExplainerTitleTail")}
        </span>
      </h2>

      <div className="flex flex-col gap-4">
        <p className="text-muted-fg text-base/6">{t("exposeExplainerLede")}</p>
        <p className="text-muted-fg text-base/6">{t("exposeExplainerIntro")}</p>
      </div>

      <ExposeComparison />

      <Note intent="warning">
        <h3 className="font-display text-base/5 font-extrabold uppercase [font-stretch:75%]">
          {t("exposeHonestyTitle")}
        </h3>
        <p className="mt-2 text-sm/6">{t("exposeHonestyBody")}</p>
      </Note>

      <ExplainerFooter
        disclaimer={
          <>
            {t("exposeCompareDisclaimer")} {t("exposeSampleCameraLine")}{" "}
            {t("exposeSampleAiLine")}
          </>
        }
        disclaimerHeading={t("exposeDisclaimerHeading")}
        faq={FAQ.map(([question, answer]) => ({
          answer: t(answer),
          id: question,
          question: t(question),
        }))}
        faqHeading={t("exposeFaqHeading")}
      />
    </section>
  );
};
