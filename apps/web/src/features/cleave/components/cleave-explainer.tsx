import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";
import {
  ComparisonSources,
  ComparisonTable,
} from "@/features/tools/components/comparison-table";
import { ExplainerFooter } from "@/features/tools/components/explainer-footer";

const sources = [
  { href: "https://www.diffchecker.com/", label: "Diffchecker" },
  { href: "https://www.diffnow.com/", label: "DiffNow" },
  { href: "https://www.mergely.com/", label: "Mergely" },
  { href: "https://www.mergely.com/doc", label: "Mergely docs" },
];
export const CleaveExplainer = () => {
  const { t } = useTranslation();
  return (
    <section
      className="border-rule mt-12 flex flex-col gap-6 border-t-[3px] pt-6"
      aria-labelledby="cleave-explainer"
    >
      <h2
        className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]"
        id="cleave-explainer"
      >
        {t("cleaveExplainerTitleLead")}{" "}
        <Ransom as="span">{t("cleaveExplainerTitleAccent")}</Ransom>{" "}
        {t("cleaveExplainerTitleBridge")}{" "}
        <span className="text-primary-ink">
          {t("cleaveExplainerTitleTail")}
        </span>
      </h2>
      <div className="flex flex-col gap-4">
        <p className="text-muted-fg text-base/6">{t("cleaveExplainerLede")}</p>
        <p className="text-muted-fg text-base/6">{t("cleaveExplainerIntro")}</p>
      </div>
      <div className="mt-12">
        <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
          {t("cleaveCompareHeading")}
        </h3>
        <ComparisonTable
          caption="cleaveCompareCaption"
          cellClassName="align-top"
          featureClassName="w-48 sm:w-56"
          featureHeading="cleaveFeature"
          columns={[
            "cleaveColDiffchecker",
            "cleaveColDiffNow",
            "cleaveColMergely",
            "cleaveColCleave",
          ]}
          minWidthClassName="min-w-[62rem]"
          ourColumnClassName="w-[30%]"
          ours={3}
          ransomClassName="text-3xl"
          rowHeaderClassName="align-middle"
          rows={[
            {
              label: "cleaveRowPlace",
              cells: [
                ["cleaveValueBrowser", "good"],
                ["cleaveValueOnline", "unknown"],
                ["cleaveValueBrowser", "good"],
                ["cleaveValueLocal", "good"],
              ],
            },
            {
              label: "cleaveRowResolve",
              cells: [
                ["cleaveValueDiffchecker", "limit"],
                ["cleaveValueNotListed", "unknown"],
                ["cleaveValueYes", "good"],
                ["cleaveValueYes", "good"],
              ],
            },
            {
              label: "cleaveRowMarkers",
              cells: [
                ["cleaveValueNotListed", "unknown"],
                ["cleaveValueNotListed", "unknown"],
                ["cleaveValueNotListed", "unknown"],
                ["cleaveValueMarkers", "good"],
              ],
            },
            {
              label: "cleaveRowLayouts",
              cells: [
                ["cleaveValueDiffcheckerLayouts", "limit"],
                ["cleaveValueSideBySide", "good"],
                ["cleaveValueSideBySide", "good"],
                ["cleaveValueLayouts", "good"],
              ],
            },
            {
              label: "cleaveRowLanguages",
              cells: [
                ["cleaveValueDiffchecker", "limit"],
                ["cleaveValueYes", "good"],
                ["cleaveValueCustomBuild", "limit"],
                ["cleaveValueLanguages", "good"],
              ],
            },
            {
              label: "cleaveRowHighlight",
              cells: [
                ["cleaveValueDiffcheckerHighlight", "limit"],
                ["cleaveValueWordChar", "good"],
                ["cleaveValueChar", "good"],
                ["cleaveValueWordChar", "good"],
              ],
            },
            {
              label: "cleaveRowWrapping",
              cells: [
                ["cleaveValueYes", "good"],
                ["cleaveValueNotListed", "unknown"],
                ["cleaveValueYes", "good"],
                ["cleaveValueYes", "good"],
              ],
            },
          ]}
        />
        <ComparisonSources
          checked="cleaveChecked"
          className="pe-2"
          sources={sources}
        />
        <p className="text-muted-fg mt-1 font-mono text-xs/6 lg:hidden">
          {t("cleaveCompareScroll")}
        </p>
      </div>
      <ExplainerFooter
        disclaimer={t("cleaveDisclaimer")}
        disclaimerHeading={t("cleaveDisclaimerHeading")}
        faqHeading={t("cleaveFaqHeading")}
        faq={(
          [
            ["cleaveFaqResolveQ", "cleaveFaqResolveA"],
            ["cleaveFaqLayoutQ", "cleaveFaqLayoutA"],
            ["cleaveFaqFilesQ", "cleaveFaqFilesA"],
          ] as const
        ).map(([q, a]) => ({ id: q, question: t(q), answer: t(a) }))}
      />
    </section>
  );
};
