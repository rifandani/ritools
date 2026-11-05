import { createFileRoute } from "@tanstack/react-router";

import { Container } from "@/core/components/ui/container";
import {
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
} from "@/core/components/ui/disclosure-group";
import { buildSeoHead } from "@/core/utils/seo";
import { useTranslation } from "@/features/i18n/use-translation";
import { ogImagePath } from "@/features/og/og.params";
import { ToolCatalog } from "@/features/tools/components/tool-catalog";

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
              <p className="text-[0.9375rem] leading-[1.625rem] text-wrap">
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
const HomeRoute = () => (
  <Container className="flex flex-col py-10 sm:py-14">
    <CatalogHeader />

    <div className="border-rule animate-rule-print mt-8 origin-left border-t-[3px] sm:mt-10" />

    <ToolCatalog />

    <HomeFaq />
  </Container>
);

export const Route = createFileRoute("/")({
  // Public, crawlable page: full SSR, so the HTML carries content and meta.
  ssr: true,
  head: () =>
    buildSeoHead({
      description:
        "Small utilities that run entirely on your device. Compress images, and more, without an upload, a signup, or a per-month limit.",
      image: ogImagePath(),
      imageAlt:
        "Ritools, set as ri/tools on a red field, with the line: small utilities that run entirely on your device.",
      path: "/",
      title: "Tools",
    }),
  component: HomeRoute,
});
