"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import type { ComparisonRow } from "@/features/tools/components/comparison-table";
import {
  ComparisonSources,
  ComparisonTable,
} from "@/features/tools/components/comparison-table";

/** The four services, in the order the table prints them. */
const COLUMNS = [
  "cinchColFreeConvert",
  "cinchColClideo",
  "cinchColVidShift",
  "cinchColCinch",
] as const;

/** The Cinch column: the last one. */
const OURS = 3;

const ROWS = [
  {
    label: "cinchRowProcessing",
    cells: [
      ["cinchValueServerSide", "limit"],
      ["cinchValueServerSide", "limit"],
      ["cinchValueClientSide", "good"],
      ["cinchValueClientSide", "good"],
    ],
  },
  {
    label: "cinchRowMaxFile",
    cells: [
      ["cinchValueFreeConvertMax", "limit"],
      ["cinchValueClideoMax", "limit"],
      ["cinchValueNoCap", "good"],
      ["cinchValueNoCap", "good"],
    ],
  },
  {
    label: "cinchRowTarget",
    cells: [
      ["cinchValuePercent", "limit"],
      ["cinchValueNo", "limit"],
      ["cinchValueYes", "good"],
      ["cinchValueYes", "good"],
    ],
  },
  {
    label: "cinchRowWebm",
    cells: [
      ["cinchValueNotStated", "unknown"],
      ["cinchValueNotStated", "unknown"],
      ["cinchValueNo", "limit"],
      ["cinchValueYes", "good"],
    ],
  },
  {
    label: "cinchRowBatch",
    cells: [
      ["cinchValueNotStated", "unknown"],
      ["cinchValueNotStated", "unknown"],
      ["cinchValueSeparatePage", "unknown"],
      ["cinchValueYesZip", "good"],
    ],
  },
] as const satisfies readonly ComparisonRow[];

/** Where each limit comes from, so a reader can check it. */
const SOURCES = [
  {
    href: "https://www.freeconvert.com/video-compressor",
    label: "FreeConvert",
  },
  { href: "https://clideo.com/compress-video", label: "Clideo" },
  { href: "https://vidshift.io/compress/", label: "VidShift" },
] as const;

/**
 * Cinch against the tools a person comes from. The source line prints the
 * date the limits were checked, because a vendor can change a cap without
 * notice.
 */
export const CinchComparison = () => {
  const { t } = useTranslation();

  return (
    <div className="mt-12">
      <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {t("cinchCompareHeading")}
      </h3>
      <ComparisonTable
        caption="cinchCompareCaption"
        columns={COLUMNS}
        featureHeading="cinchCompareFeature"
        minWidthClassName="min-w-[48rem]"
        ours={OURS}
        rows={ROWS}
      />
      <ComparisonSources checked="cinchCompareChecked" sources={SOURCES} />
      <p className="text-muted-fg mt-1 font-mono text-xs/6 lg:hidden">
        {t("cinchCompareScroll")}
      </p>
    </div>
  );
};
