import { createFileRoute } from "@tanstack/react-router";

import { buildSeoHead } from "@/core/utils/seo";
import { ogImagePath } from "@/features/og/og.params";
import { UnmaskPage } from "@/features/unmask/components/unmask-page";

export const Route = createFileRoute("/unmask")({
  // Public and crawlable: the promise, the empty state, the format line, and
  // the explainer are in the HTML.
  ssr: true,
  head: () =>
    buildSeoHead({
      description:
        "Unmask is a browser background remover for JPEG, PNG, WebP, AVIF, GIF, and BMP images. Refine the Matte with the Magic Brush, choose a Transparent, Solid, or Blur Backdrop, and download PNG, WebP, AVIF, or JPEG. No upload.",
      image: ogImagePath({ kind: "tool", path: "/unmask" }),
      imageAlt:
        "Unmask, in ransom letters on a red field, with the line: remove the background, then fix the Matte with the Magic Brush.",
      path: "/unmask",
      title: "Unmask — background remover for a clean Cutout",
    }),
  component: UnmaskPage,
});
