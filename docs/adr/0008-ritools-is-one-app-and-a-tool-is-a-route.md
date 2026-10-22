# Ritools is one app, and a Tool is a route

Ritools ships as a single app, `apps/web`. Each Tool is a route subtree on it (Squeeze is `/squeeze`), not a separate app and not a separate deployment.

The shell is shared and already built: navbar, theme, i18n, PWA, offline page, and error pages. A Tool that touches local files only gains nothing from its own deployment, and would pay the cost of a second shell. Route-level code splitting keeps a Tool's heavy assets, such as WASM codecs, out of the first page load. The `apps/*` glob stays for a future app that is not part of the site, for example a CLI.
