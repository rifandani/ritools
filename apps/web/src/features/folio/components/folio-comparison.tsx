"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import type { ComparisonRow } from "@/features/tools/components/comparison-table";
import { ComparisonTable } from "@/features/tools/components/comparison-table";

/** The four services, in the order the table prints them. */
const COLUMNS = [
  "folioColILovePdf",
  "folioColSmallpdf",
  "folioColAdobeAcrobat",
  "folioColFolio",
] as const;

/** The Folio column: the last one. */
const OURS = 3;

const ROWS = [
  {
    label: "folioRowBrowser",
    cells: [
      ["folioValueYes", "good"],
      ["folioValueYes", "good"],
      ["folioValueYes", "good"],
      ["folioValueYes", "good"],
    ],
  },
  {
    label: "folioRowProcessing",
    cells: [
      ["folioValueServerSide", "limit"],
      ["folioValueServerSide", "limit"],
      ["folioValueServerSide", "limit"],
      ["folioValueClientSide", "good"],
    ],
  },
  {
    label: "folioRowUpload",
    cells: [
      ["folioValueYes", "limit"],
      ["folioValueYes", "limit"],
      ["folioValueYes", "limit"],
      ["folioValueNo", "good"],
    ],
  },
  {
    label: "folioRowFreePlan",
    cells: [
      ["folioValueILoveFree", "limit"],
      ["folioValueSmallFree", "limit"],
      ["folioValueAdobeFree", "limit"],
      ["folioValueFolioFree", "good"],
    ],
  },
  {
    label: "folioRowEditText",
    cells: [
      ["folioValueYes", "good"],
      ["folioValueProOnly", "limit"],
      ["folioValueProOnly", "limit"],
      ["folioValueNo", "limit"],
    ],
  },
  {
    label: "folioRowAnnotate",
    cells: [
      ["folioValueYes", "good"],
      ["folioValueYes", "good"],
      ["folioValueYes", "good"],
      ["folioValueYes", "good"],
    ],
  },
  {
    label: "folioRowPages",
    cells: [
      ["folioValueYes", "good"],
      ["folioValueYes", "good"],
      ["folioValueYes", "good"],
      ["folioValueYes", "good"],
    ],
  },
  {
    label: "folioRowForms",
    cells: [
      ["folioValueYes", "good"],
      ["folioValueYes", "good"],
      ["folioValueYes", "good"],
      ["folioValueFolioForms", "good"],
    ],
  },
  {
    label: "folioRowOcr",
    cells: [
      ["folioValueYes", "good"],
      ["folioValueOcrLimited", "good"],
      ["folioValueYes", "good"],
      ["folioValueNo", "limit"],
    ],
  },
  {
    label: "folioRowRedactSign",
    cells: [
      ["folioValueYes", "good"],
      ["folioValueOcrLimited", "good"],
      ["folioValueAdobeRedactSign", "limit"],
      ["folioValueNo", "limit"],
    ],
  },
  {
    label: "folioRowConvert",
    cells: [
      ["folioValueYes", "good"],
      ["folioValueYes", "good"],
      ["folioValueYes", "good"],
      ["folioValueNo", "limit"],
    ],
  },
  {
    label: "folioRowOffline",
    cells: [
      ["folioValueNo", "limit"],
      ["folioValueNo", "limit"],
      ["folioValueNo", "limit"],
      ["folioValueFolioOffline", "good"],
    ],
  },
  {
    label: "folioRowAccount",
    cells: [
      ["folioValueAccountNotRequired", "good"],
      ["folioValueAccountNotRequired", "good"],
      ["folioValueAdobeAccount", "limit"],
      ["folioValueAccountNotRequired", "good"],
    ],
  },
  {
    label: "folioRowStorage",
    cells: [
      ["folioValueILoveStorage", "good"],
      ["folioValueSmallStorage", "good"],
      ["folioValueAdobeStorage", "limit"],
      ["folioValueFolioStorage", "good"],
    ],
  },
  {
    label: "folioRowCost",
    cells: [
      ["folioValuePaid", "limit"],
      ["folioValuePaid", "limit"],
      ["folioValuePaid", "limit"],
      ["folioValueFreeNoAccount", "good"],
    ],
  },
] as const satisfies readonly ComparisonRow[];

/** Where each limit comes from, so a reader can check it. */
const SOURCES = [
  { href: "https://www.ilovepdf.com/pricing", label: "iLovePDF" },
  { href: "https://smallpdf.com/pricing", label: "Smallpdf" },
  {
    href: "https://www.adobe.com/acrobat/online/pdf-editor.html",
    label: "Adobe Acrobat",
  },
  {
    href: "https://helpx.adobe.com/document-cloud/faq/try-acrobat-online-services.html",
    label: "Adobe limits",
  },
] as const;

/**
 * The ledger of the comparison: Folio against the online PDF services a
 * person comes from. The Folio column takes the heavy weight, so the eye
 * finds it first. The source line prints the date the limits were checked,
 * because a vendor can change a cap without notice.
 */
export const FolioComparison = () => {
  const { t } = useTranslation();

  return (
    <div className="mt-12">
      <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {t("folioCompareHeading")}
      </h3>
      <ComparisonTable
        caption="folioCompareCaption"
        cellClassName="align-top"
        columns={COLUMNS}
        featureClassName="w-48 sm:w-56"
        featureHeading="folioCompareFeature"
        minWidthClassName="min-w-[62rem]"
        ourColumnClassName="w-[30%]"
        ours={OURS}
        ransomClassName="text-3xl"
        rowHeaderClassName="align-middle"
        rows={ROWS}
      />
      <p className="text-muted-fg mt-1.5 flex flex-wrap items-baseline justify-end gap-x-3 gap-y-1 pe-2 text-right font-mono text-xs/5 italic">
        <span>*{t("folioCompareChecked")}</span>
        {SOURCES.map((source) => (
          <a
            className="text-primary-ink font-semibold underline decoration-2 underline-offset-[0.24em]"
            href={source.href}
            key={source.href}
            rel="noreferrer"
            target="_blank"
          >
            {source.label}
          </a>
        ))}
      </p>
      <p className="text-muted-fg mt-1 font-mono text-xs/6 lg:hidden">
        {t("folioCompareScroll")}
      </p>
    </div>
  );
};
