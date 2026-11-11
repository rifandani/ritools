import { createFileRoute } from "@tanstack/react-router";

import { buildSeoHead } from "@/core/utils/seo";
import { ogImagePath } from "@/features/og/og.params";
import { SnagPage } from "@/features/snag/components/snag-page";

export const Route = createFileRoute("/snag")({
  ssr: true,
  head: () =>
    buildSeoHead({
      title: "Snag — save a YouTube video as MP4, M4A, or MP3",
      description:
        "Paste one YouTube link. Save the video as MP4 at every quality it has, the audio as M4A or MP3, or the thumbnail. No account, no ads, no cap. Download only content you own or have permission to use.",
      path: "/snag",
      image: ogImagePath({ kind: "tool", path: "/snag" }),
      imageAlt: "Snag: save a video or its audio from one link.",
    }),
  component: SnagPage,
});
