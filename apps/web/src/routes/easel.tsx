import { createFileRoute } from "@tanstack/react-router";

import { buildSeoHead } from "@/core/utils/seo";
import { EaselPage } from "@/features/easel/components/easel-page";
import { ogImagePath } from "@/features/og/og.params";

export const Route = createFileRoute("/easel")({
  // Public and crawlable: the promise, the empty state, the format line, and
  // the explainer are in the HTML.
  ssr: true,
  head: () =>
    buildSeoHead({
      description:
        "Easel edits one image at a time in your browser. Crop, Rotate, Straighten, Finetune, apply a Filter, add text and shapes, add a Watermark Layer, redact with a Cover or a Mosaic, and export PNG, JPEG, WebP, or AVIF. No upload.",
      image: ogImagePath({ kind: "tool", path: "/easel" }),
      imageAlt:
        "Easel, in ransom letters on a red field, with the line: edit one image, and keep it on this device.",
      path: "/easel",
      title: "Easel — edit one image, and keep it on your device",
    }),
  component: EaselPage,
});
