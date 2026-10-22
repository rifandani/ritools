# Server rendering with TanStack Start; Nitro picks the runtime

The web app runs on TanStack Start. The server renders the full document and streams it. Each route sets its own `ssr` mode. Server-only code is in `*.server.ts` files, and the client reaches it only through `createServerFn` in `*.functions.ts` files. Nitro builds the server for the deployment target (Vercel with no configuration, `NITRO_PRESET` for other targets).

The router and its `QueryClient` are made for each request in `getRouter()`. There are no module-level instances.

The Locale comes from the request (cookie, then `Accept-Language`), so the SSR HTML and hydration agree. The language toggle writes the cookie through a server function.

## Considered Options

- Keep the static SPA — rejected; crawlers and the first paint get an empty `<main>`, and there is no typed path to a server for v2
- SPA mode of TanStack Start (prerendered shell only) — rejected; no per-request HTML, no server functions
- A Vercel-only adapter — rejected; Nitro presets change the target without app changes
- Keep `unhead` for head tags — rejected; the route `head()` renders on the server and streams with the document
