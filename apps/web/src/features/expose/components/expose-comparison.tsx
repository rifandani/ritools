"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import type { ComparisonRow } from "@/features/tools/components/comparison-table";
import { ComparisonTable } from "@/features/tools/components/comparison-table";

/** The four tools, in the order the table prints them. */
const COLUMNS = [
  "exposeColJimpl",
  "exposeColMetadata2go",
  "exposeColImageScrubber",
  "exposeColExpose",
] as const;

/** The Expose column: the last one. */
const OURS = 3;

const ROWS = [
  {
    label: "exposeRowBrowser",
    cells: [
      ["exposeValueYes", "good"],
      ["exposeValueYes", "good"],
      ["exposeValueYes", "good"],
      ["exposeValueYes", "good"],
    ],
  },
  {
    label: "exposeRowProcessing",
    cells: [
      ["exposeValueServerSide", "limit"],
      ["exposeValueServerSide", "limit"],
      ["exposeValueClientSide", "good"],
      ["exposeValueClientSide", "good"],
    ],
  },
  {
    label: "exposeRowUpload",
    cells: [
      ["exposeValueYes", "limit"],
      ["exposeValueYes", "limit"],
      ["exposeValueNo", "good"],
      ["exposeValueNo", "good"],
    ],
  },
  {
    label: "exposeRowReport",
    cells: [
      ["exposeValueExifGpsIcc", "good"],
      ["exposeValueFieldReport", "good"],
      ["exposeValueRemovedFields", "limit"],
      ["exposeValueGroupsGpsAi", "good"],
    ],
  },
  {
    label: "exposeRowChoose",
    cells: [
      ["exposeValueNo", "limit"],
      ["exposeValuePerField", "good"],
      ["exposeValueNo", "limit"],
      ["exposeValuePresets", "good"],
    ],
  },
  {
    label: "exposeRowVerify",
    cells: [
      ["exposeValueManualUpload", "limit"],
      ["exposeValueManualUpload", "limit"],
      ["exposeValueNoReread", "limit"],
      ["exposeValueAutoReread", "good"],
    ],
  },
  {
    label: "exposeRowFormats",
    cells: [
      ["exposeValueCommonImageTypes", "good"],
      ["exposeValueAnyFileType", "good"],
      ["exposeValueBrowserImages", "good"],
      ["exposeValueEightFormats", "good"],
    ],
  },
  {
    label: "exposeRowPixels",
    cells: [
      ["exposeValueYes", "good"],
      ["exposeValueYes", "good"],
      ["exposeValueNo", "limit"],
      ["exposeValueYes", "good"],
    ],
  },
  {
    label: "exposeRowInput",
    cells: [
      ["exposeValue50Mb", "limit"],
      ["exposeValue75Mb", "limit"],
      ["exposeValue2500Px", "limit"],
      ["exposeValueDeviceMemory", "good"],
    ],
  },
  {
    label: "exposeRowBulk",
    cells: [
      ["exposeValueOneFile", "limit"],
      ["exposeValueFivePerJob", "limit"],
      ["exposeValueOneFile", "limit"],
      ["exposeValueManyFiles", "good"],
    ],
  },
  {
    label: "exposeRowCost",
    cells: [
      ["exposeValueFreeWithAds", "limit"],
      ["exposeValueFreeToPaid", "limit"],
      ["exposeValueFreeOpenSource", "good"],
      ["exposeValueFreeNoAccount", "good"],
    ],
  },
] as const satisfies readonly ComparisonRow[];

/** Where each limit comes from, so a reader can check it. */
const SOURCES = [
  { href: "https://jimpl.com/remove-exif/", label: "Jimpl" },
  {
    href: "https://www.metadata2go.com/apps",
    label: "Metadata2Go",
  },
  {
    href: "https://github.com/everestpipkin/image-scrubber",
    label: "Image Scrubber",
  },
] as const;

/**
 * The ledger of the comparison: Expose against the tools a person comes from.
 * The Expose column takes the heavy weight, so the eye finds it first. The
 * source line prints the date the limits were checked, because a vendor can
 * change a cap without notice.
 */
export const ExposeComparison = () => {
  const { t } = useTranslation();

  return (
    <div className="mt-12">
      <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {t("exposeCompareHeading")}
      </h3>
      <ComparisonTable
        caption="exposeCompareCaption"
        cellClassName="align-top"
        columns={COLUMNS}
        featureClassName="w-40 sm:w-48"
        featureHeading="exposeCompareFeature"
        minWidthClassName="min-w-[54rem]"
        ours={OURS}
        rowHeaderClassName="align-middle"
        rows={ROWS}
      />
      <p className="text-muted-fg mt-1.5 flex flex-wrap items-baseline justify-end gap-x-3 gap-y-1 text-right font-mono text-xs/5 italic">
        <span>*{t("exposeCompareChecked")}</span>
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
    </div>
  );
};
