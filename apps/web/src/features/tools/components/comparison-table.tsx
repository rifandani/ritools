"use client";

import { cn } from "cn";

import { Ransom } from "@/core/components/ui/ransom";
import { useTranslation } from "@/features/i18n/use-translation";

/** Green marks a plus, red a limit, and neutral an unlisted capability. */
export type ComparisonTone = "good" | "limit" | "unknown";

const TONE_CLASS = {
  good: "text-success-subtle-fg",
  limit: "text-danger-subtle-fg",
  unknown: "text-muted-fg",
} as const satisfies Record<ComparisonTone, string>;

export interface ComparisonRow {
  readonly cells: readonly (readonly [string, ComparisonTone])[];
  readonly label: string;
}

/** The shared ledger: one Tool against the services a person comes from. */
export const ComparisonTable = ({
  caption,
  cellClassName,
  columns,
  featureClassName,
  featureHeading,
  minWidthClassName,
  ourColumnClassName,
  ours,
  ransomClassName = "text-2xl",
  rowHeaderClassName,
  rows,
}: {
  readonly caption: string;
  readonly cellClassName?: string;
  readonly columns: readonly string[];
  readonly featureClassName?: string;
  readonly featureHeading: string;
  readonly minWidthClassName: string;
  readonly ourColumnClassName?: string;
  readonly ours: number;
  readonly ransomClassName?: string;
  readonly rowHeaderClassName?: string;
  readonly rows: readonly ComparisonRow[];
}) => {
  const { t } = useTranslation();
  const label = (key: string) =>
    // SAFETY: Every key in this table comes from the Tool's locale catalog.
    t(key as never);
  return (
    <div className="border-rule mt-6 overflow-x-auto border-2">
      <table
        className={cn(
          "w-full border-collapse text-left text-sm/6",
          minWidthClassName
        )}
      >
        <caption className="sr-only">{label(caption)}</caption>
        <thead>
          <tr>
            <th
              className={cn(
                "bg-bg border-rule border-b-2 px-3 py-3 text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]",
                featureClassName
              )}
              scope="col"
            >
              {label(featureHeading)}
            </th>
            {columns.map((column, index) => (
              <th
                className={cn(
                  "border-b-2 px-3 py-3 text-xs font-bold [font-stretch:87.5%]",
                  index === ours
                    ? cn("bg-bg border-rule relative", ourColumnClassName)
                    : "border-rule text-muted-fg tracking-[0.08em] uppercase"
                )}
                key={column}
                scope="col"
              >
                {index === ours ? (
                  <Ransom className={ransomClassName}>{label(column)}</Ransom>
                ) : (
                  label(column)
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th
                className={cn(
                  "bg-bg border-rule border-t px-3 py-3 text-xs font-bold tracking-[0.06em] uppercase [font-stretch:87.5%]",
                  rowHeaderClassName
                )}
                scope="row"
              >
                {label(row.label)}
              </th>
              {row.cells.map(([key, tone], index) => (
                <td
                  className={cn(
                    "border-rule border-t px-3 py-3",
                    cellClassName,
                    TONE_CLASS[tone]
                  )}
                  key={columns[index]}
                >
                  {label(key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
