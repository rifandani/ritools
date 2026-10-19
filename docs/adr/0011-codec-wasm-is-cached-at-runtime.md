# Codec WASM is cached at runtime, not precached

The build keeps `wasm` out of the Workbox precache glob in `vite.config.ts`, and the service worker caches a codec the first time it is used, through a route in `src/sw.ts`.

Workbox refuses a precache file over 2 MiB by default, and the AVIF encoder is 3.5 MiB, so the install step failed outright with the whole glob in place. Raising the limit was rejected: it would put ~7 MiB of codec into every install, including the installs of a visitor who only ever compresses a JPEG. The cost of the choice is that a format works offline only after its first use, so the page says "each format works offline after you use it once" rather than claiming offline support outright.
