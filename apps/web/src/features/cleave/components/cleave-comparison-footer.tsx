import { useTranslation } from "@/features/i18n/use-translation";

import type { CleaveSession } from "../cleave.session";

export const CleaveComparisonFooter = ({
  session,
  layout,
}: {
  readonly session: CleaveSession;
  readonly layout: "split" | "stacked";
}) => {
  const { t } = useTranslation();
  const totals =
    layout === "split"
      ? ([
          { label: "cleaveBefore", ...session.statistics.before },
          { label: "cleaveAfter", ...session.statistics.after },
        ] as const)
      : ([{ label: "cleaveStacked", ...session.stacked }] as const);
  return (
    <footer className="cleave-comparison-footer" data-layout={layout}>
      {totals.map(({ label, lines, characters }) => (
        <section
          className="cleave-comparison-metrics"
          aria-label={t(label)}
          key={label}
        >
          <span className="num">{t("cleaveLines", { count: lines })}</span>{" "}
          <span aria-hidden="true">·</span>{" "}
          <span className="num">
            {t("cleaveCharacters", { count: characters })}
          </span>
        </section>
      ))}
    </footer>
  );
};
