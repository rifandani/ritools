import { createFileRoute } from "@tanstack/react-router";

import { buildSeoHead } from "@/core/utils/seo";
import { CleavePage } from "@/features/cleave/components/cleave-page";
import { ogImagePath } from "@/features/og/og.params";

export const Route = createFileRoute("/cleave")({
  ssr: true,
  head: () =>
    buildSeoHead({
      title: "Cleave — text diff checker and local Resolve",
      description:
        "Compare two texts on your device. Split and Stacked views, syntax colors, and Resolve for text changes and git conflicts. No upload.",
      path: "/cleave",
      image: ogImagePath({ kind: "tool", path: "/cleave" }),
      imageAlt: "Cleave: compare and Resolve text on your device.",
    }),
  component: CleavePage,
});
