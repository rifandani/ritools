import { useMemo, useState } from "react";
import {
  HiOutlineClipboardDocument,
  HiOutlineMinusCircle,
  HiOutlinePlusCircle,
} from "react-icons/hi2";

import { Button } from "@/core/components/ui/button";
import { Tooltip, TooltipContent } from "@/core/components/ui/tooltip";
import { useTranslation } from "@/features/i18n/use-translation";

import type { CleaveSession, ComparisonStatistics } from "../cleave.session";

const ChangeCount = ({
  side,
  statistics,
}: {
  readonly side: "before" | "after";
  readonly statistics: ComparisonStatistics;
}) => {
  const { t, locale } = useTranslation();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const before = side === "before";
  const { number, percent } = useMemo(
    () => ({
      number: new Intl.NumberFormat(locale),
      percent: new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 1,
      }),
    }),
    [locale]
  );
  const changeLabel = t(before ? "cleaveRemoved" : "cleaveAdded");
  const Icon = before ? HiOutlineMinusCircle : HiOutlinePlusCircle;
  return (
    <Tooltip delay={200} isOpen={detailsOpen} onOpenChange={setDetailsOpen}>
      <Button
        size="sm"
        intent="plain"
        className={
          before
            ? "[--mark-hover-line:var(--mark-ink)] [--mark-ink:var(--danger-subtle-fg)]"
            : "[--mark-hover-line:var(--mark-ink)] [--mark-ink:var(--success-subtle-fg)]"
        }
        onPress={() => setDetailsOpen(true)}
      >
        <Icon aria-hidden="true" />
        <span className="num">
          {t(before ? "cleaveRemovals" : "cleaveAdditions", {
            count: statistics.changedLines,
          })}
        </span>
      </Button>
      <TooltipContent placement="bottom start" className="cleave-statistics">
        {(
          [
            [
              "cleaveStatisticsLines",
              statistics.lines,
              statistics.changedLines,
            ],
            [
              "cleaveStatisticsCharacters",
              statistics.characters,
              statistics.changedCharacters,
            ],
          ] as const
        ).map(([label, total, changed]) => (
          <div className="cleave-statistics-group" key={label}>
            <strong>{t(label)}</strong>
            <dl>
              <div>
                <dt>{t("cleaveStatisticsTotal")}</dt>
                <dd className="num">{number.format(total)}</dd>
              </div>
              <div>
                <dt>{changeLabel}</dt>
                <dd className="num">
                  <span
                    className={
                      before
                        ? "text-danger-subtle-fg"
                        : "text-success-subtle-fg"
                    }
                  >
                    {before ? "−" : "+"}
                    {percent.format(total === 0 ? 0 : changed / total)}
                  </span>{" "}
                  {number.format(changed)}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </TooltipContent>
    </Tooltip>
  );
};

const CopyText = ({
  label,
  text,
  copy,
}: {
  readonly label: string;
  readonly text: string;
  readonly copy: (text: string) => Promise<void>;
}) => {
  const { t } = useTranslation();
  return (
    <div className="cleave-comparison-copy">
      <Tooltip>
        <Button
          size="sq-md"
          intent="plain"
          aria-label={label}
          onPress={() => {
            void copy(text);
          }}
        >
          <HiOutlineClipboardDocument aria-hidden="true" />
        </Button>
        <TooltipContent>{t("cleaveCopy")}</TooltipContent>
      </Tooltip>
    </div>
  );
};

export const CleaveComparisonHeader = ({
  session,
  statistics,
  layout,
  copy,
}: {
  readonly session: CleaveSession;
  readonly statistics: CleaveSession["statistics"];
  readonly layout: "split" | "stacked";
  readonly copy: (text: string) => Promise<void>;
}) => {
  const { t } = useTranslation();
  const { stacked, texts } = session;
  return (
    <div className="cleave-comparison-header" data-layout={layout}>
      {layout === "stacked" ? (
        <div className="cleave-comparison-row">
          <div className="cleave-comparison-counts">
            <ChangeCount side="before" statistics={statistics.before} />
            <ChangeCount side="after" statistics={statistics.after} />
          </div>
          <CopyText
            label={t("cleaveCopyStacked")}
            text={stacked.text}
            copy={copy}
          />
        </div>
      ) : (
        (["before", "after"] as const).map((side) => (
          <section
            className="cleave-comparison-row"
            aria-label={t(side === "before" ? "cleaveBefore" : "cleaveAfter")}
            key={side}
          >
            <ChangeCount side={side} statistics={statistics[side]} />
            <CopyText
              label={t(
                side === "before" ? "cleaveCopyBefore" : "cleaveCopyAfter"
              )}
              text={texts[side]}
              copy={copy}
            />
          </section>
        ))
      )}
    </div>
  );
};
