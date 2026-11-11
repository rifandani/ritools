import { createFileRoute } from "@tanstack/react-router";

import { buildSeoHead } from "@/core/utils/seo";
import { CinchPage } from "@/features/cinch/components/cinch-page";
import { ogImagePath } from "@/features/og/og.params";

export const Route = createFileRoute("/cinch")({
  // Public and crawlable: the copy, the settings and the drop zone are all in
  // the HTML. Every browser-only call waits behind an event or an effect.
  ssr: true,
  head: () =>
    buildSeoHead({
      description:
        "Compress MP4, MOV, WebM and MKV videos to a target file size or a quality preset, in bulk, entirely in your browser. No upload, no signup, no cap.",
      image: ogImagePath({ kind: "tool", path: "/cinch" }),
      imageAlt:
        "Cinch, in ransom letters on a red field, with the line: compress videos to a target file size.",
      path: "/cinch",
      title: "Cinch",
    }),
  component: CinchPage,
});
