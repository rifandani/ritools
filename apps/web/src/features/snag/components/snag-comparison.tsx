"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import type { ComparisonRow } from "@/features/tools/components/comparison-table";
import {
  ComparisonSources,
  ComparisonTable,
} from "@/features/tools/components/comparison-table";

/** The four services, in the order the table prints them. */
const COLUMNS = [
  "snagColY2Mate",
  "snagColSaveFrom",
  "snagColCobalt",
  "snagColSnag",
] as const;

/** The Snag column: the last one. */
const OURS = 3;

const ROWS = [
  {
    label: "snagRowYouTube",
    cells: [
      ["snagValueYes", "good"],
      ["snagValueSaveFromYouTube", "limit"],
      ["snagValueCobaltYouTube", "limit"],
      ["snagValueYes", "good"],
    ],
  },
  {
    label: "snagRowQuality",
    cells: [
      ["snagValue720p", "limit"],
      ["snagValueSaveFromQuality", "limit"],
      ["snagValueNoYouTube", "unknown"],
      ["snagValueEveryQuality", "good"],
    ],
  },
  {
    label: "snagRowLength",
    cells: [
      ["snagValueY2MateLength", "limit"],
      ["snagValueNoCap", "good"],
      ["snagValueNoYouTube", "unknown"],
      ["snagValueNoCap", "good"],
    ],
  },
  {
    label: "snagRowMerge",
    cells: [
      ["snagValueTheirServer", "limit"],
      ["snagValueSaveFromMerge", "limit"],
      ["snagValueCobaltMerge", "good"],
      ["snagValueThisTab", "good"],
    ],
  },
  {
    label: "snagRowAds",
    cells: [
      ["snagValueNotListed", "unknown"],
      ["snagValueAdSupported", "limit"],
      ["snagValueNoAds", "good"],
      ["snagValueNoAds", "good"],
    ],
  },
] as const satisfies readonly ComparisonRow[];

/** Where each limit comes from, so a reader can check it. */
const SOURCES = [
  { href: "https://y2mate.nu/en-tvXi/", label: "Y2Mate" },
  { href: "https://en.savefrom.net/", label: "SaveFrom.net" },
  {
    href: "https://bestvideodownloader.net/savefrom-net-review-2026-is-it-safe-and-worth-using/",
    label: "SaveFrom.net review",
  },
  { href: "https://api.cobalt.tools/", label: "cobalt" },
] as const;

/**
 * The ledger of the comparison: Snag against the link-paste downloaders a
 * person comes from. The source line prints the date the limits were checked,
 * because a service can change a cap or drop YouTube without notice.
 */
export const SnagComparison = () => {
  const { t } = useTranslation();

  return (
    <div className="mt-6">
      <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {t("snagCompareHeading")}
      </h3>
      <ComparisonTable
        caption="snagCompareCaption"
        columns={COLUMNS}
        featureHeading="snagCompareFeature"
        minWidthClassName="min-w-[48rem]"
        ours={OURS}
        rows={ROWS}
      />
      <ComparisonSources checked="snagCompareChecked" sources={SOURCES} />
      <p className="text-muted-fg mt-1 font-mono text-xs/6 lg:hidden">
        {t("snagCompareScroll")}
      </p>
    </div>
  );
};
