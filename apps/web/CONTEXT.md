# web

React app on TanStack Start. The server renders and streams each page.

## Language

### Tools

**Ritools**: The public site that holds the Tools. It is one app, and each Tool is a path on it. _Avoid_: platform, suite, app collection

**Tool**: A single-purpose page that reads and writes local data only. It has no account, no upload, and no server storage. A Tool has a name, a one-line promise, an input, and an output. _Avoid_: utility, mini-app, widget, feature

**Squeeze**: The first Tool. It compresses images to a target file size on the device. _Avoid_: Squish, Squoosh

**Batch**: The set of images the user gives Squeeze in one session. It is the unit of work, and it does not survive a reload. _Avoid_: queue, job, bulk

**Tool Catalog**: The home page. It lists the Tools that exist. _Avoid_: home page, index, tool list

**Tool Entry**: One Tool's place in the Tool Catalog. _Avoid_: card, tile, item

### Compression

**Output Format**: The file format Squeeze writes: JPEG, WebP, AVIF, PNG, Keep, or Multi. _Avoid_: target format, codec, type

**Keep**: The Output Format that writes each image in its input format. GIF and BMP become PNG. _Avoid_: same, original, passthrough

**Multi**: The Output Format that writes JPEG, WebP, and AVIF for each image. _Avoid_: all formats, trio, bundle

**Size Mode**: How Squeeze chooses output size: Per-image target, Batch total, or Fixed quality. _Avoid_: mode, strategy

**Target**: The file size that one image must reach or stay below. It is set for the Batch and may be overridden per image in Per-image target mode. In Batch total, an image's Target is its Per-image Budget. Fixed quality has no Target. _Avoid_: limit, cap, quota

**Batch Budget**: The total byte ceiling for a Batch in Batch total mode. It is split evenly, then unused bytes are redistributed once to misses. _Avoid_: total target, quota, cap

**Per-image Budget**: An image's share of the Batch Budget. _Avoid_: share, allocation

**Fixed quality**: The Size Mode that encodes at one quality and does not chase a size. _Avoid_: manual, quality mode

**Compressed**: The result for an image whose output is at or under its Target, or smaller than its input in Fixed quality. The row prints DONE. _Avoid_: optimized, success

**Already fits**: The result for an image that is used unchanged because its input already meets its Target, or because no smaller output was possible in Fixed quality. _Avoid_: skipped, no-op

**Miss**: The result for an image whose smallest useful output is still larger than its Target. _Avoid_: failure, error

**Bigger**: The result for a converted or resized image whose output is larger than its input in Fixed quality. In a Target mode, a bigger output can still be Compressed; the row adds "Bigger than input". _Avoid_: larger, inflated

**Stale**: A result made under settings that have since changed. The row keeps its last outcome, muted, and Compress all picks it up. _Avoid_: outdated, dirty

**Rejected**: The result for an input that Squeeze cannot read or does not accept. _Avoid_: invalid, failed

### Input

**Watch Folder**: A folder the browser watches for new images in Chrome and Edge. It adds files; it never removes them or starts a run. _Avoid_: sync, monitor

**Folder Path**: The path of a file inside a dropped or watched folder, preserved in the ZIP when the option is on. _Avoid_: directory, relative path

### Internationalization

**Locale**: A lowercase BCP-47 language tag that selects which Message Catalog to use (`en-us`, `id-id`). The server picks it for each request: the `app-locale` cookie, then `Accept-Language`. _Avoid_: language, languageCode, lng, resolvedLanguage

**Message Catalog**: The set of Translation Keys and strings for one Locale, owned in `apps/web/src/core/libs/i18n`. _Avoid_: resources, locale JSON, dictionary, i18n file

**Translation Key**: A flat identifier into a Message Catalog (e.g. `welcome`, `title`). _Avoid_: nested namespaces, i18next paths

**Translation Provider**: React glue that reads the current Locale and exposes `t` / `setLocale`. _Avoid_: I18nextProvider, react-i18next

### Errors

**Error Envelope**: The `{ message }` body the API returns on a failed request. Present on most failures, absent on some — a caller may never assume it parsed. _Avoid_: error response, error body, error payload

### Component Catalog

**Component Catalog**: The single page at `/master-design` that displays every core UI component for visual inspection by developers and designers. It is available in development. A production build answers 404. _Avoid_: master design, styleguide, storybook, docs site

**Component Entry**: One component's place in the Component Catalog — its Category membership, its nav item, and its section of the page. _Avoid_: item, doc, page

**Variant Showcase**: One rendered example within a Component Entry, demonstrating a single combination of a component's props. _Avoid_: demo, example, story

**Category**: A named grouping of Component Entries (Buttons, Overlays, Charts, …) that determines both nav grouping and page order. _Avoid_: group, section, tag
