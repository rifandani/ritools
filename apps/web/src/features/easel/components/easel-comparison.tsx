"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import type { ComparisonRow } from "@/features/tools/components/comparison-table";
import {
  ComparisonSources,
  ComparisonTable,
} from "@/features/tools/components/comparison-table";

/** The four tools, in the order the table prints them. */
const COLUMNS = [
  "easelColPhotopea",
  "easelColPixlr",
  "easelColFotor",
  "easelColEasel",
] as const;

/** The Easel column: the last one. */
const OURS = 3;

const ROWS = [
  {
    label: "easelRowBrowser",
    cells: [
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
    ],
  },
  {
    label: "easelRowLocal",
    cells: [
      ["easelValueNoUpload", "good"],
      ["easelValueCloud", "limit"],
      ["easelValueUploaded", "limit"],
      ["easelValueNoUpload", "good"],
    ],
  },
  {
    label: "easelRowOffline",
    cells: [
      ["easelValueNotListed", "unknown"],
      ["easelValueNotListed", "unknown"],
      ["easelValueNotListed", "unknown"],
      ["easelValueOffline", "good"],
    ],
  },
  {
    label: "easelRowCrop",
    cells: [
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
      ["easelValueCrop", "good"],
    ],
  },
  {
    label: "easelRowTurn",
    cells: [
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
    ],
  },
  {
    label: "easelRowStraighten",
    cells: [
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
    ],
  },
  {
    label: "easelRowResize",
    cells: [
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
    ],
  },
  {
    label: "easelRowAdjust",
    cells: [
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
      ["easelValueAdjust", "good"],
    ],
  },
  {
    label: "easelRowFilters",
    cells: [
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
      ["easelValueFilters", "good"],
    ],
  },
  {
    label: "easelRowFill",
    cells: [
      ["easelValueNotListed", "unknown"],
      ["easelValueYes", "good"],
      ["easelValueNotListed", "unknown"],
      ["easelValueYes", "good"],
    ],
  },
  {
    label: "easelRowAnnotate",
    cells: [
      ["easelValueText", "good"],
      ["easelValueAnnotations", "good"],
      ["easelValueTextStickers", "good"],
      ["easelValueAnnotate", "good"],
    ],
  },
  {
    label: "easelRowWatermark",
    cells: [
      ["easelValueNotListed", "unknown"],
      ["easelValueYes", "good"],
      ["easelValueYes", "good"],
      ["easelValueWatermark", "good"],
    ],
  },
  {
    label: "easelRowRedact",
    cells: [
      ["easelValueNotListed", "unknown"],
      ["easelValueNotListed", "unknown"],
      ["easelValueNotListed", "unknown"],
      ["easelValueRedact", "good"],
    ],
  },
  {
    label: "easelRowUndo",
    cells: [
      ["easelValueHistory", "good"],
      ["easelValueHistory", "good"],
      ["easelValueNotListed", "unknown"],
      ["easelValueUndo", "good"],
    ],
  },
  {
    label: "easelRowOriginal",
    cells: [
      ["easelValueNotListed", "unknown"],
      ["easelValueNotListed", "unknown"],
      ["easelValueNotListed", "unknown"],
      ["easelValueYes", "good"],
    ],
  },
  {
    label: "easelRowExport",
    cells: [
      ["easelValuePhotopeaExport", "good"],
      ["easelValuePixlrExport", "limit"],
      ["easelValueFotorExport", "limit"],
      ["easelValueEaselExport", "good"],
    ],
  },
  {
    label: "easelRowMetadata",
    cells: [
      ["easelValueNotListed", "unknown"],
      ["easelValueNotListed", "unknown"],
      ["easelValueNotListed", "unknown"],
      ["easelValueRemoved", "good"],
    ],
  },
] as const satisfies readonly ComparisonRow[];

/**
 * One page per vendor. Checked on 12 November 2026.
 *
 * Photopea: no upload, crop, resize, adjustments, filters, and the format
 * list are on photopea.com. Rotate, flip, crop-at-an-angle, text, and the
 * History panel are in the Photopea learn pages.
 * Pixlr: the editor calls itself cloud-based and names crop, straighten,
 * fill, text, and shapes. Rotate, flip, adjust, filters, undo, and JPG, PNG,
 * and WebP export are on the Pixlr crop and Pixlr E pages. Watermark is on
 * the Pixlr watermark page.
 * Fotor: the editor starts with an upload and names adjust, filters, text,
 * and JPG, PNG, or PDF download. Rotate, flip, straighten, resize, and
 * watermark are on the Fotor feature pages.
 * A cell says "Not listed" when those pages do not state the feature.
 */
const SOURCES = [
  { href: "https://www.photopea.com/", label: "Photopea" },
  { href: "https://pixlr.com/editor/", label: "Pixlr" },
  { href: "https://www.fotor.com/", label: "Fotor" },
] as const;

/**
 * Easel against the three online photo editors people search for most.
 * The Easel column takes the heavy weight, so the eye finds it first.
 * The source line prints the date the cells were checked, because a vendor
 * can change a page without notice.
 */
export const EaselComparison = () => {
  const { t } = useTranslation();

  return (
    <div className="mt-12">
      <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {t("easelCompareHeading")}
      </h3>
      <ComparisonTable
        caption="easelCompareCaption"
        cellClassName="align-top"
        columns={COLUMNS}
        featureClassName="w-40 sm:w-48"
        featureHeading="easelCompareFeature"
        minWidthClassName="min-w-[64rem]"
        ourColumnClassName="w-[32%]"
        ours={OURS}
        ransomClassName="text-3xl"
        rowHeaderClassName="align-middle"
        rows={ROWS}
      />
      <ComparisonSources checked="easelCompareChecked" sources={SOURCES} />
      <p className="text-muted-fg mt-1 font-mono text-xs/6 lg:hidden">
        {t("easelCompareScroll")}
      </p>
    </div>
  );
};
