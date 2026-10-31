import { createFileRoute } from "@tanstack/react-router";

import { buildSeoHead } from "@/core/utils/seo";
import { FolioPage } from "@/features/folio/components/folio-page";
import { ogImagePath } from "@/features/og/og.params";

export const Route = createFileRoute("/folio")({
  ssr: true,
  head: () =>
    buildSeoHead({
      title: "Folio — PDF viewer and editor",
      description:
        "Read, edit, redact, sign, fill forms, and organize PDFs on your device. No account or upload.",
      path: "/folio",
      image: ogImagePath({ kind: "tool", path: "/folio" }),
      imageAlt: "Folio: view and edit PDFs on your device.",
    }),
  component: FolioPage,
});
