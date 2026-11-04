import { createFileRoute } from "@tanstack/react-router";

import { buildSeoHead } from "@/core/utils/seo";
import { ogImagePath } from "@/features/og/og.params";
import { RedlinePage } from "@/features/redline/components/redline-page";

export const Route = createFileRoute("/redline")({
  ssr: true,
  head: () =>
    buildSeoHead({
      title: "Redline — text diff checker and local Resolve",
      description:
        "Compare two texts on your device. Split and Stacked views, syntax colors, and Resolve for text changes and git conflicts. No upload.",
      path: "/redline",
      image: ogImagePath({ kind: "tool", path: "/redline" }),
      imageAlt: "Redline: compare and Resolve text on your device.",
    }),
  component: RedlinePage,
});
