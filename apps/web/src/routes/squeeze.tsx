import { createFileRoute } from "@tanstack/react-router";

import { buildSeoHead } from "@/core/utils/seo";
import { ogImagePath } from "@/features/og/og.params";
import { SqueezePage } from "@/features/squeeze/components/squeeze-page";

export const Route = createFileRoute("/squeeze")({
  // Public and crawlable: the copy, the settings and the drop zone are all in
  // the HTML. Every browser-only call waits behind an event or an effect.
  ssr: true,
  head: () =>
    buildSeoHead({
      description:
        "Compress JPEG, PNG, WebP, AVIF, GIF and BMP images to a target file size, in bulk, entirely in your browser. No upload, no signup, no cap.",
      image: ogImagePath({ kind: "tool", path: "/squeeze" }),
      imageAlt:
        "Squeeze, in ransom letters on a red field, with the line: compress images to a target file size.",
      path: "/squeeze",
      title: "Squeeze",
    }),
  component: SqueezePage,
});
