# SEO (Search Engine Optimization)

The server renders the meta tags into the HTML. Crawlers do not have to run JavaScript.

Use the route `head()` with the helpers in `@/core/utils/seo`:

```tsx
import { buildSeoHead } from "@/core/utils/seo";

export const Route = createFileRoute("/example")({
  head: () =>
    buildSeoHead({
      description: "An example page.",
      path: "/example",
      title: "Example",
    }),
});
```

- `buildSeoHead` gives the title, description, Open Graph tags, Twitter tags, and one schema.org JSON-LD script.
- The root route gives the default tags. A page replaces a default tag when it gives a tag with the same `name` or `property`.
- Use `buildSeoMeta` (meta tags only) for a page that must not have JSON-LD, for example a page with `noindex`.

## Open Graph cards

The card is drawn on request by `GET /api/og`, not committed as a file. A route names its card with `ogImagePath` from `@/features/og/og.params`:

```tsx
import { ogImagePath } from "@/features/og/og.params";

head: () =>
  buildSeoHead({
    image: ogImagePath({ kind: "tool", path: "/squeeze" }),
    // ...
  }),
```

- The card is 1200×630, and the response carries an `ETag` over the drawing, so a feed that holds a current card gets a `304`.

See [ADR-0013](../../../docs/adr/0013-brand-assets-are-generated-from-code.md).

## `sitemap.xml`

Everytime we add a new page, we need to update the `scripts/gen-sitemap` and regenerate the `sitemap.xml` by running:

```bash
bun sitemap:gen
```
