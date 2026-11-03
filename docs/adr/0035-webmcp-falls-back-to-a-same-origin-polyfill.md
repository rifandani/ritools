# WebMCP falls back to a same-origin polyfill

Agent Actions use the native `document.modelContext` when the browser has it. Chrome gets it through the origin-trial token. In other browsers, Ritools loads `@mcp-b/global` by dynamic import, and only when the native API is absent, so a Browser Agent that uses the MCP-B transport can still call Agent Actions.

The polyfill starts a postMessage transport, and its default `allowedOrigins` is `*`, so any frame or extension message could call an Agent Action. We set `allowedOrigins` to the page's own origin and turn the iframe transport off. We do not load the polyfill on top of the native API: it would replace `document.modelContext` and put a third-party layer between the browser and every Agent Action. The polyfill also gives Playwright's Chromium a `document.modelContext`, so the smoke tests call the same API that agents call.

## Considered Options

- **Native only.** Rejected: only Chrome users with the origin trial could use Agent Actions.
- **`@mcp-b/webmcp-polyfill` alone.** Rejected: it has no transport, so no external agent can reach it.
