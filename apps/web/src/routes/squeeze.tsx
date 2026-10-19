import { createFileRoute } from "@tanstack/react-router";

import { buildSeoHead } from "@/core/utils/seo";
import { SqueezePage } from "@/features/squeeze/components/squeeze-page";

export const Route = createFileRoute("/squeeze")({
  // Public and crawlable: the copy, the settings and the drop zone are all in
  // the HTML. Every browser-only call waits behind an event or an effect.
  ssr: true,
  head: () =>
    buildSeoHead({
      description:
        "Compress JPEG, PNG, WebP and AVIF images to a target file size, in bulk, entirely in your browser. No upload, no signup, no cap.",
      path: "/squeeze",
      title: "Squeeze",
    }),
  component: SqueezePage,
});
