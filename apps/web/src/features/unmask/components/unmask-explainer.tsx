"use client";

import { Note } from "@/core/components/ui/note";
import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";
import { FaqList } from "@/features/tools/components/faq-list";
import { UnmaskComparison } from "@/features/unmask/components/unmask-comparison";

const FAQ = [
  ["unmaskFaqMatteQuestion", "unmaskFaqMatteAnswer"],
  ["unmaskFaqHairQuestion", "unmaskFaqHairAnswer"],
  ["unmaskFaqWatermarkQuestion", "unmaskFaqWatermarkAnswer"],
] as const;

/**
 * Below the Tool: what Unmask is, how it compares, what it cannot do, and the
 * answers a person needs before they trust an image to this tab.
 */
export const UnmaskExplainer = () => {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="unmask-explainer-title"
      className="border-rule flex flex-col gap-6 border-t-[3px] pt-6"
    >
      <h2
        className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]"
        id="unmask-explainer-title"
      >
        {t("unmaskExplainerTitleLead")}{" "}
        <Ransom as="span">{t("unmaskExplainerTitleAccent")}</Ransom>{" "}
        {t("unmaskExplainerTitleBridge")}{" "}
        <span className="text-primary-ink">
          {t("unmaskExplainerTitleTail")}
        </span>
      </h2>
      <div className="flex flex-col gap-4">
        <p className="text-muted-fg text-base/6">{t("unmaskExplainerLede")}</p>
        <p className="text-muted-fg text-base/6">{t("unmaskExplainerIntro")}</p>
      </div>
      <UnmaskComparison />
      <Note intent="warning">
        <h3 className="font-display text-base/5 font-extrabold uppercase [font-stretch:75%]">
          {t("unmaskHonestyTitle")}
        </h3>
        <p className="mt-2 text-sm/6">{t("unmaskHonestyBody")}</p>
      </Note>
      <section
        aria-labelledby="unmask-faq-heading"
        className="mt-6 flex flex-col gap-4"
      >
        <h3
          className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]"
          id="unmask-faq-heading"
        >
          {t("unmaskFaqHeading")}
        </h3>
        <FaqList
          items={FAQ.map(([question, answer]) => ({
            answer: t(answer),
            id: question,
            question: t(question),
          }))}
        />
      </section>
      <div className="mt-6 flex flex-col gap-2">
        <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
          {t("unmaskDisclaimerHeading")}
        </h3>
        <p className="text-muted-fg font-mono text-xs/6">
          {t("unmaskDisclaimer")}
        </p>
      </div>
    </section>
  );
};
