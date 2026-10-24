"use client";

import {
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
} from "@/core/components/ui/disclosure-group";
import { Note } from "@/core/components/ui/note";
import { ExposeComparison } from "@/features/expose/components/expose-comparison";
import { useTranslation } from "@/features/i18n/use-translation";

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
 * Below the Tool: what metadata is, how Expose compares with the tools a
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
        <span className="text-primary-ink">
          {t("exposeExplainerTitleAccent")}
        </span>
      </h2>

      <p className="text-muted-fg text-base/6">{t("exposeExplainerLede")}</p>

      <ExposeComparison />

      <Note intent="warning">
        <h3 className="font-display text-base/5 font-extrabold uppercase [font-stretch:75%]">
          {t("exposeHonestyTitle")}
        </h3>
        <p className="mt-2 text-sm/6">{t("exposeHonestyBody")}</p>
      </Note>

      <div className="mt-6 flex flex-col gap-4">
        <h3 className="border-rule border-b-2 pb-1.5 text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
          {t("exposeFaqHeading")}
        </h3>
        <DisclosureGroup>
          {FAQ.map(([question, answer]) => (
            <Disclosure id={question} key={question}>
              <DisclosureTrigger>{t(question)}</DisclosureTrigger>
              <DisclosurePanel>
                <p>{t(answer)}</p>
              </DisclosurePanel>
            </Disclosure>
          ))}
        </DisclosureGroup>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <h3 className="border-rule border-b-2 pb-1.5 text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
          {t("exposeDisclaimerHeading")}
        </h3>
        <p className="text-muted-fg font-mono text-xs/6">
          {t("exposeCompareDisclaimer")} {t("exposeSampleCameraLine")}{" "}
          {t("exposeSampleAiLine")}
        </p>
      </div>
    </section>
  );
};
