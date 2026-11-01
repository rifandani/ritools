"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import type { ComparisonRow } from "@/features/tools/components/comparison-table";
import {
  ComparisonSources,
  ComparisonTable,
} from "@/features/tools/components/comparison-table";

/** The four services, in the order the table prints them. */
const COLUMNS = [
  "unmaskColRemoveBg",
  "unmaskColPhotoroom",
  "unmaskColCanva",
  "unmaskColUnmask",
] as const;

/** The Unmask column: the last one. */
const OURS = 3;

const ROWS = [
  {
    label: "unmaskRowFree",
    cells: [
      ["unmaskValueRemoveFree", "limit"],
      ["unmaskValuePhotoroomFree", "limit"],
      ["unmaskValueCanvaFree", "limit"],
      ["unmaskValueUnmaskFree", "good"],
    ],
  },
  {
    label: "unmaskRowFull",
    cells: [
      ["unmaskValueRemoveFull", "limit"],
      ["unmaskValuePhotoroomFull", "limit"],
      ["unmaskValueCanvaFull", "limit"],
      ["unmaskValueUnmaskFull", "good"],
    ],
  },
  {
    label: "unmaskRowBatch",
    cells: [
      ["unmaskValueRemoveBatch", "limit"],
      ["unmaskValuePhotoroomBatch", "limit"],
      ["unmaskValueCanvaBatch", "limit"],
      ["unmaskValueUnmaskBatch", "good"],
    ],
  },
  {
    label: "unmaskRowLocal",
    cells: [
      ["unmaskValueServer", "limit"],
      ["unmaskValueServer", "limit"],
      ["unmaskValueServer", "limit"],
      ["unmaskValueUnmaskLocal", "good"],
    ],
  },
  {
    label: "unmaskRowUpload",
    cells: [
      ["unmaskValueUpload", "limit"],
      ["unmaskValueUpload", "limit"],
      ["unmaskValueUpload", "limit"],
      ["unmaskValueUnmaskUpload", "good"],
    ],
  },
  {
    label: "unmaskRowRepair",
    cells: [
      ["unmaskValueRemoveRepair", "limit"],
      ["unmaskValuePhotoroomRepair", "limit"],
      ["unmaskValueCanvaRepair", "limit"],
      ["unmaskValueUnmaskRepair", "good"],
    ],
  },
  {
    label: "unmaskRowCommercial",
    cells: [
      ["unmaskValueRemoveCommercial", "limit"],
      ["unmaskValuePhotoroomCommercial", "limit"],
      ["unmaskValueCanvaCommercial", "limit"],
      ["unmaskValueUnmaskCommercial", "good"],
    ],
  },
] as const satisfies readonly ComparisonRow[];

/** Where each limit comes from, so a reader can check it. */
const SOURCES = [
  {
    href: "https://www.remove.bg/help/a/what-is-the-difference-between-the-free-plan-subscription-and-pay-as-you-go",
    label: "remove.bg",
  },
  {
    href: "https://help.photoroom.com/en/articles/15284788-export-limit",
    label: "Photoroom",
  },
  {
    href: "https://www.photoroom.com/pricing",
    label: "Photoroom plans",
  },
  {
    href: "https://www.canva.com/help/transparent-background/",
    label: "Canva",
  },
  { href: "https://www.canva.com/pricing/", label: "Canva plans" },
] as const;

/**
 * The ledger of the comparison: Unmask against the paid background removers a
 * person comes from. Every limit was read from the vendor page on the checked
 * date; the source line prints it, because a vendor can change a cap without
 * notice.
 */
export const UnmaskComparison = () => {
  const { t } = useTranslation();

  return (
    <div className="mt-12">
      <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {t("unmaskCompareHeading")}
      </h3>
      <ComparisonTable
        caption="unmaskCompareCaption"
        columns={COLUMNS}
        featureHeading="unmaskCompareFeature"
        minWidthClassName="min-w-[48rem]"
        ours={OURS}
        rows={ROWS}
      />
      <ComparisonSources checked="unmaskCompareChecked" sources={SOURCES} />
      <p className="text-muted-fg mt-1 font-mono text-xs/6 lg:hidden">
        {t("unmaskCompareScroll")}
      </p>
    </div>
  );
};
