import { createFileRoute } from "@tanstack/react-router";

import { buildSeoHead } from "@/core/utils/seo";
import { ogImagePath } from "@/features/og/og.params";
import { QraftPage } from "@/features/qraft/components/qraft-page";

export const Route = createFileRoute("/qraft")({
  // Public and crawlable: the default QR and every control are in the HTML.
  ssr: true,
  head: () =>
    buildSeoHead({
      description:
        "Write QR codes, Data Matrix, PDF417, Aztec, barcodes, and postal codes on your device. Style them, add a logo, and download SVG, PNG, or a label sheet. No upload, no account, no expiry, no scan count.",
      image: ogImagePath({ kind: "tool", path: "/qraft" }),
      imageAlt:
        "Qraft: write QR codes and other scannable codes on your device.",
      path: "/qraft",
      title: "QR Code Generator — Qraft",
    }),
  component: QraftPage,
});
