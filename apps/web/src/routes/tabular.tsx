import { createFileRoute } from "@tanstack/react-router";

import { buildSeoHead } from "@/core/utils/seo";
import { ogImagePath } from "@/features/og/og.params";
import { TabularPage } from "@/features/tabular/components/tabular-page";

export const Route = createFileRoute("/tabular")({
  ssr: true,
  head: () =>
    buildSeoHead({
      title: "Tabular — CSV and Excel viewer and editor",
      description:
        "View, edit, and convert CSV, XLS, XLSX, TSV, TAB, and delimited TXT files on your device. No upload.",
      path: "/tabular",
      image: ogImagePath({ kind: "tool", path: "/tabular" }),
      imageAlt: "Tabular: view, edit, and convert table files on your device.",
    }),
  component: TabularPage,
});
