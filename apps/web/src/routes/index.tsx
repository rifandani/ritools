import { createFileRoute } from "@tanstack/react-router";
import { Link as AriaLink } from "react-aria-components/Link";

import { buttonStyles } from "@/core/components/ui/button";
import { Container } from "@/core/components/ui/container";
import { Ransom } from "@/core/components/ui/ransom";
import { buildSeoHead } from "@/core/utils/seo";
import { useTranslation } from "@/features/i18n/use-translation";
import { TOOLS } from "@/features/tools/tools";

/**
 * The local-only claim. It sits on the one red field on the page, so the
 * promise reads before any Tool does.
 */
const LocalStamp = () => {
  const { t } = useTranslation();

  return (
    <aside className="border-primary-fg bg-primary text-primary-fg animate-stamp-press flex flex-col gap-y-4 border-2 p-5 sm:p-6">
      <p className="text-[clamp(2rem,4.2vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]">
        {t("homeLocalKicker")}
      </p>
      <p className="text-base leading-6 font-semibold">{t("homeLocalClaim")}</p>
      <p className="border-primary-fg border-t-2 pt-3 text-sm leading-6 font-bold">
        {t("homeLocalLimit")}
      </p>
    </aside>
  );
};

/** The page title course: the plain h1, the one-line deck, and the count. */
const CatalogHeader = () => {
  const { t } = useTranslation();
  const count = String(TOOLS.length).padStart(2, "0");

  return (
    <header className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-end">
      <div className="flex flex-col gap-y-4">
        <h1 className="font-display text-[clamp(3.5rem,9vw,6.5rem)] leading-[0.9] font-black tracking-[0.01em] uppercase [font-stretch:75%]">
          {t("toolsTitle")}
        </h1>
        <p className="text-muted-fg max-w-[44ch] text-lg leading-7">
          {t("toolsIntro")}
        </p>
        <p className="text-muted-fg flex items-baseline gap-x-2 text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
          <span className="num text-fg animate-num-land inline-block min-w-[2ch] origin-bottom text-sm">
            {count}
          </span>
          {t("homeToolLabel", { count: TOOLS.length })}
        </p>
      </div>
      <LocalStamp />
    </header>
  );
};

/**
 * One Tool Entry, printed as a proof: number, ransom name, promise, the real
 * facts, and the way in. The row repeats for every Tool that ships.
 */
const ToolProof = ({
  index,
  tool,
}: {
  readonly index: number;
  readonly tool: (typeof TOOLS)[number];
}) => {
  const { t } = useTranslation();

  return (
    <li className="grid gap-x-6 gap-y-4 p-5 sm:p-6 lg:grid-cols-[2.5rem_minmax(0,1fr)]">
      <span className="num text-muted-fg text-sm lg:pt-2">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex flex-col gap-y-4">
        <div>
          <Ransom as="h2" className="text-[clamp(2.25rem,5vw,3.5rem)]" fit>
            {tool.name}
          </Ransom>
          <p className="mt-3 max-w-[46ch] text-lg leading-7 font-semibold">
            {t(tool.promiseKey)}
          </p>
        </div>
        <ul className="border-rule divide-rule flex flex-col divide-y-2 border-t-2">
          {tool.factKeys.map((key) => (
            <li className="text-muted-fg py-2 text-sm leading-6" key={key}>
              {t(key)}
            </li>
          ))}
        </ul>
        <AriaLink
          className={`${buttonStyles({ size: "md" })} w-full cursor-pointer sm:w-auto sm:self-end`}
          href={tool.path}
        >
          {t("homeOpenTool", { tool: tool.name })}
        </AriaLink>
      </div>
    </li>
  );
};

/** The Tool Catalog: one proof per Tool that exists. */
const HomeRoute = () => {
  const { t } = useTranslation();

  return (
    <Container className="flex flex-col py-10 sm:py-14">
      <CatalogHeader />

      <div className="border-rule animate-rule-print mt-8 origin-left border-t-[3px] sm:mt-10" />

      <section
        aria-label={t("toolsTitle")}
        className="border-rule mt-6 border-2"
      >
        <ul className="divide-rule flex flex-col divide-y-2">
          {TOOLS.map((tool, index) => (
            <ToolProof index={index} key={tool.path} tool={tool} />
          ))}
        </ul>
        <aside className="border-rule border-t-2 p-5 sm:p-6">
          <p className="text-[0.75rem] font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
            {t("squeezeFactLocal")}
          </p>
          <p className="text-muted-fg mt-3 max-w-[38ch] text-sm leading-6">
            {t("homeNoteDevice")}
          </p>
        </aside>
      </section>

      <footer className="border-rule mt-6 border-t-2 pt-3">
        <p className="text-muted-fg text-sm">{t("toolsMore")}</p>
      </footer>
    </Container>
  );
};

export const Route = createFileRoute("/")({
  // Public, crawlable page: full SSR, so the HTML carries content and meta.
  ssr: true,
  head: () =>
    buildSeoHead({
      description:
        "Small utilities that run entirely on your device. Compress images, and more, without an upload, a signup, or a per-month limit.",
      path: "/",
      title: "Tools",
    }),
  component: HomeRoute,
});
