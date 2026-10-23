# web

React app on TanStack Start. The server renders and streams each page.

## Language

### Tools

**Ritools**: The public site that holds the Tools. It is one app, and each Tool is a path on it. _Avoid_: platform, suite, app collection

**Tool**: A single-purpose page that reads and writes local data only. It has no account, no upload, and no server storage. A Tool has a name, a one-line promise, an input, and an output. _Avoid_: utility, mini-app, widget, feature

**Squeeze**: The first Tool. It compresses images to a target file size on the device. _Avoid_: Squish, Squoosh

**Expose**: The second Tool. It reads the metadata in an image and removes the metadata the user selects. _Avoid_: Exif tool, EXIF remover, metadata cleaner

**Batch**: The set of images the user gives Squeeze in one session. It is the unit of work, and it does not survive a reload. _Avoid_: queue, job, bulk

**Tool Catalog**: The home page. It lists the Tools that exist. _Avoid_: home page, index, tool list

**Tool Entry**: One Tool's place in the Tool Catalog. _Avoid_: card, tile, item

### Brand

**Open Graph Card**: The 1200×630 image that a route offers to a feed. `GET /api/og` draws it on request from the Tool Catalog and the Message Catalog, so it is never a committed file. _Avoid_: poster, og image, preview image

**Glyph Atlas**: The measured letterforms — outline, advance, and ink box, in em — that `bun brand:gen` writes so the Open Graph Card can print without a font file or a font parser. _Avoid_: font cache, subset font, font data

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

### Metadata

**Metadata**: Data inside an image file that is not the image pixels. _Avoid_: EXIF data, tags, hidden data

**EXIF**: The metadata standard that stores camera, time, and GPS fields in an image. It is one container, not all metadata. _Avoid_: metadata, exif data

**Metadata Field**: One named value in an image file, such as a camera model, a date, or a GPS coordinate. _Avoid_: tag, property, attribute

**Metadata Group**: A semantic set of Metadata Fields that the user can remove together: AI Provenance, Location, Time, Device identity, Camera settings, Authorship, Software and edit history, Thumbnails and previews, Other text, or Display. _Avoid_: category, section, container

**Metadata Report**: The grouped view of every Metadata Field in one image. _Avoid_: results, details, metadata list

**Display Metadata**: The Metadata Fields that control how an image appears: the ICC profile, the orientation, and the dimensions. Expose keeps them in every clean. _Avoid_: technical metadata, essential metadata

**AI Provenance**: Metadata that records how an AI system made or changed a file: a C2PA Manifest, generation parameters, or an AI-tool signature. _Avoid_: AI metadata, AI watermark, AI detection

**C2PA Manifest**: The signed record of a file's origin and edits that the C2PA standard stores in the file. Content Credentials is its public name. _Avoid_: content credential, credentials, certificate

**JUMBF**: The container that holds a C2PA Manifest. _Avoid_: JUMBF block, JUMBF data

**Maker Note**: A camera maker's private metadata block. It can repeat camera, time, and settings fields. _Avoid_: maker notes, proprietary EXIF

**Clean**: The action that writes a Cleaned File with the selected Metadata Groups removed. _Avoid_: strip, scrub, sanitize

**Clean Preset**: A named selection of Metadata Groups to remove: AI only, Personal, Everything, or Custom. _Avoid_: mode, profile, filter

**Cleaned File**: The new image file that Expose writes after a clean. The input file is never changed. _Avoid_: output, result, stripped file

**Verification**: The second read of a Cleaned File that reports which Metadata Fields remain. _Avoid_: check, validation, scan

**Pixel Watermark**: A mark in the image pixels that survives metadata removal, such as SynthID. Expose cannot remove it. _Avoid_: watermark, AI watermark

**Sample Image**: An image that ships with Expose and shows the Metadata Report and the Clean Preset flow without a user file. _Avoid_: demo image, example, test image

**Offline Locator**: The map on Expose. It shows a GPS point without a network request. _Avoid_: map, GPS map, mini-map

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
