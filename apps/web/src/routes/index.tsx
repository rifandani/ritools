import { createFileRoute } from "@tanstack/react-router";
import { Link as AriaLink } from "react-aria-components/Link";

import { buttonStyles } from "@/core/components/ui/button";
import { Container } from "@/core/components/ui/container";
import {
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
} from "@/core/components/ui/disclosure-group";
import { Ransom } from "@/core/components/ui/ransom";
import { buildSeoHead } from "@/core/utils/seo";
import { useTranslation } from "@/features/i18n/use-translation";
import { ogImagePath } from "@/features/og/og.params";
import { TOOLS } from "@/features/tools/tools";

/** The page title course: the promise in poster type and the claim. */
const CatalogHeader = () => {
  const { t } = useTranslation();

  return (
    <header className="flex flex-col gap-y-4">
      <h1 className="font-display text-[clamp(3.5rem,9vw,6.5rem)] leading-[0.9] font-black tracking-tight uppercase [font-stretch:75%]">
        {t("homeTitle")}
      </h1>
      <p className="text-fg max-w-[56ch] text-[clamp(1.25rem,1.5vw,1.5rem)] leading-[1.35] font-medium text-pretty">
        {t("homeLocalClaim")} {t("homeLocalLimit")}
      </p>
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
      <span className="num text-muted-fg text-base font-semibold lg:pt-3">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex flex-col gap-y-4">
        <div>
          <Ransom as="h2" className="text-[clamp(2.25rem,5vw,3.5rem)]" fit>
            {tool.name}
          </Ransom>
          <p className="mt-3 max-w-[50ch] text-xl/8 font-semibold text-pretty">
            {t(tool.promiseKey)}
          </p>
        </div>
        <ul className="border-rule divide-rule flex flex-col divide-y-2 border-t-2">
          {tool.factKeys.map((key) => (
            <li
              className="text-muted-fg py-2.5 text-[0.9375rem] leading-[1.6]"
              key={key}
            >
              <span className="block max-w-[62ch]">{t(key)}</span>
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

/** The shared FAQ: the promises that hold for every Tool. */
const COMMON_FAQ = [
  ["homeFaqFreeQ", "homeFaqFreeA"],
  ["homeFaqLocalQ", "homeFaqLocalA"],
  ["homeFaqOfflineQ", "homeFaqOfflineA"],
  ["homeFaqCommercialQ", "homeFaqCommercialA"],
] as const;

/** The shared FAQ, printed at the foot of the page: one answer set for all Tools. */
const HomeFaq = () => {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="home-faq-title"
      className="border-rule mt-8 border-t-[3px] pt-8 sm:mt-10"
    >
      <h2
        className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-none font-black tracking-[0.01em] uppercase [font-stretch:75%]"
        id="home-faq-title"
      >
        {t("homeFaqHeading")}
      </h2>
      <p className="text-muted-fg mt-3 max-w-[56ch] text-base/6 text-pretty">
        {t("homeFaqLede")}
      </p>
      <DisclosureGroup className="mt-6">
        {COMMON_FAQ.map(([question, answer]) => (
          <Disclosure id={question} key={question}>
            <DisclosureTrigger className="text-base/7">
              {t(question)}
            </DisclosureTrigger>
            <DisclosurePanel>
              <p className="max-w-[68ch] text-[0.9375rem] leading-[1.625rem]">
                {t(answer)}
              </p>
            </DisclosurePanel>
          </Disclosure>
        ))}
      </DisclosureGroup>
    </section>
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
      </section>

      <HomeFaq />
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
      image: ogImagePath(),
      imageAlt:
        "Ritools, in ransom letters on a red field, with the line: small utilities that run entirely on your device.",
      path: "/",
      title: "Tools",
    }),
  component: HomeRoute,
});
