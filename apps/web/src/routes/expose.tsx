import { createFileRoute } from "@tanstack/react-router";

import { buildSeoHead } from "@/core/utils/seo";
import { ExposePage } from "@/features/expose/components/expose-page";
import { ogImagePath } from "@/features/og/og.params";

export const Route = createFileRoute("/expose")({
  // Public and crawlable: the promise, the empty state, the two Sample Image
  // actions, and the explainer are in the HTML. Every browser-only call waits
  // behind an event or an effect.
  ssr: true,
  head: () =>
    buildSeoHead({
      description:
        "View EXIF, GPS, XMP, IPTC, ICC, and C2PA metadata in JPEG, PNG, HEIC, AVIF, WebP, TIFF, JPEG XL, and GIF images. Remove the groups you choose, on your device.",
      image: ogImagePath({ kind: "tool", path: "/expose" }),
      imageAlt:
        "Expose, in ransom letters on a red field, with the line: read the metadata in an image, then remove the groups you choose.",
      path: "/expose",
      title: "Expose — EXIF metadata viewer and remover",
    }),
  component: ExposePage,
});
