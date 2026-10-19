import { createFileRoute, notFound } from "@tanstack/react-router";
import { Schema, SchemaGetter } from "effect";
import { lazy } from "react";

import { buildSeoMeta } from "@/core/utils/seo";

// Keep this route module free of catalog/UI imports so routeTree's static
// import cannot pull Intent UI into the main chunk (PWA 2 MiB precache limit).
const MasterDesignPage = lazy(async () => {
  const m = await import("@/master-design/catalog-page");
  return { default: m.MasterDesignPage };
});

const searchSchema = Schema.Struct({
  /** Component Catalog filter. Coerced: `?q=123` filters by the text "123". */
  q: Schema.optionalKey(
    Schema.Unknown.pipe(
      Schema.decodeTo(Schema.String, {
        decode: SchemaGetter.String(),
        encode: SchemaGetter.passthrough(),
      })
    )
  ),
});

export const Route = createFileRoute("/master-design")({
  validateSearch: Schema.toStandardSchemaV1(searchSchema),
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw notFound();
    }
  },
  head: () => ({
    meta: [
      ...buildSeoMeta({
        description:
          "Internal catalog of core UI components and their variants.",
        path: "/master-design",
        title: "Component Catalog",
      }),
      { content: "noindex, nofollow", name: "robots" },
    ],
  }),
  component: MasterDesignPage,
});
