"use client";

import { cn } from "cn";

import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";

/** Unlisted capabilities stay neutral rather than implying no support. */
type Tone = "good" | "limit" | "unknown";

const TONE_CLASS = {
  good: "text-success-subtle-fg",
  limit: "text-danger-subtle-fg",
  unknown: "text-muted-fg",
} as const satisfies Record<Tone, string>;

/** The four tools, in the order the table prints them. */
const COLUMNS = [
  "tabularColCsvToSheets",
  "tabularColCsvViewerOnline",
  "tabularColCsvViewer",
  "tabularColTabular",
] as const;

/** The Tabular column: the last one. */
const OURS = 3;

const ROWS = [
  {
    label: "tabularRowBrowser",
    cells: [
      ["tabularValueYes", "good"],
      ["tabularValueYes", "good"],
      ["tabularValueYes", "good"],
      ["tabularValueYes", "good"],
    ],
  },
  {
    label: "tabularRowProcessing",
    cells: [
      ["tabularValueClientSide", "good"],
      ["tabularValueClientSide", "good"],
      ["tabularValueClientSide", "good"],
      ["tabularValueClientSide", "good"],
    ],
  },
  {
    label: "tabularRowUpload",
    cells: [
      ["tabularValueOptInSheets", "good"],
      ["tabularValueNo", "good"],
      ["tabularValueNo", "good"],
      ["tabularValueNo", "good"],
    ],
  },
  {
    label: "tabularRowFormats",
    cells: [
      ["tabularValueCsvOnly", "limit"],
      ["tabularValueCsvOnly", "limit"],
      ["tabularValueCsvTsvTxt", "limit"],
      ["tabularValueTableFiles", "good"],
    ],
  },
  {
    label: "tabularRowWorkbook",
    cells: [
      ["tabularValueNo", "limit"],
      ["tabularValueNo", "limit"],
      ["tabularValueNo", "limit"],
      ["tabularValueAllSheets", "good"],
    ],
  },
  {
    label: "tabularRowEdit",
    cells: [
      ["tabularValueReadOnly", "limit"],
      ["tabularValueYes", "good"],
      ["tabularValueYes", "good"],
      ["tabularValueEditCells", "good"],
    ],
  },
  {
    label: "tabularRowSearchSort",
    cells: [
      ["tabularValueYes", "good"],
      ["tabularValueYes", "good"],
      ["tabularValueYes", "good"],
      ["tabularValueSearchSort", "good"],
    ],
  },
  {
    label: "tabularRowStructure",
    cells: [
      ["tabularValueReadOnly", "limit"],
      ["tabularValueNotListed", "unknown"],
      ["tabularValueNotListed", "unknown"],
      ["tabularValueStructure", "good"],
    ],
  },
  {
    label: "tabularRowHistory",
    cells: [
      ["tabularValueReadOnly", "limit"],
      ["tabularValueNotListed", "unknown"],
      ["tabularValueYes", "good"],
      ["tabularValueHistory", "good"],
    ],
  },
  {
    label: "tabularRowClipboard",
    cells: [
      ["tabularValueCopyViewPasteCsv", "good"],
      ["tabularValuePasteCsv", "good"],
      ["tabularValuePasteCsv", "good"],
      ["tabularValueClipboard", "good"],
    ],
  },
  {
    label: "tabularRowKeyboard",
    cells: [
      ["tabularValuePasteShortcut", "good"],
      ["tabularValueNotListed", "unknown"],
      ["tabularValueNotListed", "unknown"],
      ["tabularValueKeyboard", "good"],
    ],
  },
  {
    label: "tabularRowSplit",
    cells: [
      ["tabularValueNotListed", "unknown"],
      ["tabularValueSeparateTool", "good"],
      ["tabularValue20kRows", "limit"],
      ["tabularValueSplit", "good"],
    ],
  },
  {
    label: "tabularRowMerge",
    cells: [
      ["tabularValueNotListed", "unknown"],
      ["tabularValueSeparateTool", "good"],
      ["tabularValue20kRows", "limit"],
      ["tabularValueMerge", "good"],
    ],
  },
  {
    label: "tabularRowDedupe",
    cells: [
      ["tabularValueNotListed", "unknown"],
      ["tabularValueSeparateTool", "good"],
      ["tabularValue20kRows", "limit"],
      ["tabularValueDedupe", "good"],
    ],
  },
  {
    label: "tabularRowDiff",
    cells: [
      ["tabularValueNotListed", "unknown"],
      ["tabularValueSeparateTool", "good"],
      ["tabularValueNotListed", "unknown"],
      ["tabularValueDiff", "good"],
    ],
  },
  {
    label: "tabularRowCharts",
    cells: [
      ["tabularValueNotListed", "unknown"],
      ["tabularValueNo", "limit"],
      ["tabularValueSeparateTool", "good"],
      ["tabularValueCharts", "good"],
    ],
  },
  {
    label: "tabularRowPdf",
    cells: [
      ["tabularValueYes", "good"],
      ["tabularValueNo", "limit"],
      ["tabularValueNotListed", "unknown"],
      ["tabularValuePdf", "good"],
    ],
  },
  {
    label: "tabularRowExport",
    cells: [
      ["tabularValueCsvPdfSheets", "good"],
      ["tabularValueCsvJson", "good"],
      ["tabularValueCsvXlsxJson", "good"],
      ["tabularValueTabularExport", "good"],
    ],
  },
  {
    label: "tabularRowInput",
    cells: [
      ["tabularValue100Mb10k", "limit"],
      ["tabularValueDeviceMemory", "good"],
      ["tabularValue100kRows", "limit"],
      ["tabularValueDeviceMemory", "good"],
    ],
  },
  {
    label: "tabularRowCost",
    cells: [
      ["tabularValueFreeNoAccount", "good"],
      ["tabularValueFreeNoAccount", "good"],
      ["tabularValueFreeToPro", "limit"],
      ["tabularValueFreeNoAccount", "good"],
    ],
  },
] as const satisfies readonly {
  readonly label: string;
  readonly cells: readonly (readonly [string, Tone])[];
}[];

