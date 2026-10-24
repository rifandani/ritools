# `web` app

- [Effect](docs/effect.md) — folder structure, runtimes, atoms, server functions, tests
- [Observability](docs/observability.md)
- [Rendering](docs/rendering.md) — SSR modes, server functions, streaming, deployment
- [SEO](docs/seo.md)

## Workers

- Every Worker `message` handler returns early unless the message is a known request shape. `event.origin` is `""` for a dedicated Worker message, so an origin check there drops every request; only a Service Worker message carries the page origin.
