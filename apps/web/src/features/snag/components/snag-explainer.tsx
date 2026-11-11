"use client";

import { Note } from "@/core/components/ui/note";
import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";
import { SnagComparison } from "@/features/snag/components/snag-comparison";
import { FaqList } from "@/features/tools/components/faq-list";

const FAQ = [
  ["snagFaqRelayQuestion", "snagFaqRelayAnswer"],
  ["snagFaqFormatsQuestion", "snagFaqFormatsAnswer"],
  ["snagFaqRefusedQuestion", "snagFaqRefusedAnswer"],
  ["snagFaqLegalQuestion", "snagFaqLegalAnswer"],
] as const;

/**
 * Below the Tool: what Snag is, how it compares, why its requests go through
 * the Video Relay, what it cannot save, and the rights notice.
 */
export const SnagExplainer = () => {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="snag-explainer-title"
      className="border-rule flex flex-col gap-6 border-t-[3px] pt-6"
    >
      <h2
        className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]"
        id="snag-explainer-title"
      >
        {t("snagExplainerTitleLead")}{" "}
        <Ransom as="span">{t("snagExplainerTitleAccent")}</Ransom>{" "}
        {t("snagExplainerTitleBridge")}{" "}
        <span className="text-primary-ink">{t("snagExplainerTitleTail")}</span>
      </h2>
      <div className="flex flex-col gap-4">
        <p className="text-muted-fg text-base/6">{t("snagExplainerLede")}</p>
        <p className="text-muted-fg text-base/6">{t("snagExplainerIntro")}</p>
      </div>
      <SnagComparison />
      <Note className="mt-6" intent="info">
        <h3 className="font-display text-base/5 font-extrabold uppercase [font-stretch:75%]">
          {t("snagRelayTitle")}
        </h3>
        <p className="mt-2 text-sm/6">{t("snagRelayBody")}</p>
      </Note>
      <Note intent="warning">
        <h3 className="font-display text-base/5 font-extrabold uppercase [font-stretch:75%]">
          {t("snagHonestyTitle")}
        </h3>
        <p className="mt-2 text-sm/6">{t("snagHonestyBody")}</p>
      </Note>
      <section
        aria-labelledby="snag-faq-heading"
        className="mt-6 flex flex-col gap-4"
      >
        <h3
          className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]"
          id="snag-faq-heading"
        >
          {t("snagFaqHeading")}
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
          {t("snagDisclaimerHeading")}
        </h3>
        <p className="text-muted-fg font-mono text-xs/6">
          {t("snagDisclaimer")}
        </p>
      </div>
    </section>
  );
};