/** Where each limit comes from, so a reader can check it. */
const SOURCES = [
  {
    href: "https://csvtosheets.com/tools/csv-viewer",
    label: "CSVtoSheets",
  },
  { href: "https://csvvieweronline.com/", label: "CSV Viewer Online" },
  { href: "https://csv-viewer.online/", label: "CSV Viewer" },
] as const;

/**
 * The ledger of the comparison: Tabular against the CSV viewers a person
 * comes from. The Tabular column takes the heavy weight, so the eye finds
 * it first. The source line prints the date the limits were checked,
 * because a vendor can change a cap without notice.
 */
export const TabularComparison = () => {
  const { t } = useTranslation();

  return (
    <div className="mt-12">
      <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {t("tabularCompareHeading")}
      </h3>
      <div className="border-rule mt-6 overflow-x-auto border-2">
        <table className="w-full min-w-[64rem] border-collapse text-left text-sm/6">
          <caption className="sr-only">{t("tabularCompareCaption")}</caption>
          <thead>
            <tr>
              <th
                className="bg-bg border-rule w-40 border-b-2 px-3 py-3 text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%] sm:w-48"
                scope="col"
              >
                {t("tabularCompareFeature")}
              </th>
              {COLUMNS.map((column, index) => (
                <th
                  className={cn(
                    "border-b-2 px-3 py-3 text-xs font-bold [font-stretch:87.5%]",
                    index === OURS
                      ? "bg-bg border-rule relative w-[32%]"
                      : "border-rule text-muted-fg tracking-[0.08em] uppercase"
                  )}
                  key={column}
                  scope="col"
                >
                  {index === OURS ? (
                    <Ransom className="text-3xl">{t(column)}</Ransom>
                  ) : (
                    t(column)
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <th
                  className="bg-bg border-rule border-t px-3 py-3 align-middle text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]"
                  scope="row"
                >
                  {t(row.label)}
                </th>
                {row.cells.map(([key, tone], index) => (
                  <td
                    className={cn(
                      "border-rule border-t px-3 py-3 align-top",
                      TONE_CLASS[tone]
                    )}
                    key={COLUMNS[index]}
                  >
                    {t(key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-fg mt-3 text-sm/6">{t("tabularCompareNotes")}</p>
      <p className="text-muted-fg mt-1.5 flex flex-wrap items-baseline justify-end gap-x-3 gap-y-1 pe-2 text-right font-mono text-xs/5 italic">
        <span>*{t("tabularCompareChecked")}</span>
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
