# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: the general public. Anyone who needs one small utility and will not sign up, install, or pay for it. Technical skill is not a requirement.

The author, a software engineer who builds and maintains other projects, is the first user. He is the standard each Tool is held to.

## Product Purpose

Ritools is a collection of small, single-purpose web tools. Each one is a Tool on the same site: a page that takes an input and gives back an output, and does all its work on the device.

It exists to replace capped and paid services, one Tool at a time. Success means a Tool is good enough that a user, the author first, stops reaching for the paid equivalent, and that the next Tool costs days instead of weeks.

## Positioning

Every Tool runs on local data only ([ADR-0008](../docs/adr/0008-tools-run-on-local-data-only.md)). No neighboring product can truthfully copy this: a service that stores user files, counts usage, or gates a batch behind a subscription cannot say that the data never leaves the device, and cannot drop its limits without dropping its business.

The narrower claim belongs to Squeeze, the first Tool: it compresses a whole Batch to a target file size. Browser-local compressors exist, but most expose a quality slider and leave the file size to chance.

## Operating Context

- The author builds the site in this monorepo: Bun workspaces, TanStack Start on React, the Effect runtime, Nitro for the build.
- A user meets a Tool in a browser and uses it once. Most arrive from search, so each Tool must stand alone as a page.
- The site is a PWA. A Tool works offline, and each image format also works offline after its first use.
- The host is not fixed. Nitro picks the runtime at build time ([ADR-0003](../apps/web/docs/adr/0003-server-rendering-with-tanstack-start.md)).

## Capabilities and Constraints

Confirmed:

- Ritools is one app. A Tool is a route on it, not a deployment ([ADR-0009](../docs/adr/0009-ritools-is-one-app-and-a-tool-is-a-route.md)).
- A Tool takes local input only. It has no account, no upload, and no server storage.
- Two Locales ship: `en-us` and `id-id`.
- The home page is the Tool Catalog.
- Squeeze is the first Tool, at `/squeeze`. It accepts a Batch of JPEG, PNG, WebP, AVIF, GIF, and BMP images. GIF and BMP contribute their first frame. Squeeze writes JPEG, WebP, AVIF, or PNG, keeps the input format, or writes JPEG, WebP, and AVIF together (Multi). It reaches a per-image Target or a Batch total, or encodes at one fixed quality. An image whose smallest output is still above its Target is a Miss.

Technical constraints:

- Device memory and CPU set the true Batch size. The site says "no cap", never "unlimited".
- GIF and BMP are input only. Squeeze cannot write them: Keep writes PNG for those inputs. Multi writes JPEG, WebP, and AVIF, never PNG ([ADR-0012](docs/adr/0012-output-format-is-a-setting-and-multi-writes-three-files.md)).
- A Batch total is one budget split evenly across the Batch, with one redistribution pass over unused bytes. Per-image overrides apply only in Per-image target mode ([ADR-0013](docs/adr/0013-a-batch-total-is-one-budget-split-across-the-batch.md)).
- EXIF metadata is kept only in JPEG output.
- An animated GIF becomes a still image: Squeeze reads the first frame.
- Workbox refuses a precache file above 2 MiB, so the codec WASM loads once and is cached at runtime.
- The browser is the runtime. Every Tool must work inside it, or it is not a Tool.

Explicitly undecided:

- Monetization. Nothing is decided. No Tool charges, and no plan exists.
- Any Tool after Squeeze.

## Brand Commitments

- **Name.** The name **Ritools** is binding.
- **Visual language.** The Ritools UI follows the visual language of _Persona 5_ and _Persona 5 Royal_. This is binding for every surface. The research is in [`docs/research/persona-5-ui-design-system.md`](docs/research/persona-5-ui-design-system.md).
- **Voice.** The copy has the Persona 5 attitude: bold, confident, and rebellious. The attitude never overrides the principle "Verifiable claims only".
- **Wordmark.** The wordmark is the name RITOOLS, cut by the ransom rules of the `Ransom` component and set in the four display faces of the ransom set: Anton, Abril Fatface, Alfa Slab One, and Archivo 900 at 125% width. It is the same note the navbar prints, not a drawing of it. The letterforms come from the self-hosted open-licensed faces and from nowhere else.
- **Logo.** The logo is `apps/web/public/logo.png`: a red disc with a crossed wrench and screwdriver in paper. It is a supplied file, and it carries the favicon, the PWA icons, the maskable icons, and the Apple touch icon, which `bun brand:gen` cuts from it. The script reads the logo and never draws or replaces it.
- **Open Graph cards.** Every route has its own card, drawn on request by `GET /api/og`: the site card, and one card per Tool with the Tool name in ransom letters and its promise from the Message Catalog. A route names its card with `ogImagePath`. The PWA manifest screenshots show Squeeze with a real Batch.
- **How the art is made.** The glyph atlas and the icon set are generated from code by `apps/web/scripts/generate-brand-assets.ts`; the manifest screenshots by `apps/web/scripts/capture-pwa-screenshots.ts`; the Open Graph cards by the endpoint. The logo alone is a supplied file. No asset holds an embedded font file, no image comes from a model, and every raster the scripts write carries the line that says where it came from.

## Evidence on Hand

None. There are no benchmarks, no usage numbers, no testimonials, and no case studies. No later work may invent one. The compression claims rest on the named codecs, and a reader can check those.

## Product Principles

1. **Local by construction.** If a Tool needs a server to hold user data, it is not a Tool.
2. **Verifiable claims only.** Say "the same codecs", never "the same quality".
3. **No caps, and no lies about caps.** The only limit is the device. The UI names it.
4. **Each Tool replaces something.** A Tool must take the place of a capped or paid service, or it does not ship.
5. **A Tool adds content, not chrome.** The shell is shared: navbar, theme, i18n, PWA, offline page, error pages.

## Accessibility & Inclusion

WCAG 2.2 AA holds for every Tool, in both color modes. A Tool is operable by keyboard alone, its progress and results are announced to assistive technology, and no state is carried by color alone.

The web glossary is [`apps/web/GLOSSARY.md`](apps/web/GLOSSARY.md).
