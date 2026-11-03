import { createFileRoute } from "@tanstack/react-router";

import { buildSeoHead } from "@/core/utils/seo";
import { ogImagePath } from "@/features/og/og.params";
import { QuillPage } from "@/features/quill/components/quill-page";

export const Route = createFileRoute("/quill")({
  ssr: true,
  head: () =>
    buildSeoHead({
      title: "Quill — Markdown editor and local Library",
      description:
        "Write, organize, and export Markdown on your device. Visual and source editing, local folders, and backups. No upload.",
      path: "/quill",
      image: ogImagePath({ kind: "tool", path: "/quill" }),
      imageAlt: "Quill: write, organize, and export Markdown on your device.",
    }),
  component: QuillPage,
});
