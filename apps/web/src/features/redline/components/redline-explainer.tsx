import { useTranslation } from "@/features/i18n/use-translation";
import {
  ComparisonSources,
  ComparisonTable,
} from "@/features/tools/components/comparison-table";
import { ExplainerFooter } from "@/features/tools/components/explainer-footer";

const sources = [
  { href: "https://www.diffchecker.com/", label: "Diffchecker" },
  { href: "https://meldmerge.org/", label: "Meld" },
];
export const RedlineExplainer = () => {
  const { t } = useTranslation();
  return (
    <section
      className="border-rule mt-12 flex flex-col gap-6 border-t-[3px] pt-6"
      aria-labelledby="redline-explainer"
    >
      <h2
        className="font-display text-3xl font-black uppercase"
        id="redline-explainer"
      >
        {t("redlineExplainerTitle")}
      </h2>
      <p className="text-muted-fg max-w-prose">{t("redlineExplainerBody")}</p>
      <h3 className="font-display text-2xl font-black uppercase">
        {t("redlineCompareHeading")}
      </h3>
      <ComparisonTable
        caption="redlineCompareCaption"
        featureHeading="redlineFeature"
        columns={[
          "redlineColDiffchecker",
          "redlineColMeld",
          "redlineColRedline",
        ]}
        minWidthClassName="min-w-[40rem]"
        ours={2}
        rows={[
          {
            label: "redlineRowPlace",
            cells: [
              ["redlineValueOnline", "unknown"],
              ["redlineValueDesktop", "unknown"],
              ["redlineValueLocal", "good"],
            ],
          },
          {
            label: "redlineRowResolve",
            cells: [
              ["redlineValueDiffchecker", "limit"],
              ["redlineValueYes", "good"],
              ["redlineValueYes", "good"],
            ],
          },
        ]}
      />
      <ComparisonSources checked="redlineChecked" sources={sources} />
      <ExplainerFooter
        disclaimer={t("redlineDisclaimer")}
        disclaimerHeading={t("redlineDisclaimerHeading")}
        faqHeading={t("redlineFaqHeading")}
        faq={(
          [
            ["redlineFaqPrivacyQ", "redlineFaqPrivacyA"],
            ["redlineFaqOfflineQ", "redlineFaqOfflineA"],
            ["redlineFaqFilesQ", "redlineFaqFilesA"],
          ] as const
        ).map(([q, a]) => ({ id: q, question: t(q), answer: t(a) }))}
      />
    </section>
  );
};
