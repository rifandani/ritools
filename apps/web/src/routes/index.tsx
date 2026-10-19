import { createFileRoute } from "@tanstack/react-router";

import { Card } from "@/core/components/ui/card";
import { Container } from "@/core/components/ui/container";
import { Link } from "@/core/components/ui/link";
import { buildSeoHead } from "@/core/utils/seo";
import { useTranslation } from "@/features/i18n/use-translation";
import { TOOLS } from "@/features/tools/tools";

/** The Tool Catalog: one Tool Entry per Tool that exists. */
const HomeRoute = () => {
  const { t } = useTranslation();

  return (
    <Container className="flex flex-col gap-y-8 py-16">
      <header className="flex flex-col gap-y-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          {t("toolsTitle")}
        </h1>
        <p className="text-muted-fg">{t("toolsIntro")}</p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <li key={tool.path}>
            <Card className="h-full p-0">
              <Link
                className="focus-visible:outline-ring flex h-full flex-col gap-y-1 rounded-xl p-5 no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                href={tool.path}
              >
                <span className="font-medium">{tool.name}</span>
                <span className="text-muted-fg text-sm">
                  {t(tool.promiseKey)}
                </span>
              </Link>
            </Card>
          </li>
        ))}
      </ul>

      <p className="text-muted-fg text-sm">{t("toolsMore")}</p>
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
