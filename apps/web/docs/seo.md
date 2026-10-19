# SEO (Search Engine Optimization)

The server renders the meta tags into the HTML. Crawlers do not have to run JavaScript.

Use the route `head()` with the helpers in `@/core/utils/seo`:

```tsx
import { buildSeoHead } from "@/core/utils/seo";

export const Route = createFileRoute("/cards")({
  head: () =>
    buildSeoHead({
      description: "All the cards you own.",
      path: "/cards",
      title: "Cards",
    }),
});
```

- `buildSeoHead` gives the title, description, Open Graph tags, Twitter tags, and one schema.org JSON-LD script.
- The root route gives the default tags. A page replaces a default tag when it gives a tag with the same `name` or `property`.
- Use `buildSeoMeta` (meta tags only) for a page that must not have JSON-LD, for example a page with `noindex`.

## `sitemap.xml`

Everytime we add a new page, we need to update the `scripts/gen-sitemap` and regenerate the `sitemap.xml` by running:

```bash
bun sitemap:gen
```
