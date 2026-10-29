"use client";

import { Note } from "@/core/components/ui/note";
import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";
import { FaqList } from "@/features/tools/components/faq-list";

import { FolioComparison } from "./folio-comparison";

const FAQ = [
  ["folioFaqDownloadQ", "folioFaqDownloadA"],
  ["folioFaqSaveQ", "folioFaqSaveA"],
  ["folioFaqEditQ", "folioFaqEditA"],
  ["folioFaqSignedQ", "folioFaqSignedA"],
  ["folioFaqOcrQ", "folioFaqOcrA"],
  ["folioFaqBlockQ", "folioFaqBlockA"],
  ["folioFaqLimitQ", "folioFaqLimitA"],
] as const;

/**
 * Below the Tool: what Folio is, how it compares with the online PDF
 * services a person comes from, what Folio cannot do, and the answers a
 * person needs before they trust a file to this tab. The comparison carries
 * a checked date and source links, because a vendor can change a limit
 * without notice.
 */
export const FolioExplainer = () => {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="folio-explainer-title"
      className="border-rule flex flex-col gap-6 border-t-[3px] pt-6"
    >
      <h2
        className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]"
        id="folio-explainer-title"
      >
        {t("folioExplainerTitleLead")}{" "}
        <Ransom as="span">{t("folioExplainerTitleAccent")}</Ransom>{" "}
        {t("folioExplainerTitleBridge")}{" "}
        <span className="text-primary-ink">{t("folioExplainerTitleTail")}</span>
      </h2>

      <div className="flex flex-col gap-4">
        <p className="text-muted-fg text-base/6">{t("folioExplainerLede")}</p>
        <p className="text-muted-fg text-base/6">{t("folioExplainerIntro")}</p>
      </div>

      <FolioComparison />

      <Note intent="warning">
        <h3 className="font-display text-base/5 font-extrabold uppercase [font-stretch:75%]">
          {t("folioHonestyTitle")}
        </h3>
        <p className="mt-2 text-sm/6">{t("folioHonestyBody")}</p>
      </Note>

      <div className="mt-6 flex flex-col gap-4">
        <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
          {t("folioFaqHeading")}
        </h3>
        <FaqList
          items={FAQ.map(([question, answer]) => ({
            answer: t(answer),
            id: question,
            question: t(question),
          }))}
        />
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
          {t("folioDisclaimerHeading")}
        </h3>
        <p className="text-muted-fg font-mono text-xs/6">
          {t("folioCompareDisclaimer")}
        </p>
      </div>
    </section>
  );
};
