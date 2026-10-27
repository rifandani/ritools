"use client";

import {
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
} from "@/core/components/ui/disclosure-group";
import { Note } from "@/core/components/ui/note";
import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";
import { TabularComparison } from "@/features/tabular/components/tabular-comparison";

const FAQ = [
  ["tabularFaqFormatsQ", "tabularFaqFormatsA"],
  ["tabularFaqEditQ", "tabularFaqEditA"],
  ["tabularFaqFormulasQ", "tabularFaqFormulasA"],
  ["tabularFaqLimitQ", "tabularFaqLimitA"],
  ["tabularFaqDatesQ", "tabularFaqDatesA"],
] as const;

/**
 * Below the Tool: what Tabular is, how it compares with the CSV viewers a
 * person comes from, what an export cannot keep, and the answers a person
 * needs before they trust a file to this tab. The limits carry a checked
 * date and a source link, because a vendor can change one without notice.
 */
export const TabularExplainer = () => {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="tabular-explainer-title"
      className="border-rule flex flex-col gap-6 border-t-[3px] pt-6"
    >
      <h2
        className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]"
        id="tabular-explainer-title"
      >
        {t("tabularExplainerTitleLead")}{" "}
        <Ransom as="span">{t("tabularExplainerTitleAccent")}</Ransom>{" "}
        {t("tabularExplainerTitleBridge")}{" "}
        <span className="text-primary-ink">
          {t("tabularExplainerTitleTail")}
        </span>
      </h2>

      <div className="flex flex-col gap-4">
        <p className="text-muted-fg text-base/6">{t("tabularExplainerLede")}</p>
        <p className="text-muted-fg text-base/6">
          {t("tabularExplainerIntro")}
        </p>
      </div>

      <TabularComparison />

      <Note intent="warning">
        <h3 className="font-display text-base/5 font-extrabold uppercase [font-stretch:75%]">
          {t("tabularHonestyTitle")}
        </h3>
        <p className="mt-2 text-sm/6">{t("tabularHonestyBody")}</p>
      </Note>

      <div className="mt-6 flex flex-col gap-4">
        <h3 className="border-rule border-b-2 pb-1.5 text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
          {t("tabularFaqHeading")}
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
          {t("tabularDisclaimerHeading")}
        </h3>
        <p className="text-muted-fg font-mono text-xs/6">
          {t("tabularCompareDisclaimer")}
        </p>
      </div>
    </section>
  );
};
