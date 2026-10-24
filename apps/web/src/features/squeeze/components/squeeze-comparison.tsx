"use client";

import { cn } from "cn";

import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";

/** How a cell reads: a plus is green, a minus is red. */
type Tone = "good" | "limit";

const TONE_CLASS = {
  good: "text-success-subtle-fg",
  limit: "text-danger-subtle-fg",
} as const satisfies Record<Tone, string>;

/** The four services, in the order the table prints them. */
const COLUMNS = [
  "squeezeColTinyPng",
  "squeezeColSquoosh",
  "squeezeColCompressorIo",
  "squeezeColSqueeze",
] as const;

/** The Squeeze column: the last one. */
const OURS = 3;

const ROWS = [
  {
    label: "squeezeRowBulk",
    cells: [
      ["squeezeValueTinyBulk", "limit"],
      ["squeezeValueSquooshBulk", "limit"],
      ["squeezeValueCompressorBulk", "limit"],
      ["squeezeValueNoCap", "good"],
    ],
  },
  {
    label: "squeezeRowTarget",
    cells: [
      ["squeezeValueNo", "limit"],
      ["squeezeValueNo", "limit"],
      ["squeezeValueNo", "limit"],
      ["squeezeValueTargetYes", "good"],
    ],
  },
  {
    label: "squeezeRowMaxFile",
    cells: [
      ["squeezeValueTinyMax", "limit"],
      ["squeezeValueNoCap", "good"],
      ["squeezeValueCompressorMax", "limit"],
      ["squeezeValueNoCap", "good"],
    ],
  },
  {
    label: "squeezeRowProcessing",
    cells: [
      ["squeezeValueServerSide", "limit"],
      ["squeezeValueClientSide", "good"],
      ["squeezeValueServerSide", "limit"],
      ["squeezeValueClientSide", "good"],
    ],
  },
  {
    label: "squeezeRowUpload",
    cells: [
      ["squeezeValueYes", "limit"],
      ["squeezeValueNo", "good"],
      ["squeezeValueYes", "limit"],
      ["squeezeValueNo", "good"],
    ],
  },
  {
    label: "squeezeRowFormats",
    cells: [
      ["squeezeValueYes", "good"],
      ["squeezeValueYes", "good"],
      ["squeezeValueNoAvif", "limit"],
      ["squeezeValueYes", "good"],
    ],
  },
  {
    label: "squeezeRowZip",
    cells: [
      ["squeezeValueYes", "good"],
      ["squeezeValueNo", "limit"],
      ["squeezeValueYes", "good"],
      ["squeezeValueYes", "good"],
    ],
  },
  {
    label: "squeezeRowCost",
    cells: [
      ["squeezeValueTinyCost", "limit"],
      ["squeezeValueFree", "good"],
      ["squeezeValueCompressorCost", "limit"],
      ["squeezeValueFreeAlways", "good"],
    ],
  },
] as const satisfies readonly {
  readonly label: string;
  readonly cells: readonly (readonly [string, Tone])[];
}[];

/** Where each limit comes from, so a reader can check it. */
const SOURCES = [
  { href: "https://tinypng.com/", label: "TinyPNG" },
  { href: "https://squoosh.app/", label: "Squoosh" },
  { href: "https://compressor.io/pricing", label: "Compressor.io" },
] as const;

/**
 * The ledger of the comparison: Squeeze against the tools a person comes
 * from. The Squeeze column takes the heavy weight, so the eye finds it first.
 * The source line prints the date the limits were checked, because a vendor
 * can change a cap without notice.
 */
export const SqueezeComparison = () => {
  const { t } = useTranslation();

  return (
    <div className="mt-12">
      <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {t("squeezeCompareHeading")}
      </h3>
      <div className="border-rule mt-6 overflow-x-auto border-2">
        <table className="w-full min-w-[48rem] border-collapse text-left text-sm/6">
          <caption className="sr-only">{t("squeezeCompareCaption")}</caption>
          <thead>
            <tr>
              <th
                className="bg-bg border-rule border-b-2 px-3 py-3 text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]"
                scope="col"
              >
                {t("squeezeCompareFeature")}
              </th>
              {COLUMNS.map((column, index) => (
                <th
                  className={cn(
                    "border-b-2 px-3 py-3 text-xs font-bold [font-stretch:87.5%]",
                    index === OURS
                      ? "bg-bg border-rule relative"
                      : "border-rule text-muted-fg tracking-[0.08em] uppercase"
                  )}
                  key={column}
                  scope="col"
                >
                  {index === OURS ? (
                    <Ransom className="text-2xl">{t(column)}</Ransom>
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
                  className="bg-bg border-rule border-t px-3 py-3 text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]"
                  scope="row"
                >
                  {t(row.label)}
                </th>
                {row.cells.map(([key, tone], index) => (
                  <td
                    className={cn(
                      "border-rule border-t px-3 py-3",
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
      <p className="text-muted-fg mt-1.5 flex flex-wrap items-baseline justify-end gap-x-3 gap-y-1 text-right font-mono text-xs/5 italic">
        <span>*{t("squeezeCompareChecked")}</span>
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
        {t("squeezeCompareScroll")}
      </p>
    </div>
  );
};
