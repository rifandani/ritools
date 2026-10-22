"use client";

import { cn } from "cn";

import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";

/**
 * How a cell reads: a cap or a paywall, a good trait, a plain fact, or the
 * Squeeze column.
 */
type Tone = "good" | "limit" | "muted" | "ours";

const TONE_CLASS = {
  good: "text-success-subtle-fg",
  limit: "text-danger-subtle-fg",
  muted: "text-muted-fg",
  ours: "text-primary-fg font-bold",
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
      ["squeezeValueNoCap", "ours"],
    ],
  },
  {
    label: "squeezeRowTarget",
    cells: [
      ["squeezeValueNo", "muted"],
      ["squeezeValueNo", "muted"],
      ["squeezeValueNo", "muted"],
      ["squeezeValueTargetYes", "ours"],
    ],
  },
  {
    label: "squeezeRowMaxFile",
    cells: [
      ["squeezeValueTinyMax", "limit"],
      ["squeezeValueNoCap", "good"],
      ["squeezeValueCompressorMax", "limit"],
      ["squeezeValueNoCap", "ours"],
    ],
  },
  {
    label: "squeezeRowProcessing",
    cells: [
      ["squeezeValueServerSide", "muted"],
      ["squeezeValueClientSide", "good"],
      ["squeezeValueServerSide", "muted"],
      ["squeezeValueClientSide", "ours"],
    ],
  },
  {
    label: "squeezeRowUpload",
    cells: [
      ["squeezeValueYes", "muted"],
      ["squeezeValueNo", "good"],
      ["squeezeValueYes", "muted"],
      ["squeezeValueNo", "ours"],
    ],
  },
  {
    label: "squeezeRowFormats",
    cells: [
      ["squeezeValueYes", "muted"],
      ["squeezeValueYes", "muted"],
      ["squeezeValueYes", "muted"],
      ["squeezeValueYes", "ours"],
    ],
  },
  {
    label: "squeezeRowZip",
    cells: [
      ["squeezeValueYes", "muted"],
      ["squeezeValueNo", "muted"],
      ["squeezeValueYes", "muted"],
      ["squeezeValueYes", "ours"],
    ],
  },
  {
    label: "squeezeRowCost",
    cells: [
      ["squeezeValueTinyCost", "limit"],
      ["squeezeValueFree", "good"],
      ["squeezeValueCompressorCost", "limit"],
      ["squeezeValueFreeAlways", "ours"],
    ],
  },
] as const satisfies readonly {
  readonly label: string;
  readonly cells: readonly (readonly [string, Tone])[];
}[];

/**
 * The ledger of the comparison: Squeeze against the tools a person comes
 * from. The Squeeze column sits on the brand red, so the eye finds it first.
 */
export const SqueezeComparison = () => {
  const { t } = useTranslation();

  return (
    <div className="mt-12">
      <h3 className="font-display text-[clamp(1.5rem,4vw,2.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {t("squeezeCompareHeading")}
      </h3>
      <div className="border-rule mt-6 overflow-x-auto border-2">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm/6">
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
                      "border-t px-3 py-3",
                      index === OURS
                        ? "bg-primary border-primary-fg"
                        : "border-rule",
                      TONE_CLASS[tone]
                    )}
                    key={key}
                  >
                    {t(key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
