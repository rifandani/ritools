"use client";

import { Note } from "@/core/components/ui/note";
import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";
import type { ComparisonRow } from "@/features/tools/components/comparison-table";
import {
  ComparisonSources,
  ComparisonTable,
} from "@/features/tools/components/comparison-table";
import { ExplainerFooter } from "@/features/tools/components/explainer-footer";

/** The four services, in the order the table prints them. */
const COLUMNS = [
  "quillColHackmd",
  "quillColNotion",
  "quillColTypora",
  "quillColQuill",
] as const;

/** The Quill column: the last one. */
const OURS = 3;

const ROWS = [
  {
    label: "quillRowCost",
    cells: [
      ["quillValueHackmdCost", "limit"],
      ["quillValueNotionCost", "limit"],
      ["quillValueTyporaCost", "limit"],
      ["quillValueQuillCost", "good"],
    ],
  },
  {
    label: "quillRowStored",
    cells: [
      ["quillValueCloud", "limit"],
      ["quillValueCloud", "limit"],
      ["quillValueTyporaStored", "good"],
      ["quillValueQuillStored", "good"],
    ],
  },
  {
    label: "quillRowFormat",
    cells: [
      ["quillValueMarkdown", "good"],
      ["quillValueNotionFormat", "limit"],
      ["quillValueMarkdown", "good"],
      ["quillValueMarkdown", "good"],
    ],
  },
  {
    label: "quillRowPdf",
    cells: [
      ["quillValueHackmdPdf", "limit"],
      ["quillValueNotionPdf", "limit"],
      ["quillValueIncluded", "good"],
      ["quillValueIncluded", "good"],
    ],
  },
  {
    label: "quillRowDocx",
    cells: [
      ["quillValueNotListed", "unknown"],
      ["quillValueNotListed", "unknown"],
      ["quillValueTyporaDocx", "limit"],
      ["quillValueIncluded", "good"],
    ],
  },
] as const satisfies readonly ComparisonRow[];

/** Where each limit comes from, so a reader can check it. */
const SOURCES = [
  { href: "https://hackmd.io/pricing", label: "HackMD plans" },
  { href: "https://hackmd.io/@docs/export-to-pdf-en", label: "HackMD PDF" },
  { href: "https://www.notion.com/pricing", label: "Notion plans" },
  {
    href: "https://www.notion.com/help/export-your-content",
    label: "Notion export",
  },
  { href: "https://store.typora.io/", label: "Typora" },
  { href: "https://support.typora.io/Export/", label: "Typora export" },
] as const;

const FAQ = [
  ["quillFaqWhereQuestion", "quillFaqWhereAnswer"],
  ["quillFaqProtectedQuestion", "quillFaqProtectedAnswer"],
  ["quillFaqBackupQuestion", "quillFaqBackupAnswer"],
] as const;

/**
 * Below the Tool: what Quill is, how it compares, what it cannot do, and the
 * answers a person needs before they keep writing in this browser.
 */
export const QuillExplainer = () => {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="quill-explainer-title"
      className="border-rule flex flex-col gap-6 border-t-[3px] pt-6"
    >
      <h2
        className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]"
        id="quill-explainer-title"
      >
        {t("quillExplainerTitleLead")}{" "}
        <Ransom as="span">{t("quillExplainerTitleAccent")}</Ransom>{" "}
        {t("quillExplainerTitleBridge")}{" "}
        <span className="text-primary-ink">{t("quillExplainerTitleTail")}</span>
      </h2>
      <div className="flex flex-col gap-4">
        <p className="text-muted-fg text-base/6">{t("quillExplainerLede")}</p>
        <p className="text-muted-fg text-base/6">{t("quillExplainerIntro")}</p>
      </div>

      <div className="mt-12">
        <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
          {t("quillCompareHeading")}
        </h3>
        <ComparisonTable
          caption="quillCompareCaption"
          columns={COLUMNS}
          featureHeading="quillCompareFeature"
          minWidthClassName="min-w-[48rem]"
          ours={OURS}
          rows={ROWS}
        />
        <ComparisonSources checked="quillCompareChecked" sources={SOURCES} />
        <p className="text-muted-fg mt-1 font-mono text-xs/6 lg:hidden">
          {t("quillCompareScroll")}
        </p>
      </div>

      <Note intent="warning">
        <h3 className="font-display text-base/5 font-extrabold uppercase [font-stretch:75%]">
          {t("quillHonestyTitle")}
        </h3>
        <p className="mt-2 text-sm/6">{t("quillHonestyBody")}</p>
      </Note>

      <ExplainerFooter
        disclaimer={t("quillDisclaimer")}
        disclaimerHeading={t("quillDisclaimerHeading")}
        faq={FAQ.map(([question, answer]) => ({
          answer: t(answer),
          id: question,
          question: t(question),
        }))}
        faqHeading={t("quillFaqHeading")}
      />
    </section>
  );
};
